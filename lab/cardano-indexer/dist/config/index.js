const fs = require("fs");
const path = require("path");
const { NETWORKS, NetworkConfig } = require("./networks");
function loadDotEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
        for (const line of lines){
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) continue;
            const key = trimmed.substring(0, eqIdx).trim();
            let val = trimmed.substring(eqIdx + 1).trim();
            if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            if (!process.env[key]) process.env[key] = val;
        }
    }
}
loadDotEnv();
function parseRelayNodes(envVal, defaults) {
    if (envVal) {
        return envVal.split(',').map((s)=>{
            const [host, portStr] = s.trim().split(':');
            return {
                host,
                port: parseInt(portStr, 10) || 3001
            };
        });
    }
    return defaults || [];
}
function loadConfig() {
    const networkName = process.env.NETWORK || 'preview';
    const network = NETWORKS[networkName];
    if (!network) {
        throw new Error(`Unknown network: ${networkName}. Valid options: ${Object.keys(NETWORKS).join(', ')}`);
    }
    const relayNodes = parseRelayNodes(process.env.RELAY_NODES, network.relayNodes);
    if (relayNodes.length === 0) {
        throw new Error('No relay nodes configured');
    }
    return {
        network,
        relayNodes,
        db: {
            path: process.env.DB_PATH || path.join(process.cwd(), 'data', 'cardano.db')
        },
        api: {
            port: parseInt(process.env.API_PORT || '3000', 10),
            host: process.env.API_HOST || '0.0.0.0'
        },
        sync: {
            batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10)
        },
        logLevel: process.env.LOG_LEVEL || 'info'
    };
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/config/index.ts

exports.loadConfig = loadConfig;
