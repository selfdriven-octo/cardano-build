const { cborDecode, cborEncode } = require("../lib/cbor");
const { Multiplexer, MuxSegment } = require("./mux");
const { MINI_PROTOCOL_IDS } = require("../config/networks");
const { logger } = require("../config/logger");
class KeepAliveClient {
    mux;
    timer = null;
    cookie = 0;
    pendingResponse = false;
    missedResponses = 0;
    constructor(mux){
        this.mux = mux;
        this.mux.on(`protocol:${MINI_PROTOCOL_IDS.KEEP_ALIVE}`, (segment)=>{
            this.handleMessage(segment.payload);
        });
    }
    start(intervalMs = 10000) {
        if (this.timer) return;
        this.sendPing();
        this.timer = setInterval(()=>{
            if (this.pendingResponse) {
                this.missedResponses++;
                logger.debug(`KeepAlive: no response to previous ping (missed=${this.missedResponses})`);
            }
            this.sendPing();
        }, intervalMs);
        logger.debug(`KeepAlive: started (interval=${intervalMs}ms)`);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.pendingResponse = false;
        this.missedResponses = 0;
    }
    sendPing() {
        try {
            this.cookie = this.cookie + 1 & 0xffff;
            const msg = cborEncode([
                0,
                this.cookie
            ]);
            this.mux.send(MINI_PROTOCOL_IDS.KEEP_ALIVE, msg);
            this.pendingResponse = true;
            logger.debug(`KeepAlive: ping sent (cookie=${this.cookie})`);
        } catch (err) {
            logger.debug(`KeepAlive: failed to send ping: ${err.message}`);
            this.stop();
        }
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
                case 1:
                    {
                        const responseCookie = msg[1];
                        this.pendingResponse = false;
                        this.missedResponses = 0;
                        logger.debug(`KeepAlive: pong received (cookie=${responseCookie})`);
                        break;
                    }
                case 0:
                    {
                        const cookie = msg[1];
                        logger.debug(`KeepAlive: unexpected server ping (cookie=${cookie}), responding`);
                        const response = cborEncode([
                            1,
                            cookie
                        ]);
                        this.mux.send(MINI_PROTOCOL_IDS.KEEP_ALIVE, response);
                        break;
                    }
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
