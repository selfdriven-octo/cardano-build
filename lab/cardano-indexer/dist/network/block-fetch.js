"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockFetchClient = void 0;
const cbor_1 = require("../lib/cbor");
const events_1 = require("events");
const networks_1 = require("../config/networks");
const logger_1 = require("../config/logger");
class BlockFetchClient extends events_1.EventEmitter {
    mux;
    pendingBlocks = [];
    constructor(mux) {
        super();
        this.mux = mux;
        this.mux.on(`protocol:${networks_1.MINI_PROTOCOL_IDS.BLOCK_FETCH}`, (segment) => {
            this.handleMessage(segment.payload);
        });
    }
    /**
     * Request a range of blocks (from → to).
     * For a single block, from and to are the same point.
     */
    requestRange(from, to) {
        const fromEncoded = [from.slot, Buffer.from(from.hash, 'hex')];
        const toEncoded = [to.slot, Buffer.from(to.hash, 'hex')];
        const msg = (0, cbor_1.cborEncode)([0, [fromEncoded, toEncoded]]);
        logger_1.logger.debug(`BlockFetch: requesting range slot ${from.slot} → ${to.slot}`);
        this.mux.send(networks_1.MINI_PROTOCOL_IDS.BLOCK_FETCH, msg);
    }
    /**
     * Request a single block by point.
     */
    requestBlock(point) {
        this.requestRange(point, point);
    }
    /**
     * Notify server we're done fetching.
     */
    clientDone() {
        const msg = (0, cbor_1.cborEncode)([1]);
        this.mux.send(networks_1.MINI_PROTOCOL_IDS.BLOCK_FETCH, msg);
    }
    /**
     * Fetch a single block and return it as a promise.
     */
    fetchBlock(point, timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`BlockFetch timeout for slot ${point.slot}`));
            }, timeoutMs);
            const onEvent = (evt) => {
                if (evt.type === 'block') {
                    clearTimeout(timeout);
                    this.removeListener('event', onEvent);
                    resolve(evt.body);
                }
                else if (evt.type === 'noBlocks') {
                    clearTimeout(timeout);
                    this.removeListener('event', onEvent);
                    reject(new Error(`No blocks available for slot ${point.slot}`));
                }
                else if (evt.type === 'batchDone') {
                    clearTimeout(timeout);
                    this.removeListener('event', onEvent);
                    // If we got here without a block, something went wrong
                    reject(new Error(`Batch done without block for slot ${point.slot}`));
                }
            };
            this.on('event', onEvent);
            this.requestBlock(point);
        });
    }
    handleMessage(payload) {
        try {
            const msg = (0, cbor_1.cborDecode)(payload);
            if (!Array.isArray(msg)) {
                logger_1.logger.warn('BlockFetch: non-array message');
                return;
            }
            const msgType = msg[0];
            switch (msgType) {
                case 2: // MsgStartBatch
                    this.emit('event', { type: 'startBatch' });
                    break;
                case 3: // MsgNoBlocks
                    logger_1.logger.warn('BlockFetch: no blocks');
                    this.emit('event', { type: 'noBlocks' });
                    break;
                case 4: { // MsgBlock [4, body]
                    const body = Buffer.isBuffer(msg[1]) ? msg[1] : Buffer.from((0, cbor_1.cborEncode)(msg[1]));
                    this.emit('event', { type: 'block', body });
                    break;
                }
                case 5: // MsgBatchDone
                    this.emit('event', { type: 'batchDone' });
                    break;
                default:
                    logger_1.logger.debug(`BlockFetch: unknown message type ${msgType}`);
            }
        }
        catch (err) {
            logger_1.logger.error(`BlockFetch decode error: ${err.message}`);
        }
    }
}
exports.BlockFetchClient = BlockFetchClient;
//# sourceMappingURL=block-fetch.js.map