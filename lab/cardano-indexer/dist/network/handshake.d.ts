import { Multiplexer } from './mux';
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
export declare function performHandshake(mux: Multiplexer, networkMagic: number, timeoutMs?: number): Promise<HandshakeResult>;
