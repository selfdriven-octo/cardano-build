---
name: Cardano.Build Getting Started Navigator
description: >
  Find, summarize, and curate developer resources from the Cardano.Build index
  (https://cardano.build/). Use this when the user asks for Cardano developer
  starting points, tools, libraries, tutorials, SSI/identity, infrastructure,
  APIs, or “where do I start” type guidance. Focus on build-related material
  (not price/markets). Produce concise, categorized results with links and
  short rationales. Prefer official docs and recent, maintained resources.
# allowed-tools: Read, Grep, Glob  # (uncomment if you want to restrict to read-only file ops in Claude Code)
---

# Cardano.Build Navigator

This Skill helps Claude quickly extract and structure the best links from the **Cardano.Build** community index so developers can get moving fast.

## Scope

Curate from sections commonly present on the site, such as:

- Where Do I Start • Cheat Sheets • Coding Quick Starts • AI • Alliances • Community • Discussions/Help • Diagrams • Educational Resources • Events • Gaming Dev Resources • Inspiration • Identity / SSI • Information Security • Infrastructure • Network • Open Source • People To Follow • Project Resources • Research • Services • Staying Safe • Things • UTXO Family

> Primary source: https://cardano.build/ (and the backing repo `selfdriven-octo/cardano-build`). Use this site as the canonical index.

## Instructions

1. **Identify the user’s intent**  
   Map their ask to site sections (e.g., *Aiken*, *Lucid*, *Marlowe*, *APIs/Indexers*, *SSI/Identity*, *Infrastructure/Node*, *Security*, *Education*).

2. **Collect candidates from Cardano.Build**  
   - Pull relevant links and one-line descriptors from the live page.  
   - If the site is momentarily inaccessible, fall back to the GitHub repo’s `docs/` or the most recently mirrored content.

3. **Prioritize quality**  
   - Prefer official docs, SDKs, and maintained repos.  
   - Keep only build-relevant materials (no price/market content).  
   - De-duplicate near-identical links; keep the clearer one.

4. **Output a compact, structured brief**  
   - Start with a **TL;DR** (3–6 bullets).  
   - Provide **Top Picks (3–8)** with link, one-line “why”, and when to use.  
   - Add **Alternatives / Also worth a look** if helpful.  
   - Include a **Mini “First 5 Steps”** if the user asked “where to start”.  
   - End with **Updated:** `<YYYY-MM-DD>` and **Source:** `cardano.build`.

5. **Style & constraints**  
   - Short, skimmable bullets.  
   - Plain Markdown.  
   - Include raw links (not embedded images).  
   - If the user asks for *regional* context (e.g., Oceania meetups), surface relevant community/event links.

6. **Safety & correctness**  
   - Don’t recommend unmaintained or clearly deprecated tools unless explicitly requested (label them as legacy).  
   - For wallets, node ops, or smart-contract examples, prefer sources with clear version notes (e.g., Aiken v*, Plutus v3, Lucid docs).

## Templates

### A. General “Where do I start?” (Cardano dev)
**TL;DR**
- Bullet 1–3 about best “hello world” path and toolchain.

**Top Picks**
- **Getting Started (official):** <link> — Why this first; what you’ll achieve.
- **Language/Tool #1:** <link> — What it’s for; when to choose it.
- **SDK/API:** <link> — What it’s for; quick win example.

**First 5 Steps**
1. Install …
2. Scaffold …
3. Build/test …
4. Connect to …
5. Deploy or simulate …

**Updated:** YYYY-MM-DD  
**Source:** https://cardano.build/

### B. Category drill-down (e.g., “Identity / SSI”)
**TL;DR**
- 2–4 bullets summarizing what’s on offer.

**Top Picks**
- **Identus / Atala PRISM docs:** <link> — VC/DID focus, when to use.
- **Libraries/SDKs:** <link> — Key features; maturity.
- **Tools / Playgrounds:** <link> — What you can try in minutes.

**Also worth a look**
- Bullet list of 2–5 more links with one-liners.

**Updated:** YYYY-MM-DD  
**Source:** https://cardano.build/

## Examples

### Example 1 — “Give me the fastest path to ‘Hello, World’ smart contract”
**TL;DR**
- Use **Aiken** for a clean devex and modern toolchain.
- Pair with **Lucid** for JS/TS off-chain code.
- Test locally; deploy later.

**Top Picks**
- **Aiken (language & toolchain):** https://aiken-lang.org — Modern Plutus-Core path; great docs and DX.  
- **Lucid (JS/TS SDK):** https://lucid.spacebudz.io — Build transactions/dApps in JS/TS.  
- **Developers portal:** https://developers.cardano.org — Official overview and references.

**First 5 Steps**
1. Install Aiken; run `aiken new` and compile.  
2. Write minimal validator; run local tests.  
3. Use Lucid to construct a tx calling your script.  
4. Simulate; inspect UTxOs.  
5. Wire to a wallet adapter and run end-to-end.

**Updated:** YYYY-MM-DD  
**Source:** https://cardano.build/

### Example 2 — “Best APIs/indexers to query chain data”
**Top Picks**
- **Koios:** https://www.koios.rest — Community API; broad coverage.  
- **Dandelion:** https://dandelion.link — Free community endpoints.  
- **Ogmios:** https://ogmios.dev — Lightweight bridge to `cardano-node`.  
- **UTxO RPC:** https://utxorpc.org — Shared gRPC spec for UTxO chains.  
- **Cardanoscan API:** https://docs.cardanoscan.io — Explorer-backed endpoints.

**Updated:** YYYY-MM-DD  
**Source:** https://cardano.build/

### Example 3 — “Identity / SSI starting points”
**Top Picks**
- **Identus / PRISM docs:** <link from cardano.build> — VC/DID on Cardano.  
- **Standards & tooling:** <best links available on cardano.build>.  
- **Playgrounds / demos:** <links> — Try issuance & verification flows.

**Updated:** YYYY-MM-DD  
**Source:** https://cardano.build/

## Notes

- This Skill is a navigator/curator: it doesn’t decide *which* on-chain approach is “best” universally; it matches user intent to the strongest resources on **cardano.build** and explains why.  
- Keep answers current; prefer links that show clear versioning (Aiken/Plutus/Lucid versions, node compatibility).