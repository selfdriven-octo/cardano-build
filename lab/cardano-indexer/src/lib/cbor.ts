/**
 * Minimal CBOR encoder/decoder for Cardano protocol messages.
 * Zero external dependencies — implements RFC 8949 subset needed for Ouroboros.
 *
 * Supports: unsigned/negative integers, byte strings, text strings,
 *           arrays, maps, booleans, null, tagged values, floats.
 */

// ---- Major types ----
const MT_UINT = 0;
const MT_NEGINT = 1;
const MT_BYTES = 2;
const MT_TEXT = 3;
const MT_ARRAY = 4;
const MT_MAP = 5;
const MT_TAG = 6;
const MT_SIMPLE = 7;

// ---- Decode ----

export interface DecodeResult {
  value: any;
  offset: number;
}

export function cborDecode(data: Buffer, offset = 0): any {
  const result = cborDecodeItem(data, offset);
  return result.value;
}

function cborDecodeItem(data: Buffer, offset: number): DecodeResult {
  if (offset >= data.length) throw new Error('CBOR: unexpected end of data');

  const initial = data[offset];
  const majorType = initial >> 5;
  const additionalInfo = initial & 0x1f;

  switch (majorType) {
    case MT_UINT:
      return decodeUint(data, offset);
    case MT_NEGINT: {
      const r = decodeUint(data, offset);
      r.value = -1 - r.value;
      return r;
    }
    case MT_BYTES:
      return decodeBytes(data, offset);
    case MT_TEXT:
      return decodeText(data, offset);
    case MT_ARRAY:
      return decodeArray(data, offset);
    case MT_MAP:
      return decodeMap(data, offset);
    case MT_TAG:
      return decodeTag(data, offset);
    case MT_SIMPLE:
      return decodeSimple(data, offset);
    default:
      throw new Error(`CBOR: unknown major type ${majorType} at offset ${offset}`);
  }
}

function readArgument(data: Buffer, offset: number): { value: number; newOffset: number } {
  const additionalInfo = data[offset] & 0x1f;
  offset++;

  if (additionalInfo < 24) {
    return { value: additionalInfo, newOffset: offset };
  } else if (additionalInfo === 24) {
    return { value: data[offset], newOffset: offset + 1 };
  } else if (additionalInfo === 25) {
    return { value: data.readUInt16BE(offset), newOffset: offset + 2 };
  } else if (additionalInfo === 26) {
    return { value: data.readUInt32BE(offset), newOffset: offset + 4 };
  } else if (additionalInfo === 27) {
    // 64-bit — read as two 32-bit
    const hi = data.readUInt32BE(offset);
    const lo = data.readUInt32BE(offset + 4);
    const val = hi * 0x100000000 + lo;
    return { value: val, newOffset: offset + 8 };
  } else if (additionalInfo === 31) {
    // Indefinite length
    return { value: -1, newOffset: offset };
  }
  throw new Error(`CBOR: invalid additional info ${additionalInfo}`);
}

function decodeUint(data: Buffer, offset: number): DecodeResult {
  const { value, newOffset } = readArgument(data, offset);
  return { value, offset: newOffset };
}

function decodeBytes(data: Buffer, offset: number): DecodeResult {
  const { value: len, newOffset } = readArgument(data, offset);

  if (len === -1) {
    // Indefinite length byte string
    let result = Buffer.alloc(0);
    let off = newOffset;
    while (data[off] !== 0xff) {
      const chunk = cborDecodeItem(data, off);
      result = Buffer.concat([result, chunk.value]);
      off = chunk.offset;
    }
    return { value: result, offset: off + 1 };
  }

  const bytes = data.subarray(newOffset, newOffset + len);
  return { value: Buffer.from(bytes), offset: newOffset + len };
}

function decodeText(data: Buffer, offset: number): DecodeResult {
  const { value: len, newOffset } = readArgument(data, offset);

  if (len === -1) {
    // Indefinite length text
    let result = '';
    let off = newOffset;
    while (data[off] !== 0xff) {
      const chunk = cborDecodeItem(data, off);
      result += chunk.value;
      off = chunk.offset;
    }
    return { value: result, offset: off + 1 };
  }

  const text = data.subarray(newOffset, newOffset + len).toString('utf-8');
  return { value: text, offset: newOffset + len };
}

function decodeArray(data: Buffer, offset: number): DecodeResult {
  const { value: len, newOffset } = readArgument(data, offset);
  const items: any[] = [];
  let off = newOffset;

  if (len === -1) {
    // Indefinite length array
    while (data[off] !== 0xff) {
      const item = cborDecodeItem(data, off);
      items.push(item.value);
      off = item.offset;
    }
    return { value: items, offset: off + 1 };
  }

  for (let i = 0; i < len; i++) {
    const item = cborDecodeItem(data, off);
    items.push(item.value);
    off = item.offset;
  }
  return { value: items, offset: off };
}

function decodeMap(data: Buffer, offset: number): DecodeResult {
  const { value: len, newOffset } = readArgument(data, offset);
  const map = new Map<any, any>();
  let off = newOffset;

  if (len === -1) {
    while (data[off] !== 0xff) {
      const key = cborDecodeItem(data, off);
      const val = cborDecodeItem(data, key.offset);
      map.set(key.value, val.value);
      off = val.offset;
    }
    return { value: map, offset: off + 1 };
  }

  for (let i = 0; i < len; i++) {
    const key = cborDecodeItem(data, off);
    const val = cborDecodeItem(data, key.offset);
    map.set(key.value, val.value);
    off = val.offset;
  }
  return { value: map, offset: off };
}

function decodeTag(data: Buffer, offset: number): DecodeResult {
  const { value: tag, newOffset } = readArgument(data, offset);
  const content = cborDecodeItem(data, newOffset);
  // For Cardano, we usually just want the content, not the tag wrapper
  // But preserve tag 258 (set) as an array
  return content;
}

function decodeSimple(data: Buffer, offset: number): DecodeResult {
  const additionalInfo = data[offset] & 0x1f;

  if (additionalInfo === 20) return { value: false, offset: offset + 1 };
  if (additionalInfo === 21) return { value: true, offset: offset + 1 };
  if (additionalInfo === 22) return { value: null, offset: offset + 1 };
  if (additionalInfo === 23) return { value: undefined, offset: offset + 1 };

  if (additionalInfo === 25) {
    // float16
    const half = data.readUInt16BE(offset + 1);
    return { value: decodeFloat16(half), offset: offset + 3 };
  }
  if (additionalInfo === 26) {
    // float32
    return { value: data.readFloatBE(offset + 1), offset: offset + 5 };
  }
  if (additionalInfo === 27) {
    // float64
    return { value: data.readDoubleBE(offset + 1), offset: offset + 9 };
  }

  if (additionalInfo === 24) {
    return { value: data[offset + 1], offset: offset + 2 };
  }

  // Simple value
  return { value: additionalInfo, offset: offset + 1 };
}

function decodeFloat16(half: number): number {
  const exp = (half >> 10) & 0x1f;
  const mant = half & 0x3ff;
  const sign = half & 0x8000 ? -1 : 1;
  if (exp === 0) return sign * 5.960464477539063e-8 * mant;
  if (exp === 31) return mant ? NaN : sign * Infinity;
  return sign * Math.pow(2, exp - 15) * (1 + mant / 1024);
}

// ---- Encode ----

export function cborEncode(value: any): Buffer {
  const chunks: Buffer[] = [];
  encodeValue(value, chunks);
  return Buffer.concat(chunks);
}

function encodeValue(value: any, chunks: Buffer[]): void {
  if (value === null || value === undefined) {
    chunks.push(Buffer.from([0xf6])); // null
    return;
  }

  if (typeof value === 'boolean') {
    chunks.push(Buffer.from([value ? 0xf5 : 0xf4]));
    return;
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      if (value >= 0) {
        encodeUint(MT_UINT, value, chunks);
      } else {
        encodeUint(MT_NEGINT, -1 - value, chunks);
      }
    } else {
      // Float64
      const buf = Buffer.alloc(9);
      buf[0] = 0xfb; // MT_SIMPLE | 27
      buf.writeDoubleBE(value, 1);
      chunks.push(buf);
    }
    return;
  }

  if (typeof value === 'string') {
    const strBuf = Buffer.from(value, 'utf-8');
    encodeUint(MT_TEXT, strBuf.length, chunks);
    chunks.push(strBuf);
    return;
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const buf = Buffer.from(value);
    encodeUint(MT_BYTES, buf.length, chunks);
    chunks.push(buf);
    return;
  }

  if (Array.isArray(value)) {
    encodeUint(MT_ARRAY, value.length, chunks);
    for (const item of value) {
      encodeValue(item, chunks);
    }
    return;
  }

  if (value instanceof Map) {
    encodeUint(MT_MAP, value.size, chunks);
    for (const [k, v] of value) {
      encodeValue(k, chunks);
      encodeValue(v, chunks);
    }
    return;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    encodeUint(MT_MAP, keys.length, chunks);
    for (const k of keys) {
      encodeValue(k, chunks);
      encodeValue(value[k], chunks);
    }
    return;
  }

  throw new Error(`CBOR: cannot encode ${typeof value}`);
}

function encodeUint(majorType: number, value: number, chunks: Buffer[]): void {
  const mt = majorType << 5;

  if (value < 24) {
    chunks.push(Buffer.from([mt | value]));
  } else if (value < 256) {
    chunks.push(Buffer.from([mt | 24, value]));
  } else if (value < 65536) {
    const buf = Buffer.alloc(3);
    buf[0] = mt | 25;
    buf.writeUInt16BE(value, 1);
    chunks.push(buf);
  } else if (value < 0x100000000) {
    const buf = Buffer.alloc(5);
    buf[0] = mt | 26;
    buf.writeUInt32BE(value, 1);
    chunks.push(buf);
  } else {
    const buf = Buffer.alloc(9);
    buf[0] = mt | 27;
    const hi = Math.floor(value / 0x100000000);
    const lo = value % 0x100000000;
    buf.writeUInt32BE(hi, 1);
    buf.writeUInt32BE(lo, 5);
    chunks.push(buf);
  }
}
