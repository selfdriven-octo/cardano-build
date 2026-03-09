"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performHandshake = performHandshake;
const cbor_1 = require("../lib/cbor");
const networks_1 = require("../config/networks");
const logger_1 = require("../config/logger");
async function performHandshake(mux, networkMagic, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Handshake timeout'));
        }, timeoutMs);
        // Listen for handshake response
        const handler = (segment) => {
            clearTimeout(timeout);
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
        // Version 13 (latest): [networkMagic, initiatorOnlyDiffusionMode, peerSharing, query]
        // peerSharing: 0=NoPeerSharing, 1=PeerSharingPublic, 2=PeerSharingPrivate
        for (const v of [13, 12, 11, 10]) {
            if (v >= 11) {
                versionMap.set(v, [networkMagic, false, 0, false]);
            }
            else {
                versionMap.set(v, [networkMagic, false]);
            }
        }
        const proposeMsg = (0, cbor_1.cborEncode)([0, versionMap]);
        logger_1.logger.debug(`Sending handshake propose with network magic: ${networkMagic}`);
        mux.send(networks_1.MINI_PROTOCOL_IDS.HANDSHAKE, proposeMsg);
    });
}
//# sourceMappingURL=handshake.js.map