const { DataStore } = require("../database/store");
const { ChainPoint } = require("../network/chain-sync");
const { logger } = require("../config/logger");
class RollbackHandler {
    store;
    constructor(store){
        this.store = store;
    }
    rollbackTo(point) {
        logger.warn(`Rolling back to slot ${point.slot}, hash ${point.hash.substring(0, 16)}...`);
        const block = this.store.getBlockByHash(point.hash);
        if (!block) {
            logger.warn(`Rollback target not found. Using slot-based rollback.`);
            const tip = this.store.getChainTip();
            if (tip && tip.slot > point.slot) {
                this.rollbackAboveHeight(point.slot);
            }
            return;
        }
        this.rollbackAboveHeight(block.height);
    }
    rollbackAboveHeight(height) {
        const block = this.store.getBlockByHeight(height);
        if (block) {
            this.store.unspendOutputsAboveSlot(block.slot);
        }
        this.store.deleteOutputsAboveHeight(height);
        this.store.deleteInputsAboveHeight(height);
        this.store.deleteTransactionsAboveHeight(height);
        this.store.deleteBlocksAboveHeight(height);
        if (block) {
            this.store.updateSyncState({
                last_block_hash: block.hash,
                last_height: block.height,
                last_slot: block.slot,
                last_timestamp: block.timestamp,
                status: 'syncing'
            });
        }
        logger.info(`Rollback complete. Chain height now: ${height}`);
    }
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/indexer/rollback.ts

exports.RollbackHandler = RollbackHandler;
