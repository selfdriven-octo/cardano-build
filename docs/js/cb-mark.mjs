// cb-mark.mjs — the Cardano mark as geometry, and an ASCII rasteriser for it.
//
// Geometry is measured from the official icon SVG (Cardano-RGB_Logo-Icon-Blue.svg,
// viewBox 375 x 346.51): 30 circles in five rings of six. Rings alternate between
// 0° and 30° offsets. Units are SVG units, origin at the centre of the mark,
// y pointing down. Pure functions, no DOM: used by the page and by the build.

export const RINGS = [
  // [distance from centre, dot radius, angular offset in degrees]
  [59.5, 25.25, 0],
  [101.9, 14.84, 30],
  [132.3, 12.62, 0],
  [162.85, 10.39, 30],
  [179.3, 8.16, 0],
];

export const MARK_WIDTH = 375;
export const MARK_HEIGHT = 346.51;

export function nodes() {
  const out = [];
  RINGS.forEach(([d, r, off], ring) => {
    for (let k = 0; k < 6; k++) out.push({ ring, k, d, r, a: ((off + 60 * k) * Math.PI) / 180 });
  });
  return out;
}

// Inline SVG of the mark (crisp, for the header and favicon).
export function markSVG({ size = 24, fill = "currentColor", title = "Cardano" } = {}) {
  const pad = 2;
  const w = MARK_WIDTH + pad * 2, h = MARK_HEIGHT + pad * 2;
  const cx = w / 2, cy = h / 2;
  const circles = nodes()
    .map((n) => `<circle cx="${(cx + n.d * Math.cos(n.a)).toFixed(2)}" cy="${(cy + n.d * Math.sin(n.a)).toFixed(2)}" r="${n.r}"/>`)
    .join("");
  const label = title ? `<title>${title}</title>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="${size}" height="${((size * h) / w).toFixed(1)}" fill="${fill}" role="img" aria-label="${title}">${label}${circles}</svg>`;
}

const RAMP = ".:-=+*#%@";
// Texture for "hex" mode: 64 hex characters.
const HEX = "5f20df933584822601f9e3f8c024eb5eb252fe8cefb24d1317dc3d432e940ebb";

function lineChar(dx, dy) {
  // dx, dy in screen cells (y down). Pick the ASCII stroke closest to the direction.
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const a = ((ang % 180) + 180) % 180;
  if (a < 22.5 || a >= 157.5) return "-";
  if (a < 67.5) return "\\";
  if (a < 112.5) return "|";
  return "/";
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Rasterise the mark into ASCII layers.
 * o.cols        grid width in characters
 * o.aspect      character cell height / width (measured from the font)
 * o.yaw, o.pitch  rotation in radians
 * o.phase       [5] in-plane ring rotation, degrees
 * o.hot         [5] 0..1 highlight per ring (drawn on the pencil layer)
 * o.mode        "shade" | "hex" | "wire"
 * o.guides      draw construction lines (rings + centre lines)
 * o.assemble    0..1 intro progress (1 = assembled); o.seed for scatter
 * o.tick        integer, animates hex texture
 * Returns { cols, rows, layers: [guide, low, mid, high, pencil], span: [minX, maxX] }
 * where span is the projected width of the mark in SVG units.
 */
export function rasterize(o) {
  const cols = Math.max(16, o.cols | 0);
  const aspect = o.aspect || 2;
  const mode = o.mode || "shade";
  const yaw = o.yaw || 0, pitch = o.pitch || 0;
  const phase = o.phase || [0, 0, 0, 0, 0];
  const hot = o.hot || [0, 0, 0, 0, 0];
  const assemble = o.assemble == null ? 1 : o.assemble;
  const upc = 392 / cols; // SVG units per column
  const upr = upc * aspect; // SVG units per row
  const rows = Math.ceil(366 / upr);
  const N = cols * rows;
  const ch = new Array(N).fill(" ");
  const layer = new Int8Array(N).fill(-1);
  const zbuf = new Float32Array(N).fill(-1e9);
  const cy0 = rows / 2, cx0 = cols / 2;
  const cY = Math.cos(yaw), sY = Math.sin(yaw), cP = Math.cos(pitch), sP = Math.sin(pitch);
  const project = (x, y, z) => {
    const x1 = x * cY + z * sY;
    const z1 = -x * sY + z * cY;
    const y1 = y * cP - z1 * sP;
    const z2 = y * sP + z1 * cP;
    return [x1, y1, z2];
  };
  const put = (col, row, c, l, z) => {
    if (col < 0 || row < 0 || col >= cols || row >= rows) return;
    const i = row * cols + col;
    if (z < zbuf[i]) return;
    zbuf[i] = z; ch[i] = c; layer[i] = l;
  };

  // construction lines: dotted ring circles and three dash-dot centre lines
  if (o.guides !== false && assemble > 0.6) {
    const gl = mode === "wire" ? 1 : 0;
    for (const [d] of RINGS) {
      const steps = Math.ceil((2 * Math.PI * d) / (upc * 1.6));
      for (let s = 0; s < steps; s++) {
        const t = (s / steps) * Math.PI * 2;
        const [x, y, z] = project(d * Math.cos(t), d * Math.sin(t), 0);
        put(Math.floor(x / upc + cx0), Math.floor(y / upr + cy0), mode === "wire" ? "." : "·", gl, z - 400);
      }
    }
    for (let k = 0; k < 3; k++) {
      const t = (k * Math.PI) / 3;
      const ux = Math.cos(t), uy = Math.sin(t);
      const [ax, ay] = project(ux, uy, 0);
      const c = lineChar(ax / upc, ay / upr);
      const len = 196, step = upc * 0.9;
      let i = 0;
      for (let s = -len; s <= len; s += step, i++) {
        const pat = i % 6; // long dash, gap, dot, gap
        if (pat === 3 || pat === 5) continue;
        const [x, y, z] = project(ux * s, uy * s, 0);
        put(Math.floor(x / upc + cx0), Math.floor(y / upr + cy0), pat === 4 ? "." : c, gl, z - 400);
      }
    }
  }

  // light from upper left, slightly in front
  const L = [-0.48, -0.56, 0.68];
  const ln = Math.hypot(...L); L[0] /= ln; L[1] /= ln; L[2] /= ln;
  let minX = 1e9, maxX = -1e9;
  const seed = o.seed || 1;
  const rand = (n) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); };

  nodes().forEach((n, idx) => {
    const a = n.a + (phase[n.ring] * Math.PI) / 180;
    let x = n.d * Math.cos(a), y = n.d * Math.sin(a), z = 0;
    if (assemble < 1) {
      // fly in from a scattered start, inner rings first
      const local = Math.min(1, Math.max(0, (assemble - n.ring * 0.08) / 0.6));
      const e = easeOut(local);
      const sx = (rand(idx) - 0.5) * 900, sy = (rand(idx + 50) - 0.5) * 700, sz = (rand(idx + 99) - 0.5) * 900;
      x = sx + (x - sx) * e; y = sy + (y - sy) * e; z = sz + (z - sz) * e;
    }
    const [px, py, pz] = project(x, y, z);
    const r = n.r;
    minX = Math.min(minX, px - r); maxX = Math.max(maxX, px + r);
    const ccol = px / upc + cx0, crow = py / upr + cy0;
    const c0 = Math.floor(ccol - r / upc) - 1, c1 = Math.ceil(ccol + r / upc) + 1;
    const r0 = Math.floor(crow - r / upr) - 1, r1 = Math.ceil(crow + r / upr) + 1;
    const h = hot[n.ring] || 0;
    const wireW = upc * 0.95;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const dx = (col + 0.5 - ccol) * upc, dy = (row + 0.5 - crow) * upr;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        const nz = Math.sqrt(r * r - d2);
        let c, l;
        if (mode === "wire") {
          if (d2 < (r - wireW) * (r - wireW) && r > wireW * 1.4) continue;
          c = lineChar(-dy / upr, dx / upc);
          l = 3;
        } else {
          const lum = Math.max(0, (dx / r) * L[0] + (dy / r) * L[1] + (nz / r) * L[2]);
          const v = Math.min(1, 0.16 + 0.9 * lum);
          c = mode === "hex" || assemble < 1 ? HEX[(col * 7 + row * 13 + idx * 5 + (o.tick || 0)) & 63] : RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
          l = v < 0.42 ? 1 : v < 0.74 ? 2 : 3;
        }
        if (h > 0.5) l = 4;
        put(col, row, c, l, pz + nz);
      }
    }
  });

  const layers = [0, 1, 2, 3, 4].map((L) => {
    let s = "";
    for (let row = 0; row < rows; row++) {
      let line = "";
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        line += layer[i] === L ? ch[i] : " ";
      }
      s += line.replace(/\s+$/, "") + (row < rows - 1 ? "\n" : "");
    }
    return s;
  });
  return { cols, rows, layers, span: [minX, maxX] };
}

// Flatten layers into a single plain-text drawing (for HTML comments, consoles, footers).
export function asciiMark({ cols = 48, aspect = 2.1, mode = "shade", guides = false, yaw = 0, pitch = 0 } = {}) {
  const { layers, rows } = rasterize({ cols, aspect, mode, guides, yaw, pitch });
  const grids = layers.map((s) => s.split("\n"));
  const out = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      let chr = " ";
      for (const g of grids) {
        const v = (g[r] || "")[c];
        if (v && v !== " ") chr = v;
      }
      line += chr;
    }
    out.push(line.replace(/\s+$/, ""));
  }
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out.join("\n");
}

export { easeInOut, easeOut };
