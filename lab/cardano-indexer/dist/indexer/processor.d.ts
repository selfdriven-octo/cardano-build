import { DataStore } from '../database/store';
import { DecodedBlock } from '../decoder/block';
/**
 * Block Processor — takes decoded blocks and indexes them into the DataStore.
 */
export declare class BlockProcessor {
    private store;
    constructor(store: DataStore);
    processBlock(block: DecodedBlock): void;
    processBatch(blocks: DecodedBlock[]): void;
}
