import * as fs from 'fs';
import * as path from 'path';
import { NETWORKS, NetworkConfig } from './networks';

// Simple .env parser — no external dependency
function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
loadDotEnv();

export interface AppConfig {
  network: NetworkConfig;
  relayNodes: { host: string; port: number }[];
  db: {
    path: string;
  };
  api: {
    port: number;
    host: string;
  };
  sync: {
    batchSize: number;
  };
  logLevel: string;
}

function parseRelayNodes(envVal?: string, defaults?: { host: string; port: number }[]): { host: string; port: number }[] {
  if (envVal) {
    return envVal.split(',').map(s => {
      const [host, portStr] = s.trim().split(':');
      return { host, port: parseInt(portStr, 10) || 3001 };
    });
  }
  return defaults || [];
}

export function loadConfig(): AppConfig {
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
