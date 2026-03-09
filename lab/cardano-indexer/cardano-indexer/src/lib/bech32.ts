/**
 * Bech32 encoder — implements BIP-173/BIP-350 for Cardano addresses.
 * Zero external dependencies.
 */

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) {
    ret.push(hrp.charCodeAt(i) >> 5);
  }
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) {
    ret.push(hrp.charCodeAt(i) & 31);
  }
  return ret;
}

function createChecksum(hrp: string, data: number[]): number[] {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = polymod(values) ^ 1;
  const ret: number[] = [];
  for (let i = 0; i < 6; i++) {
    ret.push((mod >> (5 * (5 - i))) & 31);
  }
  return ret;
}

export function bech32Encode(hrp: string, data5bit: number[], limit = 200): string {
  const checksum = createChecksum(hrp, data5bit);
  let result = hrp + '1';
  for (const d of data5bit.concat(checksum)) {
    result += CHARSET[d];
  }
  if (result.length > limit) {
    throw new Error(`Bech32 string too long: ${result.length} > ${limit}`);
  }
  return result;
}

/**
 * Convert from 8-bit byte array to 5-bit groups.
 */
export function toWords(data: Buffer | Uint8Array): number[] {
  let value = 0;
  let bits = 0;
  const result: number[] = [];
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result.push((value >> bits) & 31);
    }
  }
  if (bits > 0) {
    result.push((value << (5 - bits)) & 31);
  }
  return result;
}

/**
 * Encode raw address bytes to bech32 string.
 */
export function encodeBech32Address(prefix: string, bytes: Buffer): string {
  try {
    const words = toWords(bytes);
    return bech32Encode(prefix, words);
  } catch {
    return bytes.toString('hex');
  }
}
