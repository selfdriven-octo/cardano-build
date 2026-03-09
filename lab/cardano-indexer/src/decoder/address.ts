import { encodeBech32Address } from '../lib/bech32';
import { toHex } from './cbor';
import { logger } from '../config/logger';

/**
 * Cardano Address Decoder
 *
 * Shelley-era addresses are binary with the first byte encoding:
 *   bits 7-4 = address type
 *   bits 3-0 = network ID
 *
 * Types:
 *   0x0 = Base address (keyhash, keyhash)
 *   0x1 = Base address (scripthash, keyhash)
 *   0x2 = Base address (keyhash, scripthash)
 *   0x3 = Base address (scripthash, scripthash)
 *   0x4 = Pointer address (keyhash)
 *   0x5 = Pointer address (scripthash)
 *   0x6 = Enterprise address (keyhash)
 *   0x7 = Enterprise address (scripthash)
 *   0xE = Reward address (keyhash)
 *   0xF = Reward address (scripthash)
 *
 * Byron addresses use a different encoding (base58).
 */

export function decodeAddress(raw: Buffer | Uint8Array): string {
  if (!raw || raw.length === 0) return 'unknown';

  const bytes = Buffer.from(raw);

  try {
    // Check if it's a Shelley-era address (starts with known type byte)
    const headerByte = bytes[0];
    const addrType = (headerByte >> 4) & 0x0f;
    const networkId = headerByte & 0x0f;

    // Shelley address types
    if (addrType <= 0x07 || addrType === 0x0e || addrType === 0x0f) {
      const prefix = networkId === 0 ? 'addr_test' : 'addr';
      const stakePrefix = networkId === 0 ? 'stake_test' : 'stake';

      // Reward/stake addresses use different prefix
      if (addrType === 0x0e || addrType === 0x0f) {
        return encodeBech32Address(stakePrefix, bytes);
      }

      return encodeBech32Address(prefix, bytes);
    }

    // Byron address — first byte is 0x82 or 0x83 (CBOR array)
    // Encode as hex with byron_ prefix for now
    if (headerByte === 0x82 || headerByte === 0x83) {
      return `byron_${toHex(bytes).substring(0, 64)}`;
    }

    // Fallback: hex representation
    return toHex(bytes);
  } catch (err: any) {
    logger.debug(`Address decode error: ${err.message}`);
    return toHex(bytes);
  }
}

export function getAddressType(raw: Buffer): string {
  if (raw.length === 0) return 'unknown';
  const addrType = (raw[0] >> 4) & 0x0f;
  switch (addrType) {
    case 0: case 1: case 2: case 3: return 'base';
    case 4: case 5: return 'pointer';
    case 6: case 7: return 'enterprise';
    case 0xe: case 0xf: return 'reward';
    default: return 'byron';
  }
}
