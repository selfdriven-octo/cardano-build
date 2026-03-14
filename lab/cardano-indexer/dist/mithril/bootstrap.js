const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { spawn } = require("child_process");
const { MithrilClient, downloadStream } = require("./aggregator");
const { ZstdDecompressStream } = require("../lib/zstd");
const { parseImmutableDb } = require("./chunk-parser");
const { BlockProcessor } = require("../indexer/processor");
const { DataStore } = require("../database/store");
const { DecodedBlock } = require("../decoder/block");
const { logger } = require("../config/logger");
function parseTarHeader(header) {
    if (header.length < 512) return null;
    let allZero = true;
    for(let i = 0; i < 512; i++){
        if (header[i] !== 0) {
            allZero = false;
            break;
        }
    }
    if (allZero) return null;
    let name = '';
    for(let i = 0; i < 100 && header[i] !== 0; i++){
        name += String.fromCharCode(header[i]);
    }
    let prefix = '';
    for(let i = 345; i < 500 && header[i] !== 0; i++){
        prefix += String.fromCharCode(header[i]);
    }
    if (prefix) name = prefix + '/' + name;
    let sizeStr = '';
    for(let i = 124; i < 136 && header[i] !== 0; i++){
        sizeStr += String.fromCharCode(header[i]);
    }
    const size = parseInt(sizeStr.trim(), 8) || 0;
    const typeChar = String.fromCharCode(header[156]);
    const type = typeChar === '0' || typeChar === '\0' ? 'file' : typeChar === '5' ? 'directory' : typeChar;
    return {
        name,
        size,
        type
    };
}
class MithrilBootstrap {
    client;
    store;
    processor;
    constructor(store, network){
        this.client = new MithrilClient(network);
        this.store = store;
        this.processor = new BlockProcessor(store);
    }
    async bootstrap(options) {
        const startTime = Date.now();
        logger.info('=== Mithril Bootstrap ===');
        logger.info(`Network: ${options.network}`);
        const snapshot = await this.client.getLatestSnapshot();
        logger.info(`Snapshot: epoch ${snapshot.beacon.epoch}, ` + `immutable #${snapshot.beacon.immutable_file_number}, ` + `size ${(snapshot.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
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
        const tempDir = options.tempDir || path.join(options.dataDir, '_mithril_temp');
        const immutableDir = path.join(tempDir, 'immutable');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, {
            recursive: true
        });
        if (!fs.existsSync(immutableDir)) fs.mkdirSync(immutableDir, {
            recursive: true
        });
        const downloadUrl = this.client.getDownloadUrl(snapshot);
        logger.info(`Downloading snapshot from: ${downloadUrl}`);
        const sizeGB = (snapshot.size / 1024 / 1024 / 1024).toFixed(1);
        logger.info(`This may take a while (~${sizeGB} GB to download)...`);
        await this.downloadAndExtract(downloadUrl, tempDir, snapshot.compression_algorithm);
        const dbPath = this.findImmutableDir(tempDir);
        if (!dbPath) {
            throw new Error('Could not find immutable DB directory in snapshot');
        }
        logger.info(`Found immutable DB at: ${dbPath}`);
        this.store.enableAppendMode();
        logger.info('Parsing and indexing blocks from snapshot...');
        let totalBlocks = 0;
        let batchBlocks = [];
        let lastTip = null;
        const FLUSH_INTERVAL = 5000;
        const count = parseImmutableDb(dbPath, (block)=>{
            batchBlocks.push(block);
            lastTip = block;
            if (batchBlocks.length >= 1000) {
                this.processor.processBatch(batchBlocks);
                totalBlocks += batchBlocks.length;
                batchBlocks = [];
                if (totalBlocks % FLUSH_INTERVAL === 0) {
                    this.store.flushAndClear();
                    if (totalBlocks % 50000 === 0) {
                        const mem = process.memoryUsage();
                        logger.info(`Indexed ${totalBlocks} blocks (height ${block.height}, epoch ${block.epoch}) | RSS: ${(mem.rss / 1024 / 1024).toFixed(0)} MB`);
                    }
                }
            }
        }, {
            startChunk: options.startChunk,
            endChunk: options.endChunk
        });
        if (batchBlocks.length > 0) {
            this.processor.processBatch(batchBlocks);
            totalBlocks += batchBlocks.length;
        }
        if (lastTip) {
            this.store.updateSyncState({
                last_block_hash: lastTip.hash,
                last_height: lastTip.height,
                last_slot: lastTip.slot,
                last_timestamp: lastTip.timestamp,
                status: 'bootstrapped'
            });
        }
        this.store.flushAndClear();
        await this.store.finalizeAppendMode();
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        logger.info('=== Bootstrap Complete ===');
        logger.info(`Total blocks indexed: ${totalBlocks}`);
        logger.info(`Time elapsed: ${elapsed} minutes`);
        if (lastTip) {
            logger.info(`Chain tip: height ${lastTip.height}, slot ${lastTip.slot}, epoch ${lastTip.epoch}`);
        }
        logger.info('Data stored in JSONL files. You can now start live chain sync to catch up to the current tip.');
        this.cleanup(tempDir);
    }
    async downloadAndExtract(url, destDir, compression) {
        const isZstd = compression === 'zstandard' || compression === 'zstd' || url.includes('.tar.zst') || url.includes('zstandard');
        const ext = isZstd ? 'tar.zst' : 'tar.gz';
        const archivePath = path.join(destDir, `snapshot.${ext}`);
        logger.info(`Compression: ${compression || 'auto-detected'} → ${ext}`);
        const writeStream = fs.createWriteStream(archivePath);
        let lastProgress = 0;
        await downloadStream(url, (chunk)=>{
            writeStream.write(chunk);
        }, (bytes)=>{
            const mb = Math.floor(bytes / 1024 / 1024);
            if (mb - lastProgress >= 100) {
                logger.info(`Downloaded: ${mb} MB`);
                lastProgress = mb;
            }
        });
        writeStream.end();
        await new Promise((resolve)=>writeStream.on('finish', resolve));
        logger.info('Download complete. Extracting archive...');
        if (isZstd) {
            await this.extractTarZst(archivePath, destDir);
        } else {
            await this.extractTarGz(archivePath, destDir);
        }
        logger.info('Extraction complete');
        try {
            fs.unlinkSync(archivePath);
        } catch  {}
    }
    spawnAsync(cmd, args) {
        return new Promise((resolve, reject)=>{
            const proc = spawn(cmd, args, {
                stdio: [
                    'ignore',
                    'ignore',
                    'pipe'
                ]
            });
            let stderr = '';
            proc.stderr.on('data', (d)=>{
                stderr += d.toString().slice(-500);
            });
            proc.on('error', (e)=>reject(new Error(`${cmd} spawn error: ${e.message}`)));
            proc.on('close', (code)=>{
                if (code === 0) resolve();
                else reject(new Error(`${cmd} exited with code ${code}: ${stderr.trim()}`));
            });
        });
    }
    async extractTarZst(archivePath, destDir) {
        try {
            logger.info('Trying extraction with: tar xf ... (auto-detect)');
            await this.spawnAsync('tar', [
                'xf',
                archivePath,
                '-C',
                destDir
            ]);
            logger.info('Extraction succeeded with tar xf (auto-detect)');
            return;
        } catch (err) {
            logger.debug(`tar auto-detect failed: ${err.message}`);
        }
        try {
            logger.info('Trying extraction with: tar --zstd -xf ...');
            await this.spawnAsync('tar', [
                '--zstd',
                '-xf',
                archivePath,
                '-C',
                destDir
            ]);
            logger.info('Extraction succeeded with tar --zstd');
            return;
        } catch (err) {
            logger.debug(`tar --zstd failed: ${err.message}`);
        }
        try {
            logger.info('Trying extraction with: zstd -d | tar -xf ...');
            await new Promise((resolve, reject)=>{
                const zstdProc = spawn('zstd', [
                    '-d',
                    '--stdout',
                    archivePath
                ], {
                    stdio: [
                        'ignore',
                        'pipe',
                        'pipe'
                    ]
                });
                const tarProc = spawn('tar', [
                    '-xf',
                    '-',
                    '-C',
                    destDir
                ], {
                    stdio: [
                        'pipe',
                        'ignore',
                        'pipe'
                    ]
                });
                zstdProc.stdout.pipe(tarProc.stdin);
                let zstdErr = '';
                let tarErr = '';
                zstdProc.stderr.on('data', (d)=>{
                    zstdErr += d.toString().slice(-500);
                });
                tarProc.stderr.on('data', (d)=>{
                    tarErr += d.toString().slice(-500);
                });
                let resolved = false;
                const finish = (err)=>{
                    if (resolved) return;
                    resolved = true;
                    if (err) reject(err);
                    else resolve();
                };
                tarProc.on('close', (code)=>{
                    if (code === 0) finish();
                    else finish(new Error(`tar exited with code ${code}: ${tarErr}`));
                });
                zstdProc.on('close', (code)=>{
                    if (code !== 0 && !resolved) finish(new Error(`zstd exited with code ${code}: ${zstdErr}`));
                });
                tarProc.on('error', (e)=>finish(new Error(`tar error: ${e.message}`)));
                zstdProc.on('error', (e)=>finish(new Error(`zstd error: ${e.message}`)));
            });
            logger.info('Extraction succeeded with zstd | tar');
            return;
        } catch (err) {
            logger.debug(`zstd pipe failed: ${err.message}`);
        }
        logger.info('Using built-in TypeScript Zstandard decompressor (no system tools needed)...');
        await this.extractTarZstPure(archivePath, destDir);
        logger.info('Extraction succeeded with built-in decompressor');
    }
    extractTarZstPure(archivePath, destDir) {
        return new Promise((resolve, reject)=>{
            const readStream = fs.createReadStream(archivePath, {
                highWaterMark: 256 * 1024
            });
            const zstdDecompress = new ZstdDecompressStream();
            let buffer = Buffer.alloc(0);
            let currentEntry = null;
            let currentFile = null;
            let remainingBytes = 0;
            let filesExtracted = 0;
            zstdDecompress.on('data', (chunk)=>{
                buffer = Buffer.concat([
                    buffer,
                    chunk
                ]);
                while(buffer.length > 0){
                    if (!currentEntry) {
                        if (buffer.length < 512) break;
                        const header = buffer.subarray(0, 512);
                        buffer = buffer.subarray(512);
                        currentEntry = parseTarHeader(header);
                        if (!currentEntry) continue;
                        if (currentEntry.type === 'file' && currentEntry.size > 0) {
                            const filePath = path.join(destDir, currentEntry.name);
                            const fileDir = path.dirname(filePath);
                            if (!fs.existsSync(fileDir)) {
                                fs.mkdirSync(fileDir, {
                                    recursive: true
                                });
                            }
                            if (currentEntry.name.endsWith('.chunk') || currentEntry.name.endsWith('.primary') || currentEntry.name.endsWith('.secondary')) {
                                currentFile = fs.createWriteStream(filePath);
                                remainingBytes = currentEntry.size;
                                filesExtracted++;
                                if (filesExtracted % 100 === 0) {
                                    logger.info(`Extracted ${filesExtracted} files...`);
                                }
                            } else {
                                remainingBytes = currentEntry.size;
                                currentFile = null;
                            }
                        } else if (currentEntry.type === 'directory') {
                            const dirPath = path.join(destDir, currentEntry.name);
                            if (!fs.existsSync(dirPath)) {
                                fs.mkdirSync(dirPath, {
                                    recursive: true
                                });
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
                            const padding = (512 - currentEntry.size % 512) % 512;
                            if (padding > 0 && buffer.length >= padding) {
                                buffer = buffer.subarray(padding);
                            } else if (padding > 0) {
                                remainingBytes = -padding;
                            }
                            currentEntry = null;
                        }
                    } else if (remainingBytes < 0) {
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
            zstdDecompress.on('end', ()=>{
                logger.info(`Extraction complete: ${filesExtracted} files`);
                resolve();
            });
            zstdDecompress.on('error', (err)=>{
                reject(new Error(`Zstd decompression error: ${err.message}`));
            });
            readStream.on('error', (err)=>{
                reject(new Error(`File read error: ${err.message}`));
            });
            readStream.pipe(zstdDecompress);
        });
    }
    extractTarGz(archivePath, destDir) {
        return new Promise((resolve, reject)=>{
            const readStream = fs.createReadStream(archivePath);
            const gunzip = zlib.createGunzip();
            let buffer = Buffer.alloc(0);
            let currentEntry = null;
            let currentFile = null;
            let remainingBytes = 0;
            let filesExtracted = 0;
            gunzip.on('data', (chunk)=>{
                buffer = Buffer.concat([
                    buffer,
                    chunk
                ]);
                while(buffer.length > 0){
                    if (!currentEntry) {
                        if (buffer.length < 512) break;
                        const header = buffer.subarray(0, 512);
                        buffer = buffer.subarray(512);
                        currentEntry = parseTarHeader(header);
                        if (!currentEntry) continue;
                        if (currentEntry.type === 'file' && currentEntry.size > 0) {
                            const filePath = path.join(destDir, currentEntry.name);
                            const fileDir = path.dirname(filePath);
                            if (!fs.existsSync(fileDir)) {
                                fs.mkdirSync(fileDir, {
                                    recursive: true
                                });
                            }
                            if (currentEntry.name.endsWith('.chunk') || currentEntry.name.endsWith('.primary') || currentEntry.name.endsWith('.secondary')) {
                                currentFile = fs.createWriteStream(filePath);
                                remainingBytes = currentEntry.size;
                                filesExtracted++;
                                if (filesExtracted % 100 === 0) {
                                    logger.info(`Extracted ${filesExtracted} files...`);
                                }
                            } else {
                                remainingBytes = currentEntry.size;
                                currentFile = null;
                            }
                        } else if (currentEntry.type === 'directory') {
                            const dirPath = path.join(destDir, currentEntry.name);
                            if (!fs.existsSync(dirPath)) {
                                fs.mkdirSync(dirPath, {
                                    recursive: true
                                });
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
                            const padding = (512 - currentEntry.size % 512) % 512;
                            if (padding > 0 && buffer.length >= padding) {
                                buffer = buffer.subarray(padding);
                            } else if (padding > 0) {
                                remainingBytes = -padding;
                            }
                            currentEntry = null;
                        }
                    } else if (remainingBytes < 0) {
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
            gunzip.on('end', ()=>{
                logger.info(`Extraction complete: ${filesExtracted} files`);
                resolve();
            });
            gunzip.on('error', reject);
            readStream.pipe(gunzip);
        });
    }
    findImmutableDir(baseDir) {
        const candidates = [
            path.join(baseDir, 'immutable'),
            path.join(baseDir, 'db', 'immutable'),
            path.join(baseDir, 'cardano', 'immutable'),
            path.join(baseDir, 'cardano', 'db', 'immutable')
        ];
        for (const dir of candidates){
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                if (files.some((f)=>f.endsWith('.chunk'))) {
                    return dir;
                }
            }
        }
        const search = (dir, depth)=>{
            if (depth > 5) return null;
            try {
                const entries = fs.readdirSync(dir, {
                    withFileTypes: true
                });
                if (entries.some((e)=>e.name.endsWith('.chunk'))) return dir;
                for (const entry of entries){
                    if (entry.isDirectory()) {
                        const result = search(path.join(dir, entry.name), depth + 1);
                        if (result) return result;
                    }
                }
            } catch  {}
            return null;
        };
        return search(baseDir, 0);
    }
    cleanup(tempDir) {
        try {
            logger.info('Cleaning up temporary files...');
            fs.rmSync(tempDir, {
                recursive: true,
                force: true
            });
            logger.info('Cleanup complete');
        } catch (err) {
            logger.warn(`Cleanup failed: ${err.message}`);
        }
    }
}
async function bootstrapFromLocalDb(store, immutableDir, options = {}) {
    logger.info(`Bootstrapping from local immutable DB: ${immutableDir}`);
    store.enableAppendMode();
    const processor = new BlockProcessor(store);
    let totalBlocks = 0;
    let batchBlocks = [];
    let lastTip = null;
    parseImmutableDb(immutableDir, (block)=>{
        batchBlocks.push(block);
        lastTip = block;
        if (batchBlocks.length >= 1000) {
            processor.processBatch(batchBlocks);
            totalBlocks += batchBlocks.length;
            batchBlocks = [];
            if (totalBlocks % 5000 === 0) {
                store.flushAndClear();
            }
            if (totalBlocks % 50000 === 0) {
                logger.info(`Indexed ${totalBlocks} blocks`);
            }
        }
    }, options);
    if (batchBlocks.length > 0) {
        processor.processBatch(batchBlocks);
        totalBlocks += batchBlocks.length;
    }
    if (lastTip) {
        store.updateSyncState({
            last_block_hash: lastTip.hash,
            last_height: lastTip.height,
            last_slot: lastTip.slot,
            last_timestamp: lastTip.timestamp,
            status: 'bootstrapped'
        });
    }
    store.flushAndClear();
    await store.finalizeAppendMode();
    logger.info(`Local bootstrap complete: ${totalBlocks} blocks indexed`);
    return totalBlocks;
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/mithril/bootstrap.ts

exports.bootstrapFromLocalDb = bootstrapFromLocalDb;
exports.MithrilBootstrap = MithrilBootstrap;
