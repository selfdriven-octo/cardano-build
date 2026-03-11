const { loadConfig } = require("./config");
const { logger } = require("./config/logger");
const { DataStore } = require("./database/store");
const { SyncEngine } = require("./indexer/engine");
const { createApiServer } = require("./api/server");
const { MithrilBootstrap, bootstrapFromLocalDb } = require("./mithril/bootstrap");
const path = require("path");
function parseArgs(argv) {
    const args = {};
    const rest = argv.slice(2);
    for(let i = 0; i < rest.length; i++){
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
function printUsage() {
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
    const config = loadConfig();
    logger.setLevel(config.logLevel);
    logger.info(`Network: ${config.network.name} (magic: ${config.network.networkMagic})`);
    const dataDir = path.dirname(config.db.path);
    const store = new DataStore(dataDir);
    const syncEngine = new SyncEngine(store, config);
    const apiServer = createApiServer(store, ()=>syncEngine.getStatus(), config.api.port, config.api.host);
    const shutdown = ()=>{
        logger.info('Shutting down...');
        syncEngine.stop();
        apiServer.stop();
        store.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('uncaughtException', (err)=>{
        logger.error(`Uncaught exception: ${err.message}`, {
            stack: err.stack
        });
        shutdown();
    });
    process.on('unhandledRejection', (reason)=>{
        logger.error(`Unhandled rejection: ${reason?.message || reason}`);
    });
    apiServer.start();
    if (args['bootstrap']) {
        logger.info('=== Mithril Bootstrap Mode ===');
        const bootstrap = new MithrilBootstrap(store, config.network.name);
        await bootstrap.bootstrap({
            network: config.network.name,
            dataDir,
            skipVerification: !!args['skip-verify'],
            startChunk: typeof args['start-chunk'] === 'string' ? parseInt(args['start-chunk'], 10) : undefined,
            endChunk: typeof args['end-chunk'] === 'string' ? parseInt(args['end-chunk'], 10) : undefined,
            tempDir: typeof args['temp-dir'] === 'string' ? args['temp-dir'] : undefined
        });
        logger.info('Bootstrap complete. Starting live chain sync to catch up...');
    }
    if (args['bootstrap-local']) {
        const localPath = typeof args['bootstrap-local'] === 'string' ? args['bootstrap-local'] : '';
        if (!localPath) {
            logger.error('--bootstrap-local requires a path to the immutable DB directory');
            process.exit(1);
        }
        logger.info('=== Local Bootstrap Mode ===');
        const count = await bootstrapFromLocalDb(store, localPath, {
            startChunk: typeof args['start-chunk'] === 'string' ? parseInt(args['start-chunk'], 10) : undefined,
            endChunk: typeof args['end-chunk'] === 'string' ? parseInt(args['end-chunk'], 10) : undefined
        });
        logger.info(`Local bootstrap complete: ${count} blocks indexed. Starting live chain sync...`);
    }
    if (args['api-only']) {
        logger.info('Running in API-only mode. No chain sync.');
        logger.info(`API server listening on ${config.api.host}:${config.api.port}`);
        return;
    }
    logger.info(`Relay nodes: ${config.relayNodes.map((r)=>`${r.host}:${r.port}`).join(', ')}`);
    logger.info('Starting chain synchronization...');
    try {
        await syncEngine.start();
    } catch (err) {
        logger.error(`Fatal sync error: ${err.message}`);
        shutdown();
    }
}
main().catch((err)=>{
    logger.error(`Startup error: ${err.message}`);
    process.exit(1);
});


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/main.ts