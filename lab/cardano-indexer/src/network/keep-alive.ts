import { cborDecode, cborEncode } from '../lib/cbor';
import { Multiplexer, MuxSegment } from './mux';
import { MINI_PROTOCOL_IDS } from '../config/networks';
import { logger } from '../config/logger';

/**
 * Ouroboros KeepAlive Mini-Protocol (Node-to-Node)
 *
 * In the Ouroboros N2N protocol, the CLIENT is the initiator and must
 * send periodic MsgKeepAlive pings. The SERVER responds with
 * MsgKeepAliveResponse. If the server doesn't receive pings within
 * its timeout window, it drops the connection (ECONNRESET).
 *
 * Messages:
 *   MsgKeepAlive         = [0, cookie]    — client ping (cookie is uint16)
 *   MsgKeepAliveResponse = [1, cookie]    — server pong (echoes the cookie)
 *   MsgDone              = [2]            — client terminates the protocol
 *
 * Agency:
 *   StClient → client sends MsgKeepAlive → StServer
 *   StServer → server sends MsgKeepAliveResponse → StClient
 *   StClient → client sends MsgDone → StDone
 */
export class KeepAliveClient {
  private timer: ReturnType<typeof setInterval> | null = null;
  private cookie = 0;
  private pendingResponse = false;
  private missedResponses = 0;

  constructor(private mux: Multiplexer) {
    this.mux.on(`protocol:${MINI_PROTOCOL_IDS.KEEP_ALIVE}`, (segment: MuxSegment) => {
      this.handleMessage(segment.payload);
    });
  }

  /**
   * Start sending periodic KeepAlive pings.
   * Should be called after the handshake completes.
   */
  start(intervalMs = 10000): void {
    if (this.timer) return;

    // Send the first ping immediately
    this.sendPing();

    this.timer = setInterval(() => {
      if (this.pendingResponse) {
        this.missedResponses++;
        logger.debug(`KeepAlive: no response to previous ping (missed=${this.missedResponses})`);
        // Don't stop — the server may just be slow; the TCP timeout
        // or the server's own KeepAlive timeout will handle dead connections.
      }
      this.sendPing();
    }, intervalMs);

    logger.debug(`KeepAlive: started (interval=${intervalMs}ms)`);
  }

  /**
   * Stop sending pings and clean up the timer.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.pendingResponse = false;
    this.missedResponses = 0;
  }

  private sendPing(): void {
    try {
      this.cookie = (this.cookie + 1) & 0xffff; // uint16 wrapping
      const msg = cborEncode([0, this.cookie]);
      this.mux.send(MINI_PROTOCOL_IDS.KEEP_ALIVE, msg);
      this.pendingResponse = true;
      logger.debug(`KeepAlive: ping sent (cookie=${this.cookie})`);
    } catch (err: any) {
      logger.debug(`KeepAlive: failed to send ping: ${err.message}`);
      this.stop();
    }
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
        case 1: {
          // MsgKeepAliveResponse [1, cookie] — server pong
          const responseCookie = msg[1];
          this.pendingResponse = false;
          this.missedResponses = 0;
          logger.debug(`KeepAlive: pong received (cookie=${responseCookie})`);
          break;
        }

        case 0: {
          // MsgKeepAlive from server — shouldn't happen in standard N2N
          // but handle gracefully by echoing the cookie
          const cookie = msg[1];
          logger.debug(`KeepAlive: unexpected server ping (cookie=${cookie}), responding`);
          const response = cborEncode([1, cookie]);
          this.mux.send(MINI_PROTOCOL_IDS.KEEP_ALIVE, response);
          break;
        }

        default:
          logger.debug(`KeepAlive: unknown message type ${msgType}`);
      }
    } catch (err: any) {
      logger.error(`KeepAlive decode error: ${err.message}`);
    }
  }
}
