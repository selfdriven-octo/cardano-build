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
exports.loadConfig = loadConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const networks_1 = require("./networks");
// Simple .env parser — no external dependency
function loadDotEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1)
                continue;
            const key = trimmed.substring(0, eqIdx).trim();
            let val = trimmed.substring(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
                val = val.slice(1, -1);
            if (!process.env[key])
                process.env[key] = val;
        }
    }
}
loadDotEnv();
function parseRelayNodes(envVal, defaults) {
    if (envVal) {
        return envVal.split(',').map(s => {
            const [host, portStr] = s.trim().split(':');
            return { host, port: parseInt(portStr, 10) || 3001 };
        });
    }
    return defaults || [];
}
function loadConfig() {
    const networkName = process.env.NETWORK || 'preview';
    const network = networks_1.NETWORKS[networkName];
    if (!network) {
        throw new Error(`Unknown network: ${networkName}. Valid options: ${Object.keys(networks_1.NETWORKS).join(', ')}`);
    }
    const relayNodes = parseRelayNodes(process.env.RELAY_NODES, network.relayNodes);
    if (relayNodes.length === 0) {
        throw new Error('No relay nodes configured');
    }
    return {
        network,
        relayNodes,
        db: {
            path: process.env.DB_PATH || path.join(process.cwd(), 'data', 'cardano.db'),
        },
        api: {
            port: parseInt(process.env.API_PORT || '3000', 10),
            host: process.env.API_HOST || '0.0.0.0',
        },
        sync: {
            batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10),
        },
        logLevel: process.env.LOG_LEVEL || 'info',
    };
}
//# sourceMappingURL=index.js.map