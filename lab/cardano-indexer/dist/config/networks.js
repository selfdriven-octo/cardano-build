"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MINI_PROTOCOL_IDS = exports.PROTOCOL_VERSIONS = exports.NETWORKS = void 0;
exports.NETWORKS = {
    mainnet: {
        name: 'mainnet',
        networkMagic: 764824073,
        relayNodes: [
            { host: 'relays-new.cardano-mainnet.iohk.io', port: 3001 },
            { host: 'backbone.cardano.iog.io', port: 3001 },
        ],
        byronGenesisHash: '5f20df933584822601f9e3f8c024eb5eb252fe8cefb24d1317dc3d432e940ebb',
        shelleyGenesisHash: '1a3be38bcbb7911969283716ad7aa550250226b76a61fc51cc9a9a35d9276d81',
    },
    preview: {
        name: 'preview',
        networkMagic: 2,
        relayNodes: [
            { host: 'preview-node.world.dev.cardano.org', port: 3001 },
        ],
        byronGenesisHash: '83de1d7404f689e6507c27a1791d6740d4e222925a3547335d9443cb8820e602',
        shelleyGenesisHash: '363498d1024f84bb39d3fa9593ce391571c81f0c956846acf4c0eedaa6e6tried',
    },
};
// Ouroboros protocol versions for node-to-node
exports.PROTOCOL_VERSIONS = {
    // version number -> networkMagic style
    13: 13, // Latest supported N2N version
    12: 12,
    11: 11,
    10: 10,
};
// Mini-protocol IDs
exports.MINI_PROTOCOL_IDS = {
    HANDSHAKE: 0,
    CHAIN_SYNC: 2,
    BLOCK_FETCH: 3,
    TX_SUBMISSION: 4,
    KEEP_ALIVE: 8,
};
//# sourceMappingURL=networks.js.map