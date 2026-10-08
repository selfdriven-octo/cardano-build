#!/usr/bin/env node
// scripts/build.mjs — zero-dependency build for cardano.build.
//
//   node scripts/build.mjs          validate docs/data/index.json and regenerate:
//                                   docs/index.html, docs/llms.txt, docs/llms-full.txt,
//                                   docs/favicon.svg (and the stats block in index.json)
//   node scripts/build.mjs --check  same, but write nothing; exit 1 if anything is stale
//
// The JSON file is the source of truth. The HTML is pre-rendered so people without
// JavaScript, crawlers and agents that read raw HTML all get the full index.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { markSVG, asciiMark, rasterize } from "../docs/js/cb-mark.mjs";
import { toLlms, toLlmsFull, countItems, domainOf, kindOf, SITE } from "../docs/js/cb-format.mjs";
import { BANNER_WIDE, BANNER_NARROW } from "./banners.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs");
const CHECK = process.argv.includes("--check");
const p = (...a) => join(DOCS, ...a);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------- load + validate ----------
const indexPath = p("data", "index.json");
const rawJson = readFileSync(indexPath, "utf8");
const index = JSON.parse(rawJson);
const errors = [], warnings = [];
const ids = new Map();
const claim = (id, where) => {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) errors.push(`${where}: id "${id}" must be lowercase letters, digits and hyphens`);
  if (ids.has(id)) errors.push(`${where}: id "${id}" is already used by ${ids.get(id)}`);
  ids.set(id, where);
};
const checkUrl = (u, where) => {
  try {
    const x = new URL(u);
    if (!/^https?:$/.test(x.protocol)) errors.push(`${where}: URL must be http(s): ${u}`);
    else if (x.protocol === "http:") warnings.push(`${where}: prefer https: ${u}`);
  } catch { errors.push(`${where}: not a valid URL: ${u}`); }
};
for (const k of ["name", "description", "version", "updated", "license", "endpoints", "contribute", "sections"])
  if (index[k] == null) errors.push(`index.json: missing "${k}"`);
for (const [si, s] of (index.sections || []).entries()) {
  const where = `sections[${si}] (${s.id})`;
  claim(s.id, where);
  if (!s.title || !s.summary) errors.push(`${where}: needs a title and a summary`);
  if (!Array.isArray(s.groups) || !s.groups.length) errors.push(`${where}: needs at least one group`);
  for (const [gi, g] of (s.groups || []).entries()) {
    const gw = `${where} group ${gi}`;
    if (g.id) claim(g.id, gw);
    if (!Array.isArray(g.items) || !g.items.length) errors.push(`${gw}: needs at least one item`);
    for (const [ii, it] of (g.items || []).entries()) {
      const iw = `${gw} item ${ii} (${it.name})`;
      if (it.id) claim(it.id, iw);
      if (!it.name || typeof it.name !== "string") errors.push(`${iw}: needs a name`);
      checkUrl(it.url, iw);
      if (it.desc != null && typeof it.desc !== "string") errors.push(`${iw}: desc must be a string`);
      if (it.tags != null && (!Array.isArray(it.tags) || it.tags.some((t) => typeof t !== "string"))) errors.push(`${iw}: tags must be strings`);
      for (const l of it.links || []) {
        if (!l.label) errors.push(`${iw}: every sub-link needs a label`);
        checkUrl(l.url, `${iw} sub-link`);
      }
    }
  }
}
// legacy anchors (#ct, #yt, #sanchonet …) that should land on a section or group
const aliases = {};
for (const s of index.sections || []) {
  for (const a of s.aliases || []) aliases[a] = s.id;
  for (const g of s.groups || []) for (const a of g.aliases || []) aliases[a] = g.id;
}
for (const a of Object.keys(aliases)) if (ids.has(a)) warnings.push(`alias "${a}" is also an element id; the element wins`);
if (warnings.length) console.warn(warnings.map((w) => "warn  " + w).join("\n"));
if (errors.length) {
  console.error(errors.map((e) => "error " + e).join("\n"));
  process.exit(1);
}

// keep the stats block honest
const stats = countItems(index);
index.stats = stats;
const jsonOut = JSON.stringify(index, null, 2) + "\n";

// ---------- render pieces ----------
const kindLabel = (u) => { const k = kindOf(u); return ["pdf", "paper", "image"].includes(k) ? `<span class="k">${k}</span> ` : ""; };

function renderItem(it, g) {
  const sub = (it.links || []).map((l, i, a) => `<li><span class="br">${i === a.length - 1 ? "`--" : "|--"}</span><a href="${esc(l.url)}" rel="noopener" target="_blank">${esc(l.label)}</a><span class="it-meta">${kindLabel(l.url)}${esc(domainOf(l.url))}</span></li>`).join("");
  const tags = it.tags && it.tags.length ? ` <span class="tags">${it.tags.map((t) => "#" + esc(t)).join(" ")}</span>` : "";
  return `<li class="it"${it.id ? ` id="${it.id}"` : ""}>` +
    `<a class="it-name" href="${esc(it.url)}" rel="noopener" target="_blank">${esc(it.name)}</a>` +
    `<div class="it-desc">${it.desc ? esc(it.desc) : ""}${tags}</div>` +
    `<div class="it-meta">${kindLabel(it.url)}${esc(domainOf(it.url))}</div>` +
    (sub ? `<ul class="sub">${sub}</ul>` : "") + `</li>`;
}

function renderSection(s) {
  const n = s.groups.reduce((a, g) => a + g.items.length, 0);
  const groups = s.groups.map((g) =>
    `<div class="grp-block"${g.id ? ` id="${g.id}"` : ""}>` +
    (g.title ? `<h3 class="grp">${esc(g.title)}</h3>` : "") +
    `<ul class="items">\n${g.items.map((it) => renderItem(it, g)).join("\n")}\n</ul></div>`).join("\n");
  return `<section class="sec" id="${s.id}" aria-labelledby="${s.id}-h">
<div class="sec-head"><h2 id="${s.id}-h">${esc(s.title)}</h2><div class="sec-tools"><a href="#${s.id}" title="Link to this section">#${s.id}</a><span>${n}</span><button type="button" data-copy-section="${s.id}">Copy as markdown</button></div><p class="sec-sum">${esc(s.summary)}</p></div>
${groups}
</section>`;
}

const count = (s) => s.groups.reduce((a, g) => a + g.items.length, 0);
const pad = (str, w) => str + " ".repeat(Math.max(1, w - str.length));
const tree = [
  `<p>index/</p>`,
  `<ol>`,
  ...index.sections.map((s, i, a) => `<li><a href="#${s.id}" data-sec="${s.id}" data-total="${count(s)}"><span class="br">${i === a.length - 1 ? "`-- " : "|-- "}</span>${esc(s.id)}/<span class="n">${count(s)}</span></a></li>`),
  `</ol>`,
  `<p>cardano.build/</p>`,
  `<ol>`,
  ...[["llms.txt", "/llms.txt"], ["llms-full.txt", "/llms-full.txt"], ["SKILL.md", "/SKILL.md"], ["data/index.json", "/data/index.json"], [".well-known/agent.json", "/.well-known/agent.json"]]
    .map(([label, href], i, a) => `<li><a href="${href}"><span class="br">${i === a.length - 1 ? "`-- " : "|-- "}</span>${label}</a></li>`),
  `</ol>`,
].map((l) => "      " + l).join("\n");
const mobileNav = `      <ol>\n${index.sections.map((s) => `        <li><a href="#${s.id}">${esc(s.id)}/ <span>${count(s)}</span></a></li>`).join("\n")}\n      </ol>`;

// static first frame of the hero drawing (the module re-renders it to fit)
const hero = rasterize({ cols: 92, aspect: 1.69, yaw: -0.32, pitch: 0.14, guides: true });
const heroArt = hero.layers.map((s, i) => `<pre class="l${i}">${esc(s)}</pre>`).join("");

const headArt = asciiMark({ cols: 44, aspect: 2 }).split("\n").map((l) => "  " + l).join("\n");
const footMark = esc(asciiMark({ cols: 42, aspect: 1.64 }));

const jsonld = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: index.title,
  description: index.description,
  url: SITE + "/",
  license: "https://creativecommons.org/publicdomain/zero/1.0/",
  isAccessibleForFree: true,
  dateModified: index.updated,
  keywords: ["Cardano", "developer tools", "SDK", "smart contracts", "Aiken", "Plutus", "Hydra", "KERI", "llms.txt"],
  creator: { "@type": "Organization", name: "selfdriven Foundation", url: "https://selfdriven.foundation" },
  distribution: [
    { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: index.endpoints.index },
    { "@type": "DataDownload", encodingFormat: "text/markdown", contentUrl: index.endpoints.llms_full },
    { "@type": "DataDownload", encodingFormat: "text/markdown", contentUrl: index.endpoints.llms },
  ],
};

const template = readFileSync(join(ROOT, "scripts", "index.template.html"), "utf8");
const vars = {
  HEAD_ART: headArt,
  SITE,
  DESCRIPTION: esc(index.description),
  JSONLD: JSON.stringify(jsonld).replace(/</g, "\\u003c"),
  MARK_SVG: markSVG({ size: 26, title: "" }).replace(' role="img" aria-label=""', ' aria-hidden="true"'),
  RESOURCES: String(stats.resources),
  SECTIONS: String(stats.sections),
  UPDATED: esc(index.updated),
  REPO: esc(index.repository),
  SUGGEST: esc(index.contribute.suggest),
  HERO_ART: heroArt,
  TREE: tree,
  MOBILE_NAV: mobileNav,
  SECTIONS_HTML: index.sections.map(renderSection).join("\n"),
  FOOT_MARK: footMark,
  BANNER_WIDE: esc(BANNER_WIDE),
  BANNER_NARROW: esc(BANNER_NARROW),
  ALIASES_JSON: JSON.stringify(aliases),
};
const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => {
  if (!(k in vars)) throw new Error(`template: unknown placeholder ${m}`);
  return vars[k];
});

// favicon: the mark in white on a Cardano-blue rounded square
const markInner = markSVG({ title: "" }).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-44 -58.25 467 467"><rect x="-44" y="-58.25" width="467" height="467" rx="96" fill="#0033AD"/><g fill="#FFFFFF">${markInner}</g></svg>`;

const outputs = [
  [indexPath, jsonOut],
  [p("index.html"), html],
  [p("llms.txt"), toLlms(index)],
  [p("llms-full.txt"), toLlmsFull(index)],
  [p("favicon.svg"), favicon + "\n"],
];

let stale = 0;
for (const [file, content] of outputs) {
  const before = existsSync(file) ? readFileSync(file, "utf8") : null;
  if (before === content) continue;
  stale++;
  if (CHECK) console.error(`stale: ${file.replace(ROOT + "/", "")}`);
  else { writeFileSync(file, content); console.log(`wrote ${file.replace(ROOT + "/", "")} (${(content.length / 1024).toFixed(1)} KB)`); }
}
console.log(`${stats.resources} resources, ${stats.links} links, ${stats.sections} sections${warnings.length ? `, ${warnings.length} warnings` : ""}`);
if (CHECK && stale) process.exit(1);
