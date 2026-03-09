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
export declare const ERA_NAMES: Record<number, string>;
export declare function decodeCbor(data: Buffer): any;
export declare function blake2b256(data: Buffer): Buffer;
export declare function toHex(buf: Buffer | Uint8Array): string;
export declare function safeNumber(val: any): number;
export declare function safeBigInt(val: any): bigint;
