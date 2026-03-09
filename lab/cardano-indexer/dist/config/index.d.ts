import { NetworkConfig } from './networks';
export interface AppConfig {
    network: NetworkConfig;
    relayNodes: {
        host: string;
        port: number;
    }[];
    db: {
        path: string;
    };
    api: {
        port: number;
        host: string;
    };
    sync: {
        batchSize: number;
    };
    logLevel: string;
}
export declare function loadConfig(): AppConfig;
