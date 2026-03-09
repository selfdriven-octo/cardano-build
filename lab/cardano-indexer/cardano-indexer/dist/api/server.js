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
exports.createApiServer = createApiServer;
const http = __importStar(require("http"));
const url = __importStar(require("url"));
const logger_1 = require("../config/logger");
function createApiServer(store, getStatus, port, host) {
    // Route definitions
    const routes = [
        // Chain
        {
            pattern: /^\/api\/chain\/tip$/,
            handler: () => {
                const tip = store.getChainTip();
                if (!tip)
                    return { height: 0, slot: 0, hash: null, timestamp: 0 };
                return { height: tip.height, slot: tip.slot, hash: tip.hash, timestamp: tip.timestamp, era: tip.era, epoch: tip.epoch };
            },
        },
        {
            pattern: /^\/api\/chain\/status$/,
            handler: () => {
                const status = getStatus();
                const tip = store.getChainTip();
                return { ...status, localTip: tip ? { height: tip.height, slot: tip.slot, hash: tip.hash } : null, totalBlocks: store.getBlockCount() };
            },
        },
        // Blocks
        {
            pattern: /^\/api\/blocks$/,
            handler: (_params, query) => {
                const limit = Math.min(parseInt(query.limit) || 20, 100);
                const offset = parseInt(query.offset) || 0;
                const blocks = store.getLatestBlocks(limit, offset);
                return { blocks, total: store.getBlockCount(), limit, offset };
            },
        },
        {
            pattern: /^\/api\/blocks\/([^/]+)$/,
            handler: (params) => {
                const id = params['0'];
                const height = parseInt(id, 10);
                let block = (!isNaN(height) && height.toString() === id)
                    ? store.getBlockByHeight(height)
                    : store.getBlockByHash(id);
                if (!block)
                    return { _status: 404, error: 'Block not found' };
                const txs = store.getTransactionsByBlock(block.hash);
                return { ...block, transactions: txs };
            },
        },
        // Transactions
        {
            pattern: /^\/api\/txs\/([^/]+)$/,
            handler: (params) => {
                const txHash = params['0'];
                const tx = store.getTransactionByHash(txHash);
                if (!tx)
                    return { _status: 404, error: 'Transaction not found' };
                const inputs = store.getInputsForTx(tx.tx_hash);
                const outputs = store.getOutputsForTx(tx.tx_hash).map(out => ({
                    ...out,
                    multiAssets: store.getAssetsForOutput(out.tx_hash, out.output_index),
                }));
                return { ...tx, inputs, outputs };
            },
        },
        // Addresses
        {
            pattern: /^\/api\/addresses\/([^/]+)$/,
            handler: (params) => {
                const address = params['0'];
                const { balance, utxo_count } = store.getAddressBalance(address);
                const txCount = store.getAddressTxCount(address);
                return { address, balance, utxoCount: utxo_count, txCount };
            },
        },
        {
            pattern: /^\/api\/addresses\/([^/]+)\/utxos$/,
            handler: (params) => {
                const address = params['0'];
                const utxos = store.getUtxosForAddress(address).map(u => ({
                    ...u,
                    multiAssets: store.getAssetsForOutput(u.tx_hash, u.output_index),
                }));
                return { address, utxos, count: utxos.length };
            },
        },
        {
            pattern: /^\/api\/addresses\/([^/]+)\/txs$/,
            handler: (params, query) => {
                const address = params['0'];
                const limit = Math.min(parseInt(query.limit) || 20, 100);
                const offset = parseInt(query.offset) || 0;
                const txs = store.getAddressTransactions(address, limit, offset);
                return { address, transactions: txs, total: store.getAddressTxCount(address), limit, offset };
            },
        },
        // Health
        {
            pattern: /^\/api\/health$/,
            handler: () => {
                const status = getStatus();
                const healthy = status.status !== 'error';
                return { _status: healthy ? 200 : 503, healthy, status: status.status, lastHeight: status.lastHeight, network: status.network };
            },
        },
        // Root
        {
            pattern: /^\/$/,
            handler: () => ({
                name: 'Cardano Indexer',
                version: '1.0.0',
                endpoints: [
                    'GET /api/chain/tip', 'GET /api/chain/status', 'GET /api/blocks',
                    'GET /api/blocks/:id', 'GET /api/txs/:txHash', 'GET /api/addresses/:addr',
                    'GET /api/addresses/:addr/utxos', 'GET /api/addresses/:addr/txs', 'GET /api/health',
                ],
            }),
        },
    ];
    const server = http.createServer((req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        const parsed = url.parse(req.url || '/', true);
        const pathname = parsed.pathname || '/';
        const query = parsed.query;
        logger_1.logger.debug(`${req.method} ${pathname}`);
        for (const route of routes) {
            const match = pathname.match(route.pattern);
            if (match) {
                try {
                    const params = {};
                    for (let i = 1; i < match.length; i++) {
                        params[String(i - 1)] = decodeURIComponent(match[i]);
                    }
                    const result = route.handler(params, query);
                    const statusCode = result?._status || 200;
                    if (result?._status)
                        delete result._status;
                    res.writeHead(statusCode);
                    res.end(JSON.stringify(result));
                }
                catch (err) {
                    logger_1.logger.error(`API error: ${err.message}`);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
                return;
            }
        }
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    });
    return {
        start() {
            server.listen(port, host, () => {
                logger_1.logger.info(`API server listening on http://${host}:${port}`);
            });
        },
        stop() {
            server.close();
            logger_1.logger.info('API server stopped');
        },
    };
}
//# sourceMappingURL=server.js.map