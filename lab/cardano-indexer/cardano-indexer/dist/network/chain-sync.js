"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainSyncClient = void 0;
const cbor_1 = require("../lib/cbor");
const events_1 = require("events");
const networks_1 = require("../config/networks");
const logger_1 = require("../config/logger");
function parsePoint(raw) {
    if (Array.isArray(raw) && raw.length >= 2) {
        const hash = Buffer.isBuffer(raw[1]) ? raw[1].toString('hex') : String(raw[1]);
        return { slot: Number(raw[0]), hash };
    }
    // Origin point
    return { slot: 0, hash: '' };
}
function parseTip(raw) {
    if (Array.isArray(raw) && raw.length >= 2) {
        return {
            point: parsePoint(raw[0]),
            blockNo: Number(raw[1]),
        };
    }
    return { point: { slot: 0, hash: '' }, blockNo: 0 };
}
function encodePoint(point) {
    if (point.slot === 0 && point.hash === '') {
        return []; // origin
    }
    return [point.slot, Buffer.from(point.hash, 'hex')];
}
class ChainSyncClient extends events_1.EventEmitter {
    mux;
    waiting = false;
    constructor(mux) {
        super();
        this.mux = mux;
        this.mux.on(`protocol:${networks_1.MINI_PROTOCOL_IDS.CHAIN_SYNC}`, (segment) => {
            this.handleMessage(segment.payload);
        });
    }
    /**
     * Find intersection point with the server's chain.
     * Send known points (recent block hashes) from our database.
     */
    findIntersect(points) {
        const encoded = points.map(encodePoint);
        const msg = (0, cbor_1.cborEncode)([4, encoded]);
        logger_1.logger.debug(`ChainSync: FindIntersect with ${points.length} points`);
        this.mux.send(networks_1.MINI_PROTOCOL_IDS.CHAIN_SYNC, msg);
    }
    /**
     * Request the next block header from the server.
     */
    requestNext() {
        const msg = (0, cbor_1.cborEncode)([0]);
        this.mux.send(networks_1.MINI_PROTOCOL_IDS.CHAIN_SYNC, msg);
    }
    handleMessage(payload) {
        try {
            const msg = (0, cbor_1.cborDecode)(payload);
            if (!Array.isArray(msg)) {
                logger_1.logger.warn('ChainSync: non-array message received');
                return;
            }
            const msgType = msg[0];
            switch (msgType) {
                case 1: // MsgAwaitReply
                    this.waiting = true;
                    this.emit('event', { type: 'awaitReply' });
                    break;
                case 2: { // MsgRollForward [2, header, tip]
                    this.waiting = false;
                    const header = Buffer.isBuffer(msg[1]) ? msg[1] : (0, cbor_1.cborEncode)(msg[1]);
                    const tip = parseTip(msg[2]);
                    this.emit('event', { type: 'rollForward', header, tip });
                    break;
                }
                case 3: { // MsgRollBackward [3, point, tip]
                    this.waiting = false;
                    const point = parsePoint(msg[1]);
                    const tip = parseTip(msg[2]);
                    logger_1.logger.info(`ChainSync: RollBackward to slot ${point.slot}`);
                    this.emit('event', { type: 'rollBackward', point, tip });
                    break;
                }
                case 5: { // MsgIntersectFound [5, point, tip]
                    const point = parsePoint(msg[1]);
                    const tip = parseTip(msg[2]);
                    logger_1.logger.info(`ChainSync: IntersectFound at slot ${point.slot}, tip block ${tip.blockNo}`);
                    this.emit('event', { type: 'intersectFound', point, tip });
                    break;
                }
                case 6: { // MsgIntersectNotFound [6, tip]
                    const tip = parseTip(msg[1]);
                    logger_1.logger.warn(`ChainSync: IntersectNotFound, tip block ${tip.blockNo}`);
                    this.emit('event', { type: 'intersectNotFound', tip });
                    break;
                }
                default:
                    logger_1.logger.debug(`ChainSync: unknown message type ${msgType}`);
            }
        }
        catch (err) {
            logger_1.logger.error(`ChainSync decode error: ${err.message}`);
        }
    }
    isWaiting() {
        return this.waiting;
    }
}
exports.ChainSyncClient = ChainSyncClient;
//# sourceMappingURL=chain-sync.js.map