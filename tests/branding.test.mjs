import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url));
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function pngSize(bytes) {
  assert.deepEqual(bytes.subarray(0, 8), pngSignature);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test("header SVG and social-card PNG contain the same approved mark", () => {
  const svg = read("public/logo.svg").toString();
  const embedded = svg.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
  assert.ok(embedded);
  const png = read("public/logo.png");
  assert.deepEqual(Buffer.from(embedded[1], "base64"), png);
  const [width, height] = pngSize(png);
  assert.ok(svg.includes(`viewBox="0 0 ${width} ${height}"`));
  assert.ok(width > height);
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
