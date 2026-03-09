import { cborDecode, cborEncode } from '../lib/cbor';
import { EventEmitter } from 'events';
import { Multiplexer, MuxSegment } from './mux';
import { MINI_PROTOCOL_IDS } from '../config/networks';
import { logger } from '../config/logger';

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
  hash: string; // hex
}

export interface ChainTip {
  point: ChainPoint;
  blockNo: number;
}

export type ChainSyncEvent =
  | { type: 'rollForward'; header: Buffer; tip: ChainTip }
  | { type: 'rollBackward'; point: ChainPoint; tip: ChainTip }
  | { type: 'awaitReply' }
  | { type: 'intersectFound'; point: ChainPoint; tip: ChainTip }
  | { type: 'intersectNotFound'; tip: ChainTip };

function parsePoint(raw: any): ChainPoint {
  if (Array.isArray(raw) && raw.length >= 2) {
    const hash = Buffer.isBuffer(raw[1]) ? raw[1].toString('hex') : String(raw[1]);
    return { slot: Number(raw[0]), hash };
  }
  // Origin point
  return { slot: 0, hash: '' };
}

function parseTip(raw: any): ChainTip {
  if (Array.isArray(raw) && raw.length >= 2) {
    return {
      point: parsePoint(raw[0]),
      blockNo: Number(raw[1]),
    };
  }
  return { point: { slot: 0, hash: '' }, blockNo: 0 };
}

function encodePoint(point: ChainPoint): any {
  if (point.slot === 0 && point.hash === '') {
    return []; // origin
  }
  return [point.slot, Buffer.from(point.hash, 'hex')];
}

export class ChainSyncClient extends EventEmitter {
  private waiting = false;

  constructor(private mux: Multiplexer) {
    super();
    this.mux.on(`protocol:${MINI_PROTOCOL_IDS.CHAIN_SYNC}`, (segment: MuxSegment) => {
      this.handleMessage(segment.payload);
    });
  }

  /**
   * Find intersection point with the server's chain.
   * Send known points (recent block hashes) from our database.
   */
  findIntersect(points: ChainPoint[]): void {
    const encoded = points.map(encodePoint);
    const msg = cborEncode([4, encoded]);
    logger.debug(`ChainSync: FindIntersect with ${points.length} points`);
    this.mux.send(MINI_PROTOCOL_IDS.CHAIN_SYNC, msg);
  }

  /**
   * Request the next block header from the server.
   */
  requestNext(): void {
    const msg = cborEncode([0]);
    this.mux.send(MINI_PROTOCOL_IDS.CHAIN_SYNC, msg);
  }

  private handleMessage(payload: Buffer): void {
    try {
      const msg = cborDecode(payload);
      if (!Array.isArray(msg)) {
        logger.warn('ChainSync: non-array message received');
        return;
      }

      const msgType = msg[0];

      switch (msgType) {
        case 1: // MsgAwaitReply
          this.waiting = true;
          this.emit('event', { type: 'awaitReply' } as ChainSyncEvent);
          break;

        case 2: { // MsgRollForward [2, header, tip]
          this.waiting = false;
          const header = Buffer.isBuffer(msg[1]) ? msg[1] : cborEncode(msg[1]);
          const tip = parseTip(msg[2]);
          this.emit('event', { type: 'rollForward', header, tip } as ChainSyncEvent);
          break;
        }

        case 3: { // MsgRollBackward [3, point, tip]
          this.waiting = false;
          const point = parsePoint(msg[1]);
          const tip = parseTip(msg[2]);
          logger.info(`ChainSync: RollBackward to slot ${point.slot}`);
          this.emit('event', { type: 'rollBackward', point, tip } as ChainSyncEvent);
          break;
        }

        case 5: { // MsgIntersectFound [5, point, tip]
          const point = parsePoint(msg[1]);
          const tip = parseTip(msg[2]);
          logger.info(`ChainSync: IntersectFound at slot ${point.slot}, tip block ${tip.blockNo}`);
          this.emit('event', { type: 'intersectFound', point, tip } as ChainSyncEvent);
          break;
        }

        case 6: { // MsgIntersectNotFound [6, tip]
          const tip = parseTip(msg[1]);
          logger.warn(`ChainSync: IntersectNotFound, tip block ${tip.blockNo}`);
          this.emit('event', { type: 'intersectNotFound', tip } as ChainSyncEvent);
          break;
        }

        default:
          logger.debug(`ChainSync: unknown message type ${msgType}`);
      }
    } catch (err: any) {
      logger.error(`ChainSync decode error: ${err.message}`);
    }
  }

  isWaiting(): boolean {
    return this.waiting;
  }
}
