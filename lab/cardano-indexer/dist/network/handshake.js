"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performHandshake = performHandshake;
const cbor_1 = require("../lib/cbor");
const networks_1 = require("../config/networks");
const logger_1 = require("../config/logger");
async function performHandshake(mux, networkMagic, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Handshake timeout'));
        }, timeoutMs);
        // Ensure mux errors during handshake don't become uncaught exceptions
        const errorHandler = (err) => {
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
        const handler = (segment) => {
            cleanup();
            try {
                const msg = (0, cbor_1.cborDecode)(segment.payload);
                logger_1.logger.debug('Handshake response received', { msg: JSON.stringify(msg) });
                if (Array.isArray(msg)) {
                    const msgType = msg[0];
                    if (msgType === 1) {
                        // MsgAcceptVersion [1, version, params]
                        const version = msg[1];
                        logger_1.logger.info(`Handshake accepted, version: ${version}`);
                        resolve({ accepted: true, version });
                    }
                    else if (msgType === 2) {
                        // MsgRefuse [2, reason]
                        const reason = JSON.stringify(msg[1]);
                        logger_1.logger.warn(`Handshake refused: ${reason}`);
                        resolve({ accepted: false, reason });
                    }
                    else {
                        logger_1.logger.warn(`Unexpected handshake message type: ${msgType}`);
                        resolve({ accepted: false, reason: `Unknown msg type: ${msgType}` });
                    }
                }
                else {
                    resolve({ accepted: false, reason: 'Invalid handshake response' });
                }
            }
            catch (err) {
                reject(new Error(`Handshake decode error: ${err.message}`));
            }
        };
        mux.once(`protocol:${networks_1.MINI_PROTOCOL_IDS.HANDSHAKE}`, handler);
        // Build MsgProposeVersions
        // N2N versions 7-13, each with params [networkMagic, initiatorOnlyDiffusionMode, peerSharing, query]
        // We propose multiple versions to maximize compatibility
        const versionMap = new Map();
        // N2N version params: [networkMagic, initiatorOnlyDiffusionMode, peerSharing, query]
        // initiatorOnlyDiffusionMode = true  (we are a read-only client)
        // peerSharing = 0  (PeerSharingDisabled)
        // query = false
        // Only propose v14-15 (v13 removed in cardano-node 10.5.0+, v11-12 had PeerSharing bugs)
        for (const v of [14, 15]) {
            versionMap.set(v, [networkMagic, true, 0, false]);
        }
        const proposeMsg = (0, cbor_1.cborEncode)([0, versionMap]);
        logger_1.logger.debug(`Sending handshake propose with network magic: ${networkMagic}`);
        mux.send(networks_1.MINI_PROTOCOL_IDS.HANDSHAKE, proposeMsg);
    });
}
//# sourceMappingURL=handshake.js.map