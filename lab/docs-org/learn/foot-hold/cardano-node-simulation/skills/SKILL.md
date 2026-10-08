---
name: cardano-node-architecture
description: "Build interactive educational resources, prototypes, and technical documentation about Cardano node architecture. Use when the user mentions Cardano node, Ouroboros Praos, ChainSync, BlockFetch, TxSubmission, KeepAlive, CBOR/CDDL encoding, ledger rules, Plutus, epoch boundary, block production, KES/VRF, multiplexer, ChainDB, or alternative node implementation. Also use for Cardano-related protocol state machines, consensus mechanisms, or the open challenge to vibe-code an alternative node."
---

# Cardano Node Architecture

Build interactive educational prototypes, technical documentation, and engineering assessments covering Cardano node subsystems — from consensus to CBOR, multiplexer to mempool, ChainDB to crash recovery.

## Overview

This skill captures the complete architecture of a Cardano node as documented through 12 interactive HTML prototypes covering 17 subsystems with 93 implementation notes. It provides the patterns, technical details, and selfdriven branding context needed to build accurate, visually polished educational resources about any Cardano node subsystem.

### Trigger Contexts

Consult this skill for any mention of:
- Cardano node architecture, alternative node implementation, or the vibe-coding challenge
- Ouroboros Praos consensus, chain selection, fork choice, VRF leader election
- Any Cardano mini-protocol: ChainSync, BlockFetch, TxSubmission, KeepAlive, Handshake
- CBOR encoding, CDDL specs, canonical encoding, era-specific wire formats
- Cardano ledger rules, transaction validation, Plutus script execution, CEK machine
- Epoch boundary processing, stake snapshots, reward calculation, nonce evolution
- Block production, KES signatures, VRF proofs, operational certificates
- Multiplexer framing, protocol interleaving, bearer abstraction
- ChainDB, Immutable DB, Volatile DB, crash recovery, ledger snapshots
- Peer management, peer selection governor, connection lifecycle
- Hard fork combinator, era transitions (Byron → Shelley → ... → Conway)
- Engineering effort estimation for Cardano node implementation

## Branding

All prototypes use the selfdriven.tech brand system:
- **Domain**: selfdriven.tech (in footers and headers)
- **Logo**: Embedded as base64 JPEG, 32×32px in headers with border-radius:8px
- **Palette**: Dark theme with accent #e85d4a, green #34d399, blue #60a5fa, purple #a78bfa, yellow #fbbf24, cyan #22d3ee, orange #fb923c
- **Typography**: Poppins (headings/body) + JetBrains Mono (code/data/protocol messages)
- **Patterns**: Panel cards with 3px accent top border, pill-shaped buttons, eyebrow labels (10px uppercase 0.12em tracking), stat cards, colour-coded state badges

See the `selfdriven-ecosystem` skill for the full brand system. This skill's prototypes use a darker variant (--bg: #06070b) suited to technical/developer-facing content.

## Architecture Reference

### The Complete Node — How Pieces Fit Together

```
═══════════════════ NETWORK LAYER ═══════════════════

  TCP Connection (single socket per peer)
        │
  ┌─────▼──────────────────────────────────────────┐
  │  MULTIPLEXER                                    │
  │  8-byte frame: [timestamp:4][proto_id:2][len:2] │
  │  Protocol IDs: 0=Handshake 2=ChainSync          │
  │                3=BlockFetch 7=TxSubmission2      │
  │                8=KeepAlive                       │
  │  Max payload: 65,535 bytes per frame             │
  │  Mode bit (bit 15): 0=Initiator 1=Responder     │
  └──┬────────┬────────────┬──────────────┬────────┘
     │        │            │              │
  ChainSync BlockFetch  TxSubmission  KeepAlive

═══════════════════ CONSENSUS LAYER ═══════════════════

  Praos Chain Selection:
    1. Prefer longest valid chain
    2. Equal length → density in stability window (3k/f slots)
    3. Equal density → VRF output tiebreaker
    4. Never roll back more than k=2160 blocks
    5. Validate VRF proof + KES signature + OpCert

═══════════════════ LEDGER LAYER ═══════════════════

  Transaction Validation:
    Phase 1: Structural (size, fee, inputs, TTL, collateral, value preservation)
    Phase 2: Script execution (Plutus V1/V2/V3 in CEK machine with cost model)
    Two-phase: if Phase 1 passes but Phase 2 fails → collateral consumed

  7 Eras: Byron → Shelley → Allegra → Mary → Alonzo → Babbage → Conway
  Hard Fork Combinator composes era-specific rules

═══════════════════ STORAGE LAYER ═══════════════════

  ChainDB:
    Immutable DB: finalized blocks (older than k), append-only chunk files
    Volatile DB: recent blocks (last k), one file per block hash
    Ledger Snapshots: serialized UTxO + delegation state for crash recovery
    Invariant: immutableTip + k ≤ volatileTip
```

### Data Flow: Block Propagation

```
Peer → Multiplexer → ChainSync (header) → Chain Selection (Praos)
     → BlockFetch (body) → Ledger (validate) → ChainDB (store)
```

### Data Flow: Transaction Propagation

```
Peer → Multiplexer → TxSubmission (pull-based: server drives)
     → Mempool (validate via Phase 1 + Phase 2) → Propagate to other peers
```

### Data Flow: Block Production

```
Slot arrives → VRF leader check → KES period valid? → OpCert valid?
→ Select txs from mempool (fee density sort, size/budget limits)
→ Build block body → Compute body hash (Blake2b-256 of canonical CBOR)
→ Build header → KES sign → Propagate via ChainSync + BlockFetch
```

## Mini-Protocol State Machines

### ChainSync (Protocol ID 2)

```
States: StIdle (consumer), StNext (producer), StMustReply (producer),
        StIntersect (producer), StDone (nobody)

Flow:
  StIdle → MsgFindIntersect [points] → StIntersect
  StIntersect → MsgIntersectFound point tip → StIdle
  StIntersect → MsgIntersectNotFound tip → StIdle
  StIdle → MsgRequestNext → StNext
  StNext → MsgRollForward header tip → StIdle
  StNext → MsgRollBackward point tip → StIdle
  StNext → MsgAwaitReply → StMustReply (consumer at tip, must wait)
  StMustReply → MsgRollForward/MsgRollBackward → StIdle
  StIdle → MsgDone → StDone

Key details:
- Intersection search: consumer sends known points (tip, mid, genesis)
- Pipelining: up to 5000 headers in-flight during initial sync
- StMustReply prevents deadlock: producer MUST eventually respond
- Node-to-Node: exchanges headers only (bodies via BlockFetch)
- Node-to-Client: exchanges full blocks
```

### BlockFetch (Protocol ID 3)

```
States: BFIdle (client), BFBusy (server), BFStreaming (server), BFDone

Flow:
  BFIdle → MsgRequestRange (from, to) → BFBusy
  BFBusy → MsgStartBatch → BFStreaming
  BFBusy → MsgNoBlocks → BFIdle
  BFStreaming → MsgBlock block → BFStreaming (loop)
  BFStreaming → MsgBatchDone → BFIdle
  BFIdle → MsgClientDone → BFDone

Key details:
- Range-based, not cursor-based (request [from_point, to_point])
- Pipeline depth up to 100 during initial sync
- Multi-peer download: different ranges assigned to different peers
- Cancellation on fork switch: discard blocks for abandoned ranges
- Large blocks (>65KB) span multiple multiplexer frames
```

### TxSubmission2 (Protocol ID 7)

```
States: StInit (server), StIdle (SERVER has agency — inverted!),
        StTxIds (client), StTxs (client), StDone

Flow:
  StInit → MsgInit → StIdle
  StIdle → MsgRequestTxIds (blocking, ack_count, req_count) → StTxIds
  StTxIds → MsgReplyTxIds [(txid, size)] → StIdle
  StIdle → MsgRequestTxs [txid] → StTxs
  StTxs → MsgReplyTxs [tx] → StIdle

Key details:
- PULL-BASED: server drives the conversation (DoS prevention)
- Two-phase: advertise IDs+sizes first, then server selects which to request
- ack_count: sliding window acknowledgement mechanism
- blocking flag: true = client can wait; false = must reply immediately
- Original TxSubmission (ID 4) is deprecated; only TxSubmission2 (ID 7)
```

### KeepAlive (Protocol ID 8)

```
States: StClient (client), StServer (server), StDone

Flow:
  StClient → MsgKeepAlive (cookie:Word16) → StServer
  StServer → MsgKeepAliveResponse (cookie) → StClient
  StClient → MsgDone → StDone

Key details:
- Cookie echoed back for request-response matching
- RTT measurement feeds into peer scoring
- Default interval ~10 seconds
- Timeout: max(10s, 3 × avgRTT)
- Prevents NAT/firewall idle disconnects
```

### Handshake (Protocol ID 0)

```
Flow:
  Initiator → MsgProposeVersions {version: params, ...} → Responder
  Responder → MsgAcceptVersion (version, params) → Done
  OR: Responder → MsgRefuse (reason) → Disconnected

Version params: network_magic, initiatorOnlyDiffusionMode, peerSharing, query

N2N versions: 7-13 (current mainnet: 13)
N2C versions: 9-16
Network magic: mainnet=764824073, preprod=1, preview=2
```

## CBOR Encoding Reference

### Major Types

```
0 (0x00-0x1b): Unsigned integer
1 (0x20-0x3b): Negative integer
2 (0x40-0x5b): Byte string
3 (0x60-0x7b): Text string
4 (0x80-0x9b): Array
5 (0xa0-0xbb): Map
6 (0xc0-0xdb): Tag
7 (0xe0-0xfb): Simple/Float

Additional info (low 5 bits):
  0-23: value inline
  24: 1-byte follows
  25: 2-byte follows
  26: 4-byte follows
  27: 8-byte follows
  31: indefinite length
```

### Canonical CBOR Requirements (Critical for Hashing)

- Integers: shortest encoding (42 = `18 2a`, NOT `19 00 2a`)
- Maps: keys sorted by encoded form (shortest first, then lexicographic)
- Arrays/maps: definite length only (no indefinite 0x9f/0xbf)
- Non-canonical encoding → different hash → block/tx rejected

### Era-Specific Encoding Changes

| Era | Tx Body | Key Change |
|-----|---------|-----------|
| Byron | Custom format | Completely different from Shelley+ |
| Shelley-Mary | CBOR array `84` | Positional fields |
| Alonzo-Conway | CBOR map `a4+` | Labeled fields (key 0=inputs, 1=outputs, 2=fee...) |
| Conway | Map + tag(258) | Sets encoded with tag, new governance fields |

### Hard Fork Combinator Wrapping

```
Era-tagged data in ChainSync/BlockFetch:
  [era_index, tag(24, bstr(era_specific_cbor))]

Era indices: 0=Byron, 1=Shelley, 2=Allegra, 3=Mary, 4=Alonzo, 5=Babbage, 6=Conway

tag(24) = CBOR-in-CBOR (double encoding!)
Must: decode tag → decode bstr → decode inner CBOR
```

## Epoch Boundary Processing

### Sequence (12 stages)

1. Epoch transition detected
2. Mark stake snapshot (traverse all UTxOs + delegations, ~1.3M entries)
3. Rotate snapshots: mark→set, set→go, free old go
4. Calculate epoch nonce: η_e = hash(η_{e-1} ‖ η_v ‖ extra_entropy)
5. Reward calculation (~3,000 pools × ~1.3M delegators)
6. Distribute rewards to reward accounts
7. Process pool retirements
8. Apply protocol parameter updates
9. Conway governance processing (DRep votes, proposal ratification)
10. Free temporary computation state (CRITICAL for memory)
11. Write ledger snapshot to disk
12. New epoch begins

### Memory Profile

- Baseline: ~14 GB (UTxO: ~12GB, snapshots: ~1.2GB, delegation: ~200MB)
- Peak at boundary: ~16-18 GB (+2-4 GB temporary for reward computation)
- Temporary MUST be freed — leaking 100MB/epoch fails the 10-day test

### Three-Snapshot System

- Snapshot taken epoch N ("mark")
- Becomes "set" in epoch N+1
- Becomes active ("go") in epoch N+2 (used for VRF + rewards)
- Two-epoch delay prevents stake grinding attacks

### Nonce Evolution

```
η_e = hash(η_{e-1} ‖ η_v ‖ extra_entropy)

η_v = hash of VRF outputs from blocks in first 80% of epoch e-1
(80% cutoff prevents stake grinding via last-slot manipulation)
```

## Block Production Pipeline

### Required Cryptographic Keys

```
Cold Key (Ed25519): Pool master key, stored OFFLINE
  → Signs operational certificates

KES Key (Sum₆₂ MMM): Key-Evolving Signature, hot key
  → Changes every 129,600 slots (~36 hours)
  → Max 62 evolutions (~93 days), then must regenerate + new OpCert
  → Forward-secure: old keys erased

VRF Key (ECVRF-ED25519-SHA512-Elligator2): Slot leadership proof
  → VRF_prove(vrf_skey, slot ‖ epoch_nonce)
  → Leader if: VRF_output < 2^512 × φ_f(σ)
  → φ_f(σ) = 1 - (1-f)^σ where f=0.05 (active slot coeff), σ=relative stake

Operational Certificate: Links cold ↔ KES
  → Counter must be strictly increasing (anti-compromise)
  → Contains: KES vkey, sequence number, KES start period, cold signature
```

### Block Structure (Babbage/Conway)

```
block = [header, tx_bodies, tx_witnesses, auxiliary_data, invalid_transactions]

header = [header_body, kes_signature]

header_body = {
  0: block_number, 1: slot, 2: prev_hash,
  3: issuer_vkey, 4: vrf_vkey, 5: vrf_result,
  6: block_body_size, 7: block_body_hash,
  8: operational_cert, 9: protocol_version
}

block_body_hash = Blake2b-256(CBOR_encode([tx_bodies, tx_witnesses, auxiliary_data, invalid_txs]))
```

### Critical: The Block Body Hash

The body hash is the #1 failure point for alternative implementations. It is the Blake2b-256 of the CANONICAL CBOR encoding of the 4-tuple [tx_bodies, tx_witnesses, auxiliary_data, invalid_transactions]. Any difference in transaction ordering, CBOR encoding, witness alignment, or missing invalid_transactions indices changes the hash.

## Challenge Acceptance Test Mapping

| Test | Primary Subsystems | Effort |
|------|-------------------|--------|
| Sync from genesis/mithril to tip | ChainSync, BlockFetch, CBOR (7 eras), Ledger, ChainDB, Mux | 4-6 months |
| Produce valid block on preview/preprod | VRF, KES, OpCert, Mempool, Block construction, CBOR encoder | 2-3 months |
| N2C blockfetch + txsubmission | N2C Mux, LocalChainSync, LocalTxSubmission | 2-4 weeks |
| Private testnet with 2 Haskell nodes | All N2N protocols, Handshake, KeepAlive, bidirectional | 1-2 weeks |
| Agree on tx validity | Ledger rules (all eras), Plutus VM, cost models, fee calc | 8-12 weeks |
| Agree on block validity | VRF/KES verification, OpCert counter, epoch nonce | 2-4 weeks |
| Consensus tip within 2160 slots | Praos chain selection, density rule, epoch boundary | 2-3 weeks |
| Crash recovery without intervention | ChainDB atomic writes, Immutable/Volatile recovery, snapshots | 2-3 weeks |
| Memory ≤ Haskell node over 10 days | UTxO optimization, epoch boundary cleanup, mempool eviction | 2-4 weeks |

### Total Effort Estimate

- Sequential: ~70 person-weeks (~16 months)
- With parallelism + AI assistance: ~10-12 months
- Critical path: CBOR → Ledger Rules → Block Forge → Integration → Memory Optimization
- Recommended language: Rust (Pallas library, deterministic memory, no GC)
- Recommended tooling: Claude Code for era-specific CBOR decoders, STS rule translation, test harness generation

## Prototype Architecture Pattern

All 12 interactive prototypes follow this HTML structure:

```html
<!DOCTYPE html>
<html>
<head>
  <link href="fonts.googleapis.com/css2?family=Poppins+JetBrains+Mono" rel="stylesheet">
  <style>/* Dark theme, selfdriven brand tokens */</style>
</head>
<body>
  <div class="header">
    <img src="data:image/jpeg;base64,..." class="logo"> <!-- embedded selfdriven logo -->
    <div class="eyebrow">CATEGORY</div>
    <h1>Title</h1>
    <p class="subtitle">Description</p>
  </div>
  <div class="content">
    <div class="tabs"><!-- Tab navigation --></div>
    <div class="section active" id="tab-sim"><!-- Interactive simulation --></div>
    <div class="section" id="tab-diagram"><!-- State diagram / structure --></div>
    <div class="section" id="tab-spec"><!-- Implementation notes --></div>
  </div>
  <div class="footer">
    <span>selfdriven.tech · Component Name</span>
    <span>Educational prototype · Not production code</span>
  </div>
  <script>/* Self-contained JS engine — no dependencies */</script>
</body>
</html>
```

Key patterns:
- Self-contained: zero external dependencies except Google Fonts
- Logo embedded as base64 JPEG
- Tab-based navigation with `.section.active` toggling
- Colour-coded state badges for protocol states
- Animated message logs for protocol exchanges
- Preset scenario buttons for different edge cases
- Step-by-step or auto-run execution modes
- Implementation notes as expandable note cards with staggered fadeIn animation
- Footer: `selfdriven.tech · [Component] Simulator` + `Educational prototype · Not production [x] code`

## File Inventory

| File | Size | Content |
|------|------|---------|
| `index.html` | 53K | Architecture guide, navigation, challenge mapping |
| `challenge-assessment.html` | 65K | Effort matrix, dependencies, timeline, reality check |
| `praos-chain-selection.html` | 53K | Consensus chain selection simulator |
| `chainsync-protocol.html` | 60K | ChainSync state machine simulator |
| `blockfetch-protocol.html` | 64K | BlockFetch range download simulator |
| `txsubmission-protocol.html` | 59K | TxSubmission pull-based flow simulator |
| `keepalive-protocol.html` | 54K | KeepAlive heartbeat + RTT simulator |
| `block-forge.html` | 62K | Block production pipeline simulator |
| `ledger-validator.html` | 68K | Transaction validation simulator |
| `cbor-inspector.html` | 65K | CBOR hex inspector + encoder/decoder |
| `connection-lifecycle.html` | 60K | Handshake + peer management simulator |
| `node-internals.html` | 68K | Multiplexer, CBOR overview, Ledger, ChainDB |
| `epoch-boundary.html` | 62K | Stake snapshots, rewards, memory profile |

Total: 789KB, 13 files, zero dependencies.
