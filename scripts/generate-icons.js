import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

function createPNG(width, height, isMaskable = false) {
  // RGBA buffer with filter byte per scanline
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * (isMaskable ? 0.48 : 0.45);
  const rInner = width * 0.35;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Emerald green brand colors (#059669 -> #047857)
      let r = 5;
      let g = 150;
      let b = 105;
      let a = 255;

      if (isMaskable) {
        // Full bleed background
        const grad = y / height;
        r = Math.floor(5 - grad * 1);
        g = Math.floor(150 - grad * 30);
        b = Math.floor(105 - grad * 18);
      } else {
        // Rounded rectangle squircle corner check
        const cornerR = width * 0.22;
        const qx = Math.max(Math.abs(x - cx) - (width / 2 - cornerR), 0);
        const qy = Math.max(Math.abs(y - cy) - (height / 2 - cornerR), 0);
        if (Math.sqrt(qx * qx + qy * qy) > cornerR) {
          a = 0;
        } else {
          const grad = y / height;
          r = Math.floor(5 - grad * 1);
          g = Math.floor(150 - grad * 30);
          b = Math.floor(105 - grad * 18);
        }
      }

      // Draw center icon elements (Store roof + cash register white silhouette)
      if (a > 0) {
        // Roof triangle/trapezoid
        const roofTop = height * 0.26;
        const roofBottom = height * 0.42;
        const roofLeft = width * 0.24;
        const roofRight = width * 0.76;

        const isRoof = (y >= roofTop && y <= roofBottom && 
          x >= cx - (cx - roofLeft) * ((y - roofTop) / (roofBottom - roofTop) + 0.2) &&
          x <= cx + (roofRight - cx) * ((y - roofTop) / (roofBottom - roofTop) + 0.2));

        // Store body
        const bodyTop = height * 0.44;
        const bodyBottom = height * 0.74;
        const bodyLeft = width * 0.28;
        const bodyRight = width * 0.72;
        const isBody = (y >= bodyTop && y <= bodyBottom && x >= bodyLeft && x <= bodyRight);

        // Display screen cutout
        const screenTop = height * 0.48;
        const screenBottom = height * 0.58;
        const screenLeft = width * 0.35;
        const screenRight = width * 0.65;
        const isScreen = (y >= screenTop && y <= screenBottom && x >= screenLeft && x <= screenRight);

        // Keypad buttons
        const isKeypad = (y >= height * 0.62 && y <= height * 0.68 && x >= width * 0.35 && x <= width * 0.65 && (x % Math.floor(width * 0.08) < Math.floor(width * 0.05)));

        if ((isRoof || isBody) && !isScreen && !isKeypad) {
          r = 255;
          g = 255;
          b = 255;
        } else if (isScreen) {
          // Display screen (mint green)
          r = 236;
          g = 253;
          b = 245;
        } else if (isKeypad) {
          // Keypad
          r = 203;
          g = 213;
          b = 225;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: deflate
  ihdr[11] = 0; // Filter: standard
  ihdr[12] = 0; // Interlace: none

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // CRC32 implementation
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      crc = crc ^ byte;
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(32, 32, false));

console.log('PWA PNG icons generated successfully!');
