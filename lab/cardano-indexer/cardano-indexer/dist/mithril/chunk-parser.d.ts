import { DecodedBlock } from '../decoder/block';
interface SecondaryEntry {
    blockOffset: number;
    headerOffset: number;
    headerSize: number;
    checksum: number;
    headerHash: string;
    isEBB: boolean;
}
/**
 * Parse a secondary index file to get block offsets within the chunk.
 */
export declare function parseSecondaryIndex(filePath: string): SecondaryEntry[];
/**
 * Parse blocks from a chunk file using secondary index offsets.
 */
export declare function parseChunkFileWithIndex(chunkPath: string, secondaryPath: string, onBlock: (block: DecodedBlock, index: number) => void): number;
/**
 * Parse blocks from a chunk file by sequential CBOR decoding.
 * Falls back to this when no secondary index is available.
 */
export declare function parseChunkFileSequential(chunkPath: string, onBlock: (block: DecodedBlock, index: number) => void): number;
/**
 * Scan a directory for immutable chunk files and parse them in order.
 */
export declare function parseImmutableDb(dbDir: string, onBlock: (block: DecodedBlock) => void, options?: {
    startChunk?: number;
    endChunk?: number;
}): number;
export {};
