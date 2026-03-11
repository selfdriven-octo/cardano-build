const fs = require("fs");
const { cborDecode } = require("../lib/cbor");
const { decodeBlock, DecodedBlock } = require("../decoder/block");
const { logger } = require("../config/logger");
const SECONDARY_ENTRY_BASE_SIZE = 4 + 2 + 2 + 4 + 32;
function parseSecondaryIndex(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath);
    const entries = [];
    let offset = 0;
    if (data.length >= 2) {
        offset = 2;
    }
    while(offset + SECONDARY_ENTRY_BASE_SIZE <= data.length){
        const blockOffset = data.readUInt32BE(offset);
        offset += 4;
        const headerOffset = data.readUInt16BE(offset);
        offset += 2;
        const headerSize = data.readUInt16BE(offset);
        offset += 2;
        const checksum = data.readUInt32BE(offset);
        offset += 4;
        const headerHash = data.subarray(offset, offset + 32).toString('hex');
        offset += 32;
        let isEBB = false;
        if (offset < data.length) {
            const tag = data[offset];
            offset += 1;
            if (tag === 1) {
                isEBB = true;
                offset += 8;
            } else if (tag === 0) {
                offset += 8;
            }
        }
        entries.push({
            blockOffset,
            headerOffset,
            headerSize,
            checksum,
            headerHash,
            isEBB
        });
    }
    return entries;
}
function parseChunkFileWithIndex(chunkPath, secondaryPath, onBlock) {
    const entries = parseSecondaryIndex(secondaryPath);
    if (entries.length === 0) {
        return parseChunkFileSequential(chunkPath, onBlock);
    }
    const chunkData = fs.readFileSync(chunkPath);
    let valid = true;
    for(let i = 0; i < entries.length; i++){
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
    for(let i = 0; i < entries.length; i++){
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
        } catch (err) {
            logger.debug(`Failed to decode block at offset ${entry.blockOffset}: ${err.message}`);
        }
    }
    return count;
}
function parseChunkFileSequential(chunkPath, onBlock) {
    const data = fs.readFileSync(chunkPath);
    let offset = 0;
    let count = 0;
    while(offset < data.length){
        try {
            const result = cborDecodeWithOffset(data, offset);
            const blockRaw = result.value;
            const consumed = result.offset - offset;
            if (consumed <= 0) {
                offset++;
                continue;
            }
            const blockBuf = data.subarray(offset, result.offset);
            try {
                const decoded = decodeBlock(blockBuf);
                onBlock(decoded, count);
                count++;
            } catch  {}
            offset = result.offset;
        } catch  {
            offset++;
        }
    }
    return count;
}
function cborDecodeWithOffset(data, startOffset) {
    const remaining = data.subarray(startOffset);
    const value = cborDecode(remaining);
    const consumed = estimateCborSize(remaining);
    return {
        value,
        offset: startOffset + consumed
    };
}
function estimateCborSize(data) {
    return walkCborItem(data, 0);
}
function walkCborItem(data, offset) {
    if (offset >= data.length) return data.length;
    const initial = data[offset];
    const majorType = initial >> 5;
    const additionalInfo = initial & 0x1f;
    let argLen = 1;
    let argValue = additionalInfo;
    if (additionalInfo === 24) {
        argLen = 2;
        argValue = data[offset + 1];
    } else if (additionalInfo === 25) {
        argLen = 3;
        argValue = data.readUInt16BE(offset + 1);
    } else if (additionalInfo === 26) {
        argLen = 5;
        argValue = data.readUInt32BE(offset + 1);
    } else if (additionalInfo === 27) {
        argLen = 9;
        argValue = data.readUInt32BE(offset + 1) * 0x100000000 + data.readUInt32BE(offset + 5);
    } else if (additionalInfo === 31) {
        argLen = 1;
        argValue = -1;
    } else if (additionalInfo >= 24) {
        return offset + 1;
    }
    const headerEnd = offset + argLen;
    switch(majorType){
        case 0:
        case 1:
            return headerEnd;
        case 2:
        case 3:
            if (argValue === -1) {
                let pos = headerEnd;
                while(pos < data.length && data[pos] !== 0xff){
                    pos = walkCborItem(data, pos);
                }
                return pos < data.length ? pos + 1 : pos;
            }
            return headerEnd + argValue;
        case 4:
            if (argValue === -1) {
                let pos = headerEnd;
                while(pos < data.length && data[pos] !== 0xff){
                    pos = walkCborItem(data, pos);
                }
                return pos < data.length ? pos + 1 : pos;
            }
            {
                let pos = headerEnd;
                for(let i = 0; i < argValue && pos < data.length; i++){
                    pos = walkCborItem(data, pos);
                }
                return pos;
            }
        case 5:
            if (argValue === -1) {
                let pos = headerEnd;
                while(pos < data.length && data[pos] !== 0xff){
                    pos = walkCborItem(data, pos);
                    if (pos < data.length && data[pos] !== 0xff) {
                        pos = walkCborItem(data, pos);
                    }
                }
                return pos < data.length ? pos + 1 : pos;
            }
            {
                let pos = headerEnd;
                for(let i = 0; i < argValue && pos < data.length; i++){
                    pos = walkCborItem(data, pos);
                    pos = walkCborItem(data, pos);
                }
                return pos;
            }
        case 6:
            return walkCborItem(data, headerEnd);
        case 7:
            if (additionalInfo === 25) return offset + 3;
            if (additionalInfo === 26) return offset + 5;
            if (additionalInfo === 27) return offset + 9;
            return headerEnd;
        default:
            return headerEnd;
    }
}
function parseImmutableDb(dbDir, onBlock, options = {}) {
    const files = fs.readdirSync(dbDir).filter((f)=>f.endsWith('.chunk')).sort();
    logger.info(`Found ${files.length} chunk files in ${dbDir}`);
    let totalBlocks = 0;
    for (const file of files){
        const chunkNum = parseInt(file.replace('.chunk', ''), 10);
        if (options.startChunk !== undefined && chunkNum < options.startChunk) continue;
        if (options.endChunk !== undefined && chunkNum > options.endChunk) continue;
        const chunkPath = `${dbDir}/${file}`;
        const secondaryPath = `${dbDir}/${file.replace('.chunk', '.secondary')}`;
        logger.info(`Parsing chunk ${file}...`);
        const count = parseChunkFileWithIndex(chunkPath, secondaryPath, (block)=>{
            onBlock(block);
        });
        totalBlocks += count;
        logger.info(`Chunk ${file}: ${count} blocks (total: ${totalBlocks})`);
    }
    return totalBlocks;
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/mithril/chunk-parser.ts

exports.parseSecondaryIndex = parseSecondaryIndex;
exports.parseChunkFileWithIndex = parseChunkFileWithIndex;
exports.parseChunkFileSequential = parseChunkFileSequential;
exports.parseImmutableDb = parseImmutableDb;
