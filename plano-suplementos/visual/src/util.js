/* Utilidades comuns: cores do tema, números pt-BR, desenho em canvas. */

const U = (() => {
  const TOK = ["bg", "surface", "surface-2", "ink", "muted", "line", "accent", "heat", "water", "whey",
    "protein", "crystal", "ok", "warn", "bad", "amber"];
  let cache = null;
  function colors() {
    if (cache) return cache;
    const cs = getComputedStyle(document.documentElement);
    cache = {};
    for (const t of TOK) cache[t.replace("-", "")] = cs.getPropertyValue("--" + t).trim() || "#888";
    return cache;
  }
  function resetColors() { cache = null; }
  try {
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", resetColors);
    new MutationObserver(resetColors).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  } catch (e) { /* sem observadores: cores ficam fixas */ }

  const reduced = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  function fmt(n, d = 0) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  /* mistura cor hex/rgb com alfa */
  function alpha(c, a) {
    if (c.startsWith("#")) {
      let h = c.slice(1);
      if (h.length === 3) h = h.split("").map(x => x + x).join("");
      const n = parseInt(h, 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }
    if (c.startsWith("rgb")) {
      const p = c.match(/[\d.]+/g);
      return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
    }
    return c;
  }
  function mix(c1, c2, t) {
    const p = c => { const h = c.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map(x => x + x).join("") : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    if (!c1.startsWith("#") || !c2.startsWith("#")) return t < 0.5 ? c1 : c2;
    const a = p(c1), b = p(c2);
    return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
  }

  /* ---------- canvas ---------- */
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  const FONTS = {
    body: '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
    display: '"Big Shoulders Display", "Arial Narrow", sans-serif'
  };
  function txt(ctx, s, x, y, o = {}) {
    ctx.font = `${o.weight || 400} ${o.size || 14}px ${FONTS[o.font || "body"]}`;
    ctx.fillStyle = o.color || colors().ink;
    ctx.textAlign = o.align || "left";
    ctx.textBaseline = o.base || "alphabetic";
    ctx.fillText(s, x, y);
  }
  function tag(ctx, s, x, y, o = {}) {
    const C = colors();
    ctx.font = `600 ${o.size || 12}px ${FONTS.mono}`;
    const w = ctx.measureText(s).width + 12, h = (o.size || 12) + 8;
    const x0 = o.align === "center" ? x - w / 2 : o.align === "right" ? x - w : x;
    rr(ctx, x0, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.fill || C.surface;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = o.stroke || C.ink;
    ctx.stroke();
    txt(ctx, s, x0 + w / 2, y + 0.5, { size: o.size || 12, font: "mono", weight: 600, align: "center", base: "middle", color: o.color || C.ink });
    return w;
  }
  function arrow(ctx, x1, y1, x2, y2, color, w = 2, head = 8) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(a) * head * 0.8, y2 - Math.sin(a) * head * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.45) * head, y2 - Math.sin(a - 0.45) * head);
    ctx.lineTo(x2 - Math.cos(a + 0.45) * head, y2 - Math.sin(a + 0.45) * head);
    ctx.closePath();
    ctx.fill();
  }
  function circle(ctx, x, y, r, fill, stroke, lw = 1) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }

  /* gráfico de linhas simples, com eixos e grade leve */
  function chart(ctx, x, y, w, h, o) {
    const C = colors();
    const sx = v => x + (v - o.xmin) / (o.xmax - o.xmin) * w;
    const sy = v => y + h - (v - o.ymin) / (o.ymax - o.ymin) * h;
    ctx.save();
    ctx.fillStyle = C.surface;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = alpha(C.line, 0.9);
    ctx.lineWidth = 1;
    for (const t of o.ty || []) { ctx.beginPath(); ctx.moveTo(x, sy(t)); ctx.lineTo(x + w, sy(t)); ctx.stroke(); txt(ctx, o.fy ? o.fy(t) : String(t), x - 6, sy(t), { size: 11, font: "mono", align: "right", base: "middle", color: C.muted }); }
    for (const t of o.tx || []) { txt(ctx, o.fx ? o.fx(t) : String(t), sx(t), y + h + 14, { size: 11, font: "mono", align: "center", color: C.muted }); }
    if (o.band) { ctx.fillStyle = o.band.color; ctx.fillRect(x, sy(o.band.y2), w, sy(o.band.y1) - sy(o.band.y2)); }
    if (o.fill) { for (const f of o.fill) { ctx.beginPath(); f.pts.forEach((p, i) => i ? ctx.lineTo(sx(p[0]), sy(p[1])) : ctx.moveTo(sx(p[0]), sy(p[1]))); ctx.closePath(); ctx.fillStyle = f.color; ctx.fill(); } }
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (const s of o.series) {
      ctx.beginPath();
      s.pts.forEach((p, i) => i ? ctx.lineTo(sx(p[0]), sy(p[1])) : ctx.moveTo(sx(p[0]), sy(p[1])));
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width || 2;
      ctx.setLineDash(s.dash || []);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke();
    if (o.xlabel) txt(ctx, o.xlabel, x + w, y + h + 30, { size: 11, font: "mono", align: "right", color: C.muted });
    if (o.ylabel) txt(ctx, o.ylabel, x, y - 8, { size: 11, font: "mono", color: C.muted });
    return { sx, sy };
  }

  /* legenda horizontal: [[cor, texto, forma]] */
  function legend(ctx, items, x, y, o = {}) {
    const C = colors();
    let cx = x;
    for (const [col, s, shape] of items) {
      if (shape === "line") { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + 14, y); ctx.stroke(); cx += 18; }
      else if (shape === "sq") { ctx.fillStyle = col; ctx.fillRect(cx, y - 5, 10, 10); cx += 14; }
      else { circle(ctx, cx + 5, y, 5, col); cx += 14; }
      txt(ctx, s, cx, y, { size: o.size || 12, base: "middle", color: o.color || C.muted });
      ctx.font = `400 ${o.size || 12}px ${FONTS.body}`;
      cx += ctx.measureText(s).width + 14;
    }
  }

  /* termômetro vertical com valor */
  function thermo(ctx, x, y, h, frac, label, color) {
    const C = colors();
    rr(ctx, x - 6, y, 12, h, 6);
    ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke();
    const fh = clamp(frac, 0, 1) * (h - 8);
    rr(ctx, x - 3, y + h - 4 - fh, 6, fh, 3);
    ctx.fillStyle = color; ctx.fill();
    circle(ctx, x, y + h + 6, 9, color, C.ink, 1.2);
    if (label) txt(ctx, label, x, y - 8, { size: 12, font: "mono", align: "center", color: C.ink, weight: 600 });
  }

  return { colors, resetColors, reduced, clamp, lerp, rand, ease, gauss, fmt, alpha, mix, rr, txt, tag, arrow, circle, chart, legend, thermo, FONTS };
})();
