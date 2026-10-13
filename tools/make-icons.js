// PWA用アイコン(192/512px PNG)を外部ライブラリなしで描く。紺地に旗竿と、なびく旗(青・白・黄の3本)。
// 実在の国旗に見えない配色にしてある。出力: app/icons/icon-192.png, icon-512.png, maskable-512.png
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
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
function png(w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const NAVY = hex('#15203a'), POLE = hex('#e7ecf5'), BLUE = hex('#6f9bff'), WHITE = hex('#ffffff'), YEL = hex('#f2b705');

function draw(size, pad) {
  const S = 4; // 4×4のスーパーサンプリングで輪郭をなめらかにする
  const px = Buffer.alloc(size * size * 4);
  const u = v => v * (1 - 2 * pad) + pad; // 0..1 の設計座標を余白込みに変換
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let acc = [0, 0, 0];
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const fx = (x + (sx + 0.5) / S) / size, fy = (y + (sy + 0.5) / S) / size;
      let col = NAVY;
      // 旗竿
      if (fx > u(0.22) && fx < u(0.27) && fy > u(0.14) && fy < u(0.88)) col = POLE;
      // 旗(なびく形): 横方向の位置に応じて上下に波打たせる
      const t = (fx - u(0.27)) / (u(0.80) - u(0.27));
      if (t >= 0 && t <= 1) {
        const wave = Math.sin(t * Math.PI * 1.6) * 0.035 * t;
        const top = u(0.18) + wave, bot = u(0.56) + wave;
        if (fy > top && fy < bot) {
          const r = (fy - top) / (bot - top);
          col = r < 1 / 3 ? BLUE : r < 2 / 3 ? WHITE : YEL;
        }
      }
      // 竿の先の玉
      const dx = fx - u(0.245), dy = fy - u(0.12);
      if (dx * dx + dy * dy < Math.pow(0.035 * (1 - 2 * pad), 2)) col = YEL;
      acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2];
    }
    const i = (y * size + x) * 4;
    px[i] = acc[0] / (S * S); px[i + 1] = acc[1] / (S * S); px[i + 2] = acc[2] / (S * S); px[i + 3] = 255;
  }
  return png(size, size, px);
}
const out = path.join(__dirname, '../app/icons');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon-192.png'), draw(192, 0.04));
fs.writeFileSync(path.join(out, 'icon-512.png'), draw(512, 0.04));
fs.writeFileSync(path.join(out, 'maskable-512.png'), draw(512, 0.14)); // 丸く切り抜かれても旗が欠けない余白
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), draw(180, 0.06));
console.log('icons written');
