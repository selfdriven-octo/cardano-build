import { cborDecode, cborEncode } from '../lib/cbor';
import { Multiplexer } from './mux';
import { MINI_PROTOCOL_IDS } from '../config/networks';
import { logger } from '../config/logger';

/**
 * Ouroboros Handshake Mini-Protocol (Node-to-Node)
 *
 * The handshake negotiates protocol version between peers.
 *
 * Message types:
 *   MsgProposeVersions = [0, versionMap]
 *     where versionMap = { versionNumber: networkMagic }
 *   MsgAcceptVersion = [1, versionNumber, params]
 *   MsgRefuse = [2, reason]
 *   MsgQueryReply = [3, versionMap]
 *
 * For N2N, version params include: networkMagic, initiatorOnlyDiffusionMode, peerSharing, query
 */

export interface HandshakeResult {
  accepted: boolean;
  version?: number;
  reason?: string;
}

export async function performHandshake(
  mux: Multiplexer,
  networkMagic: number,
  timeoutMs = 15000
): Promise<HandshakeResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Handshake timeout'));
    }, timeoutMs);

    // Ensure mux errors during handshake don't become uncaught exceptions
    const errorHandler = (err: Error) => {
      cleanup();
      reject(new Error(`Connection error during handshake: ${err.message}`));
    };

    const closeHandler = () => {
      cleanup();
      reject(new Error('Connection closed during handshake'));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      mux.removeListener('error', errorHandler);
      mux.removeListener('close', closeHandler);
    };

    mux.on('error', errorHandler);
    mux.on('close', closeHandler);

    // Listen for handshake response
    const handler = (segment: { payload: Buffer }) => {
      cleanup();
      try {
        const msg = cborDecode(segment.payload);
        logger.debug('Handshake response received', { msg: JSON.stringify(msg) });

        if (Array.isArray(msg)) {
          const msgType = msg[0];
          if (msgType === 1) {
            // MsgAcceptVersion [1, version, params]
            const version = msg[1];
            logger.info(`Handshake accepted, version: ${version}`);
            resolve({ accepted: true, version });
          } else if (msgType === 2) {
            // MsgRefuse [2, reason]
            const reason = JSON.stringify(msg[1]);
            logger.warn(`Handshake refused: ${reason}`);
            resolve({ accepted: false, reason });
          } else {
            logger.warn(`Unexpected handshake message type: ${msgType}`);
            resolve({ accepted: false, reason: `Unknown msg type: ${msgType}` });
          }
        } else {
          resolve({ accepted: false, reason: 'Invalid handshake response' });
        }
      } catch (err: any) {
        reject(new Error(`Handshake decode error: ${err.message}`));
      }
    };

    mux.once(`protocol:${MINI_PROTOCOL_IDS.HANDSHAKE}`, handler);

    // Build MsgProposeVersions
    // N2N versions 7-13, each with params [networkMagic, initiatorOnlyDiffusionMode, peerSharing, query]
    // We propose multiple versions to maximize compatibility
    const versionMap = new Map<number, any>();

    // N2N version params: [networkMagic, initiatorOnlyDiffusionMode, peerSharing, query]
    // initiatorOnlyDiffusionMode = true  (we are a read-only client)
    // peerSharing = 0  (PeerSharingDisabled)
    // query = false
    // Only propose v14-15 (v13 removed in cardano-node 10.5.0+, v11-12 had PeerSharing bugs)
    for (const v of [14, 15]) {
      versionMap.set(v, [networkMagic, true, 0, false]);
    }

    const proposeMsg = cborEncode([0, versionMap]);
    logger.debug(`Sending handshake propose with network magic: ${networkMagic}`);
    mux.send(MINI_PROTOCOL_IDS.HANDSHAKE, proposeMsg);
  });
}
