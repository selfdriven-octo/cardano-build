import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../config/logger';

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

export class DataStore {
  // Primary storage
  private blocks = new Map<string, BlockRecord>();       // hash → block
  private txs = new Map<string, TxRecord>();             // tx_hash → tx
  private inputs: TxInputRecord[] = [];
  private outputs: TxOutputRecord[] = [];
  private assets: MultiAssetRecord[] = [];
  private syncState: SyncState = {
    last_block_hash: null, last_height: 0, last_slot: 0,
    last_timestamp: 0, status: 'idle', error: null
  };

  // Indexes
  private blocksByHeight = new Map<number, string>();    // height → hash
  private blocksBySlot = new Map<number, string>();      // slot → hash
  private txsByBlock = new Map<string, string[]>();      // block_hash → [tx_hash]
  private inputsByTx = new Map<string, TxInputRecord[]>();
  private outputsByTx = new Map<string, TxOutputRecord[]>();
  private outputsByAddress = new Map<string, string[]>(); // address → ["txhash:idx"]
  private assetsByOutput = new Map<string, MultiAssetRecord[]>(); // "txhash:idx" → assets

  private dataDir: string;
  private saveTimer: NodeJS.Timeout | null = null;
  private dirty = false;

  // Append-mode (for bootstrap): writes to JSONL files, keeps memory minimal.
  // Uses batched synchronous writes instead of streams to avoid backpressure OOM.
  private appendMode = false;
  private appendLines: Record<string, string[]> = {};
  private appendTotalLines = 0;
  private appendCounts = { blocks: 0, txs: 0, inputs: 0, outputs: 0, assets: 0 };
  private static readonly APPEND_DRAIN_EVERY = 5000; // flush to disk every N records

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    this.load();

    // Auto-save every 30 seconds
    this.saveTimer = setInterval(() => {
      if (this.dirty) this.save();
    }, 30000);
  }

  /**
   * Enable append mode for bootstrap: records are written to JSONL files
   * instead of accumulating in memory. Call flushAndClear() periodically.
   */
  enableAppendMode(): void {
    this.appendMode = true;
    const tables = ['blocks', 'txs', 'inputs', 'outputs', 'assets'];
    for (const t of tables) {
      this.appendLines[t] = [];
    }
    logger.info('Data store: append mode enabled (batched sync writes)');
  }

  /**
   * Drain buffered JSONL lines to disk synchronously.
   * Called automatically every APPEND_DRAIN_EVERY records and on flushAndClear.
   */
  private drainAppend(): void {
    for (const table of Object.keys(this.appendLines)) {
      const lines = this.appendLines[table];
      if (lines.length === 0) continue;
      const filePath = path.join(this.dataDir, `${table}.jsonl`);
      fs.appendFileSync(filePath, lines.join('\n') + '\n');
      lines.length = 0; // clear without reallocating the array
    }
    this.appendTotalLines = 0;
  }

  /**
   * Flush/persist state during bootstrap.
   *
   * In the new direct-write append mode, insert*() methods write straight to
   * JSONL streams, so there is nothing to drain from the Maps.  The only
   * thing that still needs periodic persistence is the sync state file so
   * that a crash-restart knows where to resume from.
   */
  flushAndClear(): void {
    if (!this.appendMode) return;

    // Drain any buffered lines to disk
    this.drainAppend();

    // Save sync state to disk
    const statePath = path.join(this.dataDir, 'sync-state.json');
    fs.writeFileSync(statePath, JSON.stringify(this.syncState));
  }

  /**
   * Finalize append mode: close streams, build indexer.json from JSONL files.
   */
  async finalizeAppendMode(): Promise<void> {
    if (!this.appendMode) return;

    // Drain any remaining buffered lines
    this.drainAppend();

    // Save final sync state
    const statePath = path.join(this.dataDir, 'sync-state.json');
    fs.writeFileSync(statePath, JSON.stringify(this.syncState));

    this.appendLines = {};
    this.appendMode = false;

    logger.info(`Append mode finalized: ${this.appendCounts.blocks} blocks, ${this.appendCounts.txs} txs written to JSONL`);
  }

  /** Get total counts including flushed-to-disk records */
  getTotalBlockCount(): number {
    return this.appendCounts.blocks + this.blocks.size;
  }

  getTotalTxCount(): number {
    return this.appendCounts.txs + this.txs.size;
  }

  // ---- Block operations ----

  insertBlock(block: BlockRecord): void {
    if (this.appendMode) {
      this.appendLines['blocks'].push(JSON.stringify(block));
      this.appendCounts.blocks++;
      if (++this.appendTotalLines % DataStore.APPEND_DRAIN_EVERY === 0) this.drainAppend();
      return;
    }
    if (this.blocks.has(block.hash)) return;
    this.blocks.set(block.hash, block);
    this.blocksByHeight.set(block.height, block.hash);
    this.blocksBySlot.set(block.slot, block.hash);
    this.dirty = true;
  }

  getBlockByHash(hash: string): BlockRecord | undefined {
    return this.blocks.get(hash);
  }

  getBlockByHeight(height: number): BlockRecord | undefined {
    const hash = this.blocksByHeight.get(height);
    return hash ? this.blocks.get(hash) : undefined;
  }

  getLatestBlocks(limit: number, offset: number): BlockRecord[] {
    const sorted = [...this.blocks.values()].sort((a, b) => b.height - a.height);
    return sorted.slice(offset, offset + limit);
  }

  getBlockCount(): number {
    return this.blocks.size;
  }

  getChainTip(): BlockRecord | undefined {
    if (this.blocks.size === 0) return undefined;
    let best: BlockRecord | undefined;
    for (const block of this.blocks.values()) {
      if (!best || block.height > best.height) best = block;
    }
    return best;
  }

  deleteBlocksAboveHeight(height: number): void {
    for (const [hash, block] of this.blocks) {
      if (block.height > height) {
        this.blocks.delete(hash);
        this.blocksByHeight.delete(block.height);
        this.blocksBySlot.delete(block.slot);
      }
    }
    this.dirty = true;
  }

  // ---- Transaction operations ----

  insertTransaction(tx: TxRecord): void {
    if (this.appendMode) {
      this.appendLines['txs'].push(JSON.stringify(tx));
      this.appendCounts.txs++;
      if (++this.appendTotalLines % DataStore.APPEND_DRAIN_EVERY === 0) this.drainAppend();
      return;
    }
    if (this.txs.has(tx.tx_hash)) return;
    this.txs.set(tx.tx_hash, tx);
    const list = this.txsByBlock.get(tx.block_hash) || [];
    list.push(tx.tx_hash);
    this.txsByBlock.set(tx.block_hash, list);
    this.dirty = true;
  }

  getTransactionByHash(txHash: string): TxRecord | undefined {
    return this.txs.get(txHash);
  }

  getTransactionsByBlock(blockHash: string): TxRecord[] {
    const hashes = this.txsByBlock.get(blockHash) || [];
    return hashes.map(h => this.txs.get(h)!).filter(Boolean).sort((a, b) => a.index_in_block - b.index_in_block);
  }

  deleteTransactionsAboveHeight(height: number): void {
    for (const [hash, tx] of this.txs) {
      if (tx.block_height > height) {
        this.txs.delete(hash);
        const list = this.txsByBlock.get(tx.block_hash);
        if (list) {
          const idx = list.indexOf(hash);
          if (idx >= 0) list.splice(idx, 1);
        }
      }
    }
    this.dirty = true;
  }

  // ---- Input operations ----

  insertInput(input: TxInputRecord): void {
    if (this.appendMode) {
      this.appendLines['inputs'].push(JSON.stringify(input));
      this.appendCounts.inputs++;
      if (++this.appendTotalLines % DataStore.APPEND_DRAIN_EVERY === 0) this.drainAppend();
      return;
    }
    this.inputs.push(input);
    const list = this.inputsByTx.get(input.tx_hash) || [];
    list.push(input);
    this.inputsByTx.set(input.tx_hash, list);
    this.dirty = true;
  }

  getInputsForTx(txHash: string): TxInputRecord[] {
    return this.inputsByTx.get(txHash) || [];
  }

  deleteInputsAboveHeight(height: number): void {
    const txsAbove = new Set<string>();
    for (const [hash, tx] of this.txs) {
      if (tx.block_height > height) txsAbove.add(hash);
    }
    this.inputs = this.inputs.filter(i => !txsAbove.has(i.tx_hash));
    for (const h of txsAbove) this.inputsByTx.delete(h);
    this.dirty = true;
  }

  // ---- Output operations ----

  insertOutput(output: TxOutputRecord): void {
    if (this.appendMode) {
      this.appendLines['outputs'].push(JSON.stringify(output));
      this.appendCounts.outputs++;
      if (++this.appendTotalLines % DataStore.APPEND_DRAIN_EVERY === 0) this.drainAppend();
      return;
    }
    this.outputs.push(output);
    const list = this.outputsByTx.get(output.tx_hash) || [];
    list.push(output);
    this.outputsByTx.set(output.tx_hash, list);

    const key = `${output.tx_hash}:${output.output_index}`;
    const addrList = this.outputsByAddress.get(output.address) || [];
    addrList.push(key);
    this.outputsByAddress.set(output.address, addrList);
    this.dirty = true;
  }

  getOutputsForTx(txHash: string): TxOutputRecord[] {
    return this.outputsByTx.get(txHash) || [];
  }

  getUtxosForAddress(address: string): TxOutputRecord[] {
    const keys = this.outputsByAddress.get(address) || [];
    const results: TxOutputRecord[] = [];
    for (const key of keys) {
      const [txHash, idxStr] = key.split(':');
      const idx = parseInt(idxStr);
      const outs = this.outputsByTx.get(txHash) || [];
      const out = outs.find(o => o.output_index === idx);
      if (out && out.spent_by_tx === null) results.push(out);
    }
    return results;
  }

  getAddressBalance(address: string): { balance: number; utxo_count: number } {
    const utxos = this.getUtxosForAddress(address);
    return {
      balance: utxos.reduce((sum, u) => sum + u.amount, 0),
      utxo_count: utxos.length,
    };
  }

  getAddressTxCount(address: string): number {
    const keys = this.outputsByAddress.get(address) || [];
    const txHashes = new Set<string>();
    for (const key of keys) {
      txHashes.add(key.split(':')[0]);
    }
    // Also check inputs
    for (const input of this.inputs) {
      const outs = this.outputsByTx.get(input.output_tx_hash) || [];
      const out = outs.find(o => o.output_index === input.output_index);
      if (out && out.address === address) txHashes.add(input.tx_hash);
    }
    return txHashes.size;
  }

  getAddressTransactions(address: string, limit: number, offset: number): TxRecord[] {
    const keys = this.outputsByAddress.get(address) || [];
    const txHashes = new Set<string>();
    for (const key of keys) txHashes.add(key.split(':')[0]);

    const txs = [...txHashes].map(h => this.txs.get(h)!).filter(Boolean);
    txs.sort((a, b) => b.block_height - a.block_height || b.index_in_block - a.index_in_block);
    return txs.slice(offset, offset + limit);
  }

  markOutputSpent(outputTxHash: string, outputIndex: number, spentByTx: string, spentAtSlot: number): void {
    const outs = this.outputsByTx.get(outputTxHash);
    if (outs) {
      const out = outs.find(o => o.output_index === outputIndex);
      if (out) {
        out.spent_by_tx = spentByTx;
        out.spent_at_slot = spentAtSlot;
        this.dirty = true;
      }
    }
  }

  unspendOutputsAboveSlot(slot: number): void {
    for (const out of this.outputs) {
      if (out.spent_at_slot !== null && out.spent_at_slot > slot) {
        out.spent_by_tx = null;
        out.spent_at_slot = null;
      }
    }
    this.dirty = true;
  }

  deleteOutputsAboveHeight(height: number): void {
    const txsAbove = new Set<string>();
    for (const [hash, tx] of this.txs) {
      if (tx.block_height > height) txsAbove.add(hash);
    }
    this.outputs = this.outputs.filter(o => {
      if (txsAbove.has(o.tx_hash)) {
        // Remove from address index
        const key = `${o.tx_hash}:${o.output_index}`;
        const addrList = this.outputsByAddress.get(o.address);
        if (addrList) {
          const idx = addrList.indexOf(key);
          if (idx >= 0) addrList.splice(idx, 1);
        }
        return false;
      }
      return true;
    });
    for (const h of txsAbove) this.outputsByTx.delete(h);
    this.dirty = true;
  }

  // ---- Multi-asset operations ----

  insertMultiAsset(asset: MultiAssetRecord): void {
    if (this.appendMode) {
      this.appendLines['assets'].push(JSON.stringify(asset));
      this.appendCounts.assets++;
      if (++this.appendTotalLines % DataStore.APPEND_DRAIN_EVERY === 0) this.drainAppend();
      return;
    }
    this.assets.push(asset);
    const key = `${asset.tx_hash}:${asset.output_index}`;
    const list = this.assetsByOutput.get(key) || [];
    list.push(asset);
    this.assetsByOutput.set(key, list);
    this.dirty = true;
  }

  getAssetsForOutput(txHash: string, outputIndex: number): MultiAssetRecord[] {
    return this.assetsByOutput.get(`${txHash}:${outputIndex}`) || [];
  }

  // ---- Sync state ----

  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  updateSyncState(updates: Partial<SyncState>): void {
    Object.assign(this.syncState, updates);
    this.dirty = true;
  }

  // ---- Persistence ----

  private save(): void {
    try {
      const data = {
        blocks: [...this.blocks.values()],
        txs: [...this.txs.values()],
        inputs: this.inputs,
        outputs: this.outputs,
        assets: this.assets,
        syncState: this.syncState,
      };
      const filePath = path.join(this.dataDir, 'indexer.json');
      fs.writeFileSync(filePath, JSON.stringify(data));
      this.dirty = false;
      logger.debug(`Data saved (${this.blocks.size} blocks, ${this.txs.size} txs)`);
    } catch (err: any) {
      logger.error(`Failed to save data: ${err.message}`);
    }
  }

  private load(): void {
    // Try loading sync state from bootstrap
    const statePath = path.join(this.dataDir, 'sync-state.json');
    if (fs.existsSync(statePath)) {
      try {
        this.syncState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      } catch {}
    }

    // Check if we have JSONL files from bootstrap
    const blocksJsonl = path.join(this.dataDir, 'blocks.jsonl');
    if (fs.existsSync(blocksJsonl)) {
      // Count records in JSONL files without loading them all into memory
      let blockCount = 0;
      let txCount = 0;

      try {
        const blockData = fs.readFileSync(blocksJsonl, 'utf-8');
        blockCount = blockData.split('\n').filter(l => l.trim()).length;
      } catch {}

      const txsJsonl = path.join(this.dataDir, 'txs.jsonl');
      if (fs.existsSync(txsJsonl)) {
        try {
          const txData = fs.readFileSync(txsJsonl, 'utf-8');
          txCount = txData.split('\n').filter(l => l.trim()).length;
        } catch {}
      }

      logger.info(`Loaded ${blockCount} blocks, ${txCount} txs from JSONL files (on-disk, not in memory)`);
      this.appendCounts.blocks = blockCount;
      this.appendCounts.txs = txCount;
      return;
    }

    // Legacy: try loading from single indexer.json
    const filePath = path.join(this.dataDir, 'indexer.json');
    if (!fs.existsSync(filePath)) {
      logger.info('No existing data found, starting fresh');
      return;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);

      for (const block of (data.blocks || [])) {
        this.blocks.set(block.hash, block);
        this.blocksByHeight.set(block.height, block.hash);
        this.blocksBySlot.set(block.slot, block.hash);
      }

      for (const tx of (data.txs || [])) {
        this.txs.set(tx.tx_hash, tx);
        const list = this.txsByBlock.get(tx.block_hash) || [];
        list.push(tx.tx_hash);
        this.txsByBlock.set(tx.block_hash, list);
      }

      for (const input of (data.inputs || [])) {
        this.inputs.push(input);
        const list = this.inputsByTx.get(input.tx_hash) || [];
        list.push(input);
        this.inputsByTx.set(input.tx_hash, list);
      }

      for (const output of (data.outputs || [])) {
        this.outputs.push(output);
        const list = this.outputsByTx.get(output.tx_hash) || [];
        list.push(output);
        this.outputsByTx.set(output.tx_hash, list);
        const key = `${output.tx_hash}:${output.output_index}`;
        const addrList = this.outputsByAddress.get(output.address) || [];
        addrList.push(key);
        this.outputsByAddress.set(output.address, addrList);
      }

      for (const asset of (data.assets || [])) {
        this.assets.push(asset);
        const key = `${asset.tx_hash}:${asset.output_index}`;
        const list = this.assetsByOutput.get(key) || [];
        list.push(asset);
        this.assetsByOutput.set(key, list);
      }

      if (data.syncState) {
        this.syncState = data.syncState;
      }

      logger.info(`Loaded ${this.blocks.size} blocks, ${this.txs.size} txs from disk`);
    } catch (err: any) {
      logger.error(`Failed to load data: ${err.message}`);
    }
  }

  close(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.dirty) this.save();
    logger.info('Data store closed');
  }
}
