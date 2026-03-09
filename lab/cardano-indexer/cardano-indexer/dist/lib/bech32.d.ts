/**
 * Bech32 encoder — implements BIP-173/BIP-350 for Cardano addresses.
 * Zero external dependencies.
 */
export declare function bech32Encode(hrp: string, data5bit: number[], limit?: number): string;
/**
 * Convert from 8-bit byte array to 5-bit groups.
 */
export declare function toWords(data: Buffer | Uint8Array): number[];
/**
 * Encode raw address bytes to bech32 string.
 */
export declare function encodeBech32Address(prefix: string, bytes: Buffer): string;
