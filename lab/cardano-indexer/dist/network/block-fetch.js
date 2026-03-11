const { cborDecode, cborEncode } = require("../lib/cbor");
const { EventEmitter } = require("events");
const { Multiplexer, MuxSegment } = require("./mux");
const { MINI_PROTOCOL_IDS } = require("../config/networks");
const { ChainPoint } = require("./chain-sync");
const { logger } = require("../config/logger");
class BlockFetchClient extends EventEmitter {
    mux;
    pendingBlocks = [];
    constructor(mux){
        super(), this.mux = mux;
        this.mux.on(`protocol:${MINI_PROTOCOL_IDS.BLOCK_FETCH}`, (segment)=>{
            this.handleMessage(segment.payload);
        });
    }
    requestRange(from, to) {
        const fromEncoded = [
            from.slot,
            Buffer.from(from.hash, 'hex')
        ];
        const toEncoded = [
            to.slot,
            Buffer.from(to.hash, 'hex')
        ];
        const msg = cborEncode([
            0,
            [
                fromEncoded,
                toEncoded
            ]
        ]);
        logger.debug(`BlockFetch: requesting range slot ${from.slot} → ${to.slot}`);
        this.mux.send(MINI_PROTOCOL_IDS.BLOCK_FETCH, msg);
    }
    requestBlock(point) {
        this.requestRange(point, point);
    }
    clientDone() {
        const msg = cborEncode([
            1
        ]);
        this.mux.send(MINI_PROTOCOL_IDS.BLOCK_FETCH, msg);
    }
    fetchBlock(point, timeoutMs = 30000) {
        return new Promise((resolve, reject)=>{
            const timeout = setTimeout(()=>{
                reject(new Error(`BlockFetch timeout for slot ${point.slot}`));
            }, timeoutMs);
            const onEvent = (evt)=>{
                if (evt.type === 'block') {
                    clearTimeout(timeout);
                    this.removeListener('event', onEvent);
                    resolve(evt.body);
                } else if (evt.type === 'noBlocks') {
                    clearTimeout(timeout);
                    this.removeListener('event', onEvent);
                    reject(new Error(`No blocks available for slot ${point.slot}`));
                } else if (evt.type === 'batchDone') {
                    clearTimeout(timeout);
                    this.removeListener('event', onEvent);
                    reject(new Error(`Batch done without block for slot ${point.slot}`));
                }
            };
            this.on('event', onEvent);
            this.requestBlock(point);
        });
    }
    handleMessage(payload) {
        try {
            const msg = cborDecode(payload);
            if (!Array.isArray(msg)) {
                logger.warn('BlockFetch: non-array message');
                return;
            }
            const msgType = msg[0];
            switch(msgType){
                case 2:
                    this.emit('event', {
                        type: 'startBatch'
                    });
                    break;
                case 3:
                    logger.warn('BlockFetch: no blocks');
                    this.emit('event', {
                        type: 'noBlocks'
                    });
                    break;
                case 4:
                    {
                        const body = Buffer.isBuffer(msg[1]) ? msg[1] : Buffer.from(cborEncode(msg[1]));
                        this.emit('event', {
                            type: 'block',
                            body
                        });
                        break;
                    }
                case 5:
                    this.emit('event', {
                        type: 'batchDone'
                    });
                    break;
                default:
                    logger.debug(`BlockFetch: unknown message type ${msgType}`);
            }
        } catch (err) {
            logger.error(`BlockFetch decode error: ${err.message}`);
        }
    }
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/network/block-fetch.ts

exports.BlockFetchClient = BlockFetchClient;
