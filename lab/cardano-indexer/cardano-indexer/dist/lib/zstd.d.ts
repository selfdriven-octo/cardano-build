/**
 * Pure TypeScript Zstandard (zstd) Decompressor
 *
 * Implements RFC 8878 - Zstandard Compression Data Format.
 * Zero external dependencies. Designed for streaming decompression
 * of Mithril blockchain snapshots (.tar.zst).
 *
 * Supports:
 *   - Standard zstd frames (magic 0xFD2FB528)
 *   - Skippable frames
 *   - All block types: Raw, RLE, Compressed
 *   - FSE (Finite State Entropy) table decoding
 *   - Huffman literal decoding (1-stream and 4-stream)
 *   - Repeat offset handling
 *   - Window sizes up to 128 MB
 */
import { Transform, TransformCallback } from 'stream';
export declare class ZstdDecompressStream extends Transform {
    private inputBuf;
    private window;
    private windowSize;
    private maxWindowSize;
    private blockState;
    private inFrame;
    private frameHeader;
    private frameFinished;
    private totalOutput;
    constructor();
    _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void;
    _flush(callback: TransformCallback): void;
    private processInput;
    private decompressBlock;
}
/**
 * Decompress a complete zstd-compressed Buffer.
 * For small inputs or testing. For large files, use ZstdDecompressStream.
 */
export declare function decompressZstd(input: Buffer): Buffer;
