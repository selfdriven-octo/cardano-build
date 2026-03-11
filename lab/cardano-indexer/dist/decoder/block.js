const { cborEncode } = require("../lib/cbor");
const { decodeCbor, ERA_NAMES, toHex, blake2b256, safeNumber } = require("./cbor");
const { decodeTransaction, decodeByronTransaction, DecodedTransaction } = require("./transaction");
const { logger } = require("../config/logger");
const SHELLEY_START_SLOT = 4492800;
const SHELLEY_START_TIME = 1596491091;
const SLOT_DURATION = 1;
const BYRON_SLOT_DURATION = 20;
const SLOTS_PER_EPOCH = 432000;
function parseChainSyncHeader(rawHeader) {
    const decoded = decodeCbor(rawHeader);
    if (!Array.isArray(decoded) || decoded.length < 2) {
        throw new Error('Invalid header structure: expected [eraId, headerData]');
    }
    const eraId = safeNumber(decoded[0]);
    let headerData = decoded[1];
    if (Buffer.isBuffer(headerData)) {
        headerData = decodeCbor(headerData);
    }
    let slot = 0;
    let height = 0;
    if (eraId <= 1) {
        if (Array.isArray(headerData)) {
            if (eraId === 0) {
                const consensus = headerData[3];
                if (Array.isArray(consensus)) {
                    const epoch = safeNumber(consensus[0]);
                    slot = epoch * 21600;
                }
            } else {
                const consensus = headerData[3];
                if (Array.isArray(consensus)) {
                    const slotId = consensus[0];
                    if (Array.isArray(slotId)) {
                        const epoch = safeNumber(slotId[0]);
                        const slotInEpoch = safeNumber(slotId[1]);
                        slot = epoch * 21600 + slotInEpoch;
                        height = slot;
                    }
                }
            }
        }
    } else {
        if (Array.isArray(headerData)) {
            const headerBody = Array.isArray(headerData[0]) ? headerData[0] : headerData;
            if (Array.isArray(headerBody)) {
                height = safeNumber(headerBody[0]);
                slot = safeNumber(headerBody[1]);
            } else if (headerBody instanceof Map) {
                height = safeNumber(headerBody.get(0) || 0);
                slot = safeNumber(headerBody.get(1) || 0);
            }
        }
    }
    let hashInput;
    if (eraId <= 1) {
        hashInput = Buffer.from(cborEncode(headerData));
    } else {
        const hBody = Array.isArray(headerData) ? headerData[0] : headerData;
        hashInput = Buffer.from(cborEncode(hBody));
    }
    const hash = toHex(blake2b256(hashInput));
    return {
        eraId,
        slot,
        hash,
        height
    };
}
function decodeBlock(rawBlock) {
    const decoded = decodeCbor(rawBlock);
    if (!Array.isArray(decoded) || decoded.length < 2) {
        throw new Error('Invalid block structure: expected [eraId, blockData]');
    }
    const eraId = safeNumber(decoded[0]);
    const blockData = decoded[1];
    const era = ERA_NAMES[eraId] || `Unknown(${eraId})`;
    if (eraId <= 1) {
        return decodeByronBlock(blockData, eraId, era);
    }
    return decodeShelleyBlock(blockData, eraId, era);
}
function decodeShelleyBlock(blockData, eraId, era) {
    let block;
    if (Buffer.isBuffer(blockData)) {
        block = decodeCbor(blockData);
    } else {
        block = blockData;
    }
    if (!Array.isArray(block)) {
        throw new Error(`Unexpected Shelley block structure for era ${era}`);
    }
    const header = block[0];
    const txBodies = block[1] || [];
    const txWitnessSets = block[2] || [];
    const auxData = block[3];
    const invalidTxs = block[4] || [];
    const headerBody = Array.isArray(header) ? header[0] : header;
    let blockNumber = 0;
    let slot = 0;
    let prevHash = '';
    let issuerVkey = '';
    let bodySize = 0;
    let bodyHash = '';
    if (Array.isArray(headerBody)) {
        blockNumber = safeNumber(headerBody[0]);
        slot = safeNumber(headerBody[1]);
        prevHash = Buffer.isBuffer(headerBody[2]) ? toHex(headerBody[2]) : '';
        issuerVkey = Buffer.isBuffer(headerBody[3]) ? toHex(headerBody[3]) : '';
        bodySize = safeNumber(headerBody[7] || 0);
        bodyHash = Buffer.isBuffer(headerBody[8]) ? toHex(headerBody[8]) : '';
    } else if (headerBody instanceof Map) {
        blockNumber = safeNumber(headerBody.get(0) || 0);
        slot = safeNumber(headerBody.get(1) || 0);
        prevHash = Buffer.isBuffer(headerBody.get(2)) ? toHex(headerBody.get(2)) : '';
        issuerVkey = Buffer.isBuffer(headerBody.get(3)) ? toHex(headerBody.get(3)) : '';
        bodySize = safeNumber(headerBody.get(7) || 0);
    }
    const headerBytes = Buffer.from(cborEncode(Array.isArray(header) ? header[0] : header));
    const blockHash = toHex(blake2b256(headerBytes));
    const timestamp = slotToTimestamp(slot);
    const epoch = slot >= SHELLEY_START_SLOT ? Math.floor((slot - SHELLEY_START_SLOT) / SLOTS_PER_EPOCH) + 208 : null;
    const epochSlot = slot >= SHELLEY_START_SLOT ? (slot - SHELLEY_START_SLOT) % SLOTS_PER_EPOCH : null;
    const invalidSet = new Set(Array.isArray(invalidTxs) ? invalidTxs.map(safeNumber) : []);
    const transactions = [];
    if (Array.isArray(txBodies)) {
        for(let i = 0; i < txBodies.length; i++){
            try {
                const txBody = txBodies[i];
                const witnesses = Array.isArray(txWitnessSets) ? txWitnessSets[i] : null;
                const isValid = !invalidSet.has(i);
                const metadata = auxData instanceof Map ? auxData.get(i) : null;
                const fullTx = [
                    txBody,
                    witnesses,
                    isValid,
                    metadata
                ];
                const decodedTx = decodeTransaction(fullTx, eraId);
                decodedTx.validContract = isValid;
                transactions.push(decodedTx);
            } catch (err) {
                logger.warn(`Failed to decode tx ${i} in block ${blockNumber}: ${err.message}`);
            }
        }
    }
    return {
        era,
        eraId,
        height: blockNumber,
        slot,
        hash: blockHash,
        prevHash,
        issuerVkey,
        blockSize: bodySize,
        txCount: transactions.length,
        transactions,
        timestamp,
        epoch,
        epochSlot
    };
}
function decodeByronBlock(blockData, eraId, era) {
    let block;
    if (Buffer.isBuffer(blockData)) {
        block = decodeCbor(blockData);
    } else {
        block = blockData;
    }
    let blockNumber = 0;
    let slot = 0;
    let prevHash = '';
    let issuerVkey = '';
    const transactions = [];
    if (eraId === 0) {
        if (Array.isArray(block) && block.length >= 1) {
            const header = block[0];
            if (Array.isArray(header)) {
                prevHash = Buffer.isBuffer(header[1]) ? toHex(header[1]) : '';
                const consensus = header[3];
                if (Array.isArray(consensus)) {
                    const epoch = safeNumber(consensus[0]);
                    slot = epoch * 21600;
                }
            }
        }
    } else {
        if (Array.isArray(block) && block.length >= 2) {
            const header = block[0];
            const body = block[1];
            if (Array.isArray(header)) {
                prevHash = Buffer.isBuffer(header[1]) ? toHex(header[1]) : '';
                const consensus = header[3];
                if (Array.isArray(consensus)) {
                    const slotId = consensus[0];
                    if (Array.isArray(slotId)) {
                        const epoch = safeNumber(slotId[0]);
                        const slotInEpoch = safeNumber(slotId[1]);
                        slot = epoch * 21600 + slotInEpoch;
                        blockNumber = slot;
                    }
                }
            }
            if (Array.isArray(body) && body.length >= 1) {
                const txPayload = body[0];
                if (Array.isArray(txPayload)) {
                    for (const txRaw of txPayload){
                        try {
                            transactions.push(decodeByronTransaction(txRaw));
                        } catch (err) {
                            logger.debug(`Failed to decode Byron tx: ${err.message}`);
                        }
                    }
                }
            }
        }
    }
    const blockBytes = Buffer.from(cborEncode(block));
    const blockHash = toHex(blake2b256(blockBytes));
    const timestamp = slotToTimestamp(slot);
    return {
        era,
        eraId,
        height: blockNumber,
        slot,
        hash: blockHash,
        prevHash,
        issuerVkey,
        blockSize: blockBytes.length,
        txCount: transactions.length,
        transactions,
        timestamp,
        epoch: Math.floor(slot / 21600),
        epochSlot: slot % 21600
    };
}
function slotToTimestamp(slot) {
    if (slot >= SHELLEY_START_SLOT) {
        return SHELLEY_START_TIME + (slot - SHELLEY_START_SLOT) * SLOT_DURATION;
    }
    const BYRON_START_TIME = 1506203091;
    return BYRON_START_TIME + slot * BYRON_SLOT_DURATION;
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/decoder/block.ts

exports.parseChainSyncHeader = parseChainSyncHeader;
exports.decodeBlock = decodeBlock;
