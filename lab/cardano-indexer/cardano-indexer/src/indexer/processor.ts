import { DataStore } from '../database/store';
import { DecodedBlock } from '../decoder/block';
import { logger } from '../config/logger';

/**
 * Block Processor — takes decoded blocks and indexes them into the DataStore.
 */
export class BlockProcessor {
  constructor(private store: DataStore) {}

  processBlock(block: DecodedBlock): void {
    // 1. Insert block
    this.store.insertBlock({
      height: block.height,
      hash: block.hash,
      prev_hash: block.prevHash || null,
      slot: block.slot,
      epoch: block.epoch,
      epoch_slot: block.epochSlot,
      timestamp: block.timestamp,
      issuer_vkey: block.issuerVkey || null,
      block_size: block.blockSize,
      tx_count: block.txCount,
      era: block.era,
    });

    // 2. Insert transactions
    for (let i = 0; i < block.transactions.length; i++) {
      const tx = block.transactions[i];
      const totalOutput = tx.outputs.reduce((sum, o) => sum + o.amount, 0);

      this.store.insertTransaction({
        tx_hash: tx.txHash,
        block_hash: block.hash,
        block_height: block.height,
        slot: block.slot,
        index_in_block: i,
        fee: tx.fee,
        total_output: totalOutput,
        input_count: tx.inputs.length,
        output_count: tx.outputs.length,
        size: tx.size,
        valid_contract: tx.validContract ? 1 : 0,
      });

      // 3. Insert inputs
      for (let j = 0; j < tx.inputs.length; j++) {
        const input = tx.inputs[j];
        this.store.insertInput({
          tx_hash: tx.txHash,
          input_index: j,
          output_tx_hash: input.txHash,
          output_index: input.outputIndex,
        });
        this.store.markOutputSpent(input.txHash, input.outputIndex, tx.txHash, block.slot);
      }

      // 4. Insert outputs
      for (let k = 0; k < tx.outputs.length; k++) {
        const output = tx.outputs[k];
        this.store.insertOutput({
          tx_hash: tx.txHash,
          output_index: k,
          address: output.address,
          amount: output.amount,
          datum_hash: output.datumHash,
          inline_datum: output.inlineDatum,
          script_ref: output.scriptRef,
          spent_by_tx: null,
          spent_at_slot: null,
        });

        for (const asset of output.multiAssets) {
          this.store.insertMultiAsset({
            tx_hash: tx.txHash,
            output_index: k,
            policy_id: asset.policyId,
            asset_name: asset.assetName,
            quantity: asset.quantity,
          });
        }
      }
    }

    // 5. Update sync state
    this.store.updateSyncState({
      last_block_hash: block.hash,
      last_height: block.height,
      last_slot: block.slot,
      last_timestamp: block.timestamp,
      status: 'syncing',
    });
  }

  processBatch(blocks: DecodedBlock[]): void {
    for (const block of blocks) {
      this.processBlock(block);
    }
    if (blocks.length > 0) {
      const last = blocks[blocks.length - 1];
      const totalTxs = blocks.reduce((sum, b) => sum + b.txCount, 0);
      logger.info(`Indexed ${blocks.length} blocks (${totalTxs} txs) up to height ${last.height}, slot ${last.slot}, era ${last.era}`);
    }
  }
}
