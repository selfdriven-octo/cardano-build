import * as crypto from 'crypto';
import { cborDecode as _cborDecode } from '../lib/cbor';
import { logger } from '../config/logger';

/**
 * CBOR utility functions for Cardano block decoding.
 *
 * Cardano blocks use a tagged CBOR encoding. The top-level structure
 * wraps an era-specific block in a 2-element array: [eraId, blockBody].
 *
 * Era IDs:
 *   0 = Byron EBB (Epoch Boundary Block)
 *   1 = Byron regular block
 *   2 = Shelley
 *   3 = Allegra
 *   4 = Mary
 *   5 = Alonzo
 *   6 = Babbage
 *   7 = Conway
 */

export const ERA_NAMES: Record<number, string> = {
  0: 'Byron-EBB',
  1: 'Byron',
  2: 'Shelley',
  3: 'Allegra',
  4: 'Mary',
  5: 'Alonzo',
  6: 'Babbage',
  7: 'Conway',
};

export function decodeCbor(data: Buffer): any {
  try {
    return _cborDecode(data);
  } catch (err: any) {
    // Sometimes blocks are double-wrapped
    try {
      const inner = _cborDecode(data);
      if (Buffer.isBuffer(inner)) {
        return _cborDecode(inner);
      }
      return inner;
    } catch {
      throw new Error(`CBOR decode failed: ${err.message}`);
    }
  }
}

export function blake2b256(data: Buffer): Buffer {
  return crypto.createHash('blake2b512').update(data).digest().subarray(0, 32);
}

export function toHex(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString('hex');
}

export function safeNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'bigint') return Number(val);
  if (Buffer.isBuffer(val)) return val.readUIntBE(0, Math.min(val.length, 6));
  return 0;
}

export function safeBigInt(val: any): bigint {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'number') return BigInt(val);
  return 0n;
}
