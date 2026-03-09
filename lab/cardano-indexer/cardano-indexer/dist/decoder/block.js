"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBlock = decodeBlock;
const cbor_1 = require("../lib/cbor");
const cbor_2 = require("./cbor");
const transaction_1 = require("./transaction");
const logger_1 = require("../config/logger");
// Cardano mainnet shelley start slot and epoch info
const SHELLEY_START_SLOT = 4492800; // slot when Shelley started on mainnet
const SHELLEY_START_TIME = 1596491091; // unix timestamp when Shelley started
const SLOT_DURATION = 1; // 1 second per slot in Shelley+
const BYRON_SLOT_DURATION = 20; // 20 seconds per slot in Byron
const SLOTS_PER_EPOCH = 432000; // 5 days
function decodeBlock(rawBlock) {
    const decoded = (0, cbor_2.decodeCbor)(rawBlock);
    if (!Array.isArray(decoded) || decoded.length < 2) {
        throw new Error('Invalid block structure: expected [eraId, blockData]');
    }
    const eraId = (0, cbor_2.safeNumber)(decoded[0]);
    const blockData = decoded[1];
    const era = cbor_2.ERA_NAMES[eraId] || `Unknown(${eraId})`;
    if (eraId <= 1) {
        return decodeByronBlock(blockData, eraId, era);
    }
    return decodeShelleyBlock(blockData, eraId, era);
}
function decodeShelleyBlock(blockData, eraId, era) {
    // blockData could be CBOR bytes or already decoded
    let block;
    if (Buffer.isBuffer(blockData)) {
        block = (0, cbor_2.decodeCbor)(blockData);
    }
    else {
        block = blockData;
    }
    if (!Array.isArray(block)) {
        throw new Error(`Unexpected Shelley block structure for era ${era}`);
    }
    // [header, txBodies, txWitnessesSet, auxData, invalidTxIndices]
    const header = block[0];
    const txBodies = block[1] || [];
    const txWitnessSets = block[2] || [];
    const auxData = block[3]; // metadata map
    const invalidTxs = block[4] || []; // set of indices
    // Parse header
    const headerBody = Array.isArray(header) ? header[0] : header;
    let blockNumber = 0;
    let slot = 0;
    let prevHash = '';
    let issuerVkey = '';
    let bodySize = 0;
    let bodyHash = '';
    if (Array.isArray(headerBody)) {
        blockNumber = (0, cbor_2.safeNumber)(headerBody[0]);
        slot = (0, cbor_2.safeNumber)(headerBody[1]);
        prevHash = Buffer.isBuffer(headerBody[2]) ? (0, cbor_2.toHex)(headerBody[2]) : '';
        issuerVkey = Buffer.isBuffer(headerBody[3]) ? (0, cbor_2.toHex)(headerBody[3]) : '';
        // headerBody[4] = vrfVkey
        // headerBody[5] = vrfResult (nonce)
        // headerBody[6] = vrfResult (leader)
        bodySize = (0, cbor_2.safeNumber)(headerBody[7] || 0);
        bodyHash = Buffer.isBuffer(headerBody[8]) ? (0, cbor_2.toHex)(headerBody[8]) : '';
    }
    else if (headerBody instanceof Map) {
        blockNumber = (0, cbor_2.safeNumber)(headerBody.get(0) || 0);
        slot = (0, cbor_2.safeNumber)(headerBody.get(1) || 0);
        prevHash = Buffer.isBuffer(headerBody.get(2)) ? (0, cbor_2.toHex)(headerBody.get(2)) : '';
        issuerVkey = Buffer.isBuffer(headerBody.get(3)) ? (0, cbor_2.toHex)(headerBody.get(3)) : '';
        bodySize = (0, cbor_2.safeNumber)(headerBody.get(7) || 0);
    }
    // Compute block hash from the header CBOR
    const headerBytes = Buffer.from((0, cbor_1.cborEncode)(Array.isArray(header) ? header[0] : header));
    const blockHash = (0, cbor_2.toHex)((0, cbor_2.blake2b256)(headerBytes));
    // Calculate timestamp from slot
    const timestamp = slotToTimestamp(slot);
    // Calculate epoch
    const epoch = slot >= SHELLEY_START_SLOT
        ? Math.floor((slot - SHELLEY_START_SLOT) / SLOTS_PER_EPOCH) + 208
        : null;
    const epochSlot = slot >= SHELLEY_START_SLOT
        ? (slot - SHELLEY_START_SLOT) % SLOTS_PER_EPOCH
        : null;
    // Parse transactions
    const invalidSet = new Set(Array.isArray(invalidTxs) ? invalidTxs.map(cbor_2.safeNumber) : []);
    const transactions = [];
    if (Array.isArray(txBodies)) {
        for (let i = 0; i < txBodies.length; i++) {
            try {
                // Build full tx structure for decoding
                const txBody = txBodies[i];
                const witnesses = Array.isArray(txWitnessSets) ? txWitnessSets[i] : null;
                const isValid = !invalidSet.has(i);
                const metadata = auxData instanceof Map ? auxData.get(i) : null;
                const fullTx = [txBody, witnesses, isValid, metadata];
                const decodedTx = (0, transaction_1.decodeTransaction)(fullTx, eraId);
                decodedTx.validContract = isValid;
                transactions.push(decodedTx);
            }
            catch (err) {
                logger_1.logger.warn(`Failed to decode tx ${i} in block ${blockNumber}: ${err.message}`);
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
        epochSlot,
    };
}
function decodeByronBlock(blockData, eraId, era) {
    let block;
    if (Buffer.isBuffer(blockData)) {
        block = (0, cbor_2.decodeCbor)(blockData);
    }
    else {
        block = blockData;
    }
    // Byron blocks: [header, body, extra]
    // Byron EBB: [header, body]
    // The header contains epoch, slot, etc.
    let blockNumber = 0;
    let slot = 0;
    let prevHash = '';
    let issuerVkey = '';
    const transactions = [];
    if (eraId === 0) {
        // Epoch Boundary Block — no transactions
        if (Array.isArray(block) && block.length >= 1) {
            const header = block[0];
            if (Array.isArray(header)) {
                // EBB header: [protocolMagic, prevHash, bodyHash, consensusData]
                prevHash = Buffer.isBuffer(header[1]) ? (0, cbor_2.toHex)(header[1]) : '';
                // consensusData for EBB = [epoch, difficulty]
                const consensus = header[3];
                if (Array.isArray(consensus)) {
                    const epoch = (0, cbor_2.safeNumber)(consensus[0]);
                    slot = epoch * 21600; // Byron: 21600 slots per epoch
                }
            }
        }
    }
    else {
        // Regular Byron block
        if (Array.isArray(block) && block.length >= 2) {
            const header = block[0];
            const body = block[1];
            if (Array.isArray(header)) {
                prevHash = Buffer.isBuffer(header[1]) ? (0, cbor_2.toHex)(header[1]) : '';
                // Consensus data = [slotId, pubkey, difficulty, signature]
                const consensus = header[3];
                if (Array.isArray(consensus)) {
                    const slotId = consensus[0];
                    if (Array.isArray(slotId)) {
                        const epoch = (0, cbor_2.safeNumber)(slotId[0]);
                        const slotInEpoch = (0, cbor_2.safeNumber)(slotId[1]);
                        slot = epoch * 21600 + slotInEpoch;
                        blockNumber = slot; // Byron doesn't have block numbers, use slot
                    }
                }
            }
            // Body contains: [txPayload, sscPayload, dlgPayload, updPayload]
            if (Array.isArray(body) && body.length >= 1) {
                const txPayload = body[0];
                if (Array.isArray(txPayload)) {
                    for (const txRaw of txPayload) {
                        try {
                            transactions.push((0, transaction_1.decodeByronTransaction)(txRaw));
                        }
                        catch (err) {
                            logger_1.logger.debug(`Failed to decode Byron tx: ${err.message}`);
                        }
                    }
                }
            }
        }
    }
    // Compute block hash
    const blockBytes = Buffer.from((0, cbor_1.cborEncode)(block));
    const blockHash = (0, cbor_2.toHex)((0, cbor_2.blake2b256)(blockBytes));
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
        epochSlot: slot % 21600,
    };
}
function slotToTimestamp(slot) {
    if (slot >= SHELLEY_START_SLOT) {
        return SHELLEY_START_TIME + (slot - SHELLEY_START_SLOT) * SLOT_DURATION;
    }
    // Byron era: 20 seconds per slot, started at 1506203091 (mainnet)
    const BYRON_START_TIME = 1506203091;
    return BYRON_START_TIME + slot * BYRON_SLOT_DURATION;
}
//# sourceMappingURL=block.js.map