const net = require("net");
const { EventEmitter } = require("events");
const { logger } = require("../config/logger");
const MUX_HEADER_SIZE = 8;
class Multiplexer extends EventEmitter {
    host;
    port;
    socket;
    buffer = Buffer.alloc(0);
    connected = false;
    constructor(host, port){
        super(), this.host = host, this.port = port;
        this.socket = new net.Socket();
        this.socket.on('data', (data)=>this.onData(data));
        this.socket.on('error', (err)=>{
            logger.error(`Socket error: ${err.message}`, {
                host,
                port
            });
            this.emit('error', err);
        });
        this.socket.on('close', ()=>{
            this.connected = false;
            logger.info('Socket closed', {
                host,
                port
            });
            this.emit('close');
        });
    }
    async connect(timeoutMs = 30000) {
        return new Promise((resolve, reject)=>{
            const timeout = setTimeout(()=>{
                reject(new Error(`Connection timeout to ${this.host}:${this.port}`));
                this.socket.destroy();
            }, timeoutMs);
            this.socket.connect(this.port, this.host, ()=>{
                clearTimeout(timeout);
                this.connected = true;
                logger.info(`Connected to ${this.host}:${this.port}`);
                resolve();
            });
            this.socket.once('error', (err)=>{
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
        header.writeUInt16BE(protocolId & 0x7fff, 4);
        header.writeUInt16BE(payload.length, 6);
        const frame = Buffer.concat([
            header,
            payload
        ]);
        logger.debug(`MUX SEND proto=${protocolId} len=${payload.length} hex=${frame.toString('hex').substring(0, 120)}`);
        this.socket.write(frame);
    }
    onData(data) {
        logger.debug(`MUX RECV raw ${data.length} bytes: ${data.toString('hex').substring(0, 120)}`);
        this.buffer = Buffer.concat([
            this.buffer,
            data
        ]);
        while(this.buffer.length >= MUX_HEADER_SIZE){
            const payloadLen = this.buffer.readUInt16BE(6);
            const totalLen = MUX_HEADER_SIZE + payloadLen;
            if (this.buffer.length < totalLen) {
                break;
            }
            const rawProtocolId = this.buffer.readUInt16BE(4);
            const isResponse = (rawProtocolId & 0x8000) !== 0;
            const protocolId = rawProtocolId & 0x7fff;
            const payload = this.buffer.subarray(MUX_HEADER_SIZE, totalLen);
            this.buffer = this.buffer.subarray(totalLen);
            const segment = {
                protocolId,
                payload: Buffer.from(payload),
                isResponse
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


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/network/mux.ts

exports.Multiplexer = Multiplexer;
