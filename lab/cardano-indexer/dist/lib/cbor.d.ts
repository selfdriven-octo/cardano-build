/**
 * Minimal CBOR encoder/decoder for Cardano protocol messages.
 * Zero external dependencies — implements RFC 8949 subset needed for Ouroboros.
 *
 * Supports: unsigned/negative integers, byte strings, text strings,
 *           arrays, maps, booleans, null, tagged values, floats.
 */
export interface DecodeResult {
    value: any;
    offset: number;
}
export declare function cborDecode(data: Buffer, offset?: number): any;
export declare function cborEncode(value: any): Buffer;
