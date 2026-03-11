const { cborDecode, cborEncode } = require("../lib/cbor");
const { Multiplexer } = require("./mux");
const { MINI_PROTOCOL_IDS } = require("../config/networks");
const { logger } = require("../config/logger");
async function performHandshake(mux, networkMagic, timeoutMs = 15000) {
    return new Promise((resolve, reject)=>{
        const timeout = setTimeout(()=>{
            cleanup();
            reject(new Error('Handshake timeout'));
        }, timeoutMs);
        const errorHandler = (err)=>{
            cleanup();
            reject(new Error(`Connection error during handshake: ${err.message}`));
        };
        const closeHandler = ()=>{
            cleanup();
            reject(new Error('Connection closed during handshake'));
        };
        const cleanup = ()=>{
            clearTimeout(timeout);
            mux.removeListener('error', errorHandler);
            mux.removeListener('close', closeHandler);
        };
        mux.on('error', errorHandler);
        mux.on('close', closeHandler);
        const handler = (segment)=>{
            cleanup();
            try {
                const msg = cborDecode(segment.payload);
                logger.debug('Handshake response received', {
                    msg: JSON.stringify(msg)
                });
                if (Array.isArray(msg)) {
                    const msgType = msg[0];
                    if (msgType === 1) {
                        const version = msg[1];
                        logger.info(`Handshake accepted, version: ${version}`);
                        resolve({
                            accepted: true,
                            version
                        });
                    } else if (msgType === 2) {
                        const reason = JSON.stringify(msg[1]);
                        logger.warn(`Handshake refused: ${reason}`);
                        resolve({
                            accepted: false,
                            reason
                        });
                    } else {
                        logger.warn(`Unexpected handshake message type: ${msgType}`);
                        resolve({
                            accepted: false,
                            reason: `Unknown msg type: ${msgType}`
                        });
                    }
                } else {
                    resolve({
                        accepted: false,
                        reason: 'Invalid handshake response'
                    });
                }
            } catch (err) {
                reject(new Error(`Handshake decode error: ${err.message}`));
            }
        };
        mux.once(`protocol:${MINI_PROTOCOL_IDS.HANDSHAKE}`, handler);
        const versionMap = new Map();
        for (const v of [
            14,
            15
        ]){
            versionMap.set(v, [
                networkMagic,
                true,
                0,
                false
            ]);
        }
        const proposeMsg = cborEncode([
            0,
            versionMap
        ]);
        logger.debug(`Sending handshake propose with network magic: ${networkMagic}`);
        mux.send(MINI_PROTOCOL_IDS.HANDSHAKE, proposeMsg);
    });
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/network/handshake.ts

exports.performHandshake = performHandshake;
