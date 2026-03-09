import { DataStore } from '../database/store';
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
export declare class MithrilBootstrap {
    private client;
    private store;
    private processor;
    constructor(store: DataStore, network: string);
    /**
     * Run the full bootstrap process.
     * Downloads and imports the latest Mithril snapshot.
     */
    bootstrap(options: BootstrapOptions): Promise<void>;
    /**
     * Download and extract a snapshot archive.
     * Supports both .tar.gz (gzip) and .tar.zst (zstandard) compression.
     */
    private downloadAndExtract;
    /**
     * Extract a tar.zst file using system tools.
     * Tries: (1) tar with --zstd flag, (2) zstd pipe to tar, (3) error with instructions.
     * Node.js has no built-in Zstandard support, so we rely on system tools.
     */
    private extractTarZst;
    /**
     * Extract a tar.zst file using the built-in pure TypeScript Zstandard decompressor.
     * Decompresses to a .tar file first, then extracts with the tar parser.
     * No system tools required.
     */
    private extractTarZstPure;
    /**
     * Extract a tar.gz file to a directory.
     */
    private extractTarGz;
    /**
     * Find the immutable DB directory within the extracted snapshot.
     */
    private findImmutableDir;
    /**
     * Clean up temporary extraction directory.
     */
    private cleanup;
}
/**
 * Bootstrap from a local immutable DB directory (e.g., from an existing cardano-node).
 * Useful when you already have the node's DB and just want to index it.
 */
export declare function bootstrapFromLocalDb(store: DataStore, immutableDir: string, options?: {
    startChunk?: number;
    endChunk?: number;
}): Promise<number>;
