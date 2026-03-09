import { cborDecode, cborEncode } from '../lib/cbor';
import { EventEmitter } from 'events';
import { Multiplexer, MuxSegment } from './mux';
import { MINI_PROTOCOL_IDS } from '../config/networks';
import { ChainPoint } from './chain-sync';
import { logger } from '../config/logger';

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

export type BlockFetchEvent =
  | { type: 'startBatch' }
  | { type: 'noBlocks' }
  | { type: 'block'; body: Buffer }
  | { type: 'batchDone' };

export class BlockFetchClient extends EventEmitter {
  private pendingBlocks: Buffer[] = [];

  constructor(private mux: Multiplexer) {
    super();
    this.mux.on(`protocol:${MINI_PROTOCOL_IDS.BLOCK_FETCH}`, (segment: MuxSegment) => {
      this.handleMessage(segment.payload);
    });
  }

  /**
   * Request a range of blocks (from → to).
   * For a single block, from and to are the same point.
   */
  requestRange(from: ChainPoint, to: ChainPoint): void {
    const fromEncoded = [from.slot, Buffer.from(from.hash, 'hex')];
    const toEncoded = [to.slot, Buffer.from(to.hash, 'hex')];
    const msg = cborEncode([0, [fromEncoded, toEncoded]]);
    logger.debug(`BlockFetch: requesting range slot ${from.slot} → ${to.slot}`);
    this.mux.send(MINI_PROTOCOL_IDS.BLOCK_FETCH, msg);
  }

  /**
   * Request a single block by point.
   */
  requestBlock(point: ChainPoint): void {
    this.requestRange(point, point);
  }

  /**
   * Notify server we're done fetching.
   */
  clientDone(): void {
    const msg = cborEncode([1]);
    this.mux.send(MINI_PROTOCOL_IDS.BLOCK_FETCH, msg);
  }

  /**
   * Fetch a single block and return it as a promise.
   */
  fetchBlock(point: ChainPoint, timeoutMs = 30000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`BlockFetch timeout for slot ${point.slot}`));
      }, timeoutMs);

      const onEvent = (evt: BlockFetchEvent) => {
        if (evt.type === 'block') {
          clearTimeout(timeout);
          this.removeListener('event', onEvent);
          resolve(evt.body);
        } else if (evt.type === 'noBlocks') {
          clearTimeout(timeout);
          this.removeListener('event', onEvent);
          reject(new Error(`No blocks available for slot ${point.slot}`));
        } else if (evt.type === 'batchDone') {
          clearTimeout(timeout);
          this.removeListener('event', onEvent);
          // If we got here without a block, something went wrong
          reject(new Error(`Batch done without block for slot ${point.slot}`));
        }
      };

      this.on('event', onEvent);
      this.requestBlock(point);
    });
  }

  private handleMessage(payload: Buffer): void {
    try {
      const msg = cborDecode(payload);
      if (!Array.isArray(msg)) {
        logger.warn('BlockFetch: non-array message');
        return;
      }

      const msgType = msg[0];

      switch (msgType) {
        case 2: // MsgStartBatch
          this.emit('event', { type: 'startBatch' } as BlockFetchEvent);
          break;

        case 3: // MsgNoBlocks
          logger.warn('BlockFetch: no blocks');
          this.emit('event', { type: 'noBlocks' } as BlockFetchEvent);
          break;

        case 4: { // MsgBlock [4, body]
          const body = Buffer.isBuffer(msg[1]) ? msg[1] : Buffer.from(cborEncode(msg[1]));
          this.emit('event', { type: 'block', body } as BlockFetchEvent);
          break;
        }

        case 5: // MsgBatchDone
          this.emit('event', { type: 'batchDone' } as BlockFetchEvent);
          break;

        default:
          logger.debug(`BlockFetch: unknown message type ${msgType}`);
      }
    } catch (err: any) {
      logger.error(`BlockFetch decode error: ${err.message}`);
    }
  }
}
