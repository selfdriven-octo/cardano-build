import { EventEmitter } from 'events';
import { NodeConnection, connectToRelay } from '../network/connection';
import { ChainSyncClient, ChainPoint, ChainSyncEvent, ChainTip } from '../network/chain-sync';
import { BlockFetchClient } from '../network/block-fetch';
import { decodeBlock, DecodedBlock } from '../decoder/block';
import { BlockProcessor } from './processor';
import { RollbackHandler } from './rollback';
import { DataStore } from '../database/store';
import { AppConfig } from '../config';
import { logger } from '../config/logger';

/**
 * Sync Engine — orchestrates the full chain sync process.
 */
export class SyncEngine extends EventEmitter {
  private connection: NodeConnection | null = null;
  private processor: BlockProcessor;
  private rollbackHandler: RollbackHandler;
  private running = false;
  private currentTip: ChainTip | null = null;
  private blocksProcessed = 0;
  private blockBatch: DecodedBlock[] = [];

  constructor(
    private store: DataStore,
    private config: AppConfig
  ) {
    super();
    this.processor = new BlockProcessor(store);
    this.rollbackHandler = new RollbackHandler(store);
  }

  async start(): Promise<void> {
    this.running = true;
    logger.info(`Starting sync engine for ${this.config.network.name}`);
    this.store.updateSyncState({ status: 'syncing' });

    while (this.running) {
      try {
        await this.syncLoop();
      } catch (err: any) {
        logger.error(`Sync error: ${err.message}`);
        this.store.updateSyncState({ status: 'error', error: err.message });

        if (this.running) {
          logger.info('Reconnecting in 10 seconds...');
          await this.sleep(10000);
        }
      }
    }
  }

  stop(): void {
    this.running = false;
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.store.updateSyncState({ status: 'idle' });
    logger.info('Sync engine stopped');
  }

  private async syncLoop(): Promise<void> {
    this.connection = await connectToRelay(
      this.config.relayNodes,
      this.config.network.networkMagic
    );

    const { chainSync, blockFetch } = this.connection;
    const syncState = this.store.getSyncState();
    const knownPoints = this.getKnownPoints();

    if (knownPoints.length > 0) {
      logger.info(`Finding intersection from height ${syncState.last_height}, slot ${syncState.last_slot}`);
    } else {
      logger.info('Starting sync from origin (genesis)');
    }

    const eventPromise = this.handleChainSyncEvents(chainSync, blockFetch);

    if (knownPoints.length > 0) {
      chainSync.findIntersect(knownPoints);
    } else {
      chainSync.findIntersect([{ slot: 0, hash: '' }]);
    }

    await eventPromise;
  }

  private async handleChainSyncEvents(
    chainSync: ChainSyncClient,
    _blockFetch: BlockFetchClient
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      chainSync.on('event', (event: ChainSyncEvent) => {
        try {
          switch (event.type) {
            case 'intersectFound':
              logger.info(`Intersection found at slot ${event.point.slot}. Starting sync...`);
              this.currentTip = event.tip;
              chainSync.requestNext();
              break;

            case 'intersectNotFound':
              logger.info('No intersection found, syncing from genesis');
              this.currentTip = event.tip;
              chainSync.requestNext();
              break;

            case 'rollForward': {
              try {
                const block = decodeBlock(event.header);
                this.currentTip = event.tip;
                this.blockBatch.push(block);

                if (this.blockBatch.length >= this.config.sync.batchSize) {
                  this.processor.processBatch(this.blockBatch);
                  this.blocksProcessed += this.blockBatch.length;
                  this.blockBatch = [];

                  const syncState = this.store.getSyncState();
                  const tipBlock = event.tip.blockNo;
                  const progress = tipBlock > 0
                    ? ((syncState.last_height / tipBlock) * 100).toFixed(2)
                    : '0.00';
                  logger.info(`Sync progress: ${progress}% (height ${syncState.last_height} / ${tipBlock})`);
                }
              } catch (err: any) {
                logger.error(`Failed to process block: ${err.message}`);
              }

              if (this.running) chainSync.requestNext();
              break;
            }

            case 'rollBackward':
              if (this.blockBatch.length > 0) {
                this.processor.processBatch(this.blockBatch);
                this.blockBatch = [];
              }
              this.rollbackHandler.rollbackTo(event.point);
              this.currentTip = event.tip;
              if (this.running) chainSync.requestNext();
              break;

            case 'awaitReply':
              if (this.blockBatch.length > 0) {
                this.processor.processBatch(this.blockBatch);
                this.blocksProcessed += this.blockBatch.length;
                this.blockBatch = [];
              }
              this.store.updateSyncState({ status: 'synced' });
              logger.info('Chain tip reached. Waiting for new blocks...');
              this.emit('synced');
              break;
          }
        } catch (err: any) {
          logger.error(`Event handler error: ${err.message}`);
          if (!this.running) resolve();
        }
      });

      if (this.connection) {
        this.connection.mux.on('close', () => {
          if (this.running) reject(new Error('Connection lost'));
          else resolve();
        });
        this.connection.mux.on('error', (err: Error) => reject(err));
      }
    });
  }

  private getKnownPoints(): ChainPoint[] {
    const points: ChainPoint[] = [];
    const syncState = this.store.getSyncState();
    if (!syncState.last_block_hash || syncState.last_height === 0) return [];

    const heights = this.getLocatorHeights(syncState.last_height);
    for (const h of heights) {
      const block = this.store.getBlockByHeight(h);
      if (block) points.push({ slot: block.slot, hash: block.hash });
    }
    return points;
  }

  private getLocatorHeights(tipHeight: number): number[] {
    const heights: number[] = [];
    let step = 1;
    let h = tipHeight;
    for (let i = 0; i < 10 && h > 0; i++) { heights.push(h); h -= step; }
    while (h > 0) { heights.push(h); step *= 2; h -= step; }
    heights.push(0);
    return [...new Set(heights)].sort((a, b) => b - a);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    const syncState = this.store.getSyncState();
    return {
      status: syncState.status,
      lastHeight: syncState.last_height,
      lastSlot: syncState.last_slot,
      lastBlockHash: syncState.last_block_hash,
      lastTimestamp: syncState.last_timestamp,
      tipBlockNo: this.currentTip?.blockNo || 0,
      blocksProcessed: this.blocksProcessed,
      network: this.config.network.name,
    };
  }
}
