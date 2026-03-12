import { cborDecode, cborEncode } from '../lib/cbor';
import { Multiplexer, MuxSegment } from './mux';
import { MINI_PROTOCOL_IDS } from '../config/networks';
import { logger } from '../config/logger';

/**
 * Ouroboros KeepAlive Mini-Protocol (Node-to-Node)
 *
 * The server periodically sends KeepAlive pings to check if the client
 * is still alive. The client MUST respond or the server will drop the
 * connection (ECONNRESET).
 *
 * Messages:
 *   MsgKeepAlive         = [0, cookie]    — server ping (cookie is uint16)
 *   MsgKeepAliveResponse = [1, cookie]    — client pong (echo the cookie)
 *   MsgDone              = [2]            — client wants to terminate
 */
export class KeepAliveClient {
  constructor(private mux: Multiplexer) {
    this.mux.on(`protocol:${MINI_PROTOCOL_IDS.KEEP_ALIVE}`, (segment: MuxSegment) => {
      this.handleMessage(segment.payload);
    });
  }

  private handleMessage(payload: Buffer): void {
    try {
      const msg = cborDecode(payload);
      if (!Array.isArray(msg)) {
        logger.warn('KeepAlive: non-array message received');
        return;
      }

      const msgType = msg[0];

      switch (msgType) {
        case 0: {
          // MsgKeepAlive [0, cookie] — respond with [1, cookie]
          const cookie = msg[1];
          logger.debug(`KeepAlive: ping received (cookie=${cookie}), sending pong`);
          const response = cborEncode([1, cookie]);
          this.mux.send(MINI_PROTOCOL_IDS.KEEP_ALIVE, response);
          break;
        }

        case 1:
          // MsgKeepAliveResponse — we shouldn't receive this as a client
          logger.debug('KeepAlive: unexpected response received (ignoring)');
          break;

        default:
          logger.debug(`KeepAlive: unknown message type ${msgType}`);
      }
    } catch (err: any) {
      logger.error(`KeepAlive decode error: ${err.message}`);
    }
  }
}
