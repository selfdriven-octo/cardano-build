import { EventEmitter } from 'events';
import { Multiplexer } from './mux';
/**
 * Ouroboros ChainSync Mini-Protocol (Node-to-Node)
 *
 * State machine: StIdle → StIntersect / StNext
 *
 * Messages (client → server):
 *   MsgFindIntersect  = [4, [point, ...]]     - find common point
 *   MsgRequestNext    = [0]                     - request next header
 *
 * Messages (server → client):
 *   MsgIntersectFound    = [5, point, tip]     - intersection found
 *   MsgIntersectNotFound = [6, tip]            - no intersection
 *   MsgRollForward       = [2, header, tip]    - new block header
 *   MsgRollBackward      = [3, point, tip]     - rollback to point
 *   MsgAwaitReply        = [1]                  - server has no more blocks, wait
 *
 * Point = [slot, headerHash]  or  "origin" (= [] in CBOR)
 * Tip   = [point, blockNo, slotNo(?, sometimes not)]
 */
export interface ChainPoint {
    slot: number;
    hash: string;
}
export interface ChainTip {
    point: ChainPoint;
    blockNo: number;
}
export type ChainSyncEvent = {
    type: 'rollForward';
    header: Buffer;
    tip: ChainTip;
} | {
    type: 'rollBackward';
    point: ChainPoint;
    tip: ChainTip;
} | {
    type: 'awaitReply';
} | {
    type: 'intersectFound';
    point: ChainPoint;
    tip: ChainTip;
} | {
    type: 'intersectNotFound';
    tip: ChainTip;
};
export declare class ChainSyncClient extends EventEmitter {
    private mux;
    private waiting;
    constructor(mux: Multiplexer);
    /**
     * Find intersection point with the server's chain.
     * Send known points (recent block hashes) from our database.
     */
    findIntersect(points: ChainPoint[]): void;
    /**
     * Request the next block header from the server.
     */
    requestNext(): void;
    private handleMessage;
    isWaiting(): boolean;
}
