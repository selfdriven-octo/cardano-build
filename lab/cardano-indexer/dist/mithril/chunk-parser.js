"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSecondaryIndex = parseSecondaryIndex;
exports.parseChunkFileWithIndex = parseChunkFileWithIndex;
exports.parseChunkFileSequential = parseChunkFileSequential;
exports.parseImmutableDb = parseImmutableDb;
const fs = __importStar(require("fs"));
const cbor_1 = require("../lib/cbor");
const block_1 = require("../decoder/block");
const logger_1 = require("../config/logger");
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
const SECONDARY_VERSION = 1;
const SECONDARY_ENTRY_BASE_SIZE = 8 + 2 + 2 + 4 + 32; // 48 bytes before blockOrEBB
/**
 * Parse a secondary index file to get block offsets within the chunk.
 */
function parseSecondaryIndex(filePath) {
    if (!fs.existsSync(filePath))
        return [];
    const data = fs.readFileSync(filePath);
    const entries = [];
    let offset = 0;
    // Skip version number (2 bytes)
    if (data.length >= 2) {
        offset = 2;
    }
    while (offset + SECONDARY_ENTRY_BASE_SIZE <= data.length) {
        // Read blockOffset as two 32-bit values (Word64)
        const hi = data.readUInt32BE(offset);
        const lo = data.readUInt32BE(offset + 4);
        const blockOffset = hi * 0x100000000 + lo;
        offset += 8;
        const headerOffset = data.readUInt16BE(offset);
        offset += 2;
        const headerSize = data.readUInt16BE(offset);
        offset += 2;
        const checksum = data.readUInt32BE(offset);
        offset += 4;
        const headerHash = data.subarray(offset, offset + 32).toString('hex');
        offset += 32;
        // blockOrEBB: 1 byte tag
        let isEBB = false;
        if (offset < data.length) {
            const tag = data[offset];
            offset += 1;
            if (tag === 1) {
                // EBB — skip epoch number (8 bytes)
                isEBB = true;
                offset += 8;
            }
            else if (tag === 0) {
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
function parseChunkFileWithIndex(chunkPath, secondaryPath, onBlock) {
    const entries = parseSecondaryIndex(secondaryPath);
    if (entries.length === 0) {
        return parseChunkFileSequential(chunkPath, onBlock);
    }
    const chunkData = fs.readFileSync(chunkPath);
    let count = 0;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const nextOffset = i + 1 < entries.length ? entries[i + 1].blockOffset : chunkData.length;
        const blockSize = nextOffset - entry.blockOffset;
        if (entry.blockOffset + blockSize > chunkData.length) {
            logger_1.logger.warn(`Block at offset ${entry.blockOffset} exceeds chunk file size, skipping`);
            continue;
        }
        try {
            const blockData = chunkData.subarray(entry.blockOffset, entry.blockOffset + blockSize);
            const decoded = (0, block_1.decodeBlock)(blockData);
            onBlock(decoded, count);
            count++;
        }
        catch (err) {
            logger_1.logger.debug(`Failed to decode block at offset ${entry.blockOffset}: ${err.message}`);
        }
    }
    return count;
}
/**
 * Parse blocks from a chunk file by sequential CBOR decoding.
 * Falls back to this when no secondary index is available.
 */
function parseChunkFileSequential(chunkPath, onBlock) {
    const data = fs.readFileSync(chunkPath);
    let offset = 0;
    let count = 0;
    while (offset < data.length) {
        try {
            // Try to decode a CBOR item at current offset
            const result = cborDecodeWithOffset(data, offset);
            const blockRaw = result.value;
            const consumed = result.offset - offset;
            if (consumed <= 0) {
                offset++;
                continue;
            }
            // Attempt to decode as a Cardano block
            const blockBuf = data.subarray(offset, result.offset);
            try {
                const decoded = (0, block_1.decodeBlock)(blockBuf);
                onBlock(decoded, count);
                count++;
            }
            catch {
                // Not a valid block, skip
            }
            offset = result.offset;
        }
        catch {
            // CBOR decode failed, advance one byte and try again
            offset++;
        }
    }
    return count;
}
/**
 * Decode a CBOR item and return the value plus the new offset.
 */
function cborDecodeWithOffset(data, startOffset) {
    // Use our CBOR decoder which returns the decoded value
    // We need to figure out the consumed bytes
    const remaining = data.subarray(startOffset);
    const value = (0, cbor_1.cborDecode)(remaining);
    // Calculate consumed bytes by re-encoding and comparing
    // This is a simplification — in practice we'd modify cborDecode to return offset
    // For now, estimate using CBOR structure
    const consumed = estimateCborSize(remaining);
    return { value, offset: startOffset + consumed };
}
/**
 * Estimate the size of the first CBOR item in a buffer.
 * This walks the CBOR structure to find where it ends.
 */
function estimateCborSize(data) {
    return walkCborItem(data, 0);
}
function walkCborItem(data, offset) {
    if (offset >= data.length)
        return data.length;
    const initial = data[offset];
    const majorType = initial >> 5;
    const additionalInfo = initial & 0x1f;
    let argLen = 1; // for the initial byte
    let argValue = additionalInfo;
    if (additionalInfo === 24) {
        argLen = 2;
        argValue = data[offset + 1];
    }
    else if (additionalInfo === 25) {
        argLen = 3;
        argValue = data.readUInt16BE(offset + 1);
    }
    else if (additionalInfo === 26) {
        argLen = 5;
        argValue = data.readUInt32BE(offset + 1);
    }
    else if (additionalInfo === 27) {
        argLen = 9;
        argValue = data.readUInt32BE(offset + 1) * 0x100000000 + data.readUInt32BE(offset + 5);
    }
    else if (additionalInfo === 31) {
        // Indefinite length
        argLen = 1;
        argValue = -1;
    }
    else if (additionalInfo >= 24) {
        return offset + 1;
    }
    const headerEnd = offset + argLen;
    switch (majorType) {
        case 0: // unsigned int
        case 1: // negative int
            return headerEnd;
        case 2: // byte string
        case 3: // text string
            if (argValue === -1) {
                // Indefinite — scan for break (0xFF)
                let pos = headerEnd;
                while (pos < data.length && data[pos] !== 0xff) {
                    pos = walkCborItem(data, pos);
                }
                return pos < data.length ? pos + 1 : pos;
            }
            return headerEnd + argValue;
        case 4: // array
            if (argValue === -1) {
                let pos = headerEnd;
                while (pos < data.length && data[pos] !== 0xff) {
                    pos = walkCborItem(data, pos);
                }
                return pos < data.length ? pos + 1 : pos;
            }
            {
                let pos = headerEnd;
                for (let i = 0; i < argValue && pos < data.length; i++) {
                    pos = walkCborItem(data, pos);
                }
                return pos;
            }
        case 5: // map
            if (argValue === -1) {
                let pos = headerEnd;
                while (pos < data.length && data[pos] !== 0xff) {
                    pos = walkCborItem(data, pos); // key
                    if (pos < data.length && data[pos] !== 0xff) {
                        pos = walkCborItem(data, pos); // value
                    }
                }
                return pos < data.length ? pos + 1 : pos;
            }
            {
                let pos = headerEnd;
                for (let i = 0; i < argValue && pos < data.length; i++) {
                    pos = walkCborItem(data, pos); // key
                    pos = walkCborItem(data, pos); // value
                }
                return pos;
            }
        case 6: // tag
            return walkCborItem(data, headerEnd);
        case 7: // simple/float
            if (additionalInfo === 25)
                return offset + 3;
            if (additionalInfo === 26)
                return offset + 5;
            if (additionalInfo === 27)
                return offset + 9;
            return headerEnd;
        default:
            return headerEnd;
    }
}
/**
 * Scan a directory for immutable chunk files and parse them in order.
 */
function parseImmutableDb(dbDir, onBlock, options = {}) {
    const files = fs.readdirSync(dbDir)
        .filter(f => f.endsWith('.chunk'))
        .sort();
    logger_1.logger.info(`Found ${files.length} chunk files in ${dbDir}`);
    let totalBlocks = 0;
    for (const file of files) {
        const chunkNum = parseInt(file.replace('.chunk', ''), 10);
        if (options.startChunk !== undefined && chunkNum < options.startChunk)
            continue;
        if (options.endChunk !== undefined && chunkNum > options.endChunk)
            continue;
        const chunkPath = `${dbDir}/${file}`;
        const secondaryPath = `${dbDir}/${file.replace('.chunk', '.secondary')}`;
        logger_1.logger.info(`Parsing chunk ${file}...`);
        const count = parseChunkFileWithIndex(chunkPath, secondaryPath, (block) => {
            onBlock(block);
        });
        totalBlocks += count;
        logger_1.logger.info(`Chunk ${file}: ${count} blocks (total: ${totalBlocks})`);
    }
    return totalBlocks;
}
//# sourceMappingURL=chunk-parser.js.map