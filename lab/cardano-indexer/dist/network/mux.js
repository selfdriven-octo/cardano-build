"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Multiplexer = void 0;
const net_1 = __importDefault(require("net"));
const events_1 = require("events");
const logger_1 = require("../config/logger");
/**
 * Ouroboros Network Multiplexer
 *
 * The mux layer frames mini-protocol messages over a single TCP connection.
 * Each frame has an 8-byte header:
 *   - 4 bytes: transmission time (uint32, network byte order)
 *   - 2 bytes: mini-protocol ID (uint16, network byte order)
 *              bit 15 = direction (0=initiator→responder, 1=responder→initiator)
 *   - 2 bytes: payload length (uint16, network byte order)
 *
 * We are the initiator (client), so we send with bit 15 = 0 and receive with bit 15 = 1.
 */
const MUX_HEADER_SIZE = 8;
class Multiplexer extends events_1.EventEmitter {
    host;
    port;
    socket;
    buffer = Buffer.alloc(0);
    connected = false;
    constructor(host, port) {
        super();
        this.host = host;
        this.port = port;
        this.socket = new net_1.default.Socket();
        this.socket.on('data', (data) => this.onData(data));
        this.socket.on('error', (err) => {
            logger_1.logger.error(`Socket error: ${err.message}`, { host, port });
            this.emit('error', err);
        });
        this.socket.on('close', () => {
            this.connected = false;
            logger_1.logger.info('Socket closed', { host, port });
            this.emit('close');
        });
    }
    async connect(timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Connection timeout to ${this.host}:${this.port}`));
                this.socket.destroy();
            }, timeoutMs);
            this.socket.connect(this.port, this.host, () => {
                clearTimeout(timeout);
                this.connected = true;
                logger_1.logger.info(`Connected to ${this.host}:${this.port}`);
                resolve();
            });
            this.socket.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }
    send(protocolId, payload) {
        if (!this.connected) {
            throw new Error('Not connected');
        }
        const header = Buffer.alloc(MUX_HEADER_SIZE);
        const timestamp = Math.floor(Date.now() / 1000) & 0xffffffff;
        header.writeUInt32BE(timestamp, 0);
        // Initiator → Responder: bit 15 = 0, so just the protocol ID
        header.writeUInt16BE(protocolId & 0x7fff, 4);
        header.writeUInt16BE(payload.length, 6);
        this.socket.write(Buffer.concat([header, payload]));
    }
    onData(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        while (this.buffer.length >= MUX_HEADER_SIZE) {
            const payloadLen = this.buffer.readUInt16BE(6);
            const totalLen = MUX_HEADER_SIZE + payloadLen;
            if (this.buffer.length < totalLen) {
                break; // Wait for more data
            }
            const rawProtocolId = this.buffer.readUInt16BE(4);
            const isResponse = (rawProtocolId & 0x8000) !== 0;
            const protocolId = rawProtocolId & 0x7fff;
            const payload = this.buffer.subarray(MUX_HEADER_SIZE, totalLen);
            this.buffer = this.buffer.subarray(totalLen);
            const segment = {
                protocolId,
                payload: Buffer.from(payload),
                isResponse,
            };
            this.emit('segment', segment);
            this.emit(`protocol:${protocolId}`, segment);
        }
    }
    isConnected() {
        return this.connected;
    }
    close() {
        this.connected = false;
        this.socket.destroy();
    }
}
exports.Multiplexer = Multiplexer;
//# sourceMappingURL=mux.js.map