# Cardano Indexer — Usage Guide

**Zero-Dependency Node.js Blockchain Indexer**
Version 1.0.0 | March 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Prerequisites](#2-prerequisites)
3. [Installation](#3-installation)
4. [Configuration](#4-configuration)
5. [Running the Indexer](#5-running-the-indexer)
6. [Mithril Bootstrap](#6-mithril-bootstrap)
7. [REST API Reference](#7-rest-api-reference)
8. [Architecture Overview](#8-architecture-overview)
9. [Data Storage](#9-data-storage)
10. [Network Protocols](#10-network-protocols)
11. [Supported Eras](#11-supported-eras)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Introduction

The Cardano Indexer is a read-only Node.js application that connects directly to the Cardano blockchain network, downloads and decodes every block, and stores the data in a queryable format accessible via a REST API. It is designed as a lightweight alternative to cardano-db-sync for applications that need blockchain data without running the full Haskell toolchain.

The project is built entirely with zero external runtime dependencies. Every component — from CBOR decoding to Bech32 address encoding, from the HTTP server to the data store — is implemented using only Node.js built-in modules.

### Key Features

- **Zero Dependencies** — No npm packages required at runtime; only Node.js built-in modules are used
- **Full Chain Sync** — Connects to Cardano relay nodes via the Ouroboros node-to-node protocol
- **Mithril Bootstrap** — Download certified snapshots from the Mithril network to skip days of block-by-block sync
- **REST API** — Query blocks, transactions, addresses, UTXOs, and multi-assets over HTTP
- **Multi-Era Support** — Decodes blocks from all Cardano eras: Byron, Shelley, Allegra, Mary, Alonzo, Babbage, and Conway
- **Configurable Network** — Switch between mainnet and preview testnet via environment variable
- **Rollback Handling** — Correctly handles chain forks by rolling back blocks and restoring UTXO state

---

## 2. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18.x or later | ES2022 features used (structuredClone, etc.) |
| TypeScript | 5.x (dev only) | Only needed to compile from source |
| Network access | — | TCP port 3001 outbound to Cardano relay nodes |
| Disk space | Varies | ~2 GB for preview, ~80 GB+ for mainnet (full chain) |

No native C/C++ addons are required. The project compiles and runs on Linux, macOS, and Windows.

---

## 3. Installation

### From Source

Clone the repository and build the TypeScript source:

```bash
git clone <repository-url> cardano-indexer
cd cardano-indexer
npm install          # installs TypeScript compiler (dev dep only)
npm run build        # compiles to dist/
```

### Pre-Built

If you received the pre-built `dist/` directory, you can run directly without compiling:

```bash
node dist/main.js
```

No `npm install` is needed for production use since there are zero runtime dependencies.

---

## 4. Configuration

The indexer is configured via environment variables or a `.env` file placed in the project root directory. Copy the provided example file to get started:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NETWORK` | `preview` | Cardano network to connect to: `mainnet` or `preview` |
| `RELAY_NODES` | (auto) | Comma-separated relay node addresses (`host:port`). If omitted, uses built-in defaults for the selected network. |
| `DB_PATH` | `./data/cardano.db` | Path to the data directory. The JSON data file is stored here. |
| `API_PORT` | `3000` | Port for the REST API server |
| `API_HOST` | `0.0.0.0` | Host/IP to bind the API server to |
| `SYNC_BATCH_SIZE` | `100` | Number of blocks to accumulate before writing to the data store in a batch |
| `LOG_LEVEL` | `info` | Logging verbosity: `debug`, `info`, `warn`, or `error` |

### Example `.env` File

```env
NETWORK=preview
RELAY_NODES=preview-node.world.dev.cardano.org:3001
DB_PATH=./data/cardano.db
API_PORT=3000
API_HOST=0.0.0.0
SYNC_BATCH_SIZE=100
LOG_LEVEL=info
```

### Built-in Relay Nodes

If you do not set `RELAY_NODES`, the indexer uses these defaults:

| Network | Relay Host | Port |
|---|---|---|
| mainnet | `relays-new.cardano-mainnet.iohk.io` | 3001 |
| mainnet | `backbone.cardano.iog.io` | 3001 |
| preview | `preview-node.world.dev.cardano.org` | 3001 |

---

## 5. Running the Indexer

The indexer supports four operational modes, selected via command-line flags.

### Live Chain Sync (Default)

Connects to a Cardano relay node and syncs blocks in real-time from genesis (or from the last saved position):

```bash
# Preview testnet (default)
node dist/main.js

# Mainnet
NETWORK=mainnet node dist/main.js
```

The indexer finds the intersection with the chain, downloads blocks, decodes them, and stores the data. Progress is logged periodically showing the sync percentage. Once the chain tip is reached, the indexer waits for new blocks.

### Mithril Bootstrap + Live Sync

Downloads a certified Mithril snapshot to rapidly populate the data store, then switches to live chain sync to catch up to the current tip:

```bash
cardano-indexer % kill %1 2>/dev/null          
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null
pkill -f "node dist/main.js" 2>/dev/null
```

```bash
node dist/main.js --bootstrap
```

```bash
NETWORK=preview node dist/main.js --bootstrap
```


This is the recommended approach for initial sync, especially on mainnet where block-by-block sync from genesis can take days. See [Section 6](#6-mithril-bootstrap) for full details.

### Local Bootstrap

If you already have a running cardano-node, you can import blocks directly from its immutable DB directory:

```bash
node dist/main.js --bootstrap-local /var/lib/cardano/db/immutable
```

### API-Only Mode

Starts only the REST API server without any chain synchronisation. Useful for querying previously indexed data:

```bash
node dist/main.js --api-only
```

### Command-Line Reference

| Flag | Description |
|---|---|
| `--bootstrap` | Bootstrap from the latest Mithril snapshot, then live sync |
| `--bootstrap-local <path>` | Bootstrap from a local cardano-node immutable DB directory |
| `--api-only` | Start the API server only, no chain synchronisation |
| `--skip-verify` | Skip Mithril certificate chain verification (faster, less secure) |
| `--start-chunk <n>` | Start importing from immutable chunk number N |
| `--end-chunk <n>` | Stop importing at immutable chunk number N |
| `--temp-dir <path>` | Temporary directory for Mithril snapshot extraction |
| `--help` | Show usage information and exit |

### Graceful Shutdown

The indexer handles SIGINT (Ctrl+C) and SIGTERM signals gracefully. On shutdown it flushes any pending data to disk, stops the sync engine, and closes the API server.

---

## 6. Mithril Bootstrap

Mithril is a stake-based threshold multi-signature protocol that produces certified snapshots of the Cardano blockchain. Instead of syncing millions of blocks one by one, you can download a single compressed snapshot and import it in a fraction of the time.

### How It Works

When you run `--bootstrap`, the indexer performs these steps:

1. Query the Mithril aggregator for the latest certified Cardano DB snapshot
2. Verify the certificate chain back to the genesis certificate (unless `--skip-verify` is used)
3. Download the tar.gz archive (streaming)
4. Extract only the immutable chunk, primary, and secondary index files (other data is skipped to save disk space)
5. Parse CBOR-encoded blocks from the chunk files using the secondary index for efficient random access
6. Index all blocks, transactions, inputs, outputs, and multi-assets into the data store in batches of 1,000
7. Clean up temporary files and switch to live chain sync to catch up to the current tip

### Mithril Aggregator URLs

| Network | Aggregator URL |
|---|---|
| mainnet | `https://aggregator.release-mainnet.api.mithril.network/aggregator` |
| preview | `https://aggregator.pre-release-preview.api.mithril.network/aggregator` |
| preprod | `https://aggregator.release-preprod.api.mithril.network/aggregator` |

### Disk Space Requirements

Mithril snapshots are compressed tar.gz archives. You need approximately twice the compressed size in free disk space during bootstrap (for the archive plus extracted files). After bootstrap completes, temporary files are automatically cleaned up.

| Network | Compressed Size | Disk Needed (approx.) |
|---|---|---|
| mainnet | ~40 GB | ~80 GB during bootstrap |
| preview | ~1–2 GB | ~4 GB during bootstrap |

### Examples

```bash
# Bootstrap preview testnet with certificate verification
NETWORK=preview node dist/main.js --bootstrap

# Bootstrap mainnet, skipping verification for speed
NETWORK=mainnet node dist/main.js --bootstrap --skip-verify

# Bootstrap only chunks 0-100 for testing
node dist/main.js --bootstrap --start-chunk 0 --end-chunk 100

# Import from an existing cardano-node database
node dist/main.js --bootstrap-local /var/lib/cardano/db/immutable
```

---

## 7. REST API Reference

The indexer exposes a REST API on the configured host and port (default: `http://0.0.0.0:3000`). All responses are JSON. CORS is enabled by default.

### Chain

| Method | Path | Description |
|---|---|---|
| GET | `/api/chain/tip` | Returns the current chain tip (latest block height, slot, hash, timestamp, era, epoch) |
| GET | `/api/chain/status` | Returns sync status including progress, blocks processed, local tip vs network tip |

### Blocks

| Method | Path | Description |
|---|---|---|
| GET | `/api/blocks` | List latest blocks. Query params: `limit` (max 100, default 20), `offset` |
| GET | `/api/blocks/:id` | Get block by height (integer) or block hash (hex). Includes transactions. |

### Transactions

| Method | Path | Description |
|---|---|---|
| GET | `/api/txs/:txHash` | Get transaction by hash. Returns inputs, outputs (with multi-assets), fee, and metadata. |

### Addresses

| Method | Path | Description |
|---|---|---|
| GET | `/api/addresses/:addr` | Get address summary: ADA balance, UTXO count, transaction count |
| GET | `/api/addresses/:addr/utxos` | List unspent transaction outputs for address (with multi-assets) |
| GET | `/api/addresses/:addr/txs` | List transactions for address. Query params: `limit`, `offset` |

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check. Returns 200 when healthy, 503 on error. Includes sync status. |
| GET | `/` | Root endpoint. Lists all available API endpoints. |

### Example Requests

**Get the current chain tip:**

```bash
curl http://localhost:3000/api/chain/tip
```

```json
{
  "height": 1234567,
  "slot": 98765432,
  "hash": "abc123...",
  "era": "Conway",
  "epoch": 450
}
```

**Look up an address balance:**

```bash
curl http://localhost:3000/api/addresses/addr1q...
```

```json
{
  "address": "addr1q...",
  "balance": 50000000,
  "utxoCount": 3,
  "txCount": 12
}
```

> **Note:** ADA amounts are in lovelace (1 ADA = 1,000,000 lovelace).

**Get a block with its transactions:**

```bash
curl http://localhost:3000/api/blocks/1234567
```

```json
{
  "height": 1234567,
  "hash": "abc123...",
  "slot": 98765432,
  "epoch": 450,
  "era": "Conway",
  "tx_count": 5,
  "transactions": [
    { "tx_hash": "def456...", "fee": 200000, "total_output": 5000000 }
  ]
}
```

**Get transaction details with inputs and outputs:**

```bash
curl http://localhost:3000/api/txs/def456...
```

```json
{
  "tx_hash": "def456...",
  "block_hash": "abc123...",
  "fee": 200000,
  "inputs": [
    { "output_tx_hash": "prev789...", "output_index": 0 }
  ],
  "outputs": [
    {
      "address": "addr1q...",
      "amount": 5000000,
      "multiAssets": [
        { "policy_id": "aabb...", "asset_name": "MyToken", "quantity": 100 }
      ]
    }
  ]
}
```

**List UTXOs for an address:**

```bash
curl http://localhost:3000/api/addresses/addr1q.../utxos
```

```json
{
  "address": "addr1q...",
  "count": 2,
  "utxos": [
    { "tx_hash": "abc...", "output_index": 0, "amount": 3000000, "multiAssets": [] },
    { "tx_hash": "def...", "output_index": 1, "amount": 2000000, "multiAssets": [] }
  ]
}
```

---

## 8. Architecture Overview

The indexer is structured into seven major modules, each with a clear responsibility:

| Module | Directory | Responsibility |
|---|---|---|
| Config | `src/config/` | Load environment variables, parse .env files, define network parameters |
| Network | `src/network/` | TCP multiplexer, Ouroboros handshake, ChainSync and BlockFetch mini-protocols |
| Decoder | `src/decoder/` | CBOR block/transaction decoding, address parsing, era detection |
| Indexer | `src/indexer/` | Block processor, rollback handler, sync engine orchestration |
| Database | `src/database/` | In-memory data store with JSON file persistence and indexed lookups |
| API | `src/api/` | HTTP REST server using Node.js built-in `http` module |
| Mithril | `src/mithril/` | Aggregator client, snapshot download, immutable DB parsing, bootstrap orchestration |
| Libraries | `src/lib/` | Custom CBOR codec (RFC 8949) and Bech32 encoder (BIP-173) |

### Source File Map

```
cardano-indexer/
├── src/
│   ├── main.ts                    # Entry point, CLI argument parsing
│   ├── config/
│   │   ├── index.ts               # Config loader with .env parser
│   │   ├── networks.ts            # Network definitions (magic, relays, genesis hashes)
│   │   └── logger.ts              # Custom zero-dep logger with colour support
│   ├── network/
│   │   ├── mux.ts                 # Ouroboros TCP multiplexer (8-byte frame headers)
│   │   ├── handshake.ts           # N2N handshake (versions 10–13)
│   │   ├── chain-sync.ts          # ChainSync mini-protocol client
│   │   ├── block-fetch.ts         # BlockFetch mini-protocol client
│   │   └── connection.ts          # Connection management and relay selection
│   ├── decoder/
│   │   ├── cbor.ts                # CBOR utilities, blake2b256 hashing
│   │   ├── block.ts               # Block decoder for all eras (Byron–Conway)
│   │   ├── transaction.ts         # Transaction CBOR decoder
│   │   └── address.ts             # Cardano address decoder with Bech32
│   ├── indexer/
│   │   ├── engine.ts              # Sync engine orchestrator
│   │   ├── processor.ts           # Block processor (inserts to data store)
│   │   └── rollback.ts            # Rollback handler (fork recovery)
│   ├── database/
│   │   └── store.ts               # JSON file-backed in-memory data store
│   ├── mithril/
│   │   ├── aggregator.ts          # Mithril aggregator API client
│   │   ├── chunk-parser.ts        # Immutable DB chunk file parser
│   │   └── bootstrap.ts           # Bootstrap orchestrator
│   └── lib/
│       ├── cbor.ts                # Complete CBOR encoder/decoder (RFC 8949)
│       └── bech32.ts              # Bech32 encoder (BIP-173/BIP-350)
├── dist/                          # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── .env.example
```

### Data Flow

**Live Sync Mode:** The TCP multiplexer maintains the connection and demultiplexes protocol messages. The handshake protocol negotiates a shared version. ChainSync drives the sync by requesting the next block header. When a RollForward message arrives, the block is CBOR-decoded and passed to the block processor, which extracts transactions, inputs, outputs, and multi-assets, inserting them into the data store. The API server reads from the same data store to serve queries.

**Bootstrap Mode:** The Mithril module downloads and extracts a certified snapshot, parses the immutable chunk files, and feeds the decoded blocks into the same block processor pipeline.

---

## 9. Data Storage

The indexer uses an in-memory data store backed by a JSON file on disk. Data is held in memory using JavaScript `Map` structures with multiple indexes for fast lookups, and is periodically flushed to disk every 30 seconds.

### Stored Entities

| Entity | Fields |
|---|---|
| Blocks | `height`, `hash`, `prev_hash`, `slot`, `epoch`, `epoch_slot`, `timestamp`, `issuer_vkey`, `block_size`, `tx_count`, `era` |
| Transactions | `tx_hash`, `block_hash`, `block_height`, `slot`, `index_in_block`, `fee`, `total_output`, `input_count`, `output_count`, `size`, `valid_contract` |
| Inputs | `tx_hash`, `input_index`, `output_tx_hash`, `output_index` |
| Outputs | `tx_hash`, `output_index`, `address`, `amount`, `datum_hash`, `inline_datum`, `script_ref`, `spent_by_tx`, `spent_at_slot` |
| Multi-Assets | `tx_hash`, `output_index`, `policy_id`, `asset_name`, `quantity` |
| Sync State | `last_block_hash`, `last_height`, `last_slot`, `last_timestamp`, `status`, `error` |

### Indexes

The following in-memory indexes enable efficient queries:

- **blocksByHeight** — Maps block height to block hash for height-based lookups
- **blocksBySlot** — Maps slot number to block hash
- **txsByBlock** — Maps block hash to an array of transaction hashes
- **inputsByTx** — Maps transaction hash to its inputs
- **outputsByTx** — Maps transaction hash to its outputs
- **outputsByAddress** — Maps address to output references for balance and UTXO queries
- **assetsByOutput** — Maps output references to multi-asset records

### Persistence

All data is saved to `indexer.json` in the data directory. The file is written every 30 seconds (if data has changed) and on graceful shutdown. On startup, the indexer automatically loads this file and rebuilds all in-memory indexes.

---

## 10. Network Protocols

The indexer implements the Ouroboros node-to-node (N2N) mini-protocol suite to communicate with Cardano relay nodes over TCP.

### Multiplexer

All mini-protocol messages are multiplexed over a single TCP connection. Each frame has an 8-byte header containing a 4-byte timestamp, a 2-byte protocol ID (with a direction bit in bit 15), and a 2-byte payload length. The multiplexer demultiplexes incoming frames and dispatches them to the correct protocol handler.

### Mini-Protocols

| ID | Protocol | Purpose |
|---|---|---|
| 0 | Handshake | Negotiate protocol version (10–13) and exchange network magic |
| 2 | ChainSync | Follow the chain: request next block, receive RollForward/RollBackward events |
| 3 | BlockFetch | Fetch full block bodies by point (slot + hash) |
| 8 | KeepAlive | Periodic heartbeat to prevent connection timeout |

### Network Magic

Each Cardano network has a unique magic number used during the handshake to prevent cross-network connections:

- **Mainnet** — 764824073
- **Preview Testnet** — 2

### ChainSync Messages

| ID | Message | Direction | Description |
|---|---|---|---|
| 0 | MsgRequestNext | Client → Server | Request the next block in the chain |
| 1 | MsgAwaitReply | Server → Client | Server has no new blocks; client should wait |
| 2 | MsgRollForward | Server → Client | New block available; includes block header and tip |
| 3 | MsgRollBackward | Server → Client | Chain fork detected; roll back to specified point |
| 4 | MsgFindIntersect | Client → Server | Find the intersection between client and server chains |
| 5 | MsgIntersectFound | Server → Client | Intersection found at the given point |
| 6 | MsgIntersectNotFound | Server → Client | No intersection found; sync from genesis |

---

## 11. Supported Eras

The Cardano blockchain has evolved through multiple eras, each with different block and transaction formats. The indexer decodes blocks from all eras:

| ID | Era | Key Features |
|---|---|---|
| 0 | Byron EBB | Epoch boundary blocks (no transactions) |
| 1 | Byron | Original Cardano era with Byron-style addresses and transactions |
| 2 | Shelley | Staking, delegation, and new address format (Bech32) |
| 3 | Allegra | Token locking and time-lock scripts |
| 4 | Mary | Multi-asset support (native tokens) |
| 5 | Alonzo | Plutus smart contracts, datum hashes, script references |
| 6 | Babbage | Inline datums, reference inputs, reference scripts |
| 7 | Conway | On-chain governance, DReps, constitutional committee |

---

## 12. Troubleshooting

### Connection Refused or Timeout

If the indexer cannot connect to relay nodes, check that outbound TCP port 3001 is not blocked by your firewall. The indexer will automatically retry with a 10-second delay. You can also try specifying alternative relay nodes via the `RELAY_NODES` environment variable.

### High Memory Usage

Because the data store is entirely in-memory, mainnet usage will require significant RAM (proportional to the number of blocks and transactions indexed). For mainnet, expect memory usage in the tens of gigabytes. Consider running on a machine with adequate RAM, or use the `--start-chunk` and `--end-chunk` flags to limit the scope of a bootstrap import.

### Slow Sync from Genesis

Syncing mainnet from block zero takes a very long time. Use Mithril bootstrap (`--bootstrap`) to skip ahead to a recent snapshot, then live sync only the remaining blocks.

### Data File Corruption

If `indexer.json` becomes corrupted (e.g., due to an unclean shutdown during a write), the indexer will log an error and start with an empty data store. You can delete the file and re-bootstrap to recover.

### CBOR Decode Errors

If you encounter CBOR decode errors during sync, these typically indicate a block from a newer era that the decoder does not yet handle. The indexer logs the error and continues syncing. You can set `LOG_LEVEL=debug` for more detailed diagnostic output.

### Mithril Bootstrap Failures

If a Mithril bootstrap fails mid-download, delete the temporary directory (default: `data/_mithril_temp`) and try again. The download will restart from the beginning. Ensure you have sufficient disk space for the compressed archive plus extraction.

### Port Already in Use

If the API server fails to start with an "address already in use" error, another process is using the configured port. Either stop that process or change `API_PORT` in your `.env` file.

---

*Cardano Indexer v1.0.0 — Built with zero external dependencies*