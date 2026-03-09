export interface NetworkConfig {
    name: string;
    networkMagic: number;
    relayNodes: {
        host: string;
        port: number;
    }[];
    byronGenesisHash: string;
    shelleyGenesisHash: string;
}
export declare const NETWORKS: Record<string, NetworkConfig>;
export declare const PROTOCOL_VERSIONS: Record<number, number>;
export declare const MINI_PROTOCOL_IDS: {
    readonly HANDSHAKE: 0;
    readonly CHAIN_SYNC: 2;
    readonly BLOCK_FETCH: 3;
    readonly TX_SUBMISSION: 4;
    readonly KEEP_ALIVE: 8;
};
