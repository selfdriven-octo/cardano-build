// cb-format.mjs — shared formatting for the index: used by the page (agent view,
// "copy as markdown") and by scripts/build.mjs (llms.txt, llms-full.txt).
// Keep this file pure (no DOM, no Node APIs) so both can import it.

export const SITE = "https://www.cardano.build";

export function domainOf(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch {
    return "";
  }
}

// A short, stable label for what sits behind a link.
export function kindOf(url) {
  const u = url.toLowerCase();
  const d = domainOf(url);
  if (/\.pdf(\?|#|$)/.test(u)) return "pdf";
  if (d === "youtube.com" || d === "youtu.be" || d.endsWith(".youtube.com")) return "video";
  if (d === "github.com" || d === "raw.githubusercontent.com") return "repo";
  if (d === "x.com" || d === "twitter.com") return "x";
  if (d.startsWith("discord.") || d === "discord.gg") return "discord";
  if (d === "arxiv.org" || d === "eprint.iacr.org" || u.includes("/research/library/papers/")) return "paper";
  if (/\.(png|jpe?g|svg)(\?|#|$)/.test(u)) return "image";
  if (d === "npmjs.com") return "npm";
  return "web";
}

export function countItems(index) {
  let resources = 0, links = 0;
  for (const s of index.sections) for (const g of s.groups) for (const it of g.items) {
    resources++; links += 1 + (it.links ? it.links.length : 0);
  }
  return { sections: index.sections.length, resources, links };
}

const mdText = (s) => String(s).replace(/([\[\]])/g, "\\$1");

function itemLine(it, { withLinks = true, withTags = true } = {}) {
  let line = `- [${mdText(it.name)}](${it.url})`;
  const bits = [];
  if (it.desc) bits.push(it.desc);
  if (withTags && it.tags && it.tags.length) bits.push(`tags: ${it.tags.join(", ")}`);
  if (bits.length) line += `: ${bits.join(" — ")}`;
  const out = [line];
  if (withLinks && it.links) for (const l of it.links) out.push(`  - [${mdText(l.label)}](${l.url})`);
  return out.join("\n");
}

export function sectionToMarkdown(sec, { level = 2, withLinks = true } = {}) {
  const h = "#".repeat(level);
  const parts = [`${h} ${sec.title}`, "", `${sec.summary} Section id: \`${sec.id}\` — ${SITE}/#${sec.id}`];
  for (const g of sec.groups) {
    parts.push("");
    if (g.title) parts.push(`${h}# ${g.title}`, "");
    parts.push(g.items.map((it) => itemLine(it, { withLinks })).join("\n"));
  }
  return parts.join("\n");
}

function header(index, kind) {
  const c = countItems(index);
  const lines = [
    `# ${index.name}`,
    "",
    `> ${index.description} ${c.resources} resources (${c.links} links) in ${c.sections} sections. Licence: ${index.license}. Updated ${index.updated}.`,
    "",
  ];
  if (kind === "short") {
    lines.push(
      `This is the short map. Every resource with descriptions, tags and sub-links: ${index.endpoints.llms_full}`,
      `Structured JSON (source of truth, schema at ${index.endpoints.schema}): ${index.endpoints.index}`,
      `Scope: ${index.contribute.scope} To add or fix an entry, open a pull request against ${index.contribute.pull_request}`,
    );
  } else {
    lines.push(
      `Every resource in the index, as markdown. Each section links back to its place on ${SITE}.`,
      `Structured JSON: ${index.endpoints.index} — short map: ${index.endpoints.llms}`,
      `Scope: ${index.contribute.scope}`,
    );
  }
  return lines.join("\n");
}

// Sections listed in full in the short llms.txt; the rest go under "Optional".
export const CORE_SECTIONS = ["start", "quickstarts", "tools", "cheat-sheets", "help"];

export function toLlms(index) {
  const parts = [header(index, "short")];
  for (const id of CORE_SECTIONS) {
    const sec = index.sections.find((s) => s.id === id);
    if (!sec) continue;
    parts.push("", `## ${sec.title}`, "", sec.summary, "");
    const items = sec.groups.flatMap((g) => g.items);
    parts.push(items.map((it) => itemLine(it, { withLinks: false, withTags: false })).join("\n"));
  }
  parts.push("", "## Optional", "");
  const rest = index.sections.filter((s) => !CORE_SECTIONS.includes(s.id));
  parts.push(
    rest
      .map((s) => {
        const n = s.groups.reduce((a, g) => a + g.items.length, 0);
        return `- [${s.title}](${SITE}/#${s.id}): ${s.summary} (${n} resource${n === 1 ? "" : "s"})`;
      })
      .join("\n"),
  );
  return parts.join("\n") + "\n";
}

export function toLlmsFull(index) {
  const parts = [header(index, "full")];
  for (const sec of index.sections) parts.push("", sectionToMarkdown(sec));
  return parts.join("\n") + "\n";
}
