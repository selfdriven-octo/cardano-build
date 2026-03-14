const fs = require("fs");
const { cborDecode, cborDecodeWithPosition } = require("../lib/cbor");
const { decodeBlock, DecodedBlock } = require("../decoder/block");
const { logger } = require("../config/logger");
const SECONDARY_ENTRY_BASE_SIZE = 8 + 2 + 2 + 4 + 32;
function parseSecondaryIndex(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath);
    const entries = [];
    let offset = 0;
    if (data.length >= 2) {
        offset = 2;
    }
    while(offset + SECONDARY_ENTRY_BASE_SIZE <= data.length){
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
            const decoded = decodeBlock(blockData, entry.headerHash);
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
        if (data[offset] === 0) {
            offset++;
            continue;
        }
        try {
            const result = cborDecodeWithPosition(data, offset);
            const nextOffset = result.offset;
            if (nextOffset <= offset) {
                offset++;
                continue;
            }
            const blockBuf = data.subarray(offset, nextOffset);
            try {
                const decoded = decodeBlock(blockBuf);
                onBlock(decoded, count);
                count++;
            } catch  {}
            offset = nextOffset;
        } catch  {
            offset++;
        }
    }
    return count;
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
