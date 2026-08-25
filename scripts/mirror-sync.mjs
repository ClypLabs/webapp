#!/usr/bin/env node
// Pushes the current GitHub release to the R2 mirror.
//
// Run after publishing a release:
//   pnpm mirror:push
//
// This is deliberately runnable from a laptop rather than only from CI. A
// GitHub Action is the convenient path, but it dies with the account - and the
// account dying is the scenario the mirror exists for.
//
// Only the latest release's binaries are mirrored. That is ~1.1 GB and it
// overwrites in place, so storage stays flat forever regardless of how many
// releases get cut. Older versions stay on GitHub; the mirror is a lifeline for
// installing and updating, not a release archive.

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const ASSETS = [
  "ClypDat-Setup.exe",
  "ClypDat-Portable.exe",
  "ClypDat-win-x64.zip",
  "ClypDat.msi",
];

const LATEST_KEY = "api/releases/latest.json";
const RELEASES_KEY = "api/releases/index.json";

const CONTENT_TYPES = {
  ".exe": "application/vnd.microsoft.portable-executable",
  ".msi": "application/x-msi",
  ".zip": "application/zip",
};

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

const ACCOUNT_ID = required("R2_ACCOUNT_ID");
const BUCKET = required("R2_BUCKET");
const ACCESS_KEY_ID = required("R2_ACCESS_KEY_ID");
const SECRET_ACCESS_KEY = required("R2_SECRET_ACCESS_KEY");
// Public base of the site, so mirrored asset URLs point back at /download/...
// rather than at R2 directly. Keeps the redirect logic in one place.
const SITE_BASE = required("SITE_BASE_URL").replace(/\/+$/, "");

const REPO = process.env.GITHUB_REPO ?? "ClypLabs/ClypDat";
const TOKEN = process.env.GITHUB_TOKEN ?? "";
const FORCE = process.argv.includes("--force");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ClypDat-MirrorSync",
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return headers;
}

async function githubJson(path) {
  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: githubHeaders(),
  });
  if (!response.ok) {
    throw new Error(`GitHub ${path} returned ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function putObject(key, body, contentType, contentLength) {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: contentLength,
    },
    // 277 MB assets need multipart; 16 MB parts keeps the part count sane
    // without holding much in memory.
    partSize: 16 * 1024 * 1024,
    queueSize: 4,
  });
  await upload.done();
}

async function fetchMirrored(key) {
  const base = process.env.MIRROR_BASE_URL?.replace(/\/+$/, "");
  if (!base) return null;
  try {
    const response = await fetch(`${base}/${key}`, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Downloads to a temp file, then hashes it. Streaming the hash and the upload
// off one response would save a disk write, but a failed upload would mean
// re-downloading 277 MB - the temp file makes a retry cheap.
async function downloadAsset(url, destination) {
  const response = await fetch(url, {
    headers: { ...githubHeaders(), Accept: "application/octet-stream" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Download failed for ${url}: ${response.status} ${response.statusText}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
}

async function sha256File(path) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
}

function contentTypeFor(name) {
  const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

// Snapshots keep GitHub's response shape so the app's updater parses them with
// no special cases. Asset URLs are rewritten to our own /download/ route, and
// the digest is the hash this script computed rather than GitHub's - it
// describes the bytes actually sitting in the bucket.
async function writeSnapshots(latest, all, digests) {
  const latestSnapshot = {
    tag_name: latest.tag_name,
    body: latest.body ?? "",
    draft: false,
    prerelease: false,
    assets: ASSETS.map((name) => ({
      name,
      browser_download_url: `${SITE_BASE}/download/${name}`,
      digest: `sha256:${digests.get(name)}`,
    })),
  };

  // Release notes only. Assets on older releases keep their GitHub URLs because
  // nothing reads them - the updater uses this list for bodies and tags alone.
  const releasesSnapshot = all
    .filter((release) => !release.draft && !release.prerelease)
    .map((release) => ({
      tag_name: release.tag_name,
      body: release.body ?? "",
      draft: false,
      prerelease: false,
      assets:
        release.tag_name === latest.tag_name
          ? latestSnapshot.assets
          : release.assets.map((asset) => ({
              name: asset.name,
              browser_download_url: asset.browser_download_url,
              digest: asset.digest ?? null,
            })),
    }));

  const json = (value) => Buffer.from(JSON.stringify(value, null, 2));
  const latestBody = json(latestSnapshot);
  const releasesBody = json(releasesSnapshot);

  await putObject(LATEST_KEY, latestBody, "application/json", latestBody.byteLength);
  await putObject(RELEASES_KEY, releasesBody, "application/json", releasesBody.byteLength);
}

async function main() {
  console.log(`Reading releases from ${REPO}...`);
  const latest = await githubJson("/releases/latest");
  let all = await githubJson("/releases?per_page=100");

  // A flagged repository can serve /releases/latest normally while the list
  // endpoint returns an empty array - that is the current state of
  // ClypLabs/ClypDat. Mirroring the empty list faithfully would strip the
  // release notes out of the updater, so fall back to the one release we know
  // about. Notes for older versions are lost either way; notes for the version
  // being offered are the ones that matter.
  if (!all.some((release) => release.tag_name === latest.tag_name)) {
    console.log(
      `  release list returned ${all.length} entries and omits ${latest.tag_name}; using the latest release alone for notes.`,
    );
    all = [latest, ...all];
  }

  const mirrored = await fetchMirrored(LATEST_KEY);
  const mirroredList = await fetchMirrored(RELEASES_KEY);
  const sameTag = !FORCE && mirrored?.tag_name === latest.tag_name;
  const listIsCurrent = Array.isArray(mirroredList) &&
    mirroredList.some((release) => release.tag_name === latest.tag_name);

  // Patch notes are written after the release is published, so the tag can be
  // current while the mirrored body is empty or outdated. Refresh just the
  // snapshots in that case - the binaries are already correct, and they are the
  // 1.1 GB part. The same applies when the mirrored list is missing the current
  // release, which happens if a sync ran while GitHub was suppressing it.
  if (sameTag && listIsCurrent && mirrored.body === (latest.body ?? "")) {
    console.log(`Mirror already at ${latest.tag_name}. Nothing to do (--force to re-upload).`);
    return;
  }

  if (sameTag) {
    console.log(`Mirror is at ${latest.tag_name} but its snapshots are stale. Refreshing those only.`);
    const digests = new Map(
      mirrored.assets.map((asset) => [asset.name, String(asset.digest ?? "").replace(/^sha256:/, "")]),
    );
    await writeSnapshots(latest, all, digests);
    console.log(`\nSnapshots refreshed for ${latest.tag_name}.`);
    return;
  }

  const missing = ASSETS.filter(
    (name) => !latest.assets.some((asset) => asset.name.toLowerCase() === name.toLowerCase()),
  );
  if (missing.length > 0) {
    throw new Error(`Release ${latest.tag_name} is missing assets: ${missing.join(", ")}`);
  }

  const workDir = await mkdtemp(join(tmpdir(), "clypdat-mirror-"));
  const digests = new Map();

  try {
    for (const name of ASSETS) {
      const asset = latest.assets.find(
        (item) => item.name.toLowerCase() === name.toLowerCase(),
      );
      const localPath = join(workDir, name);

      process.stdout.write(`  ${name}: downloading... `);
      // asset.url (the API endpoint) rather than browser_download_url: the
      // API form honours the token, so this keeps working when the repo is
      // private or flagged - which is when a mirror push matters most.
      await downloadAsset(asset.url ?? asset.browser_download_url, localPath);

      const { size } = await stat(localPath);
      const digest = await sha256File(localPath);
      digests.set(name, digest);
      process.stdout.write(`hashed (${(size / 1024 / 1024).toFixed(0)} MB), uploading... `);

      await putObject(name, createReadStream(localPath), contentTypeFor(name), size);
      console.log("done");
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  await writeSnapshots(latest, all, digests);

  console.log(`\nMirror updated to ${latest.tag_name}.`);
  for (const [name, digest] of digests) console.log(`  ${digest}  ${name}`);
}

main().catch((error) => {
  console.error(`\nMirror sync failed: ${error.message}`);
  process.exit(1);
});
