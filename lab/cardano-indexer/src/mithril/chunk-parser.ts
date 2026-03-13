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
 * The secondary index (.secondary) provides offsets, but we can also
 * scan through chunk files by decoding CBOR items sequentially since
 * CBOR is self-delimiting.
 *
 * Secondary index entry format (per block):
 *   - blockOffset   (Word64, 8 bytes big-endian)  — byte offset in chunk file
 *   - headerOffset  (Word16, 2 bytes big-endian)  — offset of header within block
 *   - headerSize    (Word16, 2 bytes big-endian)  — size of header
 *   - checksum      (Word32, 4 bytes big-endian)  — CRC32 of block
 *   - headerHash    (32 bytes)                     — blake2b-256 hash
 *   - blockOrEBB    (1 byte + optional 8 bytes)   — block type marker
 */

const SECONDARY_ENTRY_BASE_SIZE = 8 + 2 + 2 + 4 + 32; // 48 bytes before blockOrEBB
// SecondaryOffset = Word64 (8 bytes) as per ouroboros-consensus

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
export function parseSecondaryIndex(filePath: string): SecondaryEntry[] {
  if (!fs.existsSync(filePath)) return [];

  const data = fs.readFileSync(filePath);
  const entries: SecondaryEntry[] = [];
  let offset = 0;

  // Skip version number (2 bytes)
  if (data.length >= 2) {
    offset = 2;
  }

  while (offset + SECONDARY_ENTRY_BASE_SIZE <= data.length) {
    // Read blockOffset as Word64 (SecondaryOffset per ouroboros-consensus)
    const hi = data.readUInt32BE(offset);
    const lo = data.readUInt32BE(offset + 4);
    const blockOffset = hi * 0x100000000 + lo;
    offset += 8;

    const headerOffset = data.readUInt16BE(offset); offset += 2;
    const headerSize = data.readUInt16BE(offset); offset += 2;
    const checksum = data.readUInt32BE(offset); offset += 4;
    const headerHash = data.subarray(offset, offset + 32).toString('hex'); offset += 32;

    // blockOrEBB: 1 byte tag
    let isEBB = false;
    if (offset < data.length) {
      const tag = data[offset]; offset += 1;
      if (tag === 1) {
        // EBB — skip epoch number (8 bytes)
        isEBB = true;
        offset += 8;
      } else if (tag === 0) {
        // Regular block — skip slot (8 bytes)
        offset += 8;
      }
    }

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
      break;
    }
    if (i > 0 && entries[i].blockOffset < entries[i - 1].blockOffset) {
      valid = false;
      break;
    }
  }

  if (!valid) {
    logger.warn(`Secondary index for ${chunkPath} has invalid offsets, falling back to sequential parsing`);
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
      const decoded = decodeBlock(blockData);
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
 * Uses the CBOR library's own offset tracking (cborDecodeWithPosition)
 * rather than a separate size estimator, ensuring the consumed byte
 * count always matches what was actually decoded.
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

    logger.info(`Parsing chunk ${file}...`);
    const count = parseChunkFileWithIndex(chunkPath, secondaryPath, (block) => {
      onBlock(block);
    });

    totalBlocks += count;
    logger.info(`Chunk ${file}: ${count} blocks (total: ${totalBlocks})`);
  }

  return totalBlocks;
}
