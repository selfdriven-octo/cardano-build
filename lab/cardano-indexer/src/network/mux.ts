import net from 'net';
import { EventEmitter } from 'events';
import { logger } from '../config/logger';

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

export interface MuxSegment {
  protocolId: number;
  payload: Buffer;
  isResponse: boolean;
}

export class Multiplexer extends EventEmitter {
  private socket: net.Socket;
  private buffer: Buffer = Buffer.alloc(0);
  private connected = false;

  constructor(private host: string, private port: number) {
    super();
    this.socket = new net.Socket();
    this.socket.on('data', (data: Buffer) => this.onData(data));
    this.socket.on('error', (err) => {
      logger.error(`Socket error: ${err.message}`, { host, port });
      this.emit('error', err);
    });
    this.socket.on('close', () => {
      this.connected = false;
      logger.info('Socket closed', { host, port });
      this.emit('close');
    });
  }

  async connect(timeoutMs = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout to ${this.host}:${this.port}`));
        this.socket.destroy();
      }, timeoutMs);

      this.socket.connect(this.port, this.host, () => {
        clearTimeout(timeout);
        this.connected = true;
        logger.info(`Connected to ${this.host}:${this.port}`);
        resolve();
      });

      this.socket.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  send(protocolId: number, payload: Buffer): void {
    if (!this.connected) {
      throw new Error('Not connected');
    }

    const header = Buffer.alloc(MUX_HEADER_SIZE);
    const timestamp = Math.floor(Date.now() / 1000) & 0xffffffff;
    header.writeUInt32BE(timestamp, 0);
    // Initiator → Responder: bit 15 = 0, so just the protocol ID
    header.writeUInt16BE(protocolId & 0x7fff, 4);
    header.writeUInt16BE(payload.length, 6);

    const frame = Buffer.concat([header, payload]);
    logger.debug(`MUX SEND proto=${protocolId} len=${payload.length} hex=${frame.toString('hex').substring(0, 120)}`);
    this.socket.write(frame);
  }

  private onData(data: Buffer): void {
    logger.debug(`MUX RECV raw ${data.length} bytes: ${data.toString('hex').substring(0, 120)}`);
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

      const segment: MuxSegment = {
        protocolId,
        payload: Buffer.from(payload),
        isResponse,
      };

      this.emit('segment', segment);
      this.emit(`protocol:${protocolId}`, segment);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  close(): void {
    this.connected = false;
    this.socket.destroy();
  }
}
