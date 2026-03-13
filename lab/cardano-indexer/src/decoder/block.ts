import { cborEncode } from '../lib/cbor';
import { decodeCbor, ERA_NAMES, toHex, blake2b256, safeNumber } from './cbor';
import { decodeTransaction, decodeByronTransaction, DecodedTransaction } from './transaction';
import { logger } from '../config/logger';

/**
 * Cardano Block Decoder
 *
 * Handles two input formats:
 *
 * 1) Full blocks (from Mithril bootstrap / immutable DB):
 *    [eraId, [header, txBodies, txWitnesses, metadata, invalidTxs]]
 *    where header = [headerBody, headerSig]
 *
 * 2) N2N ChainSync headers (from live sync):
 *    [eraId, [headerBody, headerSig]]
 *    headerBody = [blockNumber, slot, prevHash, issuerVkey, vrfVkey,
 *                  nonceVrf, leaderVrf, bodySize, bodyHash, opCert, protocolVersion]
 *
 * The decoder auto-detects which format by checking the inner structure.
 *
 * Byron block structure is different and handled separately.
 */

export interface DecodedBlock {
  era: string;
  eraId: number;
  height: number;
  slot: number;
  hash: string;
  prevHash: string;
  issuerVkey: string;
  blockSize: number;
  txCount: number;
  transactions: DecodedTransaction[];
  timestamp: number;
  epoch: number | null;
  epochSlot: number | null;
}

// Cardano mainnet shelley start slot and epoch info
const SHELLEY_START_SLOT = 4492800;   // slot when Shelley started on mainnet
const SHELLEY_START_TIME = 1596491091; // unix timestamp when Shelley started
const SLOT_DURATION = 1;               // 1 second per slot in Shelley+
const BYRON_SLOT_DURATION = 20;        // 20 seconds per slot in Byron
const SLOTS_PER_EPOCH = 432000;        // 5 days

export function decodeBlock(rawBlock: Buffer): DecodedBlock {
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

function decodeShelleyBlock(blockData: any, eraId: number, era: string): DecodedBlock {
  // blockData could be CBOR bytes or already decoded
  let block: any;
  if (Buffer.isBuffer(blockData)) {
    block = decodeCbor(blockData);
  } else {
    block = blockData;
  }

  if (!Array.isArray(block)) {
    throw new Error(`Unexpected Shelley block structure for era ${era}`);
  }

  // Detect whether this is a full block or an N2N ChainSync header.
  //
  // Full block: [header, txBodies, txWitnesses, metadata, invalidTxs]
  //   header = [headerBody, headerSig] → block[0] is a 2-element array
  //   block.length >= 3
  //
  // N2N header: [headerBody, headerSig]
  //   headerBody = [blockNumber, slot, prevHash, ...] → block[0] has 8+ elements
  //   block.length === 2
  //
  const isHeaderOnly = block.length === 2
    && Array.isArray(block[0])
    && block[0].length >= 8;

  let headerBody: any;
  let txBodies: any[] = [];
  let txWitnessSets: any[] = [];
  let auxData: any = null;
  let invalidTxs: any[] = [];

  if (isHeaderOnly) {
    // N2N ChainSync header: block = [headerBody, headerSig]
    headerBody = block[0];
  } else {
    // Full block: block = [header, txBodies, txWitnesses, metadata, invalidTxs]
    const header = block[0];
    txBodies = block[1] || [];
    txWitnessSets = block[2] || [];
    auxData = block[3];
    invalidTxs = block[4] || [];

    // header = [headerBody, headerSig]
    headerBody = Array.isArray(header) ? header[0] : header;
  }

  // Parse headerBody fields:
  // [blockNumber, slot, prevHash, issuerVkey, vrfVkey,
  //  nonceVrf, leaderVrf, bodySize, bodyHash, opCert, protocolVersion]
  let blockNumber = 0;
  let slot = 0;
  let prevHash = '';
  let issuerVkey = '';
  let bodySize = 0;

  if (Array.isArray(headerBody)) {
    blockNumber = safeNumber(headerBody[0]);
    slot = safeNumber(headerBody[1]);
    prevHash = Buffer.isBuffer(headerBody[2]) ? toHex(headerBody[2]) : '';
    issuerVkey = Buffer.isBuffer(headerBody[3]) ? toHex(headerBody[3]) : '';
    bodySize = safeNumber(headerBody[7] || 0);
  } else if (headerBody instanceof Map) {
    blockNumber = safeNumber(headerBody.get(0) || 0);
    slot = safeNumber(headerBody.get(1) || 0);
    prevHash = Buffer.isBuffer(headerBody.get(2)) ? toHex(headerBody.get(2)) : '';
    issuerVkey = Buffer.isBuffer(headerBody.get(3)) ? toHex(headerBody.get(3)) : '';
    bodySize = safeNumber(headerBody.get(7) || 0);
  }

  // Compute block hash from headerBody CBOR
  const headerBytes = Buffer.from(cborEncode(headerBody));
  const blockHash = toHex(blake2b256(headerBytes));

  // Calculate timestamp from slot
  const timestamp = slotToTimestamp(slot);

  // Calculate epoch
  const epoch = slot >= SHELLEY_START_SLOT
    ? Math.floor((slot - SHELLEY_START_SLOT) / SLOTS_PER_EPOCH) + 208
    : null;
  const epochSlot = slot >= SHELLEY_START_SLOT
    ? (slot - SHELLEY_START_SLOT) % SLOTS_PER_EPOCH
    : null;

  // Parse transactions (only available in full blocks, not N2N headers)
  const invalidSet = new Set(Array.isArray(invalidTxs) ? invalidTxs.map(safeNumber) : []);
  const transactions: DecodedTransaction[] = [];

  if (!isHeaderOnly && Array.isArray(txBodies)) {
    for (let i = 0; i < txBodies.length; i++) {
      try {
        const txBody = txBodies[i];
        const witnesses = Array.isArray(txWitnessSets) ? txWitnessSets[i] : null;
        const isValid = !invalidSet.has(i);
        const metadata = auxData instanceof Map ? auxData.get(i) : null;

        const fullTx = [txBody, witnesses, isValid, metadata];
        const decodedTx = decodeTransaction(fullTx, eraId);
        decodedTx.validContract = isValid;
        transactions.push(decodedTx);
      } catch (err: any) {
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
    epochSlot,
  };
}

function decodeByronBlock(blockData: any, eraId: number, era: string): DecodedBlock {
  let block: any;
  if (Buffer.isBuffer(blockData)) {
    block = decodeCbor(blockData);
  } else {
    block = blockData;
  }

  // Byron blocks: [header, body, extra]
  // Byron EBB: [header, body]
  // The header contains epoch, slot, etc.

  let blockNumber = 0;
  let slot = 0;
  let prevHash = '';
  let issuerVkey = '';
  const transactions: DecodedTransaction[] = [];

  if (eraId === 0) {
    // Epoch Boundary Block — no transactions
    if (Array.isArray(block) && block.length >= 1) {
      const header = block[0];
      if (Array.isArray(header)) {
        // EBB header: [protocolMagic, prevHash, bodyHash, consensusData]
        prevHash = Buffer.isBuffer(header[1]) ? toHex(header[1]) : '';
        // consensusData for EBB = [epoch, difficulty]
        const consensus = header[3];
        if (Array.isArray(consensus)) {
          const epoch = safeNumber(consensus[0]);
          slot = epoch * 21600; // Byron: 21600 slots per epoch
        }
      }
    }
  } else {
    // Regular Byron block
    if (Array.isArray(block) && block.length >= 2) {
      const header = block[0];
      const body = block[1];

      if (Array.isArray(header)) {
        prevHash = Buffer.isBuffer(header[1]) ? toHex(header[1]) : '';
        // Consensus data = [slotId, pubkey, difficulty, signature]
        const consensus = header[3];
        if (Array.isArray(consensus)) {
          const slotId = consensus[0];
          if (Array.isArray(slotId)) {
            const epoch = safeNumber(slotId[0]);
            const slotInEpoch = safeNumber(slotId[1]);
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
              transactions.push(decodeByronTransaction(txRaw));
            } catch (err: any) {
              logger.debug(`Failed to decode Byron tx: ${err.message}`);
            }
          }
        }
      }
    }
  }

  // Compute block hash
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
    epochSlot: slot % 21600,
  };
}

function slotToTimestamp(slot: number): number {
  if (slot >= SHELLEY_START_SLOT) {
    return SHELLEY_START_TIME + (slot - SHELLEY_START_SLOT) * SLOT_DURATION;
  }
  // Byron era: 20 seconds per slot, started at 1506203091 (mainnet)
  const BYRON_START_TIME = 1506203091;
  return BYRON_START_TIME + slot * BYRON_SLOT_DURATION;
}
