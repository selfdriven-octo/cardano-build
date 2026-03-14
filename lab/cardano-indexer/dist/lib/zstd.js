const { Transform, TransformCallback } = require("stream");
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
const LL_BASELINE = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    18,
    20,
    22,
    24,
    28,
    32,
    40,
    48,
    64,
    128,
    256,
    512,
    1024,
    2048,
    4096,
    8192,
    16384,
    32768,
    65536
];
const LL_BITS = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16
];
const ML_BASELINE = [
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    35,
    37,
    39,
    41,
    43,
    47,
    51,
    59,
    67,
    83,
    99,
    131,
    259,
    515,
    1027,
    2051,
    4099,
    8195,
    16387,
    32771,
    65539
];
const ML_BITS = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    5,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16
];
const LL_DEFAULT_DIST = [
    4,
    3,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    3,
    2,
    1,
    1,
    1,
    1,
    1,
    -1,
    -1,
    -1,
    -1
];
const LL_DEFAULT_LOG = 6;
const ML_DEFAULT_DIST = [
    1,
    4,
    3,
    2,
    2,
    2,
    2,
    2,
    2,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1
];
const ML_DEFAULT_LOG = 6;
const OF_DEFAULT_DIST = [
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    -1,
    -1,
    -1,
    -1,
    -1
];
const OF_DEFAULT_LOG = 5;
class ForwardBitReader {
    buf;
    pos;
    bit;
    constructor(buf, byteOffset = 0){
        this.buf = buf;
        this.pos = byteOffset;
        this.bit = 0;
    }
    readBits(n) {
        let val = 0;
        let read = 0;
        while(read < n){
            if (this.pos >= this.buf.length) throw new Error('Forward bitstream overrun');
            const avail = 8 - this.bit;
            const take = Math.min(n - read, avail);
            const mask = (1 << take) - 1;
            val |= (this.buf[this.pos] >>> this.bit & mask) << read;
            this.bit += take;
            read += take;
            if (this.bit >= 8) {
                this.bit = 0;
                this.pos++;
            }
        }
        return val;
    }
    get bytesConsumed() {
        return this.bit > 0 ? this.pos + 1 : this.pos;
    }
    get totalBitsConsumed() {
        return this.pos * 8 + this.bit;
    }
}
class BackwardBitReader {
    buf;
    bytePos;
    acc;
    nBits;
    constructor(buf){
        this.buf = buf;
        if (buf.length === 0) throw new Error('Empty bitstream');
        const last = buf[buf.length - 1];
        if (last === 0) throw new Error('Bitstream sentinel missing');
        const sentinel = 31 - Math.clz32(last);
        this.acc = (last & (1 << sentinel) - 1) >>> 0;
        this.nBits = sentinel;
        this.bytePos = buf.length - 2;
        this.reload();
    }
    reload() {
        while(this.nBits <= 24 && this.bytePos >= 0){
            this.acc = (this.acc | this.buf[this.bytePos] << this.nBits) >>> 0;
            this.nBits += 8;
            this.bytePos--;
        }
    }
    readBits(n) {
        if (n === 0) return 0;
        if (n > this.nBits) {
            this.reload();
            if (n > this.nBits) throw new Error(`Bitstream underflow: want ${n}, have ${this.nBits}`);
        }
        const val = (this.acc & (1 << n >>> 0) - 1) >>> 0;
        this.acc = this.acc >>> n >>> 0;
        this.nBits -= n;
        this.reload();
        return val;
    }
    peekBits(n) {
        if (n === 0) return 0;
        return (this.acc & (1 << n >>> 0) - 1) >>> 0;
    }
    get bitsRemaining() {
        return this.nBits + (this.bytePos + 1) * 8;
    }
}
function highBit(val) {
    if (val === 0) return 0;
    return 31 - Math.clz32(val);
}
function buildFSETable(probs, log) {
    const tableSize = 1 << log;
    const tableMask = tableSize - 1;
    const step = (tableSize >>> 1) + (tableSize >>> 3) + 3;
    const entries = new Array(tableSize);
    const symbolNext = new Array(probs.length).fill(0);
    let highThreshold = tableSize - 1;
    for(let s = 0; s < probs.length; s++){
        if (probs[s] === -1) {
            entries[highThreshold] = {
                symbol: s,
                nBits: 0,
                newState: 0
            };
            highThreshold--;
            symbolNext[s] = 1;
        } else if (probs[s] > 0) {
            symbolNext[s] = probs[s];
        }
    }
    let pos = 0;
    for(let s = 0; s < probs.length; s++){
        const prob = probs[s];
        if (prob <= 0) continue;
        for(let i = 0; i < prob; i++){
            entries[pos] = {
                symbol: s,
                nBits: 0,
                newState: 0
            };
            pos = pos + step & tableMask;
            while(pos > highThreshold){
                pos = pos + step & tableMask;
            }
        }
    }
    for(let i = 0; i < tableSize; i++){
        const s = entries[i].symbol;
        const nextState = symbolNext[s]++;
        const nBits = log - highBit(nextState);
        entries[i].nBits = nBits;
        entries[i].newState = (nextState << nBits) - tableSize;
    }
    return {
        log,
        entries
    };
}
function readFSEDistribution(reader, maxSymbol) {
    const log = reader.readBits(4) + 5;
    const tableSize = 1 << log;
    let remaining = tableSize + 1;
    const probs = [];
    while(remaining > 1 && probs.length <= maxSymbol){
        const bits = highBit(remaining + 1) + 1;
        const lowBits = bits - 1;
        const threshold = (1 << bits) - 1 - remaining;
        let val = reader.readBits(lowBits);
        if (val >= threshold) {
            val = val << 1 | reader.readBits(1);
            val -= threshold;
        }
        const prob = val - 1;
        probs.push(prob);
        if (prob === -1) {
            remaining -= 1;
        } else if (prob > 0) {
            remaining -= prob;
        }
        if (prob === 0) {
            let repeat;
            do {
                repeat = reader.readBits(2);
                for(let i = 0; i < repeat; i++){
                    probs.push(0);
                }
            }while (repeat === 3)
        }
    }
    while(probs.length > maxSymbol + 1){
        probs.pop();
    }
    return {
        probs,
        log
    };
}
function fseDecodeStep(table, state, reader) {
    const entry = table.entries[state];
    const symbol = entry.symbol;
    const newState = entry.newState + reader.readBits(entry.nBits);
    return {
        symbol,
        newState
    };
}
function buildPredefinedFSE(dist, log) {
    return buildFSETable(dist, log);
}
let _predefinedLL = null;
let _predefinedML = null;
let _predefinedOF = null;
function getPredefinedLL() {
    if (!_predefinedLL) _predefinedLL = buildPredefinedFSE(LL_DEFAULT_DIST, LL_DEFAULT_LOG);
    return _predefinedLL;
}
function getPredefinedML() {
    if (!_predefinedML) _predefinedML = buildPredefinedFSE(ML_DEFAULT_DIST, ML_DEFAULT_LOG);
    return _predefinedML;
}
function getPredefinedOF() {
    if (!_predefinedOF) _predefinedOF = buildPredefinedFSE(OF_DEFAULT_DIST, OF_DEFAULT_LOG);
    return _predefinedOF;
}
function buildHuffmanTable(weights) {
    let sumWeights = 0;
    for (const w of weights){
        if (w > 0) sumWeights += 1 << w - 1;
    }
    if (sumWeights === 0) {
        return {
            maxBits: 0,
            symbols: []
        };
    }
    const maxBits = highBit(sumWeights);
    const tableSize = 1 << maxBits + 1;
    if (sumWeights < 1 << maxBits || sumWeights >= 1 << maxBits + 1) {}
    const symbols = new Array(1 << maxBits + 1).fill(null);
    const maxW = Math.max(...weights);
    const nBitsMax = maxBits + 1;
    const lookupSize = 1 << maxBits;
    const lookup = new Array(lookupSize).fill(null);
    const sorted = [];
    for(let s = 0; s < weights.length; s++){
        if (weights[s] > 0) {
            sorted.push({
                symbol: s,
                nBits: maxBits + 1 - weights[s]
            });
        }
    }
    sorted.sort((a, b)=>b.nBits - a.nBits || a.symbol - b.symbol);
    let code = 0;
    let prevNBits = sorted.length > 0 ? sorted[0].nBits : 0;
    for (const { symbol, nBits } of sorted){
        if (nBits < prevNBits) {
            code >>>= prevNBits - nBits;
            prevNBits = nBits;
        }
        const fillCount = 1 << maxBits - nBits;
        for(let i = 0; i < fillCount; i++){
            const idx = code | i << nBits;
            if (idx < lookupSize) {
                lookup[idx] = {
                    symbol,
                    nBits
                };
            }
        }
        code++;
    }
    return {
        maxBits,
        symbols: lookup
    };
}
function huffDecode(table, reader) {
    if (table.maxBits === 0) return 0;
    const bits = reader.peekBits(table.maxBits);
    const entry = table.symbols[bits];
    if (!entry) throw new Error(`Invalid Huffman code: ${bits}`);
    reader.readBits(entry.nBits);
    return entry.symbol;
}
function readHuffmanTree(data, offset) {
    const headerByte = data[offset];
    if (headerByte >= 128) {
        const numSymbols = headerByte - 127;
        const weights = [];
        const numBytes = Math.ceil(numSymbols / 2);
        for(let i = 0; i < numSymbols; i++){
            const byteIdx = offset + 1 + Math.floor(i / 2);
            if (i % 2 === 0) {
                weights.push(data[byteIdx] >>> 4);
            } else {
                weights.push(data[byteIdx] & 0x0F);
            }
        }
        return {
            weights,
            bytesRead: 1 + numBytes
        };
    } else {
        const compressedSize = headerByte;
        const compData = data.subarray(offset + 1, offset + 1 + compressedSize);
        const fwdReader = new ForwardBitReader(compData);
        const { probs, log } = readFSEDistribution(fwdReader, 12);
        const fseTable = buildFSETable(probs, log);
        const headerBitsUsed = fwdReader.totalBitsConsumed;
        const headerBytesUsed = fwdReader.bytesConsumed;
        const streamData = compData.subarray(headerBytesUsed);
        if (streamData.length === 0) {
            return {
                weights: [],
                bytesRead: 1 + compressedSize
            };
        }
        const bwdReader = new BackwardBitReader(streamData);
        let state = bwdReader.readBits(log);
        const weights = [];
        try {
            while(bwdReader.bitsRemaining >= 0){
                const entry = fseTable.entries[state];
                weights.push(entry.symbol);
                if (bwdReader.bitsRemaining < entry.nBits) break;
                state = entry.newState + bwdReader.readBits(entry.nBits);
            }
        } catch  {}
        return {
            weights,
            bytesRead: 1 + compressedSize
        };
    }
}
function readLiterals(data, offset, state) {
    const byte0 = data[offset];
    const litType = byte0 & 3;
    const sizeFormat = byte0 >>> 2 & 3;
    let regeneratedSize;
    let compressedSize;
    let numStreams;
    let headerSize;
    if (litType === LIT_RAW || litType === LIT_RLE) {
        switch(sizeFormat){
            case 0:
            case 2:
                regeneratedSize = byte0 >>> 3;
                headerSize = 1;
                break;
            case 1:
                regeneratedSize = (byte0 >>> 4 | data[offset + 1] << 4) & 0xFFF;
                headerSize = 2;
                break;
            case 3:
                regeneratedSize = (byte0 >>> 4 | data[offset + 1] << 4 | data[offset + 2] << 12) & 0xFFFFF;
                headerSize = 3;
                break;
            default:
                throw new Error('Invalid literal size format');
        }
        if (litType === LIT_RAW) {
            const literals = Buffer.from(data.subarray(offset + headerSize, offset + headerSize + regeneratedSize));
            return {
                literals,
                bytesRead: headerSize + regeneratedSize
            };
        } else {
            const byte = data[offset + headerSize];
            const literals = Buffer.alloc(regeneratedSize, byte);
            return {
                literals,
                bytesRead: headerSize + 1
            };
        }
    }
    numStreams = sizeFormat === 0 ? 1 : 4;
    switch(sizeFormat){
        case 0:
            regeneratedSize = byte0 >>> 4 | (data[offset + 1] & 0x3F) << 4;
            compressedSize = (data[offset + 1] >>> 6 | data[offset + 2] << 2) & 0x3FF;
            headerSize = 3;
            break;
        case 1:
            regeneratedSize = byte0 >>> 4 | (data[offset + 1] & 0x3F) << 4;
            compressedSize = (data[offset + 1] >>> 6 | data[offset + 2] << 2) & 0x3FF;
            headerSize = 3;
            break;
        case 2:
            regeneratedSize = (byte0 >>> 4 | data[offset + 1] << 4 | (data[offset + 2] & 0x03) << 12) & 0x3FFF;
            compressedSize = (data[offset + 2] >>> 2 | data[offset + 3] << 6) & 0x3FFF;
            headerSize = 4;
            break;
        case 3:
            regeneratedSize = (byte0 >>> 4 | data[offset + 1] << 4 | (data[offset + 2] & 0x3F) << 12) & 0x3FFFF;
            compressedSize = (data[offset + 2] >>> 6 | data[offset + 3] << 2 | data[offset + 4] << 10) & 0x3FFFF;
            headerSize = 5;
            break;
        default:
            throw new Error('Invalid compressed literal size format');
    }
    let treeSize = 0;
    let huffTable;
    if (litType === LIT_COMPRESSED) {
        const { weights, bytesRead } = readHuffmanTree(data, offset + headerSize);
        let sumWeights = 0;
        for (const w of weights){
            if (w > 0) sumWeights += 1 << w - 1;
        }
        if (sumWeights > 0) {
            const nextPow2 = 1 << highBit(sumWeights) + 1;
            const lastWeight = highBit(nextPow2 - sumWeights) + 1;
            weights.push(lastWeight);
        }
        huffTable = buildHuffmanTable(weights);
        state.huffTable = huffTable;
        treeSize = bytesRead;
    } else {
        if (!state.huffTable) throw new Error('Treeless literals but no previous Huffman table');
        huffTable = state.huffTable;
    }
    const streamData = data.subarray(offset + headerSize + treeSize, offset + headerSize + compressedSize);
    const literals = Buffer.alloc(regeneratedSize);
    if (numStreams === 1) {
        decompressHuffStream(streamData, huffTable, literals, 0, regeneratedSize);
    } else {
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
    return {
        literals,
        bytesRead: headerSize + compressedSize
    };
}
function decompressHuffStream(streamBuf, table, output, outOffset, count) {
    if (streamBuf.length === 0 || count === 0) return;
    try {
        const reader = new BackwardBitReader(streamBuf);
        let written = 0;
        while(written < count){
            const sym = huffDecode(table, reader);
            output[outOffset + written] = sym;
            written++;
        }
    } catch  {}
}
function readSequences(data, offset, blockSize, literals, state, window) {
    const startOffset = offset;
    const byte0 = data[offset++];
    let numSequences;
    if (byte0 === 0) {
        return {
            output: Buffer.from(literals),
            bytesRead: offset - startOffset
        };
    } else if (byte0 < 128) {
        numSequences = byte0;
    } else if (byte0 < 255) {
        numSequences = (byte0 - 128 << 8) + data[offset++];
    } else {
        numSequences = data[offset] + (data[offset + 1] << 8) + 0x7F00;
        offset += 2;
    }
    const modeByte = data[offset++];
    const llMode = modeByte >>> 6 & 3;
    const ofMode = modeByte >>> 4 & 3;
    const mlMode = modeByte >>> 2 & 3;
    const fwdReader = new ForwardBitReader(data, offset);
    let llTable;
    let ofTable;
    let mlTable;
    if (llMode === SEQ_PREDEFINED) {
        llTable = getPredefinedLL();
    } else if (llMode === SEQ_RLE) {
        const sym = data[offset + Math.floor(fwdReader.totalBitsConsumed / 8)];
        fwdReader.readBits(8);
        llTable = {
            log: 0,
            entries: [
                {
                    symbol: sym,
                    nBits: 0,
                    newState: 0
                }
            ]
        };
    } else if (llMode === SEQ_FSE) {
        const { probs, log } = readFSEDistribution(fwdReader, 35);
        llTable = buildFSETable(probs, log);
    } else {
        throw new Error('Repeat mode not supported for first block');
    }
    if (ofMode === SEQ_PREDEFINED) {
        ofTable = getPredefinedOF();
    } else if (ofMode === SEQ_RLE) {
        const bitsConsumed = fwdReader.totalBitsConsumed;
        const byteOff = Math.floor(bitsConsumed / 8) + (bitsConsumed % 8 > 0 ? 1 : 0);
        const sym = fwdReader.readBits(8);
        ofTable = {
            log: 0,
            entries: [
                {
                    symbol: sym,
                    nBits: 0,
                    newState: 0
                }
            ]
        };
    } else if (ofMode === SEQ_FSE) {
        const { probs, log } = readFSEDistribution(fwdReader, 31);
        ofTable = buildFSETable(probs, log);
    } else {
        throw new Error('Repeat mode not supported for first block');
    }
    if (mlMode === SEQ_PREDEFINED) {
        mlTable = getPredefinedML();
    } else if (mlMode === SEQ_RLE) {
        const sym = fwdReader.readBits(8);
        mlTable = {
            log: 0,
            entries: [
                {
                    symbol: sym,
                    nBits: 0,
                    newState: 0
                }
            ]
        };
    } else if (mlMode === SEQ_FSE) {
        const { probs, log } = readFSEDistribution(fwdReader, 52);
        mlTable = buildFSETable(probs, log);
    } else {
        throw new Error('Repeat mode not supported for first block');
    }
    const tablesEnd = fwdReader.bytesConsumed;
    offset += tablesEnd - (offset - startOffset + (fwdReader.totalBitsConsumed - (tablesEnd - 1) * 8 > 0 ? 0 : 0));
    const seqOffset = startOffset + Math.floor(fwdReader.totalBitsConsumed / 8) + (fwdReader.totalBitsConsumed % 8 > 0 ? 1 : 0);
    const seqStreamEnd = startOffset + (blockSize - (startOffset - startOffset));
    const seqBitsStart = fwdReader.bytesConsumed;
    const seqStream = data.subarray(startOffset + seqBitsStart, startOffset + blockSize - (startOffset - startOffset));
    const headerBytes = fwdReader.bytesConsumed;
    const totalHeaderFromStart = offset - startOffset + fwdReader.bytesConsumed - (offset - startOffset);
    const fseTablesStart = offset;
    const bitstreamStart = fseTablesStart + fwdReader.bytesConsumed - (fseTablesStart - startOffset);
    const bitstreamOffset = fwdReader.bytesConsumed;
    const bitstreamData = data.subarray(bitstreamOffset);
    if (bitstreamData.length === 0 || numSequences === 0) {
        return {
            output: Buffer.from(literals),
            bytesRead: bitstreamOffset - startOffset
        };
    }
    const bwdReader = new BackwardBitReader(bitstreamData);
    let llState = bwdReader.readBits(llTable.log);
    let ofState = bwdReader.readBits(ofTable.log);
    let mlState = bwdReader.readBits(mlTable.log);
    const sequences = [];
    for(let i = 0; i < numSequences; i++){
        const ofEntry = ofTable.entries[ofState];
        const ofCode = ofEntry.symbol;
        const mlEntry = mlTable.entries[mlState];
        const mlCode = mlEntry.symbol;
        const llEntry = llTable.entries[llState];
        const llCode = llEntry.symbol;
        let offset;
        if (ofCode > 0) {
            const extraBits = ofCode - 1;
            offset = (1 << ofCode) + (extraBits > 0 ? bwdReader.readBits(extraBits) : 0);
        } else {
            offset = 1;
        }
        const mlExtraBits = ML_BITS[mlCode] || 0;
        const matchLen = ML_BASELINE[mlCode] + (mlExtraBits > 0 ? bwdReader.readBits(mlExtraBits) : 0);
        const llExtraBits = LL_BITS[llCode] || 0;
        const litLen = LL_BASELINE[llCode] + (llExtraBits > 0 ? bwdReader.readBits(llExtraBits) : 0);
        let actualOffset;
        if (offset <= 3) {
            if (litLen > 0) {
                if (offset === 1) actualOffset = state.repOffsets[0];
                else if (offset === 2) actualOffset = state.repOffsets[1];
                else actualOffset = state.repOffsets[2];
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
                if (offset === 1) actualOffset = state.repOffsets[1];
                else if (offset === 2) actualOffset = state.repOffsets[2];
                else {
                    actualOffset = state.repOffsets[0] - 1;
                    if (actualOffset === 0) actualOffset = 1;
                }
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
        sequences.push({
            litLen,
            matchLen,
            offset: actualOffset
        });
        if (i < numSequences - 1) {
            llState = llEntry.newState + bwdReader.readBits(llEntry.nBits);
            mlState = mlEntry.newState + bwdReader.readBits(mlEntry.nBits);
            ofState = ofEntry.newState + bwdReader.readBits(ofEntry.nBits);
        }
    }
    const output = [];
    let litPos = 0;
    for (const seq of sequences){
        for(let i = 0; i < seq.litLen; i++){
            const byte = litPos < literals.length ? literals[litPos++] : 0;
            output.push(byte);
            window.push(byte);
        }
        for(let i = 0; i < seq.matchLen; i++){
            const srcPos = window.length - seq.offset;
            if (srcPos < 0) {
                output.push(0);
                window.push(0);
            } else {
                const byte = window[srcPos];
                output.push(byte);
                window.push(byte);
            }
        }
    }
    while(litPos < literals.length){
        const byte = literals[litPos++];
        output.push(byte);
        window.push(byte);
    }
    return {
        output: Buffer.from(output),
        bytesRead: data.length - startOffset
    };
}
function readFrameHeader(data, offset) {
    const magic = data.readUInt32LE(offset);
    if (magic !== ZSTD_MAGIC) throw new Error(`Invalid zstd magic: 0x${magic.toString(16)}`);
    const fhd = data[offset + 4];
    const dictionaryIdFlag = fhd & 3;
    const checksumFlag = !!(fhd & 4);
    const singleSegment = !!(fhd & 32);
    const fcsField = fhd >>> 6 & 3;
    let pos = offset + 5;
    let windowSize;
    if (!singleSegment) {
        const wd = data[pos++];
        const exponent = wd >>> 3 & 0x1F;
        const mantissa = wd & 7;
        const base = 1 << 10 + exponent;
        windowSize = base + (base >>> 3) * mantissa;
    } else {
        windowSize = 0;
    }
    let dictionaryId = null;
    if (dictionaryIdFlag === 1) {
        dictionaryId = data[pos++];
    } else if (dictionaryIdFlag === 2) {
        dictionaryId = data.readUInt16LE(pos);
        pos += 2;
    } else if (dictionaryIdFlag === 3) {
        dictionaryId = data.readUInt32LE(pos);
        pos += 4;
    }
    let contentSize = null;
    if (fcsField === 0 && singleSegment) {
        contentSize = data[pos++];
    } else if (fcsField === 1) {
        contentSize = data.readUInt16LE(pos) + 256;
        pos += 2;
    } else if (fcsField === 2) {
        contentSize = data.readUInt32LE(pos);
        pos += 4;
    } else if (fcsField === 3) {
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
        headerSize: pos - offset
    };
}
class ZstdDecompressStream extends Transform {
    inputBuf = Buffer.alloc(0);
    window = [];
    windowSize = 0;
    maxWindowSize = 128 * 1024 * 1024;
    blockState = {
        huffTable: null,
        repOffsets: [
            1,
            4,
            8
        ]
    };
    inFrame = false;
    frameHeader = null;
    frameFinished = false;
    totalOutput = 0;
    constructor(){
        super();
    }
    _transform(chunk, encoding, callback) {
        this.inputBuf = Buffer.concat([
            this.inputBuf,
            chunk
        ]);
        try {
            this.processInput();
            callback();
        } catch (err) {
            callback(err);
        }
    }
    _flush(callback) {
        try {
            this.processInput();
            callback();
        } catch (err) {
            callback(err);
        }
    }
    processInput() {
        while(this.inputBuf.length > 0){
            if (!this.inFrame) {
                if (this.inputBuf.length < 4) return;
                const magic = this.inputBuf.readUInt32LE(0);
                if (magic >= SKIPPABLE_MAGIC_LOW && magic <= SKIPPABLE_MAGIC_HIGH) {
                    if (this.inputBuf.length < 8) return;
                    const frameSize = this.inputBuf.readUInt32LE(4);
                    const totalSize = 8 + frameSize;
                    if (this.inputBuf.length < totalSize) return;
                    this.inputBuf = this.inputBuf.subarray(totalSize);
                    continue;
                }
                if (this.inputBuf.length < 5) return;
                try {
                    const header = readFrameHeader(this.inputBuf, 0);
                    if (this.inputBuf.length < header.headerSize) return;
                    this.frameHeader = header;
                    this.windowSize = Math.min(header.windowSize, this.maxWindowSize);
                    this.window = [];
                    this.blockState = {
                        huffTable: null,
                        repOffsets: [
                            1,
                            4,
                            8
                        ]
                    };
                    this.inFrame = true;
                    this.frameFinished = false;
                    this.inputBuf = this.inputBuf.subarray(header.headerSize);
                } catch  {
                    return;
                }
            }
            if (this.frameFinished) {
                if (this.frameHeader.checksumFlag) {
                    if (this.inputBuf.length < 4) return;
                    this.inputBuf = this.inputBuf.subarray(4);
                }
                this.inFrame = false;
                continue;
            }
            if (this.inputBuf.length < 3) return;
            const blockHeader = this.inputBuf[0] | this.inputBuf[1] << 8 | this.inputBuf[2] << 16;
            const lastBlock = blockHeader & 1;
            const blockType = blockHeader >>> 1 & 3;
            const blockSize = blockHeader >>> 3;
            let blockDataSize;
            if (blockType === BLOCK_TYPE_RLE) {
                blockDataSize = 1;
            } else {
                blockDataSize = blockSize;
            }
            if (this.inputBuf.length < 3 + blockDataSize) return;
            const blockData = this.inputBuf.subarray(3, 3 + blockDataSize);
            this.inputBuf = this.inputBuf.subarray(3 + blockDataSize);
            let output;
            switch(blockType){
                case BLOCK_TYPE_RAW:
                    output = Buffer.from(blockData);
                    for(let i = 0; i < output.length; i++){
                        this.window.push(output[i]);
                    }
                    break;
                case BLOCK_TYPE_RLE:
                    output = Buffer.alloc(blockSize, blockData[0]);
                    for(let i = 0; i < blockSize; i++){
                        this.window.push(blockData[0]);
                    }
                    break;
                case BLOCK_TYPE_COMPRESSED:
                    output = this.decompressBlock(blockData, blockSize);
                    break;
                default:
                    throw new Error(`Reserved block type: ${blockType}`);
            }
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
    decompressBlock(data, regeneratedSize) {
        let offset = 0;
        const { literals, bytesRead: litBytes } = readLiterals(data, offset, this.blockState);
        offset += litBytes;
        const seqData = data.subarray(offset);
        const { output } = readSequences(seqData, 0, seqData.length, literals, this.blockState, this.window);
        return output;
    }
}
function decompressZstd(input) {
    const chunks = [];
    const stream = new ZstdDecompressStream();
    stream.on('data', (chunk)=>chunks.push(chunk));
    stream.write(input);
    stream.end();
    return Buffer.concat(chunks);
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/lib/zstd.ts

exports.decompressZstd = decompressZstd;
exports.ZstdDecompressStream = ZstdDecompressStream;
