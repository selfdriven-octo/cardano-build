import { EventEmitter } from 'events';
export interface MuxSegment {
    protocolId: number;
    payload: Buffer;
    isResponse: boolean;
}
export declare class Multiplexer extends EventEmitter {
    private host;
    private port;
    private socket;
    private buffer;
    private connected;
    constructor(host: string, port: number);
    connect(timeoutMs?: number): Promise<void>;
    send(protocolId: number, payload: Buffer): void;
    private onData;
    isConnected(): boolean;
    close(): void;
}
