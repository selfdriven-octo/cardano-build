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
export declare function decodeAddress(raw: Buffer | Uint8Array): string;
export declare function getAddressType(raw: Buffer): string;
