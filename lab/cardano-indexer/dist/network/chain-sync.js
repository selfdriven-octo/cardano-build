const { cborDecode, cborEncode } = require("../lib/cbor");
const { EventEmitter } = require("events");
const { Multiplexer, MuxSegment } = require("./mux");
const { MINI_PROTOCOL_IDS } = require("../config/networks");
const { logger } = require("../config/logger");
function parsePoint(raw) {
    if (Array.isArray(raw) && raw.length >= 2) {
        const hash = Buffer.isBuffer(raw[1]) ? raw[1].toString('hex') : String(raw[1]);
        return {
            slot: Number(raw[0]),
            hash
        };
    }
    return {
        slot: 0,
        hash: ''
    };
}
function parseTip(raw) {
    if (Array.isArray(raw) && raw.length >= 2) {
        return {
            point: parsePoint(raw[0]),
            blockNo: Number(raw[1])
        };
    }
    return {
        point: {
            slot: 0,
            hash: ''
        },
        blockNo: 0
    };
}
function encodePoint(point) {
    if (point.slot === 0 && point.hash === '') {
        return [];
    }
    return [
        point.slot,
        Buffer.from(point.hash, 'hex')
    ];
}
class ChainSyncClient extends EventEmitter {
    mux;
    waiting = false;
    constructor(mux){
        super(), this.mux = mux;
        this.mux.on(`protocol:${MINI_PROTOCOL_IDS.CHAIN_SYNC}`, (segment)=>{
            this.handleMessage(segment.payload);
        });
    }
    findIntersect(points) {
        const encoded = points.map(encodePoint);
        const msg = cborEncode([
            4,
            encoded
        ]);
        logger.debug(`ChainSync: FindIntersect with ${points.length} points`);
        this.mux.send(MINI_PROTOCOL_IDS.CHAIN_SYNC, msg);
    }
    requestNext() {
        const msg = cborEncode([
            0
        ]);
        this.mux.send(MINI_PROTOCOL_IDS.CHAIN_SYNC, msg);
    }
    handleMessage(payload) {
        try {
            const msg = cborDecode(payload);
            if (!Array.isArray(msg)) {
                logger.warn('ChainSync: non-array message received');
                return;
            }
            const msgType = msg[0];
            switch(msgType){
                case 1:
                    this.waiting = true;
                    this.emit('event', {
                        type: 'awaitReply'
                    });
                    break;
                case 2:
                    {
                        this.waiting = false;
                        const header = Buffer.isBuffer(msg[1]) ? msg[1] : cborEncode(msg[1]);
                        const tip = parseTip(msg[2]);
                        this.emit('event', {
                            type: 'rollForward',
                            header,
                            tip
                        });
                        break;
                    }
                case 3:
                    {
                        this.waiting = false;
                        const point = parsePoint(msg[1]);
                        const tip = parseTip(msg[2]);
                        logger.info(`ChainSync: RollBackward to slot ${point.slot}`);
                        this.emit('event', {
                            type: 'rollBackward',
                            point,
                            tip
                        });
                        break;
                    }
                case 5:
                    {
                        const point = parsePoint(msg[1]);
                        const tip = parseTip(msg[2]);
                        logger.info(`ChainSync: IntersectFound at slot ${point.slot}, tip block ${tip.blockNo}`);
                        this.emit('event', {
                            type: 'intersectFound',
                            point,
                            tip
                        });
                        break;
                    }
                case 6:
                    {
                        const tip = parseTip(msg[1]);
                        logger.warn(`ChainSync: IntersectNotFound, tip block ${tip.blockNo}`);
                        this.emit('event', {
                            type: 'intersectNotFound',
                            tip
                        });
                        break;
                    }
                default:
                    logger.debug(`ChainSync: unknown message type ${msgType}`);
            }
        } catch (err) {
            logger.error(`ChainSync decode error: ${err.message}`);
        }
    }
    isWaiting() {
        return this.waiting;
    }
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/network/chain-sync.ts

exports.ChainSyncClient = ChainSyncClient;
