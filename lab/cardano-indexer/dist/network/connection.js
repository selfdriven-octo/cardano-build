const { Multiplexer } = require("./mux");
const { performHandshake, HandshakeResult } = require("./handshake");
const { ChainSyncClient } = require("./chain-sync");
const { BlockFetchClient } = require("./block-fetch");
const { KeepAliveClient } = require("./keep-alive");
const { logger } = require("../config/logger");
async function connectToNode(host, port, networkMagic) {
    logger.info(`Connecting to relay node ${host}:${port}...`);
    const mux = new Multiplexer(host, port);
    await mux.connect();
    const handshakeResult = await performHandshake(mux, networkMagic);
    if (!handshakeResult.accepted) {
        mux.close();
        throw new Error(`Handshake rejected: ${handshakeResult.reason}`);
    }
    const chainSync = new ChainSyncClient(mux);
    const blockFetch = new BlockFetchClient(mux);
    const keepAlive = new KeepAliveClient(mux);
    logger.info(`Node connection established (version ${handshakeResult.version})`);
    return {
        mux,
        chainSync,
        blockFetch,
        keepAlive,
        handshakeResult,
        close () {
            mux.close();
        }
    };
}
async function connectToRelay(relays, networkMagic) {
    const errors = [];
    for (const relay of relays){
        try {
            return await connectToNode(relay.host, relay.port, networkMagic);
        } catch (err) {
            logger.warn(`Failed to connect to ${relay.host}:${relay.port}: ${err.message}`);
            errors.push(err);
        }
    }
    throw new Error(`Failed to connect to any relay node. Errors:\n${errors.map((e)=>e.message).join('\n')}`);
}


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/network/connection.ts

exports.connectToNode = connectToNode;
exports.connectToRelay = connectToRelay;
