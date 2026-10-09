# Cardano.Build

The [Cardano.Build](https://www.cardano.build) developer resources index: an open, community-curated list of tools, SDKs, languages, infrastructure, people and learning resources for building on Cardano. CC0.

## For agents

| | |
|---|---|
| [`/llms.txt`](https://www.cardano.build/llms.txt) | short map for a context window |
| [`/llms-full.txt`](https://www.cardano.build/llms-full.txt) | every resource as markdown |
| [`/data/index.json`](https://www.cardano.build/data/index.json) | structured index, the source of truth ([schema](https://www.cardano.build/data/index.schema.json)) |
| [`/.well-known/agent.json`](https://www.cardano.build/.well-known/agent.json) | A2A agent card |
| [`/SKILL.md`](https://www.cardano.build/SKILL.md) | skill file: how to use and maintain the index |

## Adding or fixing a resource

1. Edit [`docs/data/index.json`](docs/data/index.json) and bump `updated`.
2. Run `node scripts/build.mjs` (Node 18+, no dependencies). It validates the JSON and regenerates `docs/index.html`, `docs/llms.txt` and `docs/llms-full.txt`.
3. Open a pull request with the JSON and the generated files. CI checks they are in sync.

Scope: anything that directly relates to building on Cardano, not investment, price or trading.

## Docs

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing](CONTRIBUTING.md)
- [Maintainers](MAINTAINERS.md)
- [SKILL.md](docs/SKILL.md): architecture, design system, the ASCII mark, gotchas
