import { Multiplexer } from './mux';
import { HandshakeResult } from './handshake';
import { ChainSyncClient } from './chain-sync';
import { BlockFetchClient } from './block-fetch';
export interface NodeConnection {
    mux: Multiplexer;
    chainSync: ChainSyncClient;
    blockFetch: BlockFetchClient;
    handshakeResult: HandshakeResult;
    close(): void;
}
/**
 * Connect to a Cardano relay node and perform the handshake.
 * Returns a NodeConnection with ready-to-use ChainSync and BlockFetch clients.
 */
export declare function connectToNode(host: string, port: number, networkMagic: number): Promise<NodeConnection>;
/**
 * Try to connect to one of several relay nodes.
 * Returns the first successful connection.
 */
export declare function connectToRelay(relays: {
    host: string;
    port: number;
}[], networkMagic: number): Promise<NodeConnection>;
