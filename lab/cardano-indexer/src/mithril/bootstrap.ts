import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { MithrilClient, downloadStream } from './aggregator';
import { parseImmutableDb } from './chunk-parser';
import { BlockProcessor } from '../indexer/processor';
import { DataStore } from '../database/store';
import { DecodedBlock } from '../decoder/block';
import { logger } from '../config/logger';

/**
 * Mithril Bootstrap Module
 *
 * Downloads a certified Mithril snapshot and imports the blockchain data
 * into the indexer's data store. This is dramatically faster than syncing
 * block-by-block from a relay node.
 *
 * Flow:
 *   1. Query Mithril aggregator for latest snapshot
 *   2. Verify certificate chain
 *   3. Download tar.gz archive
 *   4. Stream-extract chunk files from the archive
 *   5. Parse blocks from chunk files
 *   6. Index blocks into the data store
 *   7. Continue with live chain sync from the tip
 */

/**
 * Simple tar archive parser for streaming extraction.
 * Tar format: 512-byte header blocks followed by file data (padded to 512 bytes).
 */
interface TarEntry {
  name: string;
  size: number;
  type: string;
}

function parseTarHeader(header: Buffer): TarEntry | null {
  if (header.length < 512) return null;

  // Check for end-of-archive (two zero blocks)
  let allZero = true;
  for (let i = 0; i < 512; i++) {
    if (header[i] !== 0) { allZero = false; break; }
  }
  if (allZero) return null;

  // File name: bytes 0-99
  let name = '';
  for (let i = 0; i < 100 && header[i] !== 0; i++) {
    name += String.fromCharCode(header[i]);
  }

  // USTAR prefix: bytes 345-499
  let prefix = '';
  for (let i = 345; i < 500 && header[i] !== 0; i++) {
    prefix += String.fromCharCode(header[i]);
  }
  if (prefix) name = prefix + '/' + name;

  // File size: bytes 124-135 (octal)
  let sizeStr = '';
  for (let i = 124; i < 136 && header[i] !== 0; i++) {
    sizeStr += String.fromCharCode(header[i]);
  }
  const size = parseInt(sizeStr.trim(), 8) || 0;

  // File type: byte 156
  const typeChar = String.fromCharCode(header[156]);
  const type = typeChar === '0' || typeChar === '\0' ? 'file' : typeChar === '5' ? 'directory' : typeChar;

  return { name, size, type };
}

export interface BootstrapOptions {
  network: string;
  dataDir: string;
  /** Only import blocks from these chunk numbers (inclusive) */
  startChunk?: number;
  endChunk?: number;
  /** Skip certificate verification (faster, less secure) */
  skipVerification?: boolean;
  /** Temporary directory for snapshot extraction */
  tempDir?: string;
}

export class MithrilBootstrap {
  private client: MithrilClient;
  private store: DataStore;
  private processor: BlockProcessor;

  constructor(store: DataStore, network: string) {
    this.client = new MithrilClient(network);
    this.store = store;
    this.processor = new BlockProcessor(store);
  }

  /**
   * Run the full bootstrap process.
   * Downloads and imports the latest Mithril snapshot.
   */
  async bootstrap(options: BootstrapOptions): Promise<void> {
    const startTime = Date.now();

    logger.info('=== Mithril Bootstrap ===');
    logger.info(`Network: ${options.network}`);

    // 1. Get latest snapshot
    const snapshot = await this.client.getLatestSnapshot();
    logger.info(`Snapshot: epoch ${snapshot.beacon.epoch}, ` +
      `immutable #${snapshot.beacon.immutable_file_number}, ` +
      `size ${(snapshot.size / 1024 / 1024 / 1024).toFixed(2)} GB`);

    // 2. Verify certificate chain
    if (!options.skipVerification) {
      logger.info('Verifying certificate chain...');
      const valid = await this.client.verifyCertificateChain(snapshot.certificate_hash);
      if (!valid) {
        throw new Error('Certificate chain verification failed!');
      }
      logger.info('Certificate chain verified successfully');
    } else {
      logger.warn('Skipping certificate verification (--skip-verify)');
    }

    // 3. Download and extract
    const tempDir = options.tempDir || path.join(options.dataDir, '_mithril_temp');
    const immutableDir = path.join(tempDir, 'immutable');

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    if (!fs.existsSync(immutableDir)) fs.mkdirSync(immutableDir, { recursive: true });

    const downloadUrl = this.client.getDownloadUrl(snapshot);
    logger.info(`Downloading snapshot from: ${downloadUrl}`);
    logger.info('This may take a while for mainnet (~40 GB)...');

    await this.downloadAndExtract(downloadUrl, tempDir, snapshot.compression_algorithm);

    // 4. Find the immutable DB directory in the extracted snapshot
    const dbPath = this.findImmutableDir(tempDir);
    if (!dbPath) {
      throw new Error('Could not find immutable DB directory in snapshot');
    }
    logger.info(`Found immutable DB at: ${dbPath}`);

    // 5. Parse and index blocks
    logger.info('Parsing and indexing blocks from snapshot...');
    let totalBlocks = 0;
    let batchBlocks: DecodedBlock[] = [];

    const count = parseImmutableDb(dbPath, (block) => {
      batchBlocks.push(block);

      // Process in batches of 1000
      if (batchBlocks.length >= 1000) {
        this.processor.processBatch(batchBlocks);
        totalBlocks += batchBlocks.length;
        batchBlocks = [];

        if (totalBlocks % 10000 === 0) {
          logger.info(`Indexed ${totalBlocks} blocks (height ${block.height}, epoch ${block.epoch})`);
        }
      }
    }, {
      startChunk: options.startChunk,
      endChunk: options.endChunk,
    });

    // Flush remaining
    if (batchBlocks.length > 0) {
      this.processor.processBatch(batchBlocks);
      totalBlocks += batchBlocks.length;
    }

    // 6. Update sync state
    const tip = this.store.getChainTip();
    if (tip) {
      this.store.updateSyncState({
        last_block_hash: tip.hash,
        last_height: tip.height,
        last_slot: tip.slot,
        last_timestamp: tip.timestamp,
        status: 'bootstrapped',
      });
    }

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    logger.info('=== Bootstrap Complete ===');
    logger.info(`Total blocks indexed: ${totalBlocks}`);
    logger.info(`Time elapsed: ${elapsed} minutes`);
    if (tip) {
      logger.info(`Chain tip: height ${tip.height}, slot ${tip.slot}, epoch ${tip.epoch}`);
    }
    logger.info('You can now start live chain sync to catch up to the current tip.');

    // 7. Cleanup temp files
    this.cleanup(tempDir);
  }

  /**
   * Download and extract a tar.gz snapshot archive.
   */
  private async downloadAndExtract(
    url: string,
    destDir: string,
    compression: string
  ): Promise<void> {
    const archivePath = path.join(destDir, 'snapshot.tar.gz');
    const writeStream = fs.createWriteStream(archivePath);

    let lastProgress = 0;
    await downloadStream(url, (chunk) => {
      writeStream.write(chunk);
    }, (bytes) => {
      const mb = Math.floor(bytes / 1024 / 1024);
      if (mb - lastProgress >= 100) {
        logger.info(`Downloaded: ${mb} MB`);
        lastProgress = mb;
      }
    });

    writeStream.end();
    await new Promise<void>((resolve) => writeStream.on('finish', resolve));

    logger.info('Download complete. Extracting archive...');
    await this.extractTarGz(archivePath, destDir);
    logger.info('Extraction complete');

    // Remove archive to save space
    try { fs.unlinkSync(archivePath); } catch {}
  }

  /**
   * Extract a tar.gz file to a directory.
   */
  private extractTarGz(archivePath: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(archivePath);
      const gunzip = zlib.createGunzip();
      let buffer = Buffer.alloc(0);
      let currentEntry: TarEntry | null = null;
      let currentFile: fs.WriteStream | null = null;
      let remainingBytes = 0;
      let filesExtracted = 0;

      gunzip.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);

        while (buffer.length > 0) {
          if (!currentEntry) {
            // Need a 512-byte header
            if (buffer.length < 512) break;

            const header = buffer.subarray(0, 512);
            buffer = buffer.subarray(512);

            currentEntry = parseTarHeader(header);
            if (!currentEntry) continue; // End of archive or empty

            if (currentEntry.type === 'file' && currentEntry.size > 0) {
              const filePath = path.join(destDir, currentEntry.name);
              const fileDir = path.dirname(filePath);
              if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
              }

              // Only extract chunk and index files
              if (currentEntry.name.endsWith('.chunk') ||
                  currentEntry.name.endsWith('.primary') ||
                  currentEntry.name.endsWith('.secondary')) {
                currentFile = fs.createWriteStream(filePath);
                remainingBytes = currentEntry.size;
                filesExtracted++;

                if (filesExtracted % 100 === 0) {
                  logger.info(`Extracted ${filesExtracted} files...`);
                }
              } else {
                // Skip non-chunk files — just consume the bytes
                remainingBytes = currentEntry.size;
                currentFile = null;
              }
            } else if (currentEntry.type === 'directory') {
              const dirPath = path.join(destDir, currentEntry.name);
              if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
              }
              currentEntry = null;
              continue;
            } else {
              remainingBytes = currentEntry.size;
              currentFile = null;
            }
          }

          if (remainingBytes > 0) {
            const toConsume = Math.min(remainingBytes, buffer.length);
            if (currentFile) {
              currentFile.write(buffer.subarray(0, toConsume));
            }
            remainingBytes -= toConsume;
            buffer = buffer.subarray(toConsume);

            if (remainingBytes === 0) {
              if (currentFile) {
                currentFile.end();
                currentFile = null;
              }

              // Skip padding to next 512-byte boundary
              const padding = (512 - (currentEntry!.size % 512)) % 512;
              if (padding > 0 && buffer.length >= padding) {
                buffer = buffer.subarray(padding);
              } else if (padding > 0) {
                // Not enough data yet for padding
                remainingBytes = -padding; // Flag to skip padding bytes
              }

              currentEntry = null;
            }
          } else if (remainingBytes < 0) {
            // Skipping padding bytes
            const paddingLeft = -remainingBytes;
            if (buffer.length >= paddingLeft) {
              buffer = buffer.subarray(paddingLeft);
              remainingBytes = 0;
              currentEntry = null;
            } else {
              break;
            }
          } else {
            currentEntry = null;
          }
        }
      });

      gunzip.on('end', () => {
        logger.info(`Extraction complete: ${filesExtracted} files`);
        resolve();
      });

      gunzip.on('error', reject);
      readStream.pipe(gunzip);
    });
  }

  /**
   * Find the immutable DB directory within the extracted snapshot.
   */
  private findImmutableDir(baseDir: string): string | null {
    // The snapshot usually extracts to db/immutable/ or just immutable/
    const candidates = [
      path.join(baseDir, 'immutable'),
      path.join(baseDir, 'db', 'immutable'),
      path.join(baseDir, 'cardano', 'immutable'),
      path.join(baseDir, 'cardano', 'db', 'immutable'),
    ];

    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        if (files.some(f => f.endsWith('.chunk'))) {
          return dir;
        }
      }
    }

    // Recursive search
    const search = (dir: string, depth: number): string | null => {
      if (depth > 5) return null;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        // Check if this directory has chunk files
        if (entries.some(e => e.name.endsWith('.chunk'))) return dir;

        // Recurse into subdirectories
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const result = search(path.join(dir, entry.name), depth + 1);
            if (result) return result;
          }
        }
      } catch {}
      return null;
    };

    return search(baseDir, 0);
  }

  /**
   * Clean up temporary extraction directory.
   */
  private cleanup(tempDir: string): void {
    try {
      logger.info('Cleaning up temporary files...');
      fs.rmSync(tempDir, { recursive: true, force: true });
      logger.info('Cleanup complete');
    } catch (err: any) {
      logger.warn(`Cleanup failed: ${err.message}`);
    }
  }
}

/**
 * Bootstrap from a local immutable DB directory (e.g., from an existing cardano-node).
 * Useful when you already have the node's DB and just want to index it.
 */
export async function bootstrapFromLocalDb(
  store: DataStore,
  immutableDir: string,
  options: { startChunk?: number; endChunk?: number } = {}
): Promise<number> {
  logger.info(`Bootstrapping from local immutable DB: ${immutableDir}`);
  const processor = new BlockProcessor(store);
  let totalBlocks = 0;
  let batchBlocks: DecodedBlock[] = [];

  parseImmutableDb(immutableDir, (block) => {
    batchBlocks.push(block);
    if (batchBlocks.length >= 1000) {
      processor.processBatch(batchBlocks);
      totalBlocks += batchBlocks.length;
      batchBlocks = [];

      if (totalBlocks % 10000 === 0) {
        logger.info(`Indexed ${totalBlocks} blocks`);
      }
    }
  }, options);

  if (batchBlocks.length > 0) {
    processor.processBatch(batchBlocks);
    totalBlocks += batchBlocks.length;
  }

  const tip = store.getChainTip();
  if (tip) {
    store.updateSyncState({
      last_block_hash: tip.hash,
      last_height: tip.height,
      last_slot: tip.slot,
      last_timestamp: tip.timestamp,
      status: 'bootstrapped',
    });
  }

  logger.info(`Local bootstrap complete: ${totalBlocks} blocks indexed`);
  return totalBlocks;
}
