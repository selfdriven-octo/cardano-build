import { EventEmitter } from 'events';
import { Multiplexer } from './mux';
import { ChainPoint } from './chain-sync';
/**
 * Ouroboros BlockFetch Mini-Protocol (Node-to-Node)
 *
 * Messages (client → server):
 *   MsgRequestRange  = [0, [from_point, to_point]]    - request block range
 *   MsgClientDone    = [1]                              - done fetching
 *
 * Messages (server → client):
 *   MsgStartBatch    = [2]                              - batch starting
 *   MsgNoBlocks      = [3]                              - no blocks available
 *   MsgBlock         = [4, blockBody]                   - a block body
 *   MsgBatchDone     = [5]                              - end of batch
 */
export type BlockFetchEvent = {
    type: 'startBatch';
} | {
    type: 'noBlocks';
} | {
    type: 'block';
    body: Buffer;
} | {
    type: 'batchDone';
};
export declare class BlockFetchClient extends EventEmitter {
    private mux;
    private pendingBlocks;
    constructor(mux: Multiplexer);
    /**
     * Request a range of blocks (from → to).
     * For a single block, from and to are the same point.
     */
    requestRange(from: ChainPoint, to: ChainPoint): void;
    /**
     * Request a single block by point.
     */
    requestBlock(point: ChainPoint): void;
    /**
     * Notify server we're done fetching.
     */
    clientDone(): void;
    /**
     * Fetch a single block and return it as a promise.
     */
    fetchBlock(point: ChainPoint, timeoutMs?: number): Promise<Buffer>;
    private handleMessage;
}
