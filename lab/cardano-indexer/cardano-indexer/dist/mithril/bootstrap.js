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
exports.MithrilBootstrap = void 0;
exports.bootstrapFromLocalDb = bootstrapFromLocalDb;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const zlib = __importStar(require("zlib"));
const child_process_1 = require("child_process");
const aggregator_1 = require("./aggregator");
const zstd_1 = require("../lib/zstd");
const chunk_parser_1 = require("./chunk-parser");
const processor_1 = require("../indexer/processor");
const logger_1 = require("../config/logger");
function parseTarHeader(header) {
    if (header.length < 512)
        return null;
    // Check for end-of-archive (two zero blocks)
    let allZero = true;
    for (let i = 0; i < 512; i++) {
        if (header[i] !== 0) {
            allZero = false;
            break;
        }
    }
    if (allZero)
        return null;
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
    if (prefix)
        name = prefix + '/' + name;
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
class MithrilBootstrap {
    client;
    store;
    processor;
    constructor(store, network) {
        this.client = new aggregator_1.MithrilClient(network);
        this.store = store;
        this.processor = new processor_1.BlockProcessor(store);
    }
    /**
     * Run the full bootstrap process.
     * Downloads and imports the latest Mithril snapshot.
     */
    async bootstrap(options) {
        const startTime = Date.now();
        logger_1.logger.info('=== Mithril Bootstrap ===');
        logger_1.logger.info(`Network: ${options.network}`);
        // 1. Get latest snapshot
        const snapshot = await this.client.getLatestSnapshot();
        logger_1.logger.info(`Snapshot: epoch ${snapshot.beacon.epoch}, ` +
            `immutable #${snapshot.beacon.immutable_file_number}, ` +
            `size ${(snapshot.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
        // 2. Verify certificate chain
        if (!options.skipVerification) {
            logger_1.logger.info('Verifying certificate chain...');
            const valid = await this.client.verifyCertificateChain(snapshot.certificate_hash);
            if (!valid) {
                throw new Error('Certificate chain verification failed!');
            }
            logger_1.logger.info('Certificate chain verified successfully');
        }
        else {
            logger_1.logger.warn('Skipping certificate verification (--skip-verify)');
        }
        // 3. Download and extract
        const tempDir = options.tempDir || path.join(options.dataDir, '_mithril_temp');
        const immutableDir = path.join(tempDir, 'immutable');
        if (!fs.existsSync(tempDir))
            fs.mkdirSync(tempDir, { recursive: true });
        if (!fs.existsSync(immutableDir))
            fs.mkdirSync(immutableDir, { recursive: true });
        const downloadUrl = this.client.getDownloadUrl(snapshot);
        logger_1.logger.info(`Downloading snapshot from: ${downloadUrl}`);
        const sizeGB = (snapshot.size / 1024 / 1024 / 1024).toFixed(1);
        logger_1.logger.info(`This may take a while (~${sizeGB} GB to download)...`);
        await this.downloadAndExtract(downloadUrl, tempDir, snapshot.compression_algorithm);
        // 4. Find the immutable DB directory in the extracted snapshot
        const dbPath = this.findImmutableDir(tempDir);
        if (!dbPath) {
            throw new Error('Could not find immutable DB directory in snapshot');
        }
        logger_1.logger.info(`Found immutable DB at: ${dbPath}`);
        // 5. Parse and index blocks
        logger_1.logger.info('Parsing and indexing blocks from snapshot...');
        let totalBlocks = 0;
        let batchBlocks = [];
        const count = (0, chunk_parser_1.parseImmutableDb)(dbPath, (block) => {
            batchBlocks.push(block);
            // Process in batches of 1000
            if (batchBlocks.length >= 1000) {
                this.processor.processBatch(batchBlocks);
                totalBlocks += batchBlocks.length;
                batchBlocks = [];
                if (totalBlocks % 10000 === 0) {
                    logger_1.logger.info(`Indexed ${totalBlocks} blocks (height ${block.height}, epoch ${block.epoch})`);
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
        logger_1.logger.info('=== Bootstrap Complete ===');
        logger_1.logger.info(`Total blocks indexed: ${totalBlocks}`);
        logger_1.logger.info(`Time elapsed: ${elapsed} minutes`);
        if (tip) {
            logger_1.logger.info(`Chain tip: height ${tip.height}, slot ${tip.slot}, epoch ${tip.epoch}`);
        }
        logger_1.logger.info('You can now start live chain sync to catch up to the current tip.');
        // 7. Cleanup temp files
        this.cleanup(tempDir);
    }
    /**
     * Download and extract a snapshot archive.
     * Supports both .tar.gz (gzip) and .tar.zst (zstandard) compression.
     */
    async downloadAndExtract(url, destDir, compression) {
        // Determine archive extension from compression algorithm
        const isZstd = compression === 'zstandard' || compression === 'zstd' ||
            url.includes('.tar.zst') || url.includes('zstandard');
        const ext = isZstd ? 'tar.zst' : 'tar.gz';
        const archivePath = path.join(destDir, `snapshot.${ext}`);
        logger_1.logger.info(`Compression: ${compression || 'auto-detected'} → ${ext}`);
        const writeStream = fs.createWriteStream(archivePath);
        let lastProgress = 0;
        await (0, aggregator_1.downloadStream)(url, (chunk) => {
            writeStream.write(chunk);
        }, (bytes) => {
            const mb = Math.floor(bytes / 1024 / 1024);
            if (mb - lastProgress >= 100) {
                logger_1.logger.info(`Downloaded: ${mb} MB`);
                lastProgress = mb;
            }
        });
        writeStream.end();
        await new Promise((resolve) => writeStream.on('finish', resolve));
        logger_1.logger.info('Download complete. Extracting archive...');
        if (isZstd) {
            await this.extractTarZst(archivePath, destDir);
        }
        else {
            await this.extractTarGz(archivePath, destDir);
        }
        logger_1.logger.info('Extraction complete');
        // Remove archive to save space
        try {
            fs.unlinkSync(archivePath);
        }
        catch { }
    }
    /**
     * Extract a tar.zst file using system tools.
     * Tries: (1) tar with --zstd flag, (2) zstd pipe to tar, (3) error with instructions.
     * Node.js has no built-in Zstandard support, so we rely on system tools.
     */
    async extractTarZst(archivePath, destDir) {
        // Strategy 1: Try `tar --zstd -xf` (GNU tar with zstd plugin)
        try {
            logger_1.logger.info('Trying extraction with: tar --zstd -xf ...');
            (0, child_process_1.execSync)(`tar --zstd -xf "${archivePath}" -C "${destDir}"`, {
                stdio: 'pipe',
                timeout: 3600000, // 1 hour timeout
            });
            logger_1.logger.info('Extraction succeeded with tar --zstd');
            return;
        }
        catch (err) {
            logger_1.logger.debug(`tar --zstd failed: ${err.message}`);
        }
        // Strategy 2: Try `zstd -d` piped to `tar -x`
        try {
            logger_1.logger.info('Trying extraction with: zstd -d | tar -xf ...');
            await new Promise((resolve, reject) => {
                const zstd = (0, child_process_1.spawn)('zstd', ['-d', '--stdout', archivePath], { stdio: ['pipe', 'pipe', 'pipe'] });
                const tar = (0, child_process_1.spawn)('tar', ['-xf', '-', '-C', destDir], { stdio: ['pipe', 'pipe', 'pipe'] });
                zstd.stdout.pipe(tar.stdin);
                let zstdErr = '';
                let tarErr = '';
                zstd.stderr.on('data', (d) => { zstdErr += d.toString(); });
                tar.stderr.on('data', (d) => { tarErr += d.toString(); });
                let resolved = false;
                const finish = (err) => {
                    if (resolved)
                        return;
                    resolved = true;
                    if (err)
                        reject(err);
                    else
                        resolve();
                };
                tar.on('close', (code) => {
                    if (code === 0)
                        finish();
                    else
                        finish(new Error(`tar exited with code ${code}: ${tarErr}`));
                });
                zstd.on('close', (code) => {
                    if (code !== 0)
                        finish(new Error(`zstd exited with code ${code}: ${zstdErr}`));
                });
                tar.on('error', (e) => finish(new Error(`tar spawn error: ${e.message}`)));
                zstd.on('error', (e) => finish(new Error(`zstd spawn error: ${e.message}`)));
            });
            logger_1.logger.info('Extraction succeeded with zstd | tar');
            return;
        }
        catch (err) {
            logger_1.logger.debug(`zstd pipe failed: ${err.message}`);
        }
        // Strategy 3: Try plain `tar xf` (some versions auto-detect zstd)
        try {
            logger_1.logger.info('Trying extraction with: tar xf ... (auto-detect)');
            (0, child_process_1.execSync)(`tar xf "${archivePath}" -C "${destDir}"`, {
                stdio: 'pipe',
                timeout: 3600000,
            });
            logger_1.logger.info('Extraction succeeded with tar xf (auto-detect)');
            return;
        }
        catch (err) {
            logger_1.logger.debug(`tar auto-detect failed: ${err.message}`);
        }
        // Strategy 4: Pure TypeScript Zstandard decompressor (zero dependencies)
        logger_1.logger.info('Using built-in TypeScript Zstandard decompressor (no system tools needed)...');
        await this.extractTarZstPure(archivePath, destDir);
        logger_1.logger.info('Extraction succeeded with built-in decompressor');
    }
    /**
     * Extract a tar.zst file using the built-in pure TypeScript Zstandard decompressor.
     * Decompresses to a .tar file first, then extracts with the tar parser.
     * No system tools required.
     */
    extractTarZstPure(archivePath, destDir) {
        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(archivePath, { highWaterMark: 256 * 1024 });
            const zstdDecompress = new zstd_1.ZstdDecompressStream();
            let buffer = Buffer.alloc(0);
            let currentEntry = null;
            let currentFile = null;
            let remainingBytes = 0;
            let filesExtracted = 0;
            zstdDecompress.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
                while (buffer.length > 0) {
                    if (!currentEntry) {
                        if (buffer.length < 512)
                            break;
                        const header = buffer.subarray(0, 512);
                        buffer = buffer.subarray(512);
                        currentEntry = parseTarHeader(header);
                        if (!currentEntry)
                            continue;
                        if (currentEntry.type === 'file' && currentEntry.size > 0) {
                            const filePath = path.join(destDir, currentEntry.name);
                            const fileDir = path.dirname(filePath);
                            if (!fs.existsSync(fileDir)) {
                                fs.mkdirSync(fileDir, { recursive: true });
                            }
                            if (currentEntry.name.endsWith('.chunk') ||
                                currentEntry.name.endsWith('.primary') ||
                                currentEntry.name.endsWith('.secondary')) {
                                currentFile = fs.createWriteStream(filePath);
                                remainingBytes = currentEntry.size;
                                filesExtracted++;
                                if (filesExtracted % 100 === 0) {
                                    logger_1.logger.info(`Extracted ${filesExtracted} files...`);
                                }
                            }
                            else {
                                remainingBytes = currentEntry.size;
                                currentFile = null;
                            }
                        }
                        else if (currentEntry.type === 'directory') {
                            const dirPath = path.join(destDir, currentEntry.name);
                            if (!fs.existsSync(dirPath)) {
                                fs.mkdirSync(dirPath, { recursive: true });
                            }
                            currentEntry = null;
                            continue;
                        }
                        else {
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
                            const padding = (512 - (currentEntry.size % 512)) % 512;
                            if (padding > 0 && buffer.length >= padding) {
                                buffer = buffer.subarray(padding);
                            }
                            else if (padding > 0) {
                                remainingBytes = -padding;
                            }
                            currentEntry = null;
                        }
                    }
                    else if (remainingBytes < 0) {
                        const paddingLeft = -remainingBytes;
                        if (buffer.length >= paddingLeft) {
                            buffer = buffer.subarray(paddingLeft);
                            remainingBytes = 0;
                            currentEntry = null;
                        }
                        else {
                            break;
                        }
                    }
                    else {
                        currentEntry = null;
                    }
                }
            });
            zstdDecompress.on('end', () => {
                logger_1.logger.info(`Extraction complete: ${filesExtracted} files`);
                resolve();
            });
            zstdDecompress.on('error', (err) => {
                reject(new Error(`Zstd decompression error: ${err.message}`));
            });
            readStream.on('error', (err) => {
                reject(new Error(`File read error: ${err.message}`));
            });
            readStream.pipe(zstdDecompress);
        });
    }
    /**
     * Extract a tar.gz file to a directory.
     */
    extractTarGz(archivePath, destDir) {
        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(archivePath);
            const gunzip = zlib.createGunzip();
            let buffer = Buffer.alloc(0);
            let currentEntry = null;
            let currentFile = null;
            let remainingBytes = 0;
            let filesExtracted = 0;
            gunzip.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
                while (buffer.length > 0) {
                    if (!currentEntry) {
                        // Need a 512-byte header
                        if (buffer.length < 512)
                            break;
                        const header = buffer.subarray(0, 512);
                        buffer = buffer.subarray(512);
                        currentEntry = parseTarHeader(header);
                        if (!currentEntry)
                            continue; // End of archive or empty
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
                                    logger_1.logger.info(`Extracted ${filesExtracted} files...`);
                                }
                            }
                            else {
                                // Skip non-chunk files — just consume the bytes
                                remainingBytes = currentEntry.size;
                                currentFile = null;
                            }
                        }
                        else if (currentEntry.type === 'directory') {
                            const dirPath = path.join(destDir, currentEntry.name);
                            if (!fs.existsSync(dirPath)) {
                                fs.mkdirSync(dirPath, { recursive: true });
                            }
                            currentEntry = null;
                            continue;
                        }
                        else {
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
                            const padding = (512 - (currentEntry.size % 512)) % 512;
                            if (padding > 0 && buffer.length >= padding) {
                                buffer = buffer.subarray(padding);
                            }
                            else if (padding > 0) {
                                // Not enough data yet for padding
                                remainingBytes = -padding; // Flag to skip padding bytes
                            }
                            currentEntry = null;
                        }
                    }
                    else if (remainingBytes < 0) {
                        // Skipping padding bytes
                        const paddingLeft = -remainingBytes;
                        if (buffer.length >= paddingLeft) {
                            buffer = buffer.subarray(paddingLeft);
                            remainingBytes = 0;
                            currentEntry = null;
                        }
                        else {
                            break;
                        }
                    }
                    else {
                        currentEntry = null;
                    }
                }
            });
            gunzip.on('end', () => {
                logger_1.logger.info(`Extraction complete: ${filesExtracted} files`);
                resolve();
            });
            gunzip.on('error', reject);
            readStream.pipe(gunzip);
        });
    }
    /**
     * Find the immutable DB directory within the extracted snapshot.
     */
    findImmutableDir(baseDir) {
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
        const search = (dir, depth) => {
            if (depth > 5)
                return null;
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                // Check if this directory has chunk files
                if (entries.some(e => e.name.endsWith('.chunk')))
                    return dir;
                // Recurse into subdirectories
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const result = search(path.join(dir, entry.name), depth + 1);
                        if (result)
                            return result;
                    }
                }
            }
            catch { }
            return null;
        };
        return search(baseDir, 0);
    }
    /**
     * Clean up temporary extraction directory.
     */
    cleanup(tempDir) {
        try {
            logger_1.logger.info('Cleaning up temporary files...');
            fs.rmSync(tempDir, { recursive: true, force: true });
            logger_1.logger.info('Cleanup complete');
        }
        catch (err) {
            logger_1.logger.warn(`Cleanup failed: ${err.message}`);
        }
    }
}
exports.MithrilBootstrap = MithrilBootstrap;
/**
 * Bootstrap from a local immutable DB directory (e.g., from an existing cardano-node).
 * Useful when you already have the node's DB and just want to index it.
 */
async function bootstrapFromLocalDb(store, immutableDir, options = {}) {
    logger_1.logger.info(`Bootstrapping from local immutable DB: ${immutableDir}`);
    const processor = new processor_1.BlockProcessor(store);
    let totalBlocks = 0;
    let batchBlocks = [];
    (0, chunk_parser_1.parseImmutableDb)(immutableDir, (block) => {
        batchBlocks.push(block);
        if (batchBlocks.length >= 1000) {
            processor.processBatch(batchBlocks);
            totalBlocks += batchBlocks.length;
            batchBlocks = [];
            if (totalBlocks % 10000 === 0) {
                logger_1.logger.info(`Indexed ${totalBlocks} blocks`);
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
    logger_1.logger.info(`Local bootstrap complete: ${totalBlocks} blocks indexed`);
    return totalBlocks;
}
//# sourceMappingURL=bootstrap.js.map