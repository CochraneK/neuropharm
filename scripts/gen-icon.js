/*
 * 生成 PWA 图标（纯 Node，无第三方依赖）
 * 设计：teal 底 + 白色胶囊（左白右浅青，中缝分界）
 * 用法: node scripts/gen-icon.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'img');
const TEAL = [0x0e, 0x8c, 0x7f];   // --accent
const WHITE = [0xff, 0xff, 0xff];
const PALE = [0xbf, 0xe6, 0xdf];   // 胶囊右半

// CRC32
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      raw[p++] = rgb[i]; raw[p++] = rgb[i + 1]; raw[p++] = rgb[i + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 胶囊（圆角矩形）内部判定
function inCapsule(x, y, cx, cy, L, H) {
  const r = H / 2;
  const qx = Math.abs(x - cx) - (L / 2 - r);
  const qy = Math.abs(y - cy) - (H / 2 - r);
  const d = (qx > 0 && qy > 0) ? Math.hypot(qx, qy) : Math.max(qx, qy);
  return d <= r;
}

function render(size) {
  const rgb = Buffer.alloc(size * size * 3);
  const cx = size / 2, cy = size / 2;
  const L = size * 0.56, H = size * 0.30;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      let c = TEAL;
      if (inCapsule(x + 0.5, y + 0.5, cx, cy, L, H)) {
        // 左半白、右半浅青，分界略偏右以显立体
        c = (x + 0.5) < cx + size * 0.02 ? WHITE : PALE;
        // 中缝：细分隔线
        if (Math.abs(x + 0.5 - (cx + size * 0.02)) < Math.max(1, size * 0.008)) c = TEAL;
      }
      rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2];
    }
  }
  return png(size, size, rgb);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
[192, 512].forEach(s => {
  const p = path.join(OUT_DIR, `icon-${s}.png`);
  fs.writeFileSync(p, render(s));
  console.log(`[gen-icon] ${p} (${fs.statSync(p).size} bytes)`);
});
