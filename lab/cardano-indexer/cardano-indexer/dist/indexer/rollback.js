"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollbackHandler = void 0;
const logger_1 = require("../config/logger");
/**
 * Rollback Handler — handles chain forks by deleting blocks above the rollback point
 * and restoring UTXO state.
 */
class RollbackHandler {
    store;
    constructor(store) {
        this.store = store;
    }
    rollbackTo(point) {
        logger_1.logger.warn(`Rolling back to slot ${point.slot}, hash ${point.hash.substring(0, 16)}...`);
        const block = this.store.getBlockByHash(point.hash);
        if (!block) {
            logger_1.logger.warn(`Rollback target not found. Using slot-based rollback.`);
            // Find closest block at or below slot
            const tip = this.store.getChainTip();
            if (tip && tip.slot > point.slot) {
                this.rollbackAboveHeight(point.slot); // Use slot as approximate height
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
                status: 'syncing',
            });
        }
        logger_1.logger.info(`Rollback complete. Chain height now: ${height}`);
    }
}
exports.RollbackHandler = RollbackHandler;
//# sourceMappingURL=rollback.js.map