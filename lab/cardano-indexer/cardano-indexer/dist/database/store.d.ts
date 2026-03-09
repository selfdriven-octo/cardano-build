/**
 * JSON file-backed data store — replaces SQLite when no native bindings available.
 *
 * Uses in-memory Maps with periodic JSON persistence.
 * Indexes are built in-memory for fast lookups.
 */
export interface BlockRecord {
    height: number;
    hash: string;
    prev_hash: string | null;
    slot: number;
    epoch: number | null;
    epoch_slot: number | null;
    timestamp: number;
    issuer_vkey: string | null;
    block_size: number | null;
    tx_count: number;
    era: string | null;
}
export interface TxRecord {
    tx_hash: string;
    block_hash: string;
    block_height: number;
    slot: number;
    index_in_block: number;
    fee: number | null;
    total_output: number | null;
    input_count: number;
    output_count: number;
    size: number | null;
    valid_contract: number;
}
export interface TxInputRecord {
    tx_hash: string;
    input_index: number;
    output_tx_hash: string;
    output_index: number;
}
export interface TxOutputRecord {
    tx_hash: string;
    output_index: number;
    address: string;
    amount: number;
    datum_hash: string | null;
    inline_datum: string | null;
    script_ref: string | null;
    spent_by_tx: string | null;
    spent_at_slot: number | null;
}
export interface MultiAssetRecord {
    tx_hash: string;
    output_index: number;
    policy_id: string;
    asset_name: string;
    quantity: number;
}
export interface SyncState {
    last_block_hash: string | null;
    last_height: number;
    last_slot: number;
    last_timestamp: number;
    status: string;
    error: string | null;
}
export declare class DataStore {
    private blocks;
    private txs;
    private inputs;
    private outputs;
    private assets;
    private syncState;
    private blocksByHeight;
    private blocksBySlot;
    private txsByBlock;
    private inputsByTx;
    private outputsByTx;
    private outputsByAddress;
    private assetsByOutput;
    private dataDir;
    private saveTimer;
    private dirty;
    constructor(dataDir: string);
    insertBlock(block: BlockRecord): void;
    getBlockByHash(hash: string): BlockRecord | undefined;
    getBlockByHeight(height: number): BlockRecord | undefined;
    getLatestBlocks(limit: number, offset: number): BlockRecord[];
    getBlockCount(): number;
    getChainTip(): BlockRecord | undefined;
    deleteBlocksAboveHeight(height: number): void;
    insertTransaction(tx: TxRecord): void;
    getTransactionByHash(txHash: string): TxRecord | undefined;
    getTransactionsByBlock(blockHash: string): TxRecord[];
    deleteTransactionsAboveHeight(height: number): void;
    insertInput(input: TxInputRecord): void;
    getInputsForTx(txHash: string): TxInputRecord[];
    deleteInputsAboveHeight(height: number): void;
    insertOutput(output: TxOutputRecord): void;
    getOutputsForTx(txHash: string): TxOutputRecord[];
    getUtxosForAddress(address: string): TxOutputRecord[];
    getAddressBalance(address: string): {
        balance: number;
        utxo_count: number;
    };
    getAddressTxCount(address: string): number;
    getAddressTransactions(address: string, limit: number, offset: number): TxRecord[];
    markOutputSpent(outputTxHash: string, outputIndex: number, spentByTx: string, spentAtSlot: number): void;
    unspendOutputsAboveSlot(slot: number): void;
    deleteOutputsAboveHeight(height: number): void;
    insertMultiAsset(asset: MultiAssetRecord): void;
    getAssetsForOutput(txHash: string, outputIndex: number): MultiAssetRecord[];
    getSyncState(): SyncState;
    updateSyncState(updates: Partial<SyncState>): void;
    private save;
    private load;
    close(): void;
}
