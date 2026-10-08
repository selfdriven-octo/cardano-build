// cb-app.mjs — behaviour for cardano.build. The page is fully rendered at build
// time; this module adds the animated mark, search, the agent view, copy
// buttons and the chain clock. Everything degrades to the static page.

import { rasterize, asciiMark, easeInOut } from "/js/cb-mark.mjs";
import { sectionToMarkdown, toLlmsFull, SITE } from "/js/cb-format.mjs";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const ALIASES = JSON.parse(($("#cb-aliases") || {}).textContent || "{}");
// The full index is only needed for the agent view and "copy as markdown".
// window.CB_INDEX lets a self-contained build ship it inline.
let indexPromise;
function getIndex() {
  if (!indexPromise) {
    indexPromise = window.CB_INDEX
      ? Promise.resolve(window.CB_INDEX)
      : fetch("/data/index.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  return indexPromise;
}
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

/* ---------- copy + toast ---------- */
const toast = $("#toast");
let toastTimer;
function say(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), 1600);
}
function copy(text, msg = "Copied") {
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
    say(ok ? msg : "Copy blocked here. Select the text and copy it manually.");
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => say(msg), fallback);
  } else fallback();
}

const PROMPT = `Use cardano.build as your index of Cardano developer resources.
Start with ${SITE}/llms.txt for the map. When you need every link with its section, tags and sub-links, fetch ${SITE}/llms-full.txt or the structured ${SITE}/data/index.json.
Prefer official sources (developers.cardano.org, cips.cardano.org, the project's own docs or repo) for protocol details, and cite the URLs you use.`;

$("#copy-prompt").addEventListener("click", () => copy(PROMPT, "Prompt copied"));
$$(".cmd").forEach((b) =>
  b.addEventListener("click", () => {
    copy(b.dataset.copy, "Command copied");
    b.classList.add("done");
    setTimeout(() => b.classList.remove("done"), 1400);
  }),
);
$$("[data-copy-section]").forEach((b) =>
  b.addEventListener("click", async () => {
    try {
      const index = await getIndex();
      const sec = index.sections.find((s) => s.id === b.dataset.copySection);
      if (sec) copy(sectionToMarkdown(sec), `Copied ${sec.title} as markdown`);
    } catch { say("Couldn't load /data/index.json. Open it directly to copy."); }
  }),
);

/* ---------- the drawing ---------- */
function initArt() {
  const fig = $("#drawing"), art = $("#art"), pres = $$("pre", art);
  const dim = $("#dim"), dimV = $("#dim-v"), scaleEl = $("#art-scale");
  const pauseBtn = $("#art-pause");
  let cols = 80, aspect = 2, cellW = 6, fs = 9;
  let mode = "shade";
  let playing = !reduceMotion;
  let visible = true;
  const st = { yaw: reduceMotion ? -0.32 : 0, pitch: reduceMotion ? 0.14 : 0, ty: 0, tp: 0, phase: [0, 0, 0, 0, 0], hot: [0, 0, 0, 0, 0] };
  let moves = [];
  let pointerAt = 0;
  const t0 = performance.now();
  const introMs = reduceMotion ? 0 : 1900;
  let lastStep = t0 + introMs;

  function measure() {
    const probe = document.createElement("span");
    probe.textContent = "M".repeat(100);
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font-family:var(--mono);font-stretch:100%;font-weight:500;font-size:100px;line-height:1.18";
    art.appendChild(probe);
    const r = probe.getBoundingClientRect();
    probe.remove();
    const adv = r.width / 100 / 100; // em per char
    const w = art.clientWidth || 600;
    const target = w > 560 ? 92 : w > 400 ? 72 : 58;
    fs = Math.max(5, Math.min(12, w / (target * adv)));
    cellW = fs * adv;
    cols = Math.floor(w / cellW);
    aspect = (fs * 1.18) / cellW;
    art.style.setProperty("--art-fs", fs.toFixed(3) + "px");
    scaleEl.textContent = `1 col = ${(392 / cols).toFixed(1)} u`;
  }

  function step(now = performance.now()) {
    moves = moves.filter((m) => now < m.start + m.dur);
    for (let i = 0; i < 5; i++) {
      if (moves.some((m) => m.ring === i)) continue;
      const base = Math.round(st.phase[i] / 60) * 60;
      moves.push({ ring: i, from: base, to: base + (i % 2 ? -60 : 60), start: now + i * 150, dur: 780 });
    }
    lastStep = now;
  }

  function draw(now) {
    const t = (now - t0) / 1000;
    const assemble = introMs ? Math.min(1, (now - t0) / introMs) : 1;
    // ring moves
    st.hot = [0, 0, 0, 0, 0];
    for (const m of moves) {
      const k = Math.min(1, Math.max(0, (now - m.start) / m.dur));
      if (now >= m.start) {
        st.phase[m.ring] = m.from + (m.to - m.from) * easeInOut(k);
        if (k < 1) st.hot[m.ring] = 1;
      }
    }
    moves = moves.filter((m) => now < m.start + m.dur + 20);
    // orientation: follow the pointer, otherwise drift
    if (!reduceMotion) {
      const idle = now - pointerAt > 2600;
      const ty = idle ? 0.42 * Math.sin(t * 0.33) : st.ty;
      const tp = idle ? 0.16 * Math.sin(t * 0.27 + 1) : st.tp;
      const k = playing || !idle ? 0.07 : 0;
      st.yaw += (ty - st.yaw) * k;
      st.pitch += (tp - st.pitch) * k;
    }
    const out = rasterize({
      cols, aspect, yaw: st.yaw, pitch: st.pitch, phase: st.phase, hot: st.hot,
      mode, assemble, seed: 7, tick: Math.floor(t * 8), guides: true,
    });
    out.layers.forEach((s, i) => { if (pres[i] && pres[i].textContent !== s) pres[i].textContent = s; });
    // dimension line spans the mark's projected width
    const upc = 392 / cols;
    const [a, b] = out.span;
    const left = (a / upc + cols / 2) * cellW, right = (b / upc + cols / 2) * cellW;
    const w = art.clientWidth;
    dim.style.left = Math.max(0, left).toFixed(1) + "px";
    dim.style.width = Math.max(40, Math.min(w, right) - Math.max(0, left)).toFixed(1) + "px";
    dimV.textContent = (assemble < 1 ? "…" : (b - a).toFixed(1)) + " u";
  }

  let raf = 0, lastFrame = 0;
  function loop(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    if (now - lastFrame >= 33) { // ~30 fps reads as a terminal, and halves the work
      lastFrame = now;
      if (playing && now - lastStep > 6500) step(now);
      draw(now);
    }
    if (playing || moves.length || now - t0 < introMs + 100 || now - pointerAt < 4000) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  measure();
  draw(performance.now());
  kick();

  new ResizeObserver(() => { measure(); draw(performance.now()); }).observe(art);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(fig);
  document.addEventListener("visibilitychange", kick);

  fig.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    step(); kick();
  });
  $(".hero").addEventListener("pointermove", (e) => {
    if (reduceMotion || e.pointerType === "touch") return;
    const r = fig.getBoundingClientRect();
    st.ty = Math.max(-0.9, Math.min(0.9, ((e.clientX - (r.left + r.width / 2)) / r.width) * 1.3));
    st.tp = Math.max(-0.6, Math.min(0.6, -((e.clientY - (r.top + r.height / 2)) / r.height) * 0.9));
    pointerAt = performance.now();
    kick();
  });
  $$("#art-ctl [data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      $$("#art-ctl [data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      draw(performance.now()); kick();
    }),
  );
  pauseBtn.hidden = reduceMotion;
  pauseBtn.addEventListener("click", () => {
    playing = !playing;
    pauseBtn.setAttribute("aria-pressed", String(!playing));
    pauseBtn.textContent = playing ? "pause" : "play";
    kick();
  });
}

/* ---------- search ---------- */
function initSearch() {
  const q = $("#q"), results = $("#results"), empty = $("#empty"), emptyMsg = $("#empty-msg");
  const rows = $$(".it").map((li) => ({
    li, sec: li.closest(".sec"), grp: li.closest(".grp-block"),
    hay: (li.textContent + " " + (($(".grp", li.closest(".grp-block")) || {}).textContent || "")).toLowerCase().replace(/\s+/g, " "),
    marks: $$(".it-name, .it-desc, .sub a", li).map((el) => ({ el, text: el.textContent })),
  }));
  const secs = $$(".sec"), grps = $$(".grp-block");
  const treeItems = new Map($$("#tree [data-sec]").map((a) => [a.dataset.sec, a]));
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let last = "", wasSearching = false;

  function run() {
    const raw = q.value.trim();
    const v = raw.toLowerCase();
    if (v === last) return;
    last = v;
    if (v && document.body.dataset.view === "agent") setView("human");
    if (v && !wasSearching) {
      // bring the results into view the first time a search starts
      const top = $("#index").getBoundingClientRect().top;
      if (top > innerHeight * 0.6 || top < 0) $("#index").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
    wasSearching = !!v;
    const terms = v.split(/\s+/).filter(Boolean);
    const re = terms.length ? new RegExp("(" + terms.map(esc).join("|") + ")", "gi") : null;
    let hits = 0;
    const perSec = new Map();
    for (const r of rows) {
      const ok = !terms.length || terms.every((t) => r.hay.includes(t));
      r.li.hidden = !ok;
      if (ok) { hits++; perSec.set(r.sec.id, (perSec.get(r.sec.id) || 0) + 1); }
      for (const m of r.marks) {
        if (ok && re && re.test(m.text)) { re.lastIndex = 0; m.el.innerHTML = escHtml(m.text).replace(re, "<mark>$1</mark>"); m.dirty = true; }
        else if (m.dirty) { m.el.textContent = m.text; m.dirty = false; }
        if (re) re.lastIndex = 0;
      }
    }
    for (const g of grps) g.hidden = !$$(".it", g).some((li) => !li.hidden);
    for (const s of secs) s.hidden = !perSec.get(s.id);
    for (const [id, a] of treeItems) {
      const n = terms.length ? perSec.get(id) || 0 : Number(a.dataset.total);
      $(".n", a).textContent = n;
      a.parentElement.classList.toggle("none", n === 0);
    }
    if (!terms.length) { results.hidden = true; empty.hidden = true; return; }
    empty.hidden = hits > 0;
    results.hidden = hits === 0;
    if (hits) {
      results.innerHTML = `<span>${hits} match${hits === 1 ? "" : "es"} for “${escHtml(raw)}” in ${perSec.size} section${perSec.size === 1 ? "" : "s"}</span><button class="btn ghost" type="button" id="clear">Clear search</button>`;
      $("#clear").addEventListener("click", clear);
    } else emptyMsg.textContent = `Nothing matches “${raw}”.`;
  }
  function clear() { q.value = ""; run(); q.focus(); }
  let timer;
  q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 70); });
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { q.value = ""; run(); q.blur(); }
    if (e.key === "Enter") { const first = rows.find((r) => !r.li.hidden); if (first) first.li.scrollIntoView({ block: "center" }); }
  });
  $("#empty-clear").addEventListener("click", clear);
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault(); q.focus(); q.select();
    }
  });
}

/* ---------- human / agent views ---------- */
let mdReady = false;
function setView(v, { remember = true } = {}) {
  document.body.dataset.view = v;
  $$(".views [data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
  $("#human").hidden = v === "agent";
  $("#agent").hidden = v !== "agent";
  if (v === "agent" && !mdReady) {
    mdReady = true;
    $("#md").textContent = "Loading /data/index.json …";
    getIndex().then(
      (index) => { $("#md").textContent = toLlmsFull(index); },
      () => { mdReady = false; $("#md").textContent = "Couldn't load /data/index.json. Open /llms-full.txt directly."; },
    );
  }
  if (remember) store.set("cb-view", v);
}
function initViews() {
  $$(".views [data-view]").forEach((b) =>
    b.addEventListener("click", () => {
      setView(b.dataset.view);
      if (b.dataset.view === "agent") $("#agent").scrollIntoView({ block: "start" });
    }),
  );
  $("#copy-all").addEventListener("click", () => copy($("#md").textContent, "Copied llms-full.txt"));
  const initial = location.hash === "#agent" ? "agent" : store.get("cb-view") === "agent" ? "agent" : "human";
  setView(initial, { remember: false });
}

/* ---------- tree highlights the section in view ---------- */
function initTree() {
  const links = new Map($$("#tree a[data-sec]").map((a) => [a.dataset.sec, a]));
  let current;
  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) if (e.isIntersecting) {
        if (current) current.classList.remove("active");
        current = links.get(e.target.id);
        if (current) current.classList.add("active");
      }
    },
    { rootMargin: "-20% 0px -70% 0px" },
  );
  $$(".sec").forEach((s) => io.observe(s));
}

/* ---------- old anchors keep working ---------- */
function initHash() {
  const alias = new Map(Object.entries(ALIASES));
  const go = () => {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    if (h === "agent") { setView("agent"); return; }
    if (h === "human") { setView("human"); return; }
    if (document.getElementById(h)) { if (document.body.dataset.view === "agent") setView("human"); return; }
    const to = alias.get(h);
    if (to) {
      if (document.body.dataset.view === "agent") setView("human");
      history.replaceState(null, "", "#" + to);
      document.getElementById(to).scrollIntoView();
    }
  };
  addEventListener("hashchange", go);
  go();
}

/* ---------- chain clock (computed locally) ---------- */
function initClock() {
  const SHELLEY_UNIX = 1596059091, SHELLEY_SLOT = 4492800, SHELLEY_EPOCH = 208, EPOCH = 432000;
  const e = $("#c-epoch"), s = $("#c-slot"), bar = $("#c-bar");
  const fmt = new Intl.NumberFormat("en");
  const tick = () => {
    const now = Math.floor(Date.now() / 1000);
    const since = now - SHELLEY_UNIX;
    const epoch = SHELLEY_EPOCH + Math.floor(since / EPOCH);
    const p = (since % EPOCH) / EPOCH;
    const filled = Math.round(p * 10);
    e.textContent = epoch;
    s.textContent = fmt.format(SHELLEY_SLOT + since);
    bar.innerHTML = `[<b>${"#".repeat(filled)}</b>${"-".repeat(10 - filled)}] ${Math.floor(p * 100)}%`;
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- footer banner fits its column ---------- */
function initBanner() {
  const fit = () => {
    for (const pre of $$(".fit")) {
      if (!pre.offsetParent) continue;
      pre.style.fontSize = "10px";
      const avail = pre.clientWidth;
      pre.style.width = "max-content";
      const natural = pre.getBoundingClientRect().width;
      pre.style.width = "";
      pre.style.fontSize = Math.max(4, Math.min(16, (10 * avail) / natural)).toFixed(2) + "px";
    }
  };
  fit();
  new ResizeObserver(fit).observe($(".foot"));
  document.fonts && document.fonts.ready.then(fit);
}

initArt();
initSearch();
initViews();
initTree();
initHash();
initClock();
initBanner();

console.log(
  "%c" + asciiMark({ cols: 44, aspect: 2 }) + "\n\ncardano.build\nAgents: " + SITE + "/llms.txt  ·  " + SITE + "/data/index.json",
  "font-family:monospace;color:#0033AD",
);
