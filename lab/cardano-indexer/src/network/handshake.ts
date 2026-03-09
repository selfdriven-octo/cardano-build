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
      reject(new Error('Handshake timeout'));
    }, timeoutMs);

    // Listen for handshake response
    const handler = (segment: { payload: Buffer }) => {
      clearTimeout(timeout);
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

    // Version 13 (latest): [networkMagic, initiatorOnlyDiffusionMode, peerSharing, query]
    // peerSharing: 0=NoPeerSharing, 1=PeerSharingPublic, 2=PeerSharingPrivate
    for (const v of [13, 12, 11, 10]) {
      if (v >= 11) {
        versionMap.set(v, [networkMagic, false, 0, false]);
      } else {
        versionMap.set(v, [networkMagic, false]);
      }
    }

    const proposeMsg = cborEncode([0, versionMap]);
    logger.debug(`Sending handshake propose with network magic: ${networkMagic}`);
    mux.send(MINI_PROTOCOL_IDS.HANDSHAKE, proposeMsg);
  });
}
