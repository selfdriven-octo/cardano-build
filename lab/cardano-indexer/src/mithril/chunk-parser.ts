import * as fs from 'fs';
import { cborDecode, cborDecodeWithPosition } from '../lib/cbor';
import { decodeBlock, DecodedBlock } from '../decoder/block';
import { logger } from '../config/logger';

/**
 * Cardano Immutable DB Chunk File Parser
 *
 * Chunk files (.chunk) contain CBOR-encoded blocks laid out sequentially.
 * Each block is a self-delimiting CBOR item: [eraId, blockData].
 *
 * The secondary index (.secondary) provides offsets into chunk files.
 * Format matches ouroboros-consensus SecondaryIndex (no file header):
 *
 * Each entry is exactly 56 bytes:
 *   - blockOffset   (Word64, 8 bytes big-endian)  — byte offset in chunk file
 *   - headerOffset  (Word16, 2 bytes big-endian)  — offset of header within block CBOR
 *   - headerSize    (Word16, 2 bytes big-endian)  — size of header CBOR
 *   - checksum      (Word32, 4 bytes big-endian)  — CRC32 of block
 *   - headerHash    (32 bytes)                     — blake2b-256 of header CBOR
 *   - blockOrEBB    (Word64, 8 bytes big-endian)  — SlotNo or EpochNo (no tag byte)
 *
 * There is NO version header and NO tag byte for blockOrEBB.
 * Whether the value is a SlotNo (regular block) or EpochNo (EBB) is
 * determined by position: at most the first entry can be an EBB.
 */

const SECONDARY_ENTRY_SIZE = 8 + 2 + 2 + 4 + 32 + 8; // 56 bytes

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
 *
 * ouroboros-consensus writes entries directly with no file header.
 * Each entry is a fixed 56 bytes.
 */
export function parseSecondaryIndex(filePath: string): SecondaryEntry[] {
  if (!fs.existsSync(filePath)) return [];

  const data = fs.readFileSync(filePath);
  const entries: SecondaryEntry[] = [];
  let offset = 0;

  // No version header — entries start at byte 0
  while (offset + SECONDARY_ENTRY_SIZE <= data.length) {
    // blockOffset: Word64 BE
    const hi = data.readUInt32BE(offset);
    const lo = data.readUInt32BE(offset + 4);
    const blockOffset = hi * 0x100000000 + lo;
    offset += 8;

    const headerOffset = data.readUInt16BE(offset); offset += 2;
    const headerSize = data.readUInt16BE(offset); offset += 2;
    const checksum = data.readUInt32BE(offset); offset += 4;
    const headerHash = data.subarray(offset, offset + 32).toString('hex'); offset += 32;

    // blockOrEBB: Word64 BE — no tag byte
    // It's either a SlotNo (regular block) or EpochNo (EBB).
    // At most the first entry in a chunk can be an EBB (blockOffset 0).
    const blockOrEbbHi = data.readUInt32BE(offset);
    const blockOrEbbLo = data.readUInt32BE(offset + 4);
    offset += 8;

    // Heuristic for EBB: first entry with blockOffset 0
    // (EBBs always start at offset 0 in the chunk, and regular blocks
    // never have blockOffset 0 unless there's only one block)
    const isEBB = entries.length === 0 && blockOffset === 0
      && blockOrEbbHi === 0 && blockOrEbbLo < 500;

    entries.push({ blockOffset, headerOffset, headerSize, checksum, headerHash, isEBB });
  }

  return entries;
}

/**
 * Parse blocks from a chunk file using secondary index offsets.
 */
export function parseChunkFileWithIndex(
  chunkPath: string,
  secondaryPath: string,
  onBlock: (block: DecodedBlock, index: number) => void
): number {
  const entries = parseSecondaryIndex(secondaryPath);
  if (entries.length === 0) {
    return parseChunkFileSequential(chunkPath, onBlock);
  }

  const chunkData = fs.readFileSync(chunkPath);

  // Validate index entries: offsets must be within file bounds and non-decreasing
  let valid = true;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].blockOffset >= chunkData.length) {
      valid = false;
      logger.debug(`Secondary index entry ${i}: blockOffset ${entries[i].blockOffset} >= file size ${chunkData.length}`);
      break;
    }
    if (i > 0 && entries[i].blockOffset <= entries[i - 1].blockOffset) {
      valid = false;
      logger.debug(`Secondary index entry ${i}: blockOffset ${entries[i].blockOffset} <= prev ${entries[i - 1].blockOffset}`);
      break;
    }
  }

  if (!valid) {
    logger.warn(`Secondary index for ${chunkPath} has invalid offsets (${entries.length} entries), falling back to sequential parsing`);
    return parseChunkFileSequential(chunkPath, onBlock);
  }

  let count = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const nextOffset = i + 1 < entries.length ? entries[i + 1].blockOffset : chunkData.length;
    const blockSize = nextOffset - entry.blockOffset;

    if (entry.blockOffset + blockSize > chunkData.length) {
      logger.debug(`Block at offset ${entry.blockOffset} exceeds chunk file size, skipping`);
      continue;
    }

    try {
      const blockData = chunkData.subarray(entry.blockOffset, entry.blockOffset + blockSize);
      const decoded = decodeBlock(blockData, entry.headerHash);
      onBlock(decoded, count);
      count++;
    } catch (err: any) {
      logger.debug(`Failed to decode block at offset ${entry.blockOffset}: ${err.message}`);
    }
  }

  return count;
}

/**
 * Parse blocks from a chunk file by sequential CBOR decoding.
 * Falls back to this when no secondary index is available.
 *
 * Uses cborDecodeWithPosition to get the offset of the next item
 * without creating a separate copy of the raw bytes — the already-
 * decoded value from cborDecodeWithPosition is reused by extracting
 * just the raw subarray and passing it to decodeBlock.
 */
export function parseChunkFileSequential(
  chunkPath: string,
  onBlock: (block: DecodedBlock, index: number) => void
): number {
  const data = fs.readFileSync(chunkPath);
  let offset = 0;
  let count = 0;

  while (offset < data.length) {
    // Skip any zero-padding between blocks
    if (data[offset] === 0) {
      offset++;
      continue;
    }

    try {
      // Decode the next CBOR item and get the exact end offset
      const result = cborDecodeWithPosition(data, offset);
      const nextOffset = result.offset;

      if (nextOffset <= offset) {
        // Safety: avoid infinite loops if decode returns same offset
        offset++;
        continue;
      }

      // Extract the raw bytes for this CBOR item and try to decode as a block
      const blockBuf = data.subarray(offset, nextOffset);
      try {
        const decoded = decodeBlock(blockBuf);
        onBlock(decoded, count);
        count++;
      } catch {
        // Valid CBOR but not a decodable Cardano block — skip it
      }

      offset = nextOffset;
    } catch {
      // CBOR decode failed at this position — advance one byte and retry
      offset++;
    }
  }

  return count;
}

/**
 * Scan a directory for immutable chunk files and parse them in order.
 */
export function parseImmutableDb(
  dbDir: string,
  onBlock: (block: DecodedBlock) => void,
  options: { startChunk?: number; endChunk?: number } = {}
): number {
  const files = fs.readdirSync(dbDir)
    .filter(f => f.endsWith('.chunk'))
    .sort();

  logger.info(`Found ${files.length} chunk files in ${dbDir}`);
  let totalBlocks = 0;

  for (const file of files) {
    const chunkNum = parseInt(file.replace('.chunk', ''), 10);
    if (options.startChunk !== undefined && chunkNum < options.startChunk) continue;
    if (options.endChunk !== undefined && chunkNum > options.endChunk) continue;

    const chunkPath = `${dbDir}/${file}`;
    const secondaryPath = `${dbDir}/${file.replace('.chunk', '.secondary')}`;

    const count = parseChunkFileWithIndex(chunkPath, secondaryPath, (block) => {
      onBlock(block);
    });

    totalBlocks += count;

    if (totalBlocks % 100000 < count) {
      logger.info(`Progress: ${totalBlocks} blocks indexed (chunk ${file})`);
    }
  }

  return totalBlocks;
}
