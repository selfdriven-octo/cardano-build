This is an example code base.
Do use it production!

Build a nodejs version of a cardano node as indexer - eg readonly

Research the Node.js ecosystem for building a Cardano blockchain indexer. I need to understand:

1. What npm packages exist for connecting to the Cardano network using Ouroboros mini-protocols (node-to-node or node-to-client)? Search for packages like @cardano-ogmios, cardano-js, @cardano-sdk, @harmoniclabs, ouroboros-miniprotocols-ts, etc.

2. What is the Ouroboros network protocol structure? What mini-protocols are needed for chain sync (ChainSync, BlockFetch)?

3. What CBOR decoding libraries exist for Node.js that can decode Cardano blocks?

4. What are the known relay nodes / entry points for Cardano mainnet and preview testnet?

Use web search to find:
- npm packages for Cardano Ouroboros mini-protocols in JavaScript/TypeScript
- Cardano network magic numbers for mainnet vs testnet
- Cardano block CBOR structure
- Any existing Node.js Cardano indexer projects on GitHub

Focus on finding the most mature and actively maintained libraries.Check if there are any relevant skills or existing code in the workspace that could help with building a Node.js Cardano indexer. Look at:
- /sessions/trusting-peaceful-mccarthy/mnt/.skills/skills/ - list what's available
- /sessions/trusting-peaceful-mccarthy/mnt/outputs/ - check for any existing project files
- Any selfdriven-ecosystem skill that might have Cardano-related patterns

Just do a quick survey - don't read full files unless they seem directly relevant to Cardano/blockchain.

----

It is possible to get it to work with Mithrill to bootstrap the data store?

Great idea — Mithril would let you skip the slow block-by-block sync from genesis and bootstrap from a certified snapshot instead. Let me research the Mithril API and build the integration.Research the Cardano Mithril protocol and its REST API for bootstrapping chain data. I need to understand:

1. What is the Mithril aggregator API? What endpoints exist for:
   - Listing available snapshots
   - Downloading snapshot archives
   - Getting certificate chains
   - Cardano DB snapshots vs Cardano transaction snapshots

2. What are the Mithril aggregator URLs for:
   - Mainnet
   - Preview testnet
   - Preprod testnet

3. What snapshot types are available? Specifically:
   - Full node DB snapshots (for bootstrapping a cardano-node)
   - Cardano Transactions snapshots (individual transactions)
   - Mithril Stake Distribution snapshots

4. What is the snapshot archive format? (tar.gz? What's inside?)

5. What API endpoints are available at the aggregator? Search for the Mithril REST API documentation.

6. Are there any npm/JS libraries for Mithril, or is it purely HTTP API based?

Use web search to find:
- Mithril aggregator API documentation
- Mithril snapshot download process
- How to verify Mithril certificates in JavaScript
- The actual REST API endpoints (GET /artifact/snapshots, etc.)

Focus on what's needed to download and import a Cardano DB snapshot to bootstrap an indexer.

---

cd cardano-indexer
npm install   # installs only typescript + @types/node
cp .env.example .env
# Edit .env to set NETWORK=preview or NETWORK=mainnet
npm run build
npm start

---

The API will be at http://localhost:3000 with endpoints like /api/chain/tip, /api/blocks, /api/txs/:txHash, /api/addresses/:addr/utxos.

cardano-indexer
 
