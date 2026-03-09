import { DataStore } from '../database/store';
import { ChainPoint } from '../network/chain-sync';
/**
 * Rollback Handler — handles chain forks by deleting blocks above the rollback point
 * and restoring UTXO state.
 */
export declare class RollbackHandler {
    private store;
    constructor(store: DataStore);
    rollbackTo(point: ChainPoint): void;
    private rollbackAboveHeight;
}
