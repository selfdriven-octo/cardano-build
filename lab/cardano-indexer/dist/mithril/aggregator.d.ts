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
export declare const MITHRIL_AGGREGATORS: Record<string, string>;
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
 * Download a file from a URL, streaming to a write stream.
 */
export declare function downloadStream(url: string, onData: (chunk: Buffer) => void, onProgress?: (bytes: number) => void): Promise<void>;
export declare class MithrilClient {
    private baseUrl;
    constructor(network: string);
    /**
     * List available Cardano DB snapshots (most recent first).
     */
    listSnapshots(): Promise<MithrilSnapshot[]>;
    /**
     * Get the latest (most recent) snapshot.
     */
    getLatestSnapshot(): Promise<MithrilSnapshot>;
    /**
     * Get snapshot details by digest.
     */
    getSnapshot(digest: string): Promise<MithrilSnapshot>;
    /**
     * Get the certificate for a snapshot (for verification).
     */
    getCertificate(hash: string): Promise<MithrilCertificate>;
    /**
     * Verify the certificate chain back to the genesis certificate.
     * Returns true if the chain is valid.
     *
     * Note: Full cryptographic verification of multi-signatures requires
     * implementing STM (Stake-based Threshold Multisignature) verification.
     * This implementation verifies the certificate chain structure.
     */
    verifyCertificateChain(certificateHash: string): Promise<boolean>;
    /**
     * Get the download URL for a snapshot.
     */
    getDownloadUrl(snapshot: MithrilSnapshot): string;
    /**
     * List available Cardano transaction snapshot artifacts.
     */
    listCardanoTransactions(): Promise<any[]>;
}
