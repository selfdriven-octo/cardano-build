"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToNode = connectToNode;
exports.connectToRelay = connectToRelay;
const mux_1 = require("./mux");
const handshake_1 = require("./handshake");
const chain_sync_1 = require("./chain-sync");
const block_fetch_1 = require("./block-fetch");
const logger_1 = require("../config/logger");
/**
 * Connect to a Cardano relay node and perform the handshake.
 * Returns a NodeConnection with ready-to-use ChainSync and BlockFetch clients.
 */
async function connectToNode(host, port, networkMagic) {
    logger_1.logger.info(`Connecting to relay node ${host}:${port}...`);
    const mux = new mux_1.Multiplexer(host, port);
    await mux.connect();
    // Perform handshake
    const handshakeResult = await (0, handshake_1.performHandshake)(mux, networkMagic);
    if (!handshakeResult.accepted) {
        mux.close();
        throw new Error(`Handshake rejected: ${handshakeResult.reason}`);
    }
    // Create mini-protocol clients
    const chainSync = new chain_sync_1.ChainSyncClient(mux);
    const blockFetch = new block_fetch_1.BlockFetchClient(mux);
    logger_1.logger.info(`Node connection established (version ${handshakeResult.version})`);
    return {
        mux,
        chainSync,
        blockFetch,
        handshakeResult,
        close() {
            mux.close();
        },
    };
}
/**
 * Try to connect to one of several relay nodes.
 * Returns the first successful connection.
 */
async function connectToRelay(relays, networkMagic) {
    const errors = [];
    for (const relay of relays) {
        try {
            return await connectToNode(relay.host, relay.port, networkMagic);
        }
        catch (err) {
            logger_1.logger.warn(`Failed to connect to ${relay.host}:${relay.port}: ${err.message}`);
            errors.push(err);
        }
    }
    throw new Error(`Failed to connect to any relay node. Errors:\n${errors.map(e => e.message).join('\n')}`);
}
//# sourceMappingURL=connection.js.map