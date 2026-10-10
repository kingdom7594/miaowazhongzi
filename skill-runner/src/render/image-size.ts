export interface ImageSize {
  width: number;
  height: number;
}

/** 从 PNG/JPEG/SVG 字节探测宽高；无法识别时返回 {0,0}（不 mock）。 */
export function probeImageSize(bytes: Buffer): ImageSize {
  return probePng(bytes) ?? probeJpeg(bytes) ?? probeSvg(bytes) ?? { width: 0, height: 0 };
}

function probePng(bytes: Buffer): ImageSize | null {
  // 8-byte signature + IHDR chunk: width/height are big-endian uint32 at offsets 16 and 20.
  if (bytes.length < 24) return null;
  const sig = bytes.subarray(0, 8);
  if (!sig.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function probeJpeg(bytes: Buffer): ImageSize | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1]!;
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 carry dimensions.
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      const height = bytes.readUInt16BE(offset + 5);
      const width = bytes.readUInt16BE(offset + 7);
      return { width, height };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const segmentLength = bytes.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;
    offset += 2 + segmentLength;
  }
  return null;
}

function probeSvg(bytes: Buffer): ImageSize | null {
  const head = bytes.subarray(0, 1024).toString('utf-8').trimStart();
  if (!head.startsWith('<svg') && !head.startsWith('<?xml')) return null;
  const text = bytes.subarray(0, 4096).toString('utf-8');
  const viewBox = text.match(/viewBox\s*=\s*"([^"]+)"/);
  if (viewBox) {
    const parts = viewBox[1]!.split(/[\s,]+/).map(Number);
    if (parts.length >= 4 && parts[2]! > 0 && parts[3]! > 0) {
      return { width: parts[2]!, height: parts[3]! };
    }
  }
  const width = text.match(/\bwidth\s*=\s*"(\d+(?:\.\d+)?)/);
  const height = text.match(/\bheight\s*=\s*"(\d+(?:\.\d+)?)/);
  if (width && height) {
    return { width: Number(width[1]), height: Number(height[1]) };
  }
  return null;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/** 依据 content-type/magic bytes 决定扩展名；不信任调用方给的扩展名。 */
export function detectExtension(bytes: Buffer, contentType?: string | null): string {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg';
  }
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp';
  }
  const head = bytes.subarray(0, 512).toString('utf-8').trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'svg';
  const mime = (contentType ?? '').split(';')[0]!.trim().toLowerCase();
  return EXT_BY_MIME[mime] ?? 'bin';
}
