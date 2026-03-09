import { DecodedTransaction } from './transaction';
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
export declare function decodeBlock(rawBlock: Buffer): DecodedBlock;
