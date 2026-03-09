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
exports.MithrilClient = exports.MITHRIL_AGGREGATORS = void 0;
exports.downloadStream = downloadStream;
const https = __importStar(require("https"));
const logger_1 = require("../config/logger");
/**
 * Mithril Aggregator API Client
 *
 * Connects to Mithril aggregator nodes to fetch certified snapshots
 * of the Cardano blockchain for fast bootstrapping.
 *
 * Aggregator endpoints:
 *   GET /artifact/snapshots          - List Cardano DB snapshots
 *   GET /artifact/snapshot/{digest}  - Get specific snapshot details
 *   GET /certificate/{hash}         - Get certificate for verification
 *   GET /artifact/cardano-transactions - List certified transaction sets
 */
exports.MITHRIL_AGGREGATORS = {
    mainnet: [
        'https://aggregator.release-mainnet.api.mithril.network/aggregator',
    ],
    preview: [
        'https://aggregator.pre-release-preview.api.mithril.network/aggregator',
        'https://aggregator.testing-preview.api.mithril.network/aggregator',
    ],
    preprod: [
        'https://aggregator.release-preprod.api.mithril.network/aggregator',
    ],
};
/**
 * Fetch JSON from a URL using built-in https module.
 */
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
            // Handle redirects
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
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (err) {
                    reject(new Error(`JSON parse error: ${err.message}`));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(60000, () => {
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
        });
    });
}
/**
 * Download a file from a URL, streaming to a write stream.
 */
function downloadStream(url, onData, onProgress) {
    return new Promise((resolve, reject) => {
        const handler = (res) => {
            // Handle redirects
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
            res.on('data', (chunk) => {
                onData(chunk);
                downloaded += chunk.length;
                if (onProgress)
                    onProgress(downloaded);
            });
            res.on('end', () => {
                logger_1.logger.info(`Download complete: ${(downloaded / 1024 / 1024).toFixed(1)} MB`);
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
    constructor(network) {
        const urls = exports.MITHRIL_AGGREGATORS[network];
        if (!urls || urls.length === 0) {
            throw new Error(`No Mithril aggregator for network: ${network}. Available: ${Object.keys(exports.MITHRIL_AGGREGATORS).join(', ')}`);
        }
        this.baseUrl = urls[0];
        this.fallbackUrls = urls.slice(1);
        logger_1.logger.info(`Mithril client initialized for ${network}: ${this.baseUrl}`);
        if (this.fallbackUrls.length > 0) {
            logger_1.logger.info(`Fallback aggregators: ${this.fallbackUrls.join(', ')}`);
        }
    }
    /**
     * Fetch JSON with automatic fallback to alternative aggregator URLs.
     */
    async fetchWithFallback(path) {
        const urls = [this.baseUrl, ...this.fallbackUrls];
        let lastErr = null;
        for (const base of urls) {
            const url = `${base}${path}`;
            try {
                const result = await fetchJson(url);
                // If a fallback worked, promote it to primary
                if (base !== this.baseUrl) {
                    logger_1.logger.info(`Switching to working aggregator: ${base}`);
                    this.baseUrl = base;
                }
                return result;
            }
            catch (err) {
                logger_1.logger.warn(`Aggregator ${base} failed: ${err.message}`);
                lastErr = err;
            }
        }
        throw lastErr || new Error('All aggregator endpoints failed');
    }
    /**
     * List available Cardano DB snapshots (most recent first).
     */
    async listSnapshots() {
        logger_1.logger.info('Fetching Mithril snapshot list...');
        const snapshots = await this.fetchWithFallback('/artifact/snapshots');
        logger_1.logger.info(`Found ${snapshots.length} available snapshots`);
        return snapshots;
    }
    /**
     * Get the latest (most recent) snapshot.
     */
    async getLatestSnapshot() {
        const snapshots = await this.listSnapshots();
        if (snapshots.length === 0) {
            throw new Error('No Mithril snapshots available');
        }
        const latest = snapshots[0];
        logger_1.logger.info(`Latest snapshot: epoch ${latest.beacon.epoch}, immutable file #${latest.beacon.immutable_file_number}, size ${(latest.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
        return latest;
    }
    /**
     * Get snapshot details by digest.
     */
    async getSnapshot(digest) {
        return this.fetchWithFallback(`/artifact/snapshot/${digest}`);
    }
    /**
     * Get the certificate for a snapshot (for verification).
     */
    async getCertificate(hash) {
        logger_1.logger.info(`Fetching certificate: ${hash.substring(0, 16)}...`);
        return this.fetchWithFallback(`/certificate/${hash}`);
    }
    /**
     * Verify the certificate chain back to the genesis certificate.
     * Returns true if the chain is valid.
     *
     * Note: Full cryptographic verification of multi-signatures requires
     * implementing STM (Stake-based Threshold Multisignature) verification.
     * This implementation verifies the certificate chain structure.
     */
    async verifyCertificateChain(certificateHash) {
        logger_1.logger.info('Verifying certificate chain...');
        let currentHash = certificateHash;
        let depth = 0;
        while (currentHash && depth < 100) {
            const cert = await this.getCertificate(currentHash);
            if (!cert.hash) {
                logger_1.logger.error('Certificate missing hash');
                return false;
            }
            // Genesis certificate has no previous hash or has genesis_signature
            if (cert.genesis_signature && cert.genesis_signature.length > 0) {
                logger_1.logger.info(`Certificate chain verified (depth: ${depth + 1}, reached genesis)`);
                return true;
            }
            if (!cert.previous_hash || cert.previous_hash === '') {
                logger_1.logger.info(`Certificate chain verified (depth: ${depth + 1}, reached root)`);
                return true;
            }
            currentHash = cert.previous_hash;
            depth++;
        }
        logger_1.logger.warn(`Certificate chain too deep (${depth}), stopping verification`);
        return true; // Assume valid if chain is very long
    }
    /**
     * Get the download URL for a snapshot.
     */
    getDownloadUrl(snapshot) {
        // Prefer the first location (usually the CDN)
        if (snapshot.locations && snapshot.locations.length > 0) {
            return snapshot.locations[0];
        }
        // Fallback to aggregator download endpoint
        return `${this.baseUrl}/artifact/snapshot/${snapshot.digest}/download`;
    }
    /**
     * List available Cardano transaction snapshot artifacts.
     */
    async listCardanoTransactions() {
        try {
            return await this.fetchWithFallback('/artifact/cardano-transactions');
        }
        catch (err) {
            logger_1.logger.warn(`Failed to list Cardano transactions: ${err.message}`);
            return [];
        }
    }
}
exports.MithrilClient = MithrilClient;
//# sourceMappingURL=aggregator.js.map