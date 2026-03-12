const { cborDecode, cborEncode } = require("../lib/cbor");
const { Multiplexer, MuxSegment } = require("./mux");
const { MINI_PROTOCOL_IDS } = require("../config/networks");
const { logger } = require("../config/logger");
class KeepAliveClient {
    mux;
    constructor(mux){
        this.mux = mux;
        this.mux.on(`protocol:${MINI_PROTOCOL_IDS.KEEP_ALIVE}`, (segment)=>{
            this.handleMessage(segment.payload);
        });
    }
    handleMessage(payload) {
        try {
            const msg = cborDecode(payload);
            if (!Array.isArray(msg)) {
                logger.warn('KeepAlive: non-array message received');
                return;
            }
            const msgType = msg[0];
            switch(msgType){
                case 0:
                    {
                        const cookie = msg[1];
                        logger.debug(`KeepAlive: ping received (cookie=${cookie}), sending pong`);
                        const response = cborEncode([
                            1,
                            cookie
                        ]);
                        this.mux.send(MINI_PROTOCOL_IDS.KEEP_ALIVE, response);
                        break;
                    }
                case 1:
                    logger.debug('KeepAlive: unexpected response received (ignoring)');
                    break;
                default:
                    logger.debug(`KeepAlive: unknown message type ${msgType}`);
            }
        } catch (err) {
            logger.error(`KeepAlive decode error: ${err.message}`);
        }
    }
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/network/keep-alive.ts

exports.KeepAliveClient = KeepAliveClient;
