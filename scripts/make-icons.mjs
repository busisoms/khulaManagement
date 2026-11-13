// Draws the app icon as PNG (192 and 512) with plain Node — no image libraries.
// Usage: node scripts/make-icons.mjs
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BG = hex("#1e5b3e"), TRUNK = hex("#f3e3c3"), LIGHT = hex("#7fbf95"), MID = hex("#5a9e74");

function pixel(x, y) {
  // Shapes in the 64x64 design space of icon.svg (full-bleed background so it works as maskable).
  const inCircle = (cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  if (inCircle(32, 24, 12)) return LIGHT;
  if (inCircle(23, 30, 8) || inCircle(41, 30, 8)) return MID;
  if (x >= 30 && x <= 34 && y >= 30 && y <= 52) return TRUNK;
  if (x >= 18 && x <= 46 && y >= 50 && y <= 54) return TRUNK;
  return BG;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const SS = 3; // supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const p = pixel(((x + (sx + 0.5) / SS) / size) * 64, ((y + (sy + 0.5) / SS) / size) * 64);
        acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2];
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(acc[i] / (SS * SS));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
for (const s of [192, 512]) writeFileSync(`public/icons/icon-${s}.png`, png(s));
console.log("Icons written.");
