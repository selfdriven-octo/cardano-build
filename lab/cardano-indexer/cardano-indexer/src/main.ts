import { loadConfig } from './config';
import { logger } from './config/logger';
import { DataStore } from './database/store';
import { SyncEngine } from './indexer/engine';
import { createApiServer } from './api/server';
import { MithrilBootstrap, bootstrapFromLocalDb } from './mithril/bootstrap';
import * as path from 'path';

/**
 * Parse CLI arguments into a simple key-value map.
 *
 *   --bootstrap           → { bootstrap: true }
 *   --bootstrap-local /p  → { 'bootstrap-local': '/p' }
 *   --skip-verify         → { 'skip-verify': true }
 *   --api-only            → { 'api-only': true }
 */
function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  const rest = argv.slice(2); // skip node + script path

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function printUsage(): void {
  console.log(`
Cardano Indexer — Zero-dependency Node.js blockchain indexer

Usage:
  node dist/main.js [options]

Modes:
  (default)                      Live chain sync from relay nodes
  --bootstrap                    Bootstrap from latest Mithril snapshot, then live sync
  --bootstrap-local <path>       Bootstrap from a local cardano-node immutable DB directory
  --api-only                     Start API server only (no sync)

Bootstrap Options:
  --skip-verify                  Skip Mithril certificate chain verification
  --start-chunk <n>              Start importing from chunk number N
  --end-chunk <n>                Stop importing at chunk number N
  --temp-dir <path>              Temporary directory for snapshot extraction

Environment:
  CARDANO_NETWORK                Network: mainnet | preview (default: preview)
  DATA_DIR                       Data directory (default: ./data)
  API_PORT                       REST API port (default: 3000)
  API_HOST                       REST API host (default: 0.0.0.0)
  LOG_LEVEL                      Log level: debug | info | warn | error (default: info)
  RELAY_HOST / RELAY_PORT        Custom relay node

Examples:
  # Bootstrap from Mithril snapshot on preview testnet
  CARDANO_NETWORK=preview node dist/main.js --bootstrap

  # Bootstrap from existing cardano-node DB
  node dist/main.js --bootstrap-local /var/lib/cardano/db/immutable

  # Live sync only (default)
  node dist/main.js

  # API server only (query previously indexed data)
  node dist/main.js --api-only
`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (args['help'] || args['h']) {
    printUsage();
    process.exit(0);
  }

  logger.info('=== Cardano Indexer ===');
  logger.info('Zero external dependencies — pure Node.js implementation');

  // Load configuration
  const config = loadConfig();
  logger.setLevel(config.logLevel);
  logger.info(`Network: ${config.network.name} (magic: ${config.network.networkMagic})`);

  // Initialize data store
  const dataDir = path.dirname(config.db.path);
  const store = new DataStore(dataDir);

  // Create API server (always started)
  const syncEngine = new SyncEngine(store, config);
  const apiServer = createApiServer(
    store,
    () => syncEngine.getStatus(),
    config.api.port,
    config.api.host
  );

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down...');
    syncEngine.stop();
    apiServer.stop();
    store.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`, { stack: err.stack });
    shutdown();
  });
  process.on('unhandledRejection', (reason: any) => {
    logger.error(`Unhandled rejection: ${reason?.message || reason}`);
  });

  // Start API server
  apiServer.start();

  // ----- Mode: Bootstrap from Mithril snapshot -----
  if (args['bootstrap']) {
    logger.info('=== Mithril Bootstrap Mode ===');

    const bootstrap = new MithrilBootstrap(store, config.network.name);
    await bootstrap.bootstrap({
      network: config.network.name,
      dataDir,
      skipVerification: !!args['skip-verify'],
      startChunk: typeof args['start-chunk'] === 'string' ? parseInt(args['start-chunk'], 10) : undefined,
      endChunk: typeof args['end-chunk'] === 'string' ? parseInt(args['end-chunk'], 10) : undefined,
      tempDir: typeof args['temp-dir'] === 'string' ? args['temp-dir'] : undefined,
    });

    logger.info('Bootstrap complete. Starting live chain sync to catch up...');
  }

  // ----- Mode: Bootstrap from local immutable DB -----
  if (args['bootstrap-local']) {
    const localPath = typeof args['bootstrap-local'] === 'string' ? args['bootstrap-local'] : '';
    if (!localPath) {
      logger.error('--bootstrap-local requires a path to the immutable DB directory');
      process.exit(1);
    }

    logger.info('=== Local Bootstrap Mode ===');
    const count = await bootstrapFromLocalDb(store, localPath, {
      startChunk: typeof args['start-chunk'] === 'string' ? parseInt(args['start-chunk'], 10) : undefined,
      endChunk: typeof args['end-chunk'] === 'string' ? parseInt(args['end-chunk'], 10) : undefined,
    });

    logger.info(`Local bootstrap complete: ${count} blocks indexed. Starting live chain sync...`);
  }

  // ----- Mode: API only -----
  if (args['api-only']) {
    logger.info('Running in API-only mode. No chain sync.');
    logger.info(`API server listening on ${config.api.host}:${config.api.port}`);
    return; // keep process alive via API server
  }

  // ----- Default: Live chain sync -----
  logger.info(`Relay nodes: ${config.relayNodes.map(r => `${r.host}:${r.port}`).join(', ')}`);
  logger.info('Starting chain synchronization...');
  try {
    await syncEngine.start();
  } catch (err: any) {
    logger.error(`Fatal sync error: ${err.message}`);
    shutdown();
  }
}

main().catch((err) => {
  logger.error(`Startup error: ${err.message}`);
  process.exit(1);
});
