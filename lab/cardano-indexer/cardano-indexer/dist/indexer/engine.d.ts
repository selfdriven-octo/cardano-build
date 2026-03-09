import { EventEmitter } from 'events';
import { DataStore } from '../database/store';
import { AppConfig } from '../config';
/**
 * Sync Engine — orchestrates the full chain sync process.
 */
export declare class SyncEngine extends EventEmitter {
    private store;
    private config;
    private connection;
    private processor;
    private rollbackHandler;
    private running;
    private currentTip;
    private blocksProcessed;
    private blockBatch;
    constructor(store: DataStore, config: AppConfig);
    start(): Promise<void>;
    stop(): void;
    private syncLoop;
    private handleChainSyncEvents;
    private getKnownPoints;
    private getLocatorHeights;
    private sleep;
    getStatus(): {
        status: string;
        lastHeight: number;
        lastSlot: number;
        lastBlockHash: string | null;
        lastTimestamp: number;
        tipBlockNo: number;
        blocksProcessed: number;
        network: string;
    };
}
