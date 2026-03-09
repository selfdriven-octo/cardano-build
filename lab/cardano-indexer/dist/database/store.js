"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../config/logger");
class DataStore {
    // Primary storage
    blocks = new Map(); // hash → block
    txs = new Map(); // tx_hash → tx
    inputs = [];
    outputs = [];
    assets = [];
    syncState = {
        last_block_hash: null, last_height: 0, last_slot: 0,
        last_timestamp: 0, status: 'idle', error: null
    };
    // Indexes
    blocksByHeight = new Map(); // height → hash
    blocksBySlot = new Map(); // slot → hash
    txsByBlock = new Map(); // block_hash → [tx_hash]
    inputsByTx = new Map();
    outputsByTx = new Map();
    outputsByAddress = new Map(); // address → ["txhash:idx"]
    assetsByOutput = new Map(); // "txhash:idx" → assets
    dataDir;
    saveTimer = null;
    dirty = false;
    constructor(dataDir) {
        this.dataDir = dataDir;
        if (!fs.existsSync(dataDir))
            fs.mkdirSync(dataDir, { recursive: true });
        this.load();
        // Auto-save every 30 seconds
        this.saveTimer = setInterval(() => {
            if (this.dirty)
                this.save();
        }, 30000);
    }
    // ---- Block operations ----
    insertBlock(block) {
        if (this.blocks.has(block.hash))
            return;
        this.blocks.set(block.hash, block);
        this.blocksByHeight.set(block.height, block.hash);
        this.blocksBySlot.set(block.slot, block.hash);
        this.dirty = true;
    }
    getBlockByHash(hash) {
        return this.blocks.get(hash);
    }
    getBlockByHeight(height) {
        const hash = this.blocksByHeight.get(height);
        return hash ? this.blocks.get(hash) : undefined;
    }
    getLatestBlocks(limit, offset) {
        const sorted = [...this.blocks.values()].sort((a, b) => b.height - a.height);
        return sorted.slice(offset, offset + limit);
    }
    getBlockCount() {
        return this.blocks.size;
    }
    getChainTip() {
        if (this.blocks.size === 0)
            return undefined;
        let best;
        for (const block of this.blocks.values()) {
            if (!best || block.height > best.height)
                best = block;
        }
        return best;
    }
    deleteBlocksAboveHeight(height) {
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
    insertTransaction(tx) {
        if (this.txs.has(tx.tx_hash))
            return;
        this.txs.set(tx.tx_hash, tx);
        const list = this.txsByBlock.get(tx.block_hash) || [];
        list.push(tx.tx_hash);
        this.txsByBlock.set(tx.block_hash, list);
        this.dirty = true;
    }
    getTransactionByHash(txHash) {
        return this.txs.get(txHash);
    }
    getTransactionsByBlock(blockHash) {
        const hashes = this.txsByBlock.get(blockHash) || [];
        return hashes.map(h => this.txs.get(h)).filter(Boolean).sort((a, b) => a.index_in_block - b.index_in_block);
    }
    deleteTransactionsAboveHeight(height) {
        for (const [hash, tx] of this.txs) {
            if (tx.block_height > height) {
                this.txs.delete(hash);
                const list = this.txsByBlock.get(tx.block_hash);
                if (list) {
                    const idx = list.indexOf(hash);
                    if (idx >= 0)
                        list.splice(idx, 1);
                }
            }
        }
        this.dirty = true;
    }
    // ---- Input operations ----
    insertInput(input) {
        this.inputs.push(input);
        const list = this.inputsByTx.get(input.tx_hash) || [];
        list.push(input);
        this.inputsByTx.set(input.tx_hash, list);
        this.dirty = true;
    }
    getInputsForTx(txHash) {
        return this.inputsByTx.get(txHash) || [];
    }
    deleteInputsAboveHeight(height) {
        const txsAbove = new Set();
        for (const [hash, tx] of this.txs) {
            if (tx.block_height > height)
                txsAbove.add(hash);
        }
        this.inputs = this.inputs.filter(i => !txsAbove.has(i.tx_hash));
        for (const h of txsAbove)
            this.inputsByTx.delete(h);
        this.dirty = true;
    }
    // ---- Output operations ----
    insertOutput(output) {
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
    getOutputsForTx(txHash) {
        return this.outputsByTx.get(txHash) || [];
    }
    getUtxosForAddress(address) {
        const keys = this.outputsByAddress.get(address) || [];
        const results = [];
        for (const key of keys) {
            const [txHash, idxStr] = key.split(':');
            const idx = parseInt(idxStr);
            const outs = this.outputsByTx.get(txHash) || [];
            const out = outs.find(o => o.output_index === idx);
            if (out && out.spent_by_tx === null)
                results.push(out);
        }
        return results;
    }
    getAddressBalance(address) {
        const utxos = this.getUtxosForAddress(address);
        return {
            balance: utxos.reduce((sum, u) => sum + u.amount, 0),
            utxo_count: utxos.length,
        };
    }
    getAddressTxCount(address) {
        const keys = this.outputsByAddress.get(address) || [];
        const txHashes = new Set();
        for (const key of keys) {
            txHashes.add(key.split(':')[0]);
        }
        // Also check inputs
        for (const input of this.inputs) {
            const outs = this.outputsByTx.get(input.output_tx_hash) || [];
            const out = outs.find(o => o.output_index === input.output_index);
            if (out && out.address === address)
                txHashes.add(input.tx_hash);
        }
        return txHashes.size;
    }
    getAddressTransactions(address, limit, offset) {
        const keys = this.outputsByAddress.get(address) || [];
        const txHashes = new Set();
        for (const key of keys)
            txHashes.add(key.split(':')[0]);
        const txs = [...txHashes].map(h => this.txs.get(h)).filter(Boolean);
        txs.sort((a, b) => b.block_height - a.block_height || b.index_in_block - a.index_in_block);
        return txs.slice(offset, offset + limit);
    }
    markOutputSpent(outputTxHash, outputIndex, spentByTx, spentAtSlot) {
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
    unspendOutputsAboveSlot(slot) {
        for (const out of this.outputs) {
            if (out.spent_at_slot !== null && out.spent_at_slot > slot) {
                out.spent_by_tx = null;
                out.spent_at_slot = null;
            }
        }
        this.dirty = true;
    }
    deleteOutputsAboveHeight(height) {
        const txsAbove = new Set();
        for (const [hash, tx] of this.txs) {
            if (tx.block_height > height)
                txsAbove.add(hash);
        }
        this.outputs = this.outputs.filter(o => {
            if (txsAbove.has(o.tx_hash)) {
                // Remove from address index
                const key = `${o.tx_hash}:${o.output_index}`;
                const addrList = this.outputsByAddress.get(o.address);
                if (addrList) {
                    const idx = addrList.indexOf(key);
                    if (idx >= 0)
                        addrList.splice(idx, 1);
                }
                return false;
            }
            return true;
        });
        for (const h of txsAbove)
            this.outputsByTx.delete(h);
        this.dirty = true;
    }
    // ---- Multi-asset operations ----
    insertMultiAsset(asset) {
        this.assets.push(asset);
        const key = `${asset.tx_hash}:${asset.output_index}`;
        const list = this.assetsByOutput.get(key) || [];
        list.push(asset);
        this.assetsByOutput.set(key, list);
        this.dirty = true;
    }
    getAssetsForOutput(txHash, outputIndex) {
        return this.assetsByOutput.get(`${txHash}:${outputIndex}`) || [];
    }
    // ---- Sync state ----
    getSyncState() {
        return { ...this.syncState };
    }
    updateSyncState(updates) {
        Object.assign(this.syncState, updates);
        this.dirty = true;
    }
    // ---- Persistence ----
    save() {
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
            logger_1.logger.debug(`Data saved (${this.blocks.size} blocks, ${this.txs.size} txs)`);
        }
        catch (err) {
            logger_1.logger.error(`Failed to save data: ${err.message}`);
        }
    }
    load() {
        const filePath = path.join(this.dataDir, 'indexer.json');
        if (!fs.existsSync(filePath)) {
            logger_1.logger.info('No existing data found, starting fresh');
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
            logger_1.logger.info(`Loaded ${this.blocks.size} blocks, ${this.txs.size} txs from disk`);
        }
        catch (err) {
            logger_1.logger.error(`Failed to load data: ${err.message}`);
        }
    }
    close() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
        if (this.dirty)
            this.save();
        logger_1.logger.info('Data store closed');
    }
}
exports.DataStore = DataStore;
//# sourceMappingURL=store.js.map