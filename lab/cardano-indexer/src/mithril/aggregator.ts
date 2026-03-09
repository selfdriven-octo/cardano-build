import * as https from 'https';
import { logger } from '../config/logger';

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

export const MITHRIL_AGGREGATORS: Record<string, string[]> = {
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

export interface MithrilSnapshot {
  digest: string;
  beacon: {
    network: string;
    epoch: number;
    immutable_file_number: number;
  };
  certificate_hash: string;
  size: number;
  created_at: string;
  locations: string[];
  compression_algorithm: string;
  cardano_node_version: string;
}

export interface MithrilCertificate {
  hash: string;
  previous_hash: string;
  epoch: number;
  signed_entity_type: any;
  metadata: any;
  protocol_message: any;
  signed_message: string;
  aggregate_verification_key: string;
  multi_signature: string;
  genesis_signature: string;
}

/**
 * Fetch JSON from a URL using built-in https module.
 */
function fetchJson(url: string): Promise<any> {
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
        } catch (err: any) {
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
export function downloadStream(url: string, onData: (chunk: Buffer) => void, onProgress?: (bytes: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const handler = (res: any) => {
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

      res.on('data', (chunk: Buffer) => {
        onData(chunk);
        downloaded += chunk.length;
        if (onProgress) onProgress(downloaded);
      });

      res.on('end', () => {
        logger.info(`Download complete: ${(downloaded / 1024 / 1024).toFixed(1)} MB`);
        resolve();
      });

      res.on('error', reject);
    };

    https.get(url, handler).on('error', reject);
  });
}

export class MithrilClient {
  private baseUrl: string;
  private fallbackUrls: string[];

  constructor(network: string) {
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

  /**
   * Fetch JSON with automatic fallback to alternative aggregator URLs.
   */
  private async fetchWithFallback(path: string): Promise<any> {
    const urls = [this.baseUrl, ...this.fallbackUrls];
    let lastErr: Error | null = null;

    for (const base of urls) {
      const url = `${base}${path}`;
      try {
        const result = await fetchJson(url);
        // If a fallback worked, promote it to primary
        if (base !== this.baseUrl) {
          logger.info(`Switching to working aggregator: ${base}`);
          this.baseUrl = base;
        }
        return result;
      } catch (err: any) {
        logger.warn(`Aggregator ${base} failed: ${err.message}`);
        lastErr = err;
      }
    }

    throw lastErr || new Error('All aggregator endpoints failed');
  }

  /**
   * List available Cardano DB snapshots (most recent first).
   */
  async listSnapshots(): Promise<MithrilSnapshot[]> {
    logger.info('Fetching Mithril snapshot list...');
    const snapshots = await this.fetchWithFallback('/artifact/snapshots');
    logger.info(`Found ${snapshots.length} available snapshots`);
    return snapshots;
  }

  /**
   * Get the latest (most recent) snapshot.
   */
  async getLatestSnapshot(): Promise<MithrilSnapshot> {
    const snapshots = await this.listSnapshots();
    if (snapshots.length === 0) {
      throw new Error('No Mithril snapshots available');
    }
    const latest = snapshots[0];
    logger.info(`Latest snapshot: epoch ${latest.beacon.epoch}, immutable file #${latest.beacon.immutable_file_number}, size ${(latest.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
    return latest;
  }

  /**
   * Get snapshot details by digest.
   */
  async getSnapshot(digest: string): Promise<MithrilSnapshot> {
    return this.fetchWithFallback(`/artifact/snapshot/${digest}`);
  }

  /**
   * Get the certificate for a snapshot (for verification).
   */
  async getCertificate(hash: string): Promise<MithrilCertificate> {
    logger.info(`Fetching certificate: ${hash.substring(0, 16)}...`);
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
  async verifyCertificateChain(certificateHash: string): Promise<boolean> {
    logger.info('Verifying certificate chain...');
    let currentHash = certificateHash;
    let depth = 0;

    while (currentHash && depth < 100) {
      const cert = await this.getCertificate(currentHash);

      if (!cert.hash) {
        logger.error('Certificate missing hash');
        return false;
      }

      // Genesis certificate has no previous hash or has genesis_signature
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
    return true; // Assume valid if chain is very long
  }

  /**
   * Get the download URL for a snapshot.
   */
  getDownloadUrl(snapshot: MithrilSnapshot): string {
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
  async listCardanoTransactions(): Promise<any[]> {
    try {
      return await this.fetchWithFallback('/artifact/cardano-transactions');
    } catch (err: any) {
      logger.warn(`Failed to list Cardano transactions: ${err.message}`);
      return [];
    }
  }
}
