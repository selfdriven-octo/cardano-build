import { cborEncode } from '../lib/cbor';
import { decodeCbor, ERA_NAMES, toHex, blake2b256, safeNumber } from './cbor';
import { decodeTransaction, decodeByronTransaction, DecodedTransaction } from './transaction';
import { logger } from '../config/logger';

/**
 * Cardano Block Decoder
 *
 * N2N ChainSync delivers wrapped blocks as: [eraId, blockCbor]
 *
 * Shelley+ block structure: [header, txBodies, txWitnesses, metadata, invalidTxs]
 *   header = [headerBody, headerSig]
 *   headerBody = [blockNumber, slot, prevHash, issuerVkey, vrfVkey, nonceVrf, leaderVrf, bodySize, bodyHash, opCert, protocolVersion]
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

/**
 * Parse a ChainSync header to extract the block point (slot + hash).
 * ChainSync N2N delivers [eraId, headerCBOR] — not the full block.
 * We parse just enough to get the slot and compute the header hash.
 */
export function parseChainSyncHeader(rawHeader: Buffer): { eraId: number; slot: number; hash: string; height: number } {
  const decoded = decodeCbor(rawHeader);

  if (!Array.isArray(decoded) || decoded.length < 2) {
    throw new Error('Invalid header structure: expected [eraId, headerData]');
  }

  const eraId = safeNumber(decoded[0]);
  let headerData = decoded[1];

  // If headerData is a Buffer, decode it
  if (Buffer.isBuffer(headerData)) {
    headerData = decodeCbor(headerData);
  }

  let slot = 0;
  let height = 0;

  if (eraId <= 1) {
    // Byron header
    if (Array.isArray(headerData)) {
      if (eraId === 0) {
        // EBB header: [protocolMagic, prevHash, bodyHash, consensusData]
        const consensus = headerData[3];
        if (Array.isArray(consensus)) {
          const epoch = safeNumber(consensus[0]);
          slot = epoch * 21600;
        }
      } else {
        // Byron main header: [protocolMagic, prevHash, bodyHash, consensusData]
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
    // Shelley+ header: [headerBody, headerSig]
    // headerBody = [blockNumber, slot, prevHash, issuerVkey, ...]
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

  // Compute header hash from the headerBody CBOR
  let hashInput: Buffer;
  if (eraId <= 1) {
    hashInput = Buffer.from(cborEncode(headerData));
  } else {
    const hBody = Array.isArray(headerData) ? headerData[0] : headerData;
    hashInput = Buffer.from(cborEncode(hBody));
  }
  const hash = toHex(blake2b256(hashInput));

  return { eraId, slot, hash, height };
}

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
    blockNumber = safeNumber(headerBody[0]);
    slot = safeNumber(headerBody[1]);
    prevHash = Buffer.isBuffer(headerBody[2]) ? toHex(headerBody[2]) : '';
    issuerVkey = Buffer.isBuffer(headerBody[3]) ? toHex(headerBody[3]) : '';
    // headerBody[4] = vrfVkey
    // headerBody[5] = vrfResult (nonce)
    // headerBody[6] = vrfResult (leader)
    bodySize = safeNumber(headerBody[7] || 0);
    bodyHash = Buffer.isBuffer(headerBody[8]) ? toHex(headerBody[8]) : '';
  } else if (headerBody instanceof Map) {
    blockNumber = safeNumber(headerBody.get(0) || 0);
    slot = safeNumber(headerBody.get(1) || 0);
    prevHash = Buffer.isBuffer(headerBody.get(2)) ? toHex(headerBody.get(2)) : '';
    issuerVkey = Buffer.isBuffer(headerBody.get(3)) ? toHex(headerBody.get(3)) : '';
    bodySize = safeNumber(headerBody.get(7) || 0);
  }

  // Compute block hash from the header CBOR
  const headerBytes = Buffer.from(cborEncode(Array.isArray(header) ? header[0] : header));
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

  // Parse transactions
  const invalidSet = new Set(Array.isArray(invalidTxs) ? invalidTxs.map(safeNumber) : []);
  const transactions: DecodedTransaction[] = [];

  if (Array.isArray(txBodies)) {
    for (let i = 0; i < txBodies.length; i++) {
      try {
        // Build full tx structure for decoding
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
