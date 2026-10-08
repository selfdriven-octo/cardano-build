---
name: cardano-build
description: Use when someone needs Cardano developer resources (smart contract languages, SDKs, APIs, infrastructure, governance, identity/SSI, education, community), or wants to add to, fix or redesign the cardano.build index and site. Fetch the plain-text and JSON endpoints instead of scraping HTML.
---

# cardano.build

An open, community-curated index of Cardano developer resources, published under CC0 at https://www.cardano.build from the repo https://github.com/selfdriven-octo/cardano-build (GitHub Pages, `docs/` folder).

## Using the index (agents)

| Endpoint | What it is | When to use it |
|---|---|---|
| https://www.cardano.build/llms.txt | Short markdown map: core sections in full, the rest as one line each | First fetch; fits a context window |
| https://www.cardano.build/llms-full.txt | Every resource with description, tags and sub-links | Answering "what exists for X" |
| https://www.cardano.build/data/index.json | Structured source of truth | Filtering by section, group or tag |
| https://www.cardano.build/data/index.schema.json | JSON Schema (draft 2020-12) | Validating edits |
| https://www.cardano.build/.well-known/agent.json | A2A AgentCard (protocolVersion 0.2.2) | Discovery |
| https://www.cardano.build/#<id> | Pre-rendered HTML section, e.g. `#tools`, `#network` | Linking a human to a section |

Data model: `sections[] → groups[] → items[]`. An item is `{ name, url, desc?, tags?, links?: [{label, url}], id? }`. Section ids are stable anchors (`start`, `quickstarts`, `tools`, `ai`, `network`, `infrastructure`, `identity`, `open-source`, `cheat-sheets`, `education`, `research`, `diagrams`, `services`, `project-resources`, `safety`, `infosec`, `utxo-family`, `depin`, `gaming`, `related`, `help`, `community`, `channels`, `alliances`, `events`, `inspiration`, `about`).

When answering from the index: cite the item URL, prefer official sources (developers.cardano.org, cips.cardano.org, a project's own docs or repo) for protocol details, and say when an entry might be dated (some videos and blog posts date from 2022–2024).

## Contributing

1. Edit `docs/data/index.json` only. Keep `name` short, put the explanation in `desc`, use `links` for a tool's extra docs/videos, add `tags` for languages (`python`, `typescript`, `haskell`, `aiken` …).
2. Bump `updated` (YYYY-MM-DD).
3. Run `node scripts/build.mjs` (Node 18+, no dependencies). It validates the JSON and regenerates `docs/index.html`, `docs/llms.txt`, `docs/llms-full.txt`, `docs/favicon.svg` and the `stats` block.
4. Commit the JSON and the generated files together. CI runs `node scripts/build.mjs --check` and fails if they are out of sync.

Scope: anything that directly relates to building on Cardano. Not investment, price or trading.

## Architecture

```
docs/                        GitHub Pages root (CNAME www.cardano.build, .nojekyll so .well-known is served)
  data/index.json            source of truth
  data/index.schema.json     schema
  index.html                 GENERATED from scripts/index.template.html — never edit by hand
  llms.txt, llms-full.txt    GENERATED
  favicon.svg                GENERATED from the mark geometry
  SKILL.md                   this file
  .well-known/agent.json     A2A AgentCard (hand-maintained)
  classic.html               the previous landkit page, kept for reference
  js/cb-mark.mjs             Cardano mark geometry + ASCII rasteriser (pure, shared by page and build)
  js/cb-format.mjs           markdown/llms formatting (pure, shared by page and build)
  js/cb-app.mjs              page behaviour: animated drawing, search, agent view, copy, chain clock
  fonts/                     self-hosted Martian Mono + Plus Jakarta Sans (OFL), latin subsets
scripts/
  build.mjs                  validate + generate (zero dependencies)
  index.template.html        page template with {{PLACEHOLDERS}}
  banners.mjs                FIGlet banners for the footer (larry3d, smslant)
```

The HTML is pre-rendered at build time so crawlers, no-JS readers and agents that read raw HTML get the full index. JavaScript only enhances: it fetches `/data/index.json` lazily for the agent view and "Copy as markdown".

## Design system: blueprint

One sheet of Cardano blue with white chalk ink and a yellow pencil for what you're pointing at. Structure is set in a wide monospace on the character grid; running text is set in a sans.

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#0033AD` | page ground (Cardano blue) |
| `--deep` | `#00247C` | bars, panels, terminal |
| `--ink` | `#F3F6FF` | primary text |
| `--ink-2` | `#B3C4F6` | secondary text (5.4:1 on paper) |
| `--ink-3` | `#86A2EE` | metadata |
| `--faint` | `#4D74D8` | construction lines, tree branches |
| `--rule` / `--rule-soft` | `#3A62CC` / `#1A47BA` | borders / dashed row lines |
| `--grid` | `#0A3BB3` | 24px background grid |
| `--pencil` | `#FFD25E` | focus, search matches, live state, ring steps |

Type: Martian Mono (variable, `font-stretch` 75–112.5%) for headings, names, trees and ASCII; Plus Jakarta Sans for descriptions and prose. H1 is Martian Mono 700 at 112.5% stretch.

## The mark

Measured from the official icon SVG (viewBox 375 × 346.51): 30 dots in five rings of six, rings alternating 0°/30° offsets.

| Ring | Distance | Dot radius | Offset |
|---|---|---|---|
| 1 | 59.5 | 25.25 | 0° |
| 2 | 101.9 | 14.84 | 30° |
| 3 | 132.3 | 12.62 | 0° |
| 4 | 162.85 | 10.39 | 30° |
| 5 | 179.3 | 8.16 | 0° |

`rasterize()` treats each dot as a sphere, rotates (yaw, pitch), projects orthographically, shades with the ramp `.:-=+*#%@` and splits characters into five colour layers (construction, low, mid, high, pencil). Modes: `shade`, `hex`, `wire`. A ring step turns each ring by ±60° in sequence, inner to outer, so the mark always comes back to its exact official arrangement. `asciiMark()` flattens a frame to plain text for the HTML comment, the footer and the console.

## Gotchas

- Martian Mono has no box-drawing, block or braille glyphs. Keep all ASCII art and trees to printable ASCII (plus `·`), or glyphs fall back to another font and columns drift.
- Character aspect (cell height ÷ width) for Martian Mono at 100% stretch is about 1.69 at line-height 1.18. The page measures it at runtime; static frames in the build use that value.
- Never put `-->` in generated ASCII: the top-of-file art sits inside an HTML comment.
- Old anchors (`#ct`, `#yt`, `#ssi`, `#sanchonet`, `#hello-worlds` …) resolve through `aliases` on sections and groups. An alias must not equal a real element id (the build warns).
- The chain clock is computed locally from the mainnet Shelley start (epoch 208, slot 4,492,800, unix 1596059091, 432,000-second epochs). It makes no network calls.
- `prefers-reduced-motion`: no intro, no ambient motion; the drawing renders a still frame and only moves when clicked.
