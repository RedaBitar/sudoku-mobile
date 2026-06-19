// Generates PWA icons with zero external dependencies.
//
// We draw a clean Sudoku-grid motif into a raw RGBA buffer and encode it as
// PNG using only Node's built-in zlib. This keeps the build hermetic (no
// network, no native image deps) while still emitting real PNG assets.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');
mkdirSync(PUBLIC, { recursive: true });

const ACCENT = [37, 99, 235]; // #2563EB
const INK = [24, 24, 27]; // #18181B
const PAPER = [255, 255, 255];
const SOFT = [219, 234, 254]; // #DBEAFE

// --- tiny RGBA canvas ---------------------------------------------------

const makeCanvas = (size) => ({
  size,
  data: new Uint8Array(size * size * 4),
});

const setPx = (cv, x, y, [r, g, b], a = 255) => {
  if (x < 0 || y < 0 || x >= cv.size || y >= cv.size) return;
  const i = (y * cv.size + x) * 4;
  cv.data[i] = r;
  cv.data[i + 1] = g;
  cv.data[i + 2] = b;
  cv.data[i + 3] = a;
};

const fillRect = (cv, x0, y0, w, h, color, a = 255) => {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) setPx(cv, x, y, color, a);
  }
};

const fillBackground = (cv, color) => fillRect(cv, 0, 0, cv.size, cv.size, color);

// Draw the Sudoku motif inside [inset, size-inset].
const drawGrid = (cv, inset, lineColor, boxColor) => {
  const s = cv.size;
  const span = s - inset * 2;
  const cell = span / 9;
  const thin = Math.max(1, Math.round(s * 0.006));
  const thick = Math.max(2, Math.round(s * 0.018));

  // A couple of softly filled cells for character.
  fillRect(cv, Math.round(inset + cell * 0), Math.round(inset + cell * 0), Math.round(cell), Math.round(cell), SOFT);
  fillRect(cv, Math.round(inset + cell * 8), Math.round(inset + cell * 8), Math.round(cell), Math.round(cell), SOFT);
  fillRect(cv, Math.round(inset + cell * 4), Math.round(inset + cell * 4), Math.round(cell), Math.round(cell), SOFT);

  for (let i = 0; i <= 9; i++) {
    const isBox = i % 3 === 0;
    const w = isBox ? thick : thin;
    const color = isBox ? boxColor : lineColor;
    const pos = Math.round(inset + cell * i - w / 2);
    // vertical
    fillRect(cv, pos, Math.round(inset - thick / 2), w, Math.round(span + thick), color);
    // horizontal
    fillRect(cv, Math.round(inset - thick / 2), pos, Math.round(span + thick), w, color);
  }
};

// --- PNG encoding -------------------------------------------------------

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
};

const encodePNG = (cv) => {
  const { size, data } = cv;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Add a filter byte (0 = none) at the start of every scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(data.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

// --- emit ---------------------------------------------------------------

const writePNG = (name, cv) => {
  writeFileSync(join(PUBLIC, name), encodePNG(cv));
  console.log('wrote', name, `${cv.size}x${cv.size}`);
};

const standardIcon = (size) => {
  const cv = makeCanvas(size);
  fillBackground(cv, PAPER);
  drawGrid(cv, Math.round(size * 0.12), [228, 228, 231], ACCENT);
  return cv;
};

const maskableIcon = (size) => {
  const cv = makeCanvas(size);
  fillBackground(cv, ACCENT);
  // Centered white panel well within the maskable safe zone (~80%).
  const pad = Math.round(size * 0.16);
  fillRect(cv, pad, pad, size - pad * 2, size - pad * 2, PAPER);
  drawGrid(cv, Math.round(size * 0.26), [203, 213, 225], INK);
  return cv;
};

writePNG('icon-192.png', standardIcon(192));
writePNG('icon-512.png', standardIcon(512));
writePNG('icon-maskable-512.png', maskableIcon(512));
writePNG('apple-touch-icon.png', standardIcon(180));

// Crisp scalable favicon.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#ffffff"/>
  <g stroke="#2563EB" stroke-width="3" stroke-linecap="round">
    <path d="M22 10V54M42 10V54M10 22H54M10 42H54"/>
  </g>
  <g stroke="#E4E4E7" stroke-width="1.5">
    <path d="M16 10V54M28 10V54M36 10V54M48 10V54M10 16H54M10 28H54M10 36H54M10 48H54"/>
  </g>
  <rect x="11" y="11" width="9" height="9" fill="#DBEAFE"/>
  <rect x="44" y="44" width="9" height="9" fill="#DBEAFE"/>
</svg>
`;
writeFileSync(join(PUBLIC, 'favicon.svg'), favicon);
console.log('wrote favicon.svg');
