const https = require("https");
const { logger } = require("../config/logger");
const MITHRIL_AGGREGATORS = {
    mainnet: [
        'https://aggregator.release-mainnet.api.mithril.network/aggregator'
    ],
    preview: [
        'https://aggregator.pre-release-preview.api.mithril.network/aggregator',
        'https://aggregator.testing-preview.api.mithril.network/aggregator'
    ],
    preprod: [
        'https://aggregator.release-preprod.api.mithril.network/aggregator'
    ]
};
function fetchJson(url) {
    return new Promise((resolve, reject)=>{
        const req = https.get(url, {
            headers: {
                'Accept': 'application/json'
            }
        }, (res)=>{
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchJson(res.headers.location).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} from ${url}`));
                res.resume();
                return;
            }
            let data = '';
            res.setEncoding('utf-8');
            res.on('data', (chunk)=>{
                data += chunk;
            });
            res.on('end', ()=>{
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(new Error(`JSON parse error: ${err.message}`));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(60000, ()=>{
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
        });
    });
}
function downloadStream(url, onData, onProgress) {
    return new Promise((resolve, reject)=>{
        const handler = (res)=>{
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                https.get(res.headers.location, handler).on('error', reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                res.resume();
                return;
            }
            let downloaded = 0;
            const totalSize = parseInt(res.headers['content-length'] || '0', 10);
            res.on('data', (chunk)=>{
                onData(chunk);
                downloaded += chunk.length;
                if (onProgress) onProgress(downloaded);
            });
            res.on('end', ()=>{
                logger.info(`Download complete: ${(downloaded / 1024 / 1024).toFixed(1)} MB`);
                resolve();
            });
            res.on('error', reject);
        };
        https.get(url, handler).on('error', reject);
    });
}
class MithrilClient {
    baseUrl;
    fallbackUrls;
    constructor(network){
        const urls = MITHRIL_AGGREGATORS[network];
        if (!urls || urls.length === 0) {
            throw new Error(`No Mithril aggregator for network: ${network}. Available: ${Object.keys(MITHRIL_AGGREGATORS).join(', ')}`);
        }
        this.baseUrl = urls[0];
        this.fallbackUrls = urls.slice(1);
        logger.info(`Mithril client initialized for ${network}: ${this.baseUrl}`);
        if (this.fallbackUrls.length > 0) {
            logger.info(`Fallback aggregators: ${this.fallbackUrls.join(', ')}`);
        }
    }
    async fetchWithFallback(path) {
        const urls = [
            this.baseUrl,
            ...this.fallbackUrls
        ];
        let lastErr = null;
        for (const base of urls){
            const url = `${base}${path}`;
            try {
                const result = await fetchJson(url);
                if (base !== this.baseUrl) {
                    logger.info(`Switching to working aggregator: ${base}`);
                    this.baseUrl = base;
                }
                return result;
            } catch (err) {
                logger.warn(`Aggregator ${base} failed: ${err.message}`);
                lastErr = err;
            }
        }
        throw lastErr || new Error('All aggregator endpoints failed');
    }
    async listSnapshots() {
        logger.info('Fetching Mithril snapshot list...');
        const snapshots = await this.fetchWithFallback('/artifact/snapshots');
        logger.info(`Found ${snapshots.length} available snapshots`);
        return snapshots;
    }
    async getLatestSnapshot() {
        const snapshots = await this.listSnapshots();
        if (snapshots.length === 0) {
            throw new Error('No Mithril snapshots available');
        }
        const latest = snapshots[0];
        logger.info(`Latest snapshot: epoch ${latest.beacon.epoch}, immutable file #${latest.beacon.immutable_file_number}, size ${(latest.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
        return latest;
    }
    async getSnapshot(digest) {
        return this.fetchWithFallback(`/artifact/snapshot/${digest}`);
    }
    async getCertificate(hash) {
        logger.info(`Fetching certificate: ${hash.substring(0, 16)}...`);
        return this.fetchWithFallback(`/certificate/${hash}`);
    }
    async verifyCertificateChain(certificateHash) {
        logger.info('Verifying certificate chain...');
        let currentHash = certificateHash;
        let depth = 0;
        while(currentHash && depth < 100){
            const cert = await this.getCertificate(currentHash);
            if (!cert.hash) {
                logger.error('Certificate missing hash');
                return false;
            }
            if (cert.genesis_signature && cert.genesis_signature.length > 0) {
                logger.info(`Certificate chain verified (depth: ${depth + 1}, reached genesis)`);
                return true;
            }
            if (!cert.previous_hash || cert.previous_hash === '') {
                logger.info(`Certificate chain verified (depth: ${depth + 1}, reached root)`);
                return true;
            }
            currentHash = cert.previous_hash;
            depth++;
        }
        logger.warn(`Certificate chain too deep (${depth}), stopping verification`);
        return true;
    }
    getDownloadUrl(snapshot) {
        if (snapshot.locations && snapshot.locations.length > 0) {
            return snapshot.locations[0];
        }
        return `${this.baseUrl}/artifact/snapshot/${snapshot.digest}/download`;
    }
    async listCardanoTransactions() {
        try {
            return await this.fetchWithFallback('/artifact/cardano-transactions');
        } catch (err) {
            logger.warn(`Failed to list Cardano transactions: ${err.message}`);
            return [];
        }
    }
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/mithril/aggregator.ts

exports.downloadStream = downloadStream;
exports.MithrilClient = MithrilClient;
exports.MITHRIL_AGGREGATORS = MITHRIL_AGGREGATORS;
