export interface NetworkConfig {
  name: string;
  networkMagic: number;
  relayNodes: { host: string; port: number }[];
  byronGenesisHash: string;
  shelleyGenesisHash: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
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
      { host: 'preview-node.world.dev.cardano.org', port: 30002 },
      { host: 'preview-node.world.dev.cardano.org', port: 3001 },
      { host: 'preview-node.play.dev.cardano.org', port: 3001 },
    ],
    byronGenesisHash: '83de1d7404f689e6507c27a1791d6740d4e222925a3547335d9443cb8820e602',
    shelleyGenesisHash: '363498d1024f84bb39d3fa9593ce391571c81f0c956846acf4c0eedaa6e6tried',
  },
  preprod: {
    name: 'preprod',
    networkMagic: 1,
    relayNodes: [
      { host: 'preprod-node.world.dev.cardano.org', port: 30000 },
      { host: 'preprod-node.world.dev.cardano.org', port: 3001 },
    ],
    byronGenesisHash: '9ad7ff320c9cf74e0f5ee78d22a85ce42bb0a487d0506bf60cfb0a91a72152df',
    shelleyGenesisHash: '4a3f86e0e6e27dab7f5d0aa4b7d8bdeb7e7f0c6e7bfc1ccf22f70b0eb3e49a4e',
  },
};

// Ouroboros protocol versions for node-to-node
export const PROTOCOL_VERSIONS: Record<number, number> = {
  15: 15, // Latest supported N2N version
  14: 14,
  // v13 removed from cardano-node 10.5.0+
  // v11-12 had PeerSharing encoding bugs
};

// Mini-protocol IDs
export const MINI_PROTOCOL_IDS = {
  HANDSHAKE: 0,
  CHAIN_SYNC: 2,
  BLOCK_FETCH: 3,
  TX_SUBMISSION: 4,
  KEEP_ALIVE: 8,
} as const;
