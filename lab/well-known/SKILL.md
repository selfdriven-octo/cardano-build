---
name: cardano-build
description: "Use this skill for any task related to the cardano.build community developer resources website. This includes: updating or adding new resources, tools, SDKs, or links to the site; redesigning or modifying the site's HTML/CSS/JS; maintaining alignment with Cardano core branding (dark theme, Cardano blue #0033AD, starburst logo, Plus Jakarta Sans typography); editing the YAML data source for resource entries; managing the A2A agent.json discovery file; creating or updating diagrams, cheat sheets, or educational content for the Cardano developer community; working with the GitHub Pages deployment (Jekyll, GitHub Actions); and any reference to 'cardano.build', 'BuildingOnCardano', or the selfdriven Foundation's developer resource index. Also trigger when the user asks about Cardano developer ecosystem tooling, community channels, smart contract languages (Aiken, Plutus, Helios, OpShin), SDKs (MeshJS, Lucid, PyCardano), infrastructure (Demeter, TxPipe, Blockfrost, Koios), identity/SSI on Cardano, or Cardano governance resources — especially if they want to create or update content about these topics."
---

# Cardano.Build — Developer Resources Website

## Overview

[cardano.build](https://www.cardano.build) is a community-maintained index of Cardano developer tools, frameworks, SDKs, community channels, educational resources, and services. It is hosted on GitHub Pages from the [selfdriven-octo/cardano-build](https://github.com/selfdriven-octo/cardano-build) repository and maintained by the selfdriven Foundation under CC0 (Public Domain).

The site serves as the go-to starting point for anyone building on the Cardano blockchain — from first-time developers to experienced smart contract engineers.

## Architecture

```
cardano-build/
├── docs/                    # GitHub Pages source (published site)
│   ├── index.html           # Main single-page site
│   ├── .well-known/
│   │   └── agent.json       # A2A Protocol AgentCard for AI discovery
│   └── images/              # Diagrams, logos, screenshots
├── data/
│   └── cardano-build.yaml   # Structured resource data (source of truth)
├── ROADMAP.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── README.md
```

## Brand & Design System

The site aligns with **Cardano core branding** as defined at [cardano.org/brand-assets](https://cardano.org/brand-assets/). When modifying the site's look and feel, always adhere to these guidelines:

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--cardano-blue` | `#0033AD` | Primary brand color, borders, accents |
| `--cardano-blue-light` | `#0046E8` | Hover states, active elements |
| `--cardano-blue-glow` | `#1A5CFF` | Glow effects, highlights |
| `--cardano-blue-muted` | `#0033AD33` | Translucent backgrounds, badges |
| `--bg-primary` | `#0C0E14` | Page background |
| `--bg-secondary` | `#12151E` | Section backgrounds |
| `--bg-card` | `#181C28` | Card backgrounds |
| `--bg-card-hover` | `#1E2333` | Card hover state |
| `--border-color` | `#1F2535` | Default borders |
| `--text-primary` | `#E8ECF4` | Headings, primary text |
| `--text-secondary` | `#8892A8` | Body text, descriptions |
| `--text-muted` | `#5A6478` | Labels, metadata |
| `--accent-green` | `#00D4AA` | Status indicators, success |
| `--accent-orange` | `#FF8A50` | Warnings, highlights |
| `--accent-purple` | `#8B6CEF` | Categories, tags |

### Typography

- **Font**: Plus Jakarta Sans (Google Fonts)
- **Weights**: 300–800
- **Headings**: 700–800 weight, tight letter-spacing (-0.01em to -0.03em)
- **Body**: 400–500 weight, 1.65 line-height
- **Code**: System monospace

### Logo

The site uses the **Cardano starburst** logo (6-pointed star with orbital dots) as an inline SVG. This appears in the header, hero section, footer, and as a background watermark. The starburst should always be rendered in `--cardano-blue-light` (#0046E8) or `--cardano-blue-glow` (#1A5CFF).

See [cardano.org/brand-assets](https://cardano.org/brand-assets/) and the [Cardano Foundation Trademark Policy](https://cardanofoundation.org/en/trademark-policy) for usage guidelines.

### Design Principles

1. **Dark theme only** — matches cardano.org dark mode aesthetic
2. **Glassmorphism header** — sticky, blurred backdrop with border
3. **Card-based layout** — bordered cards with subtle hover transitions
4. **Blue accent system** — all interactive elements use Cardano blue
5. **Collapsible sections** — accordion pattern for content density
6. **Tool logos via favicons** — `https://www.google.com/s2/favicons?domain=DOMAIN&sz=64` for quick logos (replace with hosted assets for production)
7. **Language/framework tags** — color-coded pills (TypeScript=blue, Python=teal, Haskell=purple, Go=cyan, etc.)
8. **Responsive** — mobile-first, single column below 768px

## Content Sections

The site is organised into these major sections (all collapsible):

| Section | ID | Content |
|---------|----|---------|
| Where Do I Start? | `getting-started` | Beginner resources, starter kits, books, videos |
| Smart Contract Languages | `smart-contracts` | Aiken, Plutus, Helios, OpShin, plu-ts, Marlowe, Scalus |
| SDKs & Libraries | `sdks-libs` | MeshJS, Lucid, PyCardano, CardanoSharp, Apollo, Blockfrost, Koios, Maestro, Dandelion |
| Infrastructure | `infrastructure` | Demeter, TxPipe, Ogmios, Blink Labs, Strica, Yaci DevKit, Iagon |
| Network & Governance | `network` | Explorers, Hydra, Mithril, Midnight, Partner Chains, CIPs, Voltaire |
| Identity / SSI | `identity` | SSI books, RootsWallet, selfdriven.id, Identus, CF Identity Wallet |
| AI | `ai` | SingularityNet, opshinGPT, masumi.network, selfdriven.ai |
| Educational Resources | `education` | LearnCardano, Essential Cardano, CF Education, Gimbalabs, etc. |
| Services & Platforms | `services` | ANVIL, NMKR, jpg.store, Orcfax, ADAHandles, CardanoPress, etc. |
| Security & Auditing | `security` | IOG guidelines, EpochSec, auditing firms, safety tools |
| Community & People | `community` | YouTube channels, X accounts, town halls, alliances, forums |
| Research | `research` | IOG Research, papers library |
| Open Source Projects | `open-source` | GitHub repos for DEXs, wallets, protocols |
| UTXO Family | `utxo-family` | Cross-chain resources, BitcoinOS, Rosen Bridge |

## Adding or Updating Resources

When adding a new resource to the site:

1. **Identify the correct section** from the table above
2. **Use the appropriate component pattern**:
   - **Tool card** (for SDKs, smart contract languages, infrastructure): Card with logo, name, description, language tag, and sub-links
   - **Resource list item** (for links, guides, videos): Single row with favicon, title, and arrow
   - **Resource grid item** (for explorers, education): Card with logo, title, and subtitle
   - **People pill** (for community members, services, open source): Rounded pill with favicon and name
3. **Include the favicon**: `<img class="r-logo gfav" src="https://www.google.com/s2/favicons?domain=DOMAIN&sz=64" alt="">`
4. **Always link externally** with `target="_blank"`
5. **Keep descriptions concise** — 1-2 lines maximum per item

### Tool Card Template

```html
<div class="tool-card">
  <div class="tool-card-header">
    <img class="tool-logo gfav" src="https://www.google.com/s2/favicons?domain=DOMAIN&sz=64" alt="Name">
    <h4>Tool Name</h4>
    <span class="tag tag-ts">TypeScript</span>
  </div>
  <p>Brief description of the tool (1-2 sentences).</p>
  <div class="tool-links">
    <a href="URL" target="_blank">Website</a>
    <a href="URL" target="_blank">Docs</a>
    <a href="URL" target="_blank">GitHub</a>
  </div>
</div>
```

Available tag classes: `tag-ts` (TypeScript), `tag-js` (JavaScript), `tag-py` (Python), `tag-hs` (Haskell), `tag-go` (Go), `tag-csharp` (C#), `tag-rust` (Rust), `tag-aiken` (Aiken), `tag-api` (API), `tag-infra` (Infrastructure), `tag-sc` (Smart Contract/DSL).

### Resource List Item Template

```html
<a href="URL" target="_blank">
  <img class="r-logo gfav" src="https://www.google.com/s2/favicons?domain=DOMAIN&sz=64" alt="">
  Resource Title
  <span class="link-arrow">↗</span>
</a>
```

## A2A Agent Discovery (agent.json)

The site hosts an [A2A Protocol](https://a2a-protocol.org) AgentCard at `/.well-known/agent.json`. This allows AI agents to discover cardano.build's capabilities and route developer queries to it.

### Agent Card Structure

The agent.json follows the Google A2A spec (v0.2.2) with:

- **Provider**: selfdriven Foundation
- **9 skills** covering all site sections (resource discovery, smart contracts, infrastructure, network/governance, identity/SSI, community, education, security, open source)
- **Input/Output modes**: `text/plain`, `application/json`
- **No authentication required** (public resource index)

### Updating agent.json

When adding new sections or significantly changing site content, update the corresponding skill in `agent.json`:

1. Add/modify the skill entry with a clear `id`, `name`, `description`
2. Update `tags` to include relevant keywords
3. Add representative `examples` (3-4 natural language queries)
4. Validate JSON before committing: `python3 -c "import json; json.load(open('agent.json'))"`

## Hero Visual

The hero section includes an animated canvas visualization showing:

- Central Cardano starburst with glow effect
- 18 tool nodes orbiting in two rings (inner 6, outer 12)
- Connection lines between center and nodes
- Animated particles flowing between nodes
- Faint code snippets floating in background
- Subtle grid pattern

The canvas auto-resizes and rebuilds on window resize. Tool labels in the nodes match actual Cardano ecosystem tools (Aiken, MeshJS, Hydra, etc.).

## Deployment

The site deploys via **GitHub Pages** from the `docs/` directory on the `main` branch.

### Local Development

The site is a static single-page HTML file — no build step required. Open `docs/index.html` directly in a browser.

### Publishing Changes

1. Edit files in `docs/`
2. Commit and push to `main`
3. GitHub Pages auto-deploys

### .well-known Directory

GitHub Pages may not serve dotfiles by default. Ensure the Jekyll config (if used) includes:

```yaml
# _config.yml
include:
  - .well-known
```

Or if using a static file approach, the `.well-known/` directory in `docs/` should be committed and served directly.

## Quick Reference Links

| Resource | URL |
|----------|-----|
| Live site | https://www.cardano.build |
| GitHub repo | https://github.com/selfdriven-octo/cardano-build |
| Agent discovery | https://www.cardano.build/.well-known/agent.json |
| Cardano brand assets | https://cardano.org/brand-assets/ |
| Cardano developer portal | https://developers.cardano.org |
| selfdriven Foundation | https://selfdriven.foundation |
| Suggest changes | https://x.com/@selfdrivenF |
| Donate | https://handle.me/selfdrivenx.cb |

## Content Guidelines

- **Focus**: Developer tools and building resources only — not investment, DeFi prices, or speculation
- **Tone**: Welcoming to newcomers, technically precise for experienced developers
- **Attribution**: Link to original sources, credit creators
- **Currency**: Regularly verify links are not broken; remove deprecated/defunct projects
- **Neutrality**: Include all credible community tools regardless of commercial status
- **License**: All site content is CC0 (Public Domain)
