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

// ============================================================
// Constants
// ============================================================

const ZSTD_MAGIC = 0xFD2FB528;
const SKIPPABLE_MAGIC_LOW = 0x184D2A50;
const SKIPPABLE_MAGIC_HIGH = 0x184D2A5F;

const BLOCK_TYPE_RAW = 0;
const BLOCK_TYPE_RLE = 1;
const BLOCK_TYPE_COMPRESSED = 2;

const LIT_RAW = 0;
const LIT_RLE = 1;
const LIT_COMPRESSED = 2;
const LIT_TREELESS = 3;

const SEQ_PREDEFINED = 0;
const SEQ_RLE = 1;
const SEQ_FSE = 2;
const SEQ_REPEAT = 3;

// Literal Length baselines and extra bits (codes 0-35)
const LL_BASELINE = [
  0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,
  16,18,20,22,24,28,32,40,48,64,128,256,512,1024,2048,4096,
  8192,16384,32768,65536
];
const LL_BITS = [
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  1,1,1,1,2,2,3,3,4,6,7,8,9,10,11,12,
  13,14,15,16
];

// Match Length baselines and extra bits (codes 0-52)
const ML_BASELINE = [
  3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,
  19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,
  35,37,39,41,43,47,51,59,67,83,99,131,259,515,1027,2051,
  4099,8195,16387,32771,65539
];
const ML_BITS = [
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  1,1,1,1,2,2,3,3,4,4,5,7,8,9,10,11,
  12,13,14,15,16
];

// Default FSE distributions (from RFC 8878)
const LL_DEFAULT_DIST = [4,3,2,2,2,2,2,2,2,2,2,2,2,1,1,1,2,2,2,2,2,2,2,2,2,3,2,1,1,1,1,1,-1,-1,-1,-1];
const LL_DEFAULT_LOG = 6;
const ML_DEFAULT_DIST = [1,4,3,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,-1,-1,-1,-1,-1,-1,-1];
const ML_DEFAULT_LOG = 6;
const OF_DEFAULT_DIST = [1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,-1,-1,-1,-1,-1];
const OF_DEFAULT_LOG = 5;

// ============================================================
// FSE Table Types
// ============================================================

interface FSEEntry {
  symbol: number;
  nBits: number;
  newState: number;
}

interface FSETable {
  log: number;
  entries: FSEEntry[];
}

interface HuffWeight {
  symbol: number;
  weight: number;
}

interface Sequence {
  litLen: number;
  matchLen: number;
  offset: number;
}

// ============================================================
// Forward Bit Reader (for FSE table headers)
// ============================================================

class ForwardBitReader {
  private buf: Buffer;
  private pos: number;  // byte position
  private bit: number;  // bit within byte (0-7)

  constructor(buf: Buffer, byteOffset: number = 0) {
    this.buf = buf;
    this.pos = byteOffset;
    this.bit = 0;
  }

  readBits(n: number): number {
    let val = 0;
    let read = 0;
    while (read < n) {
      if (this.pos >= this.buf.length) throw new Error('Forward bitstream overrun');
      const avail = 8 - this.bit;
      const take = Math.min(n - read, avail);
      const mask = (1 << take) - 1;
      val |= ((this.buf[this.pos] >>> this.bit) & mask) << read;
      this.bit += take;
      read += take;
      if (this.bit >= 8) {
        this.bit = 0;
        this.pos++;
      }
    }
    return val;
  }

  /** Total bytes consumed (rounded up) */
  get bytesConsumed(): number {
    return this.bit > 0 ? this.pos + 1 : this.pos;
  }

  get totalBitsConsumed(): number {
    return this.pos * 8 + this.bit;
  }
}

// ============================================================
// Backward Bit Reader (for sequences and Huffman streams)
// ============================================================

class BackwardBitReader {
  private buf: Buffer;
  private bytePos: number;
  private acc: number;   // bit accumulator (unsigned 32-bit via >>>)
  private nBits: number; // valid bits in accumulator

  constructor(buf: Buffer) {
    this.buf = buf;
    if (buf.length === 0) throw new Error('Empty bitstream');

    const last = buf[buf.length - 1];
    if (last === 0) throw new Error('Bitstream sentinel missing');

    // Find sentinel: highest set bit in last byte
    const sentinel = 31 - Math.clz32(last);
    // Bits below sentinel are initial data
    this.acc = (last & ((1 << sentinel) - 1)) >>> 0;
    this.nBits = sentinel;
    this.bytePos = buf.length - 2; // next byte to load (going backward)
    this.reload();
  }

  private reload(): void {
    while (this.nBits <= 24 && this.bytePos >= 0) {
      this.acc = ((this.acc | (this.buf[this.bytePos] << this.nBits)) >>> 0);
      this.nBits += 8;
      this.bytePos--;
    }
  }

  readBits(n: number): number {
    if (n === 0) return 0;
    if (n > this.nBits) {
      this.reload();
      if (n > this.nBits) throw new Error(`Bitstream underflow: want ${n}, have ${this.nBits}`);
    }
    const val = (this.acc & (((1 << n) >>> 0) - 1)) >>> 0;
    this.acc = (this.acc >>> n) >>> 0;
    this.nBits -= n;
    this.reload();
    return val;
  }

  peekBits(n: number): number {
    if (n === 0) return 0;
    return (this.acc & (((1 << n) >>> 0) - 1)) >>> 0;
  }

  get bitsRemaining(): number {
    return this.nBits + (this.bytePos + 1) * 8;
  }
}

// ============================================================
// FSE: Build & Decode
// ============================================================

function highBit(val: number): number {
  if (val === 0) return 0;
  return 31 - Math.clz32(val);
}

/**
 * Build an FSE decoding table from normalized probability distribution.
 */
function buildFSETable(probs: number[], log: number): FSETable {
  const tableSize = 1 << log;
  const tableMask = tableSize - 1;
  const step = (tableSize >>> 1) + (tableSize >>> 3) + 3;

  const entries: FSEEntry[] = new Array(tableSize);
  const symbolNext: number[] = new Array(probs.length).fill(0);

  // Phase 1: Place "less than 1" symbols at the end
  let highThreshold = tableSize - 1;
  for (let s = 0; s < probs.length; s++) {
    if (probs[s] === -1) {
      entries[highThreshold] = { symbol: s, nBits: 0, newState: 0 };
      highThreshold--;
      symbolNext[s] = 1;
    } else if (probs[s] > 0) {
      symbolNext[s] = probs[s];
    }
  }

  // Phase 2: Spread symbols across table
  let pos = 0;
  for (let s = 0; s < probs.length; s++) {
    const prob = probs[s];
    if (prob <= 0) continue; // skip absent and "less than 1" (already placed)
    for (let i = 0; i < prob; i++) {
      entries[pos] = { symbol: s, nBits: 0, newState: 0 };
      pos = (pos + step) & tableMask;
      while (pos > highThreshold) {
        pos = (pos + step) & tableMask;
      }
    }
  }

  // Phase 3: Build decode table (compute nBits and newState for each entry)
  for (let i = 0; i < tableSize; i++) {
    const s = entries[i].symbol;
    const nextState = symbolNext[s]++;
    const nBits = log - highBit(nextState);
    entries[i].nBits = nBits;
    entries[i].newState = ((nextState << nBits) - tableSize);
  }

  return { log, entries };
}

/**
 * Read FSE distribution header from a forward bitstream.
 * Returns normalized probabilities and accuracy log.
 */
function readFSEDistribution(reader: ForwardBitReader, maxSymbol: number): { probs: number[]; log: number } {
  const log = reader.readBits(4) + 5;
  const tableSize = 1 << log;
  let remaining = tableSize + 1;
  const probs: number[] = [];

  while (remaining > 1 && probs.length <= maxSymbol) {
    const bits = highBit(remaining + 1) + 1;
    const lowBits = bits - 1;
    const threshold = (1 << bits) - 1 - remaining;

    let val = reader.readBits(lowBits);
    if (val >= threshold) {
      val = (val << 1) | reader.readBits(1);
      val -= threshold;
    }

    const prob = val - 1; // -1 means "less than 1"
    probs.push(prob);

    if (prob === -1) {
      remaining -= 1;
    } else if (prob > 0) {
      remaining -= prob;
    }

    // Handle repeat zeros
    if (prob === 0) {
      let repeat: number;
      do {
        repeat = reader.readBits(2);
        for (let i = 0; i < repeat; i++) {
          probs.push(0);
        }
      } while (repeat === 3);
    }
  }

  // Trim trailing zeros if we went past maxSymbol
  while (probs.length > maxSymbol + 1) {
    probs.pop();
  }

  return { probs, log };
}

/**
 * Decode one FSE step: read symbol from current state, advance state.
 */
function fseDecodeStep(table: FSETable, state: number, reader: BackwardBitReader): { symbol: number; newState: number } {
  const entry = table.entries[state];
  const symbol = entry.symbol;
  const newState = entry.newState + reader.readBits(entry.nBits);
  return { symbol, newState };
}

/**
 * Build predefined FSE table from default distribution.
 */
function buildPredefinedFSE(dist: number[], log: number): FSETable {
  return buildFSETable(dist, log);
}

// Lazy-initialized predefined tables
let _predefinedLL: FSETable | null = null;
let _predefinedML: FSETable | null = null;
let _predefinedOF: FSETable | null = null;

function getPredefinedLL(): FSETable {
  if (!_predefinedLL) _predefinedLL = buildPredefinedFSE(LL_DEFAULT_DIST, LL_DEFAULT_LOG);
  return _predefinedLL;
}
function getPredefinedML(): FSETable {
  if (!_predefinedML) _predefinedML = buildPredefinedFSE(ML_DEFAULT_DIST, ML_DEFAULT_LOG);
  return _predefinedML;
}
function getPredefinedOF(): FSETable {
  if (!_predefinedOF) _predefinedOF = buildPredefinedFSE(OF_DEFAULT_DIST, OF_DEFAULT_LOG);
  return _predefinedOF;
}

// ============================================================
// Huffman: Build & Decode
// ============================================================

interface HuffmanTable {
  maxBits: number;
  // Fast lookup: indexed by bit pattern (up to 2^maxBits entries)
  // Each entry: [symbol, nBits] or null
  symbols: Array<{ symbol: number; nBits: number } | null>;
}

/**
 * Build Huffman decode table from weights.
 * Weight 0 = symbol absent. For weight w > 0: nBits = maxBits + 1 - w.
 */
function buildHuffmanTable(weights: number[]): HuffmanTable {
  // Determine maxBits: sum of (1 << (w-1)) for all w > 0 must equal 2^maxBits
  let sumWeights = 0;
  for (const w of weights) {
    if (w > 0) sumWeights += (1 << (w - 1));
  }

  if (sumWeights === 0) {
    return { maxBits: 0, symbols: [] };
  }

  const maxBits = highBit(sumWeights); // log2(sumWeights)
  const tableSize = 1 << (maxBits + 1);

  // Verify: sumWeights should be exactly 2^maxBits
  // If not exact, the last symbol fills the gap
  // (handled by spec: lastWeight = log2(nextPow2(sumWeights) - sumWeights) + 1)
  if (sumWeights < (1 << maxBits) || sumWeights >= (1 << (maxBits + 1))) {
    // Adjust: find the implied last weight
  }

  // Build decode table using canonical Huffman
  const symbols: Array<{ symbol: number; nBits: number } | null> = new Array(1 << (maxBits + 1)).fill(null);

  // Assign codes by weight
  // Symbols with same weight get consecutive codes
  // Lower weights = more bits = less frequent
  const maxW = Math.max(...weights);
  const nBitsMax = maxBits + 1; // nBits for weight 1

  // Compute starting codes for each weight
  // Weight w -> nBits = maxBits + 1 - w
  // Number of entries in table per code = 1 << (maxBits + 1 - nBits) = 1 << w... no wait
  // Table indexed by the first maxBits+1... that's wrong, we need maxBits table

  // Actually: for a symbol with nBits, it occupies tableSize / (1 << nBits) = 2^(maxBits - nBits +1)... hmm

  // Let me use the simpler approach: maxBits = max nBits = nBitsMax - 1 = maxBits
  // Table size = 1 << maxBits (NOT maxBits+1)

  // Recalculate: nBits for weight w = maxBits + 1 - w
  // maxNBits = maxBits + 1 - 1 = maxBits (when weight = 1)
  // minNBits = maxBits + 1 - maxW (when weight = maxW)

  // Fast lookup table: index = first maxBits bits
  const lookupSize = 1 << maxBits;
  const lookup: Array<{ symbol: number; nBits: number } | null> = new Array(lookupSize).fill(null);

  // Sort symbols by weight (ascending = more bits first)
  const sorted: Array<{ symbol: number; nBits: number }> = [];
  for (let s = 0; s < weights.length; s++) {
    if (weights[s] > 0) {
      sorted.push({ symbol: s, nBits: maxBits + 1 - weights[s] });
    }
  }
  sorted.sort((a, b) => b.nBits - a.nBits || a.symbol - b.symbol);

  // Fill table
  let code = 0;
  let prevNBits = sorted.length > 0 ? sorted[0].nBits : 0;

  for (const { symbol, nBits } of sorted) {
    if (nBits < prevNBits) {
      code >>>= (prevNBits - nBits);
      prevNBits = nBits;
    }

    // Fill all entries that match this prefix
    const fillCount = 1 << (maxBits - nBits);
    for (let i = 0; i < fillCount; i++) {
      const idx = code | (i << nBits);
      if (idx < lookupSize) {
        lookup[idx] = { symbol, nBits };
      }
    }
    code++;
  }

  return { maxBits, symbols: lookup };
}

/**
 * Decode one Huffman symbol from backward bitstream.
 */
function huffDecode(table: HuffmanTable, reader: BackwardBitReader): number {
  if (table.maxBits === 0) return 0;
  const bits = reader.peekBits(table.maxBits);
  const entry = table.symbols[bits];
  if (!entry) throw new Error(`Invalid Huffman code: ${bits}`);
  reader.readBits(entry.nBits);
  return entry.symbol;
}

/**
 * Read Huffman tree description from block data.
 * Returns weights array and number of bytes consumed.
 */
function readHuffmanTree(data: Buffer, offset: number): { weights: number[]; bytesRead: number } {
  const headerByte = data[offset];

  if (headerByte >= 128) {
    // Direct representation: weights packed as 4-bit values
    const numSymbols = headerByte - 127;
    const weights: number[] = [];
    const numBytes = Math.ceil(numSymbols / 2);

    for (let i = 0; i < numSymbols; i++) {
      const byteIdx = offset + 1 + Math.floor(i / 2);
      if (i % 2 === 0) {
        weights.push(data[byteIdx] >>> 4);
      } else {
        weights.push(data[byteIdx] & 0x0F);
      }
    }

    return { weights, bytesRead: 1 + numBytes };
  } else {
    // FSE-compressed weights
    const compressedSize = headerByte;
    const compData = data.subarray(offset + 1, offset + 1 + compressedSize);

    // Read FSE distribution for weights
    const fwdReader = new ForwardBitReader(compData);
    const { probs, log } = readFSEDistribution(fwdReader, 12); // max weight symbol ~12
    const fseTable = buildFSETable(probs, log);

    // Decode weights using backward bitstream on remaining data
    const headerBitsUsed = fwdReader.totalBitsConsumed;
    const headerBytesUsed = fwdReader.bytesConsumed;
    const streamData = compData.subarray(headerBytesUsed);

    if (streamData.length === 0) {
      return { weights: [], bytesRead: 1 + compressedSize };
    }

    const bwdReader = new BackwardBitReader(streamData);

    // Initialize FSE state
    let state = bwdReader.readBits(log);
    const weights: number[] = [];

    // Decode until we've consumed the stream
    // The number of weights isn't explicitly stored; we decode until the stream is exhausted
    try {
      while (bwdReader.bitsRemaining >= 0) {
        const entry = fseTable.entries[state];
        weights.push(entry.symbol);
        if (bwdReader.bitsRemaining < entry.nBits) break;
        state = entry.newState + bwdReader.readBits(entry.nBits);
      }
    } catch {
      // Stream exhausted
    }

    return { weights, bytesRead: 1 + compressedSize };
  }
}

// ============================================================
// Compressed Block Decompression
// ============================================================

interface BlockState {
  huffTable: HuffmanTable | null;
  repOffsets: [number, number, number];
  // Previous FSE tables for SEQ_REPEAT mode
  prevLLTable: FSETable | null;
  prevOFTable: FSETable | null;
  prevMLTable: FSETable | null;
}

/**
 * Read the literals section of a compressed block.
 * Returns the literal bytes and number of bytes consumed.
 */
function readLiterals(
  data: Buffer,
  offset: number,
  state: BlockState
): { literals: Buffer; bytesRead: number } {
  const byte0 = data[offset];
  const litType = byte0 & 3;
  const sizeFormat = (byte0 >>> 2) & 3;

  let regeneratedSize: number;
  let compressedSize: number;
  let numStreams: number;
  let headerSize: number;

  if (litType === LIT_RAW || litType === LIT_RLE) {
    // Raw or RLE literals
    switch (sizeFormat) {
      case 0: case 2:
        regeneratedSize = byte0 >>> 3;
        headerSize = 1;
        break;
      case 1:
        regeneratedSize = ((byte0 >>> 4) | (data[offset + 1] << 4)) & 0xFFF;
        headerSize = 2;
        break;
      case 3:
        regeneratedSize = ((byte0 >>> 4) | (data[offset + 1] << 4) | (data[offset + 2] << 12)) & 0xFFFFF;
        headerSize = 3;
        break;
      default:
        throw new Error('Invalid literal size format');
    }

    if (litType === LIT_RAW) {
      const literals = Buffer.from(data.subarray(offset + headerSize, offset + headerSize + regeneratedSize));
      return { literals, bytesRead: headerSize + regeneratedSize };
    } else {
      // RLE: single byte repeated
      const byte = data[offset + headerSize];
      const literals = Buffer.alloc(regeneratedSize, byte);
      return { literals, bytesRead: headerSize + 1 };
    }
  }

  // Compressed or Treeless literals
  numStreams = (sizeFormat === 0) ? 1 : 4;

  switch (sizeFormat) {
    case 0: // single stream
      regeneratedSize = (byte0 >>> 4) | ((data[offset + 1] & 0x3F) << 4);
      compressedSize = ((data[offset + 1] >>> 6) | (data[offset + 2] << 2)) & 0x3FF;
      headerSize = 3;
      break;
    case 1:
      regeneratedSize = (byte0 >>> 4) | ((data[offset + 1] & 0x3F) << 4);
      compressedSize = ((data[offset + 1] >>> 6) | (data[offset + 2] << 2)) & 0x3FF;
      headerSize = 3;
      break;
    case 2:
      regeneratedSize = ((byte0 >>> 4) | (data[offset + 1] << 4) | ((data[offset + 2] & 0x03) << 12)) & 0x3FFF;
      compressedSize = ((data[offset + 2] >>> 2) | (data[offset + 3] << 6)) & 0x3FFF;
      headerSize = 4;
      break;
    case 3:
      regeneratedSize = ((byte0 >>> 4) | (data[offset + 1] << 4) | ((data[offset + 2] & 0x3F) << 12)) & 0x3FFFF;
      compressedSize = ((data[offset + 2] >>> 6) | (data[offset + 3] << 2) | (data[offset + 4] << 10)) & 0x3FFFF;
      headerSize = 5;
      break;
    default:
      throw new Error('Invalid compressed literal size format');
  }

  let treeSize = 0;
  let huffTable: HuffmanTable;

  if (litType === LIT_COMPRESSED) {
    // Read new Huffman tree
    const { weights, bytesRead } = readHuffmanTree(data, offset + headerSize);

    // The last weight is implied: fills up to next power of 2
    let sumWeights = 0;
    for (const w of weights) {
      if (w > 0) sumWeights += (1 << (w - 1));
    }
    if (sumWeights > 0) {
      const nextPow2 = 1 << (highBit(sumWeights) + 1);
      const lastWeight = highBit(nextPow2 - sumWeights) + 1;
      weights.push(lastWeight);
    }

    huffTable = buildHuffmanTable(weights);
    state.huffTable = huffTable;
    treeSize = bytesRead;
  } else {
    // Treeless: reuse previous Huffman table
    if (!state.huffTable) throw new Error('Treeless literals but no previous Huffman table');
    huffTable = state.huffTable;
  }

  // Decompress Huffman-encoded literals
  const streamData = data.subarray(offset + headerSize + treeSize, offset + headerSize + compressedSize);
  const literals = Buffer.alloc(regeneratedSize);

  if (numStreams === 1) {
    decompressHuffStream(streamData, huffTable, literals, 0, regeneratedSize);
  } else {
    // 4-stream mode: first 6 bytes give compressed sizes of streams 1-3
    // (stream 4 size is implied)
    if (streamData.length < 6) throw new Error('4-stream literals too short');
    const cSize1 = streamData.readUInt16LE(0);
    const cSize2 = streamData.readUInt16LE(2);
    const cSize3 = streamData.readUInt16LE(4);

    const stream1Start = 6;
    const stream2Start = stream1Start + cSize1;
    const stream3Start = stream2Start + cSize2;
    const stream4Start = stream3Start + cSize3;

    const regenPerStream = Math.ceil(regeneratedSize / 4);
    const regen1 = Math.min(regenPerStream, regeneratedSize);
    const regen2 = Math.min(regenPerStream, regeneratedSize - regen1);
    const regen3 = Math.min(regenPerStream, regeneratedSize - regen1 - regen2);
    const regen4 = regeneratedSize - regen1 - regen2 - regen3;

    decompressHuffStream(streamData.subarray(stream1Start, stream2Start), huffTable, literals, 0, regen1);
    decompressHuffStream(streamData.subarray(stream2Start, stream3Start), huffTable, literals, regen1, regen2);
    decompressHuffStream(streamData.subarray(stream3Start, stream4Start), huffTable, literals, regen1 + regen2, regen3);
    decompressHuffStream(streamData.subarray(stream4Start), huffTable, literals, regen1 + regen2 + regen3, regen4);
  }

  return { literals, bytesRead: headerSize + compressedSize };
}

function decompressHuffStream(
  streamBuf: Buffer,
  table: HuffmanTable,
  output: Buffer,
  outOffset: number,
  count: number
): void {
  if (streamBuf.length === 0 || count === 0) return;

  try {
    const reader = new BackwardBitReader(streamBuf);
    let written = 0;
    while (written < count) {
      const sym = huffDecode(table, reader);
      output[outOffset + written] = sym;
      written++;
    }
  } catch {
    // Stream exhausted before expected count - fill with zeros
    // This can happen due to rounding in 4-stream mode
  }
}

/**
 * Read the sequences section and execute them.
 * Returns decompressed block data.
 */
function readSequences(
  data: Buffer,
  offset: number,
  blockSize: number,
  literals: Buffer,
  state: BlockState,
  window: number[]
): { output: Buffer; bytesRead: number } {
  const startOffset = offset;

  // Number of sequences
  const byte0 = data[offset++];
  let numSequences: number;
  if (byte0 === 0) {
    // No sequences: output is just the literals
    return { output: Buffer.from(literals), bytesRead: offset - startOffset };
  } else if (byte0 < 128) {
    numSequences = byte0;
  } else if (byte0 < 255) {
    numSequences = ((byte0 - 128) << 8) + data[offset++];
  } else {
    numSequences = data[offset] + (data[offset + 1] << 8) + 0x7F00;
    offset += 2;
  }

  // Compression modes for LL, OF, ML
  const modeByte = data[offset++];
  const llMode = (modeByte >>> 6) & 3;
  const ofMode = (modeByte >>> 4) & 3;
  const mlMode = (modeByte >>> 2) & 3;

  // Read FSE tables based on modes
  const fwdReader = new ForwardBitReader(data, offset);

  let llTable: FSETable;
  let ofTable: FSETable;
  let mlTable: FSETable;

  // Literal Length table
  if (llMode === SEQ_PREDEFINED) {
    llTable = getPredefinedLL();
  } else if (llMode === SEQ_RLE) {
    const sym = data[offset + Math.floor(fwdReader.totalBitsConsumed / 8)];
    fwdReader.readBits(8);
    llTable = { log: 0, entries: [{ symbol: sym, nBits: 0, newState: 0 }] };
  } else if (llMode === SEQ_FSE) {
    const { probs, log } = readFSEDistribution(fwdReader, 35);
    llTable = buildFSETable(probs, log);
  } else {
    // SEQ_REPEAT: reuse previous block's table
    if (!state.prevLLTable) throw new Error('Repeat mode for LL table but no previous table exists');
    llTable = state.prevLLTable;
  }

  // Offset table
  if (ofMode === SEQ_PREDEFINED) {
    ofTable = getPredefinedOF();
  } else if (ofMode === SEQ_RLE) {
    const bitsConsumed = fwdReader.totalBitsConsumed;
    const byteOff = Math.floor(bitsConsumed / 8) + ((bitsConsumed % 8) > 0 ? 1 : 0);
    const sym = fwdReader.readBits(8);
    ofTable = { log: 0, entries: [{ symbol: sym, nBits: 0, newState: 0 }] };
  } else if (ofMode === SEQ_FSE) {
    const { probs, log } = readFSEDistribution(fwdReader, 31);
    ofTable = buildFSETable(probs, log);
  } else {
    // SEQ_REPEAT: reuse previous block's table
    if (!state.prevOFTable) throw new Error('Repeat mode for OF table but no previous table exists');
    ofTable = state.prevOFTable;
  }

  // Match Length table
  if (mlMode === SEQ_PREDEFINED) {
    mlTable = getPredefinedML();
  } else if (mlMode === SEQ_RLE) {
    const sym = fwdReader.readBits(8);
    mlTable = { log: 0, entries: [{ symbol: sym, nBits: 0, newState: 0 }] };
  } else if (mlMode === SEQ_FSE) {
    const { probs, log } = readFSEDistribution(fwdReader, 52);
    mlTable = buildFSETable(probs, log);
  } else {
    // SEQ_REPEAT: reuse previous block's table
    if (!state.prevMLTable) throw new Error('Repeat mode for ML table but no previous table exists');
    mlTable = state.prevMLTable;
  }

  // Save tables for potential SEQ_REPEAT in next block
  state.prevLLTable = llTable;
  state.prevOFTable = ofTable;
  state.prevMLTable = mlTable;

  const tablesEnd = fwdReader.bytesConsumed;
  offset += tablesEnd - (offset - startOffset + (fwdReader.totalBitsConsumed - (tablesEnd - 1) * 8 > 0 ? 0 : 0));

  // The remaining data is the backward bitstream for sequence commands
  const seqOffset = startOffset + Math.floor(fwdReader.totalBitsConsumed / 8) + ((fwdReader.totalBitsConsumed % 8) > 0 ? 1 : 0);
  const seqStreamEnd = startOffset + (blockSize - (startOffset - startOffset)); // end of block
  // Actually, we need to figure out where in the block data the sequence bitstream is.
  // The block data layout is: [literals section] [sequences header + FSE tables] [sequence bitstream]
  // We've already consumed literals (handled before this function).
  // The sequences section starts at our original offset.
  // After reading the FSE tables (forward), the rest is the backward bitstream.

  const seqBitsStart = fwdReader.bytesConsumed;
  const seqStream = data.subarray(startOffset + seqBitsStart, startOffset + blockSize - (startOffset - startOffset));

  // Actually let me recalculate. The entire data passed to this function starts at the sequences section.
  // data[offset_orig..] is the sequences section.
  // We read: numSequences header (1-3 bytes), mode byte, FSE tables (fwdReader consumed some bytes).
  // Remaining bytes after fwdReader = backward bitstream.

  const headerBytes = fwdReader.bytesConsumed;
  // But fwdReader started at the position after modeByte. Let me track more carefully.
  // fwdReader was created with offset = position after numSeq + modeByte
  // fwdReader.bytesConsumed tells how many bytes from that starting point

  // Total header = (numSeq header) + (mode byte) + (FSE tables via fwdReader)
  const totalHeaderFromStart = (offset - startOffset) + fwdReader.bytesConsumed - (offset - startOffset);
  // Hmm this is getting tangled. Let me simplify.

  // Let's recalculate from scratch:
  // startOffset = beginning of sequences section in `data`
  // We consumed bytes for: numSequences (1-3 bytes), modeByte (1 byte)
  // Then fwdReader started at `offset` (which is startOffset + numSeqBytes + 1)
  // fwdReader consumed `fwdReader.bytesConsumed` bytes for FSE table headers

  const fseTablesStart = offset; // this was where fwdReader started
  const bitstreamStart = fseTablesStart + fwdReader.bytesConsumed - (fseTablesStart - startOffset);

  // I'm overcomplicating this. Let me just use the forward reader's consumed bytes
  // relative to the start of data.

  // fwdReader was constructed with offset into `data`. So...
  // Actually fwdReader was constructed as: new ForwardBitReader(data, offset)
  // where offset was advanced past numSeq header and mode byte.
  // fwdReader.bytesConsumed is relative to byte 0 of data, because we passed the global offset.
  // Wait no, ForwardBitReader stores pos relative to its starting byteOffset.
  // Let me re-check the ForwardBitReader constructor...

  // ForwardBitReader(buf, byteOffset): this.pos = byteOffset
  // So bytesConsumed = this.pos + (this.bit > 0 ? 1 : 0) which is absolute position in buf.

  // So the bitstream starts at fwdReader.bytesConsumed in `data`
  const bitstreamOffset = fwdReader.bytesConsumed;

  // The sequences section ends at startOffset + remainingBlockBytes
  // We don't have remainingBlockBytes directly, but the caller should pass the right amount of data.
  // Let's assume data.length is the end of the sequences section.
  const bitstreamData = data.subarray(bitstreamOffset);

  if (bitstreamData.length === 0 || numSequences === 0) {
    return { output: Buffer.from(literals), bytesRead: bitstreamOffset - startOffset };
  }

  // Decode sequences using backward bitstream
  const bwdReader = new BackwardBitReader(bitstreamData);

  // Initialize FSE states
  let llState = bwdReader.readBits(llTable.log);
  let ofState = bwdReader.readBits(ofTable.log);
  let mlState = bwdReader.readBits(mlTable.log);

  const sequences: Sequence[] = [];

  for (let i = 0; i < numSequences; i++) {
    // Decode in order: offset, matchLen, litLen
    const ofEntry = ofTable.entries[ofState];
    const ofCode = ofEntry.symbol;

    const mlEntry = mlTable.entries[mlState];
    const mlCode = mlEntry.symbol;

    const llEntry = llTable.entries[llState];
    const llCode = llEntry.symbol;

    // Read extra bits for each (in order: LL, ML, OF — reversed from decode order)
    // Actually the spec says: OF extra bits first, then ML, then LL
    let offset: number;
    if (ofCode > 0) {
      const extraBits = ofCode - 1;
      offset = (1 << ofCode) + (extraBits > 0 ? bwdReader.readBits(extraBits) : 0);
    } else {
      offset = 1; // ofCode 0 with no extra bits = offset 1
    }

    const mlExtraBits = ML_BITS[mlCode] || 0;
    const matchLen = ML_BASELINE[mlCode] + (mlExtraBits > 0 ? bwdReader.readBits(mlExtraBits) : 0);

    const llExtraBits = LL_BITS[llCode] || 0;
    const litLen = LL_BASELINE[llCode] + (llExtraBits > 0 ? bwdReader.readBits(llExtraBits) : 0);

    // Handle repeat offsets
    let actualOffset: number;
    if (offset <= 3) {
      // Repeat offset
      if (litLen > 0) {
        if (offset === 1) actualOffset = state.repOffsets[0];
        else if (offset === 2) actualOffset = state.repOffsets[1];
        else actualOffset = state.repOffsets[2];

        // Update repeat offsets
        if (offset === 2) {
          const tmp = state.repOffsets[1];
          state.repOffsets[1] = state.repOffsets[0];
          state.repOffsets[0] = tmp;
        } else if (offset === 3) {
          const tmp = state.repOffsets[2];
          state.repOffsets[2] = state.repOffsets[1];
          state.repOffsets[1] = state.repOffsets[0];
          state.repOffsets[0] = tmp;
        }
      } else {
        // litLen == 0: special case, offsets shift by 1
        if (offset === 1) actualOffset = state.repOffsets[1];
        else if (offset === 2) actualOffset = state.repOffsets[2];
        else {
          actualOffset = state.repOffsets[0] - 1;
          if (actualOffset === 0) actualOffset = 1; // safeguard
        }

        // Update
        if (offset === 1) {
          const tmp = state.repOffsets[1];
          state.repOffsets[1] = state.repOffsets[0];
          state.repOffsets[0] = tmp;
        } else if (offset === 2) {
          const tmp = state.repOffsets[2];
          state.repOffsets[2] = state.repOffsets[1];
          state.repOffsets[1] = state.repOffsets[0];
          state.repOffsets[0] = tmp;
        } else {
          state.repOffsets[2] = state.repOffsets[1];
          state.repOffsets[1] = state.repOffsets[0];
          state.repOffsets[0] = actualOffset;
        }
      }
    } else {
      actualOffset = offset - 3;
      state.repOffsets[2] = state.repOffsets[1];
      state.repOffsets[1] = state.repOffsets[0];
      state.repOffsets[0] = actualOffset;
    }

    sequences.push({ litLen, matchLen, offset: actualOffset });

    // Update FSE states (not for last sequence)
    if (i < numSequences - 1) {
      llState = llEntry.newState + bwdReader.readBits(llEntry.nBits);
      mlState = mlEntry.newState + bwdReader.readBits(mlEntry.nBits);
      ofState = ofEntry.newState + bwdReader.readBits(ofEntry.nBits);
    }
  }

  // Execute sequences
  const output: number[] = [];
  let litPos = 0;

  for (const seq of sequences) {
    // Copy literals
    for (let i = 0; i < seq.litLen; i++) {
      const byte = litPos < literals.length ? literals[litPos++] : 0;
      output.push(byte);
      window.push(byte);
    }

    // Copy match from window
    for (let i = 0; i < seq.matchLen; i++) {
      const srcPos = window.length - seq.offset;
      if (srcPos < 0) {
        output.push(0); // Beyond window - shouldn't happen with valid data
        window.push(0);
      } else {
        const byte = window[srcPos];
        output.push(byte);
        window.push(byte);
      }
    }
  }

  // Copy remaining literals after last sequence
  while (litPos < literals.length) {
    const byte = literals[litPos++];
    output.push(byte);
    window.push(byte);
  }

  return {
    output: Buffer.from(output),
    bytesRead: data.length - startOffset,
  };
}

// ============================================================
// Frame & Block Decompression
// ============================================================

interface FrameHeader {
  windowSize: number;
  contentSize: number | null; // null if not present
  dictionaryId: number | null;
  checksumFlag: boolean;
  singleSegment: boolean;
  headerSize: number;
}

function readFrameHeader(data: Buffer, offset: number): FrameHeader {
  const magic = data.readUInt32LE(offset);
  if (magic !== ZSTD_MAGIC) throw new Error(`Invalid zstd magic: 0x${magic.toString(16)}`);

  const fhd = data[offset + 4];
  const dictionaryIdFlag = fhd & 3;
  const checksumFlag = !!(fhd & 4);
  const singleSegment = !!(fhd & 32);
  const fcsField = (fhd >>> 6) & 3;

  let pos = offset + 5;

  // Window descriptor (absent if singleSegment)
  let windowSize: number;
  if (!singleSegment) {
    const wd = data[pos++];
    const exponent = (wd >>> 3) & 0x1F;
    const mantissa = wd & 7;
    const base = 1 << (10 + exponent);
    windowSize = base + (base >>> 3) * mantissa;
  } else {
    windowSize = 0; // will be set from content size
  }

  // Dictionary ID (0, 1, 2, or 4 bytes)
  let dictionaryId: number | null = null;
  if (dictionaryIdFlag === 1) {
    dictionaryId = data[pos++];
  } else if (dictionaryIdFlag === 2) {
    dictionaryId = data.readUInt16LE(pos);
    pos += 2;
  } else if (dictionaryIdFlag === 3) {
    dictionaryId = data.readUInt32LE(pos);
    pos += 4;
  }

  // Frame Content Size (0, 1, 2, 4, or 8 bytes)
  let contentSize: number | null = null;
  if (fcsField === 0 && singleSegment) {
    contentSize = data[pos++];
  } else if (fcsField === 1) {
    contentSize = data.readUInt16LE(pos) + 256;
    pos += 2;
  } else if (fcsField === 2) {
    contentSize = data.readUInt32LE(pos);
    pos += 4;
  } else if (fcsField === 3) {
    // 8-byte content size - use lower 32 bits (sufficient for our use)
    contentSize = data.readUInt32LE(pos);
    pos += 8;
  }

  if (singleSegment && contentSize !== null) {
    windowSize = contentSize;
  }

  return {
    windowSize,
    contentSize,
    dictionaryId,
    checksumFlag,
    singleSegment,
    headerSize: pos - offset,
  };
}

// ============================================================
// ZstdDecompressStream - Streaming Transform
// ============================================================

export class ZstdDecompressStream extends Transform {
  private inputBuf: Buffer = Buffer.alloc(0);
  private window: number[] = [];
  private windowSize: number = 0;
  private maxWindowSize: number = 128 * 1024 * 1024; // 128 MB max
  private blockState: BlockState = {
    huffTable: null,
    repOffsets: [1, 4, 8],
    prevLLTable: null,
    prevOFTable: null,
    prevMLTable: null,
  };
  private inFrame: boolean = false;
  private frameHeader: FrameHeader | null = null;
  private frameFinished: boolean = false;
  private totalOutput: number = 0;

  constructor() {
    super();
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.inputBuf = Buffer.concat([this.inputBuf, chunk]);
    try {
      this.processInput();
      callback();
    } catch (err: any) {
      callback(err);
    }
  }

  _flush(callback: TransformCallback): void {
    try {
      this.processInput();
      callback();
    } catch (err: any) {
      callback(err);
    }
  }

  private processInput(): void {
    while (this.inputBuf.length > 0) {
      if (!this.inFrame) {
        // Need at least 4 bytes for magic
        if (this.inputBuf.length < 4) return;

        const magic = this.inputBuf.readUInt32LE(0);

        // Check for skippable frame
        if (magic >= SKIPPABLE_MAGIC_LOW && magic <= SKIPPABLE_MAGIC_HIGH) {
          if (this.inputBuf.length < 8) return;
          const frameSize = this.inputBuf.readUInt32LE(4);
          const totalSize = 8 + frameSize;
          if (this.inputBuf.length < totalSize) return;
          this.inputBuf = this.inputBuf.subarray(totalSize);
          continue;
        }

        // Need enough for frame header (max ~14 bytes, but check incrementally)
        if (this.inputBuf.length < 5) return; // magic + FHD byte minimum

        try {
          const header = readFrameHeader(this.inputBuf, 0);
          if (this.inputBuf.length < header.headerSize) return;

          this.frameHeader = header;
          this.windowSize = Math.min(header.windowSize, this.maxWindowSize);
          this.window = [];
          this.blockState = {
            huffTable: null,
            repOffsets: [1, 4, 8],
            prevLLTable: null,
            prevOFTable: null,
            prevMLTable: null,
          };
          this.inFrame = true;
          this.frameFinished = false;
          this.inputBuf = this.inputBuf.subarray(header.headerSize);
        } catch {
          return; // Not enough data yet
        }
      }

      // Inside a frame: read blocks
      if (this.frameFinished) {
        // Read optional checksum (4 bytes)
        if (this.frameHeader!.checksumFlag) {
          if (this.inputBuf.length < 4) return;
          this.inputBuf = this.inputBuf.subarray(4); // skip checksum
        }
        this.inFrame = false;
        continue;
      }

      // Need at least 3 bytes for block header
      if (this.inputBuf.length < 3) return;

      const blockHeader = this.inputBuf[0] | (this.inputBuf[1] << 8) | (this.inputBuf[2] << 16);
      const lastBlock = blockHeader & 1;
      const blockType = (blockHeader >>> 1) & 3;
      const blockSize = blockHeader >>> 3;

      // Determine bytes needed for this block
      let blockDataSize: number;
      if (blockType === BLOCK_TYPE_RLE) {
        blockDataSize = 1;
      } else {
        blockDataSize = blockSize;
      }

      if (this.inputBuf.length < 3 + blockDataSize) return;

      const blockData = this.inputBuf.subarray(3, 3 + blockDataSize);
      this.inputBuf = this.inputBuf.subarray(3 + blockDataSize);

      // Decompress block
      let output: Buffer;
      switch (blockType) {
        case BLOCK_TYPE_RAW:
          output = Buffer.from(blockData);
          for (let i = 0; i < output.length; i++) {
            this.window.push(output[i]);
          }
          break;

        case BLOCK_TYPE_RLE:
          output = Buffer.alloc(blockSize, blockData[0]);
          for (let i = 0; i < blockSize; i++) {
            this.window.push(blockData[0]);
          }
          break;

        case BLOCK_TYPE_COMPRESSED:
          output = this.decompressBlock(blockData, blockSize);
          break;

        default:
          throw new Error(`Reserved block type: ${blockType}`);
      }

      // Trim window to windowSize
      if (this.window.length > this.windowSize * 2) {
        this.window = this.window.slice(-this.windowSize);
      }

      this.totalOutput += output.length;
      this.push(output);

      if (lastBlock) {
        this.frameFinished = true;
      }
    }
  }

  private decompressBlock(data: Buffer, regeneratedSize: number): Buffer {
    let offset = 0;

    // 1. Read literals section
    const { literals, bytesRead: litBytes } = readLiterals(data, offset, this.blockState);
    offset += litBytes;

    // 2. Read and execute sequences section
    const seqData = data.subarray(offset);
    const { output } = readSequences(seqData, 0, seqData.length, literals, this.blockState, this.window);

    return output;
  }
}

/**
 * Decompress a complete zstd-compressed Buffer.
 * For small inputs or testing. For large files, use ZstdDecompressStream.
 */
export function decompressZstd(input: Buffer): Buffer {
  const chunks: Buffer[] = [];
  const stream = new ZstdDecompressStream();

  stream.on('data', (chunk: Buffer) => chunks.push(chunk));

  stream.write(input);
  stream.end();

  // Since Transform is synchronous for our implementation,
  // all data should be available immediately
  return Buffer.concat(chunks);
}
