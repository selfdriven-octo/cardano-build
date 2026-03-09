# SKILL.md
## Cardano Node Reference Specification

### Skill
Understanding and navigating the reference architecture, specifications, and implementation of the Cardano Node.

### Purpose
This skill enables an AI agent or developer to locate, understand, and work with the authoritative sources that define how the Cardano blockchain operates.

The Cardano system does not have a single monolithic specification. Instead, the system is defined across four layers:

1. Consensus protocol specifications
2. Ledger state transition rules
3. Network protocol definitions
4. Node implementation

Understanding Cardano requires navigating these layers together.

---

# Cardano System Architecture

    +------------------------------------+
    |        Cardano Node Software       |
    |            cardano-node            |
    +------------------------------------+

    +------------------------------------+
    |         Consensus Layer            |
    |       ouroboros-consensus          |
    +------------------------------------+

    +------------------------------------+
    |          Network Layer             |
    |        ouroboros-network           |
    +------------------------------------+

    +------------------------------------+
    |           Ledger Layer             |
    |          cardano-ledger            |
    +------------------------------------+

---

# Core Reference Sources

## 1. Consensus Protocol

Consensus is defined by the **Ouroboros protocol family**.

Key protocols:

- Ouroboros Classic
- Ouroboros Praos
- Ouroboros Genesis
- Ouroboros Chronos

These papers define:

- slot leadership
- fork choice rules
- chain selection
- stake-based block production
- security guarantees

Primary function of consensus:

    determine who may produce the next block

---

## 2. Ledger Specification

The ledger specification defines the **state machine of the blockchain**.

It describes how transactions update the ledger state.

Main components:

    UTXO
    UTXOW
    LEDGER
    CHAIN
    POOL
    DELEG
    EPOCH
    GOV

Key features defined in the ledger spec:

- transaction validation
- UTxO accounting
- stake delegation
- stake pools
- epoch transitions
- Plutus script execution
- governance rules (Conway era)

The ledger spec uses **formal inference rules**.

Example:

    UTXOW
    Γ ⊢ tx : valid
    ---------------------
    UTxO → UTxO'

Meaning:

If a transaction is valid under the rules, the UTxO state transitions to a new state.

---

## 3. Network Protocol

Cardano nodes communicate through the **Ouroboros Network Framework**.

This networking system uses **multiplexed mini-protocols**.

Mini-protocols:

    ChainSync
    BlockFetch
    TxSubmission
    LocalStateQuery
    LocalTxSubmission
    KeepAlive

These protocols run simultaneously over a single connection.

Example message flow:

    Node A → request next block
    Node B → respond with block header
    Node A → request full block
    Node B → deliver block

---

## 4. Node Implementation

The official node implementation is written in **Haskell**.

Primary repository structure:

    cardano-node
    cardano-api
    cardano-cli
    ouroboros-consensus
    ouroboros-network
    cardano-ledger

Responsibilities:

    cardano-node
        runs the node

    cardano-cli
        builds and submits transactions

    cardano-api
        integration layer for tools

    ouroboros-consensus
        block production + chain selection

    ouroboros-network
        peer-to-peer networking

    cardano-ledger
        ledger rules and state transitions

---

# Transaction Lifecycle

A transaction moves through several stages.

    wallet
       ↓
    cardano-cli / API
       ↓
    node mempool
       ↓
    block producer
       ↓
    block inclusion
       ↓
    ledger validation
       ↓
    UTxO update

---

# Block Production Process

Block production follows the Ouroboros slot leader selection.

    for each slot:

      if node_is_slot_leader:
          gather transactions
          construct block
          sign block
          broadcast block

Nodes verify blocks using:

    consensus rules
    ledger rules
    cryptographic signatures

---

# Governance (Conway Era)

Governance introduces new actors.

    DReps
    Stake Pool Operators
    Constitutional Committee
    ADA holders

Governance operations include:

    parameter updates
    treasury withdrawals
    constitutional changes
    hard fork initiation

---

# Cardano Improvement Proposals

Many behaviours are standardized via **CIPs**.

Examples:

    CIP-30   dApp wallet bridge
    CIP-68   reference NFTs
    CIP-1694 governance framework
    CIP-1852 HD wallet derivation

CIPs extend functionality beyond the base protocol.

---

# Key Concepts

## UTxO Model

Cardano uses the **Extended UTxO model**.

    input UTxO
       +
    transaction
       →
    output UTxO

Enhancements include:

    multi-assets
    Plutus scripts
    datum and redeemer data
    reference scripts

---

## Deterministic Execution

Cardano enforces deterministic transaction validation.

This ensures:

    same input
    same ledger state
    same output

for all nodes.

---

# When To Use This Skill

Use this skill when:

- implementing Cardano integrations
- building infrastructure around Cardano
- analyzing node behaviour
- understanding protocol mechanics
- designing Cardano-compatible systems
- auditing node behaviour

---

# Practical Developer Entry Points

Most developers start with:

    cardano-cli
    cardano-api

Protocol researchers work with:

    cardano-ledger
    ouroboros-consensus

Network engineers interact with:

    ouroboros-network

---

# Mental Model

Think of Cardano as four stacked layers.

    Consensus
      determines block order

    Ledger
      defines valid state transitions

    Network
      moves blocks and transactions

    Node
      executes everything

Together these components form the Cardano blockchain system.

---

# Outcome

After applying this skill an agent should be able to:

- identify the authoritative Cardano specifications
- navigate the node codebase
- understand how blocks are produced
- trace transaction validation
- identify where protocol rules are defined
- reason about Cardano system behaviour