import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [dirname(require.resolve("next/package.json"))] }));

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url));
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function pngSize(bytes) {
  assert.deepEqual(bytes.subarray(0, 8), pngSignature);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test("framed SVG and social-card PNG render the approved Silver Outline tile", async () => {
  const svg = read("public/logo.svg").toString();
  const embedded = svg.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
  assert.ok(embedded);
  const png = read("public/logo.png");
  assert.deepEqual(pngSize(Buffer.from(embedded[1], "base64")), [1254, 1254]);
  const [width, height] = pngSize(png);
  assert.deepEqual([width, height], [768, 768]);
  assert.ok(svg.includes('viewBox="0 0 512 512"'));
  assert.match(svg, /fill="#17191c" stroke="#bec2c7" stroke-width="9"/);
  const rendered = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  const pixels = await sharp(png).ensureAlpha().raw().toBuffer();
  assert.deepEqual(rendered, pixels);
});

test("header uses the updated transparent mark, not the framed brand tile", async () => {
  const header = read("app/components/Header.tsx").toString();
  const mark = read("public/logo-mark.png");
  assert.match(header, /src="\/logo-mark\.png"/);
  assert.deepEqual(pngSize(mark), [768, 450]);
  const { data, info } = await sharp(mark).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // PNG byte 24 is the bit depth, not a pixel. Check decoded alpha instead.
  for (const [x, y] of [[0, 0], [info.width - 1, info.height - 1], [192, 225], [576, 225]]) {
    assert.equal(data[(y * info.width + x) * 4 + 3], 0, "Header background and both inner holes stay transparent");
  }
});

test("favicon includes valid PNG frames for every desktop icon size", () => {
  const icon = read("app/favicon.ico");
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  assert.equal(icon.readUInt16LE(0), 0);
  assert.equal(icon.readUInt16LE(2), 1);
  assert.equal(icon.readUInt16LE(4), sizes.length);
  let expectedOffset = 6 + sizes.length * 16;
  for (let i = 0; i < sizes.length; i++) {
    const entry = 6 + i * 16;
    const length = icon.readUInt32LE(entry + 8);
    const offset = icon.readUInt32LE(entry + 12);
    assert.equal(offset, expectedOffset);
    assert.equal(icon[entry] || 256, sizes[i]);
    assert.equal(icon[entry + 1] || 256, sizes[i]);
    assert.deepEqual(pngSize(icon.subarray(offset, offset + length)), [sizes[i], sizes[i]]);
    expectedOffset += length;
  }
  assert.equal(expectedOffset, icon.length);
});

test("social preview is a square high-resolution avatar", () => {
  assert.deepEqual(pngSize(read("public/icon.png")), [512, 512]);
});

test("email logo remains a compact path-only Tiny PS SVG", () => {
  const bytes = read("public/bimi/clypdat.svg");
  const svg = bytes.toString();
  assert.ok(bytes.length < 32768);
  assert.ok(svg.includes('baseProfile="tiny-ps"'));
  assert.ok(svg.includes('viewBox="0 0 256 256"'));
  assert.match(svg, /<path\s/);
  assert.doesNotMatch(svg, /<(?:image|script|foreignObject)\b|(?:href|url)\s*[=(]/i);
});
