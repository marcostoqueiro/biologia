/* Cenas da linha de creatina. O lote rodado no reator, o resfriamento do
   cristalizador e a lavagem da centrífuga seguem para o laudo do QC-701. */

const BATCH = { run: null, cryst: null, wash: null };

/* Modelo cinético didático (mol/L, horas), calibrado para tendências qualitativas. */
const KIN = { k1: 5, k2: 0.06, ku: 0.02, k3: 6e-5, k4: 0.004 };
function arrh(Ea, T) { return Math.exp(Ea / 8.314e-3 * (1 / 333.15 - 1 / (T + 273.15))); }
function runBatch(pH, T, td) {
  const ffree = 1 / (1 + Math.pow(10, 10.0 - pH)), fcn = 1 / (1 + Math.pow(10, pH - 10.3));
  let S = 1, C = 0, Cr = 0, D = 0, Cn = 0, t = 0;
  const F = 1.05 / td, ttot = td + 2, dt = 0.002, traj = [];
  const a60 = arrh(60, T), a70 = arrh(70, T), a80 = arrh(80, T), a95 = arrh(95, T), a100 = arrh(100, T);
  let next = 0;
  while (t <= ttot + 1e-9) {
    if (t >= next) { traj.push({ t, S, C, Cr, D, Cn }); next += ttot / 120; }
    const feed = t < td ? F : 0;
    const r1 = KIN.k1 * a60 * ffree * S * fcn * C;
    const r2 = KIN.k2 * a70 * (fcn * C) * ((1 - fcn) * C);
    const ru = KIN.ku * a80 * C * (1 - fcn);
    const r3 = KIN.k3 * a95 * Cr * (1 + Math.pow(10, 5 - pH));
    const r4 = KIN.k4 * a100 * Cr * Math.pow(10, pH - 13);
    S += (-r1 + r4) * dt; C += (feed - r1 - 2 * r2 - ru) * dt; Cr += (r1 - r3 - r4) * dt; D += r2 * dt; Cn += r3 * dt;
    t += dt;
  }
  traj.push({ t: ttot, S, C, Cr, D, Cn });
  return { pH, T, td, ttot, traj, conv: Cr, rD: D / Math.max(Cr, 1e-9), rCn: Cn / Math.max(Cr, 1e-9), C };
}
function verdict(r) {
  if (r.conv < 0.6) {
    let why = "reação lenta.";
    if (r.pH < 8.8) why = "pH baixo: o N da sarcosina está protonado e sem par livre.";
    else if (r.pH > 11.5) why = "pH alto: a cianamida virou ânion e sobra sem reagir.";
    else if (r.T < 45) why = "frio demais: poucos choques com energia suficiente.";
    return { tone: "bad", txt: "Rendimento baixo: " + why };
  }
  if (r.rCn > 3000) return { tone: "warn", txt: "Muita creatinina: temperatura alta degrada o produto." };
  if (r.rD > 6000) return { tone: "warn", txt: "Muita DCD: dosagem rápida ou pH perto de 10,3." };
  return { tone: "ok", txt: "Lote bom: alta conversão e poucas impurezas." };
}

/* ---------- F-101: forno de cianamida cálcica ---------- */
SCENES.furnace = () => ({
  aria: "Forno rotativo: pedaços de carbeto de cálcio reagem com nitrogênio a cerca de 1000 °C e viram cianamida cálcica.",
  controls: [{ type: "range", id: "T", label: "Temperatura do forno", min: 700, max: 1250, step: 10, value: 1050, unit: "°C", fmt: v => U.fmt(v) }],
  init() {
    this.t = 0; this.lumps = []; this.n2 = []; this.outConv = []; this.acc = 0; this.acc2 = 0;
    const r = this.p ? this.rate() : 0.9;
    for (let x = 110; x < 690; x += 25) this.lumps.push({ x, y: U.rand(-10, 10), conv: Math.min(1, r * (x - 110) / 55 * 0.12), rot: Math.random() * 6, s: U.rand(9, 14) });
    for (let x = 120; x < 690; x += 18) this.n2.push({ x, y: U.rand(-22, 22), vx: -U.rand(120, 180), a: Math.random() * 6 });
    this.outConv = [Math.min(1, r * 580 / 55 * 0.12)];
  },
  rate() { const T = this.p.T; const r = 1 / (1 + Math.exp(-(T - 930) / 35)); return T > 1150 ? r * Math.max(0.12, 1 - (T - 1150) / 80) : r; },
  update(dt) {
    this.t += dt;
    this.acc += dt * 2.2; this.acc2 += dt * 14;
    while (this.acc > 1) { this.acc--; this.lumps.push({ x: 110, y: U.rand(-10, 10), conv: 0, rot: Math.random() * 6, s: U.rand(9, 14) }); }
    while (this.acc2 > 1) { this.acc2--; this.n2.push({ x: 690, y: U.rand(-22, 22), vx: -U.rand(120, 180), a: Math.random() * 6 }); }
    const r = this.rate();
    for (const l of this.lumps) {
      l.x += 55 * dt; l.rot += dt * 2; l.y += Math.sin(this.t * 3 + l.rot) * 0.3;
      l.conv = Math.min(1, l.conv + r * dt * 0.12);
      if (l.x > 690) { l.dead = true; this.outConv.push(l.conv); if (this.outConv.length > 20) this.outConv.shift(); }
    }
    for (const m of this.n2) {
      m.x += m.vx * dt; m.a += dt * 3;
      for (const l of this.lumps) if (Math.abs(l.x - m.x) < l.s && Math.abs(l.y - m.y) < l.s && Math.random() < r * 0.5) m.dead = true;
      if (m.x < 100) m.dead = true;
    }
    this.lumps = this.lumps.filter(l => !l.dead); this.n2 = this.n2.filter(m => !m.dead);
  },
  draw(ctx, C) {
    const T = this.p.T, glow = U.clamp((T - 650) / 600, 0, 1);
    U.txt(ctx, "CaC₂ + N₂  →  CaCN₂ + C", 400, 52, { size: 22, font: "mono", align: "center", weight: 600 });
    U.txt(ctx, "libera ~300 kJ/mol", 400, 76, { size: 12, font: "mono", align: "center", color: C.muted });
    ctx.save(); ctx.translate(400, 230); ctx.rotate(0.05);
    U.rr(ctx, -310, -60, 620, 120, 56); ctx.fillStyle = C.ink; ctx.fill();
    const g = ctx.createLinearGradient(0, -48, 0, 48);
    g.addColorStop(0, U.mix(C.surface2, C.heat, glow * 0.85)); g.addColorStop(0.5, U.mix(C.surface2, C.heat, glow)); g.addColorStop(1, U.mix(C.surface2, C.heat, glow * 0.7));
    U.rr(ctx, -300, -48, 600, 96, 46); ctx.fillStyle = g; ctx.fill();
    for (let k = 0; k < 7; k++) { const x = -260 + k * 85 + ((this.t * 30) % 85); ctx.strokeStyle = U.alpha(C.ink, 0.15); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, -48); ctx.lineTo(x, 48); ctx.stroke(); }
    for (const m of this.n2) {
      const x = m.x - 400, y = m.y;
      U.circle(ctx, x - 3 * Math.cos(m.a), y - 3 * Math.sin(m.a), 3.2, C.water); U.circle(ctx, x + 3 * Math.cos(m.a), y + 3 * Math.sin(m.a), 3.2, C.water);
    }
    for (const l of this.lumps) {
      ctx.save(); ctx.translate(l.x - 400, l.y + 22); ctx.rotate(l.rot);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283, rr = l.s * (0.8 + 0.2 * Math.sin(k * 2.3)); k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = U.mix(C.crystal, C.ink, l.conv * 0.75); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.stroke();
      if (l.conv > 0.3) U.circle(ctx, l.s * 0.3, -l.s * 0.2, 2, C.ink);
      ctx.restore();
    }
    ctx.restore();
    U.arrow(ctx, 30, 216, 92, 220, C.crystal, 3); U.txt(ctx, "CaC₂", 30, 206, { size: 13, font: "mono", weight: 600 });
    U.arrow(ctx, 780, 260, 712, 256, C.water, 3); U.txt(ctx, "N₂", 760, 286, { size: 13, font: "mono", weight: 600, color: C.water });
    U.arrow(ctx, 700, 290, 740, 340, C.ink, 3); U.txt(ctx, "CaCN₂", 746, 352, { size: 13, font: "mono", weight: 600 });
    U.legend(ctx, [[C.crystal, "CaC₂ (carbeto)", "sq"], [U.mix(C.crystal, C.ink, 0.75), "CaCN₂", "sq"], [C.water, "N₂"]], 60, 330);
    U.rr(ctx, 60, 380, 680, 70, 8); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    U.txt(ctx, "depois, em água:", 76, 404, { size: 12, font: "mono", color: C.muted });
    U.txt(ctx, "CaCN₂ + H₂O + CO₂  →  H₂N–C≡N (cianamida) + CaCO₃", 76, 432, { size: 16, font: "mono", weight: 600 });
    const st = T > 1150 ? ["sinterizando: a massa funde e o N₂ não entra", C.bad] : T < 900 ? ["frio: a ligação tripla do N₂ quase não rompe", C.warn] : ["faixa boa de reação", C.ok];
    U.txt(ctx, st[0], 400, 120, { size: 14, weight: 700, align: "center", color: st[1] });
  },
  readouts() {
    const avg = this.outConv.length ? this.outConv.reduce((a, b) => a + b, 0) / this.outConv.length : 0;
    const T = this.p.T;
    return [
      { k: "Temperatura", v: U.fmt(T), u: "°C" },
      { k: "Conversão na saída", v: U.fmt(avg * 100), u: "%", tone: avg > 0.85 ? "ok" : avg > 0.5 ? "warn" : "bad" },
      { k: "Estado", v: T > 1150 ? "sinterizando" : T < 900 ? "lento" : "ótimo", tone: T > 1150 ? "bad" : T < 900 ? "warn" : "ok" }
    ];
  }
});

/* ---------- R-201: reator com simulador de lote ---------- */
SCENES.reactor = () => ({
  aria: "Reator encamisado com agitador e bomba dosadora de cianamida; um gráfico mostra a evolução das concentrações durante o lote.",
  controls: [
    { type: "range", id: "pH", label: "pH", min: 7, max: 13, step: 0.1, value: 9.8, unit: "", fmt: v => U.fmt(v, 1) },
    { type: "range", id: "T", label: "Temperatura", min: 20, max: 120, step: 1, value: 70, unit: "°C" },
    { type: "range", id: "td", label: "Tempo de dosagem da cianamida", min: 0.5, max: 6, step: 0.25, value: 3, unit: "h", fmt: v => U.fmt(v, 2) },
    { type: "button", id: "run", label: "▶ Rodar lote", primary: true },
    { type: "button", id: "reset", label: "Limpar" }
  ],
  init() { this.t = 0; this.res = null; this.play = 0; this.playing = false; this.stale = false; this.drips = []; },
  onButton(id) {
    if (id === "reset") { this.init(); return; }
    if (id === "run") { this.res = runBatch(this.p.pH, this.p.T, this.p.td); this.play = 0; this.playing = true; this.stale = false; }
  },
  onChange() { if (this.res) this.stale = true; },
  ctrlState(id) { if (id === "run") return { label: this.playing ? "Rodando…" : this.stale ? "▶ Rodar de novo" : "▶ Rodar lote", disabled: this.playing }; },
  state() {
    if (!this.res) return { t: 0, S: 1, C: 0, Cr: 0, D: 0, Cn: 0 };
    const tr = this.res.traj, t = this.play;
    let i = tr.findIndex(s => s.t >= t); if (i < 0) i = tr.length - 1;
    return tr[i];
  },
  update(dt) {
    this.t += dt;
    if (this.playing) {
      this.play += dt * this.res.ttot / 7;
      if (this.play >= this.res.ttot) {
        this.play = this.res.ttot; this.playing = false;
        BATCH.run = this.res;
      }
    }
    const dosing = this.playing && this.play < this.res.td;
    if (dosing && Math.random() < dt * (10 / this.res.td + 1)) this.drips.push({ y: 92 });
    for (const d of this.drips) d.y += dt * 220;
    this.drips = this.drips.filter(d => d.y < 190);
  },
  hash(i, k) { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); },
  draw(ctx, C) {
    const s = this.state(), T = this.p.T;
    // camisa e vaso
    const vx = 60, vy = 120, vw = 260, vh = 300;
    const jacket = T > 40 ? U.alpha(C.heat, 0.15 + 0.35 * (T - 40) / 80) : U.alpha(C.water, 0.25);
    ctx.beginPath(); ctx.moveTo(vx - 14, vy); ctx.lineTo(vx - 14, vy + vh - 40); ctx.quadraticCurveTo(vx - 14, vy + vh + 26, vx + vw / 2, vy + vh + 26); ctx.quadraticCurveTo(vx + vw + 14, vy + vh + 26, vx + vw + 14, vy + vh - 40); ctx.lineTo(vx + vw + 14, vy);
    ctx.fillStyle = jacket; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx, vy + vh - 40); ctx.quadraticCurveTo(vx, vy + vh + 12, vx + vw / 2, vy + vh + 12); ctx.quadraticCurveTo(vx + vw, vy + vh + 12, vx + vw, vy + vh - 40); ctx.lineTo(vx + vw, vy); ctx.closePath();
    ctx.fillStyle = C.surface; ctx.fill(); ctx.stroke();
    const dosed = this.res ? U.clamp(this.play / this.res.td, 0, 1) : 0;
    const top = vy + vh * (0.42 - 0.18 * dosed);
    ctx.save(); ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx, vy + vh - 40); ctx.quadraticCurveTo(vx, vy + vh + 12, vx + vw / 2, vy + vh + 12); ctx.quadraticCurveTo(vx + vw, vy + vh + 12, vx + vw, vy + vh - 40); ctx.lineTo(vx + vw, vy); ctx.closePath(); ctx.clip();
    ctx.fillStyle = U.alpha(C.water, 0.1); ctx.fillRect(vx, top, vw, vh + 20);
    // moléculas
    const draw = (n, k, fn) => { for (let i = 0; i < n; i++) { const x = vx + 16 + this.hash(i, k) * (vw - 32) + Math.sin(this.t * 1.3 + i) * 4; const y = top + 12 + this.hash(i, k + 7) * (vy + vh - top - 10) + Math.cos(this.t + i * 2) * 4; fn(x, y, i); } };
    draw(Math.round(34 * s.S), 1, (x, y) => U.circle(ctx, x, y, 4.2, C.protein));
    draw(Math.round(34 * s.C / 1.05), 2, (x, y) => U.circle(ctx, x, y, 3, C.water));
    draw(Math.round(300 * s.D), 3, (x, y) => U.circle(ctx, x, y, 3, C.heat));
    const nCr = Math.round(34 * s.Cr), nSol = Math.min(nCr, 4);
    for (let i = 0; i < nCr; i++) {
      const sunk = i >= nSol;
      const x = vx + 24 + this.hash(i, 9) * (vw - 48);
      const y = sunk ? vy + vh - 24 - this.hash(i, 11) * 34 + (Math.abs(x - vx - vw / 2) / (vw / 2)) * -30 : top + 30 + this.hash(i, 12) * 120;
      ctx.save(); ctx.translate(x, y); ctx.rotate(this.hash(i, 13) * 3);
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-4, -3.5); ctx.lineTo(4, -3.5); ctx.lineTo(7, 0); ctx.lineTo(4, 3.5); ctx.lineTo(-4, 3.5); ctx.closePath();
      ctx.fillStyle = C.surface2; ctx.fill(); ctx.strokeStyle = C.crystal; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    // agitador
    ctx.fillStyle = C.ink; U.rr(ctx, vx + vw / 2 - 26, 70, 52, 30, 4); ctx.fill();
    U.txt(ctx, "M", vx + vw / 2, 86, { size: 13, font: "mono", align: "center", base: "middle", color: C.surface, weight: 700 });
    ctx.fillRect(vx + vw / 2 - 3, 100, 6, 260);
    const a = this.t * (this.playing ? 9 : 2);
    for (const off of [0, Math.PI]) { const w = Math.cos(a + off) * 54; ctx.fillStyle = Math.sin(a + off) > 0 ? C.ink : C.muted; ctx.fillRect(vx + vw / 2 + Math.min(0, w), 350, Math.abs(w), 10); }
    // bomba dosadora
    U.rr(ctx, 300, 64, 110, 34, 6); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
    U.txt(ctx, "P-202", 355, 78, { size: 11, font: "mono", align: "center", weight: 600 });
    U.txt(ctx, "cianamida", 355, 92, { size: 11, font: "mono", align: "center", color: C.water });
    ctx.strokeStyle = C.water; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(300, 82); ctx.lineTo(260, 82); ctx.lineTo(260, 112); ctx.stroke();
    for (const d of this.drips) U.circle(ctx, 260, d.y + 20, 3, C.water);
    U.tag(ctx, `TIC-201 ${T} °C`, 40, 470, { stroke: T > 100 ? C.bad : C.ink });
    U.tag(ctx, `AIC-201 pH ${U.fmt(this.p.pH, 1)}`, 196, 470, {});
    // gráfico
    const tt = this.res ? this.res.ttot : this.p.td + 2;
    const tr = this.res ? this.res.traj.filter(q => q.t <= this.play + 1e-6) : [];
    U.chart(ctx, 440, 70, 330, 210, {
      xmin: 0, xmax: tt, ymin: 0, ymax: 1.1, ty: [0, 0.5, 1], fy: v => U.fmt(v, 1), tx: [0, tt / 2, tt], fx: v => U.fmt(v, 1), xlabel: "tempo (h)", ylabel: "mol/L",
      series: [
        { pts: tr.map(q => [q.t, q.S]), color: C.protein },
        { pts: tr.map(q => [q.t, q.C]), color: C.water },
        { pts: tr.map(q => [q.t, q.Cr]), color: C.accent, width: 3 },
        { pts: tr.map(q => [q.t, q.D * 20]), color: C.heat, dash: [5, 4] }
      ]
    });
    U.legend(ctx, [[C.accent, "creatina", "line"], [C.protein, "sarcosina", "line"], [C.water, "cianamida", "line"], [C.heat, "DCD ×20", "line"]], 440, 332, { size: 11 });
    // resultado
    U.rr(ctx, 440, 350, 330, 120, 8); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    if (!this.res) {
      U.txt(ctx, "Ajuste pH, temperatura e dosagem", 456, 388, { size: 14, weight: 700 });
      U.txt(ctx, "e clique em Rodar lote.", 456, 410, { size: 14 });
      U.txt(ctx, "dica: compare pH 8, 10 e 12", 456, 440, { size: 12, font: "mono", color: C.muted });
    } else {
      const v = verdict(this.res), done = !this.playing;
      U.txt(ctx, done ? "RESULTADO DO LOTE" : "LOTE EM ANDAMENTO", 456, 372, { size: 11, font: "mono", color: C.muted });
      U.txt(ctx, `conversão ${U.fmt(s.Cr * 100, 0)}%  ·  DCD ${U.fmt(s.D / Math.max(s.Cr, 1e-6) * 1e6)} ppm`, 456, 396, { size: 14, font: "mono", weight: 600 });
      U.txt(ctx, `creatinina ${U.fmt(s.Cn / Math.max(s.Cr, 1e-6) * 1e6)} ppm`, 456, 418, { size: 14, font: "mono" });
      if (done) {
        const col = v.tone === "ok" ? C.ok : v.tone === "warn" ? C.warn : C.bad;
        const words = v.txt.split(" "); let line = "", y = 442;
        ctx.font = `700 13px ${U.FONTS.body}`;
        for (const w of words) { if (ctx.measureText(line + w).width > 300) { U.txt(ctx, line, 456, y, { size: 13, weight: 700, color: col }); line = ""; y += 16; } line += w + " "; }
        U.txt(ctx, line, 456, y, { size: 13, weight: 700, color: col });
      }
      if (this.stale && done) U.txt(ctx, "parâmetros mudaram: rode de novo", 762, 372, { size: 11, font: "mono", align: "right", color: C.warn });
    }
  },
  xchart(ctx, W, H, C) {
    const pH0 = this.p.pH;
    const ff = p => 1 / (1 + Math.pow(10, 10.0 - p)), fc = p => 1 / (1 + Math.pow(10, p - 10.3));
    const A = [], B = [], P = [], D = [];
    let pm = 0, dm = 0;
    for (let p = 6; p <= 14.001; p += 0.05) { pm = Math.max(pm, ff(p) * fc(p)); dm = Math.max(dm, fc(p) * (1 - fc(p))); }
    for (let p = 6; p <= 14.001; p += 0.05) { A.push([p, ff(p)]); B.push([p, fc(p)]); P.push([p, ff(p) * fc(p) / pm]); D.push([p, fc(p) * (1 - fc(p)) / dm]); }
    const x = 40, y = 26, w = W - 56, h = H - 62;
    const ch = U.chart(ctx, x, y, w, h, { xmin: 6, xmax: 14, ymin: 0, ymax: 1.05, tx: [6, 8, 10, 12, 14], ty: [0, 0.5, 1], fy: v => U.fmt(v, 1), xlabel: "pH",
      series: [{ pts: A, color: C.protein }, { pts: B, color: C.water }, { pts: D, color: C.heat, dash: [5, 4] }, { pts: P, color: C.accent, width: 3 }] });
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(ch.sx(pH0), y); ctx.lineTo(ch.sx(pH0), y + h); ctx.stroke(); ctx.setLineDash([]);
    U.legend(ctx, [[C.protein, "N livre", "line"], [C.water, "cianamida neutra", "line"], [C.accent, "creatina", "line"], [C.heat, "DCD", "line"]], x, 12, { size: 11 });
  },
  readouts() {
    const s = this.state();
    return [
      { k: "Conversão", v: U.fmt(s.Cr * 100, 0), u: "%", tone: this.res && !this.playing ? (s.Cr > 0.85 ? "ok" : s.Cr > 0.6 ? "warn" : "bad") : "" },
      { k: "DCD / creatina", v: U.fmt(s.D / Math.max(s.Cr, 1e-6) * 1e6), u: "ppm" },
      { k: "Creatinina", v: U.fmt(s.Cn / Math.max(s.Cr, 1e-6) * 1e6), u: "ppm" },
      { k: "Cianamida livre", v: U.fmt(s.C, 2), u: "mol/L" },
      { k: "Tempo", v: U.fmt(s.t, 1), u: "h" }
    ];
  }
});

/* ---------- CR-301: cristalizador ---------- */
const CSAT = [[4, 6], [20, 14], [50, 34], [60, 45]];
function csat(T) {
  let a = CSAT[0], b = CSAT[1];
  if (T >= CSAT[3][0]) { a = CSAT[2]; b = CSAT[3]; }
  else for (let i = 0; i < 3; i++) if (T >= CSAT[i][0] && T <= CSAT[i + 1][0]) { a = CSAT[i]; b = CSAT[i + 1]; }
  const f = (T - a[0]) / (b[0] - a[0]);
  return Math.exp(Math.log(a[1]) + f * (Math.log(b[1]) - Math.log(a[1])));
}
SCENES.cryst = () => ({
  aria: "Cristalizador: ao resfriar, a creatina dissolvida forma núcleos e cristais; um gráfico mostra a curva de solubilidade.",
  controls: [
    { type: "range", id: "R", label: "Velocidade de resfriamento", min: 2, max: 40, step: 1, value: 10, unit: "°C/h" },
    { type: "button", id: "run", label: "▶ Resfriar de 60 a 5 °C", primary: true },
    { type: "button", id: "reset", label: "Reiniciar" }
  ],
  KV: 6.65e-13,
  init() { this.T = 60; this.C = 45; this.cls = []; this.pend = 0; this.running = false; this.done = false; this.hist = [[60, 45]]; this.vis = []; this.t = 0; },
  onButton(id) { if (id === "reset") this.init(); if (id === "run") { this.init(); this.running = true; this.Rrun = this.p.R; } },
  ctrlState(id) { if (id === "run") return { disabled: this.running }; },
  sigma() { return this.C / csat(this.T) - 1; },
  L43() { let a = 0, b = 0; for (const [n, L] of this.cls) { a += n * L ** 4; b += n * L ** 3; } return b > 0 ? a / b : 0; },
  N() { return this.cls.reduce((s, c) => s + c[0], 0); },
  update(dt) {
    this.t += dt;
    if (this.running) {
      const R = this.Rrun, H = 55 / R, steps = 3000;
      const per = Math.ceil(steps * dt / 12);
      const dth = H / steps;
      for (let k = 0; k < per && this.T > 5; k++) {
        const s = this.C / csat(this.T) - 1;
        if (s > 0.03) this.pend += 5e9 * Math.pow(s - 0.03, 6) * dth;
        if (this.pend > 0 && (k % 8 === 0)) { this.cls.push([this.pend, 2]); this.pend = 0; }
        const G = 600 * Math.max(s, 0);
        let mass = 0;
        for (const c of this.cls) { c[1] += G * dth; mass += c[0] * this.KV * c[1] ** 3; }
        this.C = 45 - mass;
        this.T -= R * dth;
      }
      if (this.hist.length === 0 || Math.abs(this.hist[this.hist.length - 1][0] - this.T) > 0.4) this.hist.push([this.T, this.C]);
      if (this.T <= 5) { this.running = false; this.done = true; BATCH.cryst = { R: this.Rrun, L: this.L43(), fines: U.clamp((260 - this.L43()) / 160, 0, 1) }; }
      // amostra visual de cristais
      const N = this.N();
      if (N > 0) {
        while (this.vis.length < Math.min(46, 6 + Math.log10(N) * 4)) {
          let r = Math.random() * N, ci = 0;
          for (; ci < this.cls.length - 1; ci++) { r -= this.cls[ci][0]; if (r <= 0) break; }
          this.vis.push({ ci, x: U.rand(80, 300), y: U.rand(180, 400), a: Math.random() * 3, w: U.rand(-0.3, 0.3) });
        }
      }
    }
    for (const v of this.vis) { v.a += v.w * dt; v.y = Math.min(410, v.y + dt * (this.cls[v.ci] ? this.cls[v.ci][1] / 60 : 0)); }
  },
  draw(ctx, C) {
    const T = this.T;
    // vaso
    ctx.beginPath(); ctx.moveTo(56, 100); ctx.lineTo(56, 340); ctx.lineTo(190, 440); ctx.lineTo(324, 340); ctx.lineTo(324, 100); ctx.closePath();
    ctx.fillStyle = U.alpha(T > 30 ? C.heat : C.water, 0.12 + 0.2 * Math.abs(T - 30) / 30); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(68, 108); ctx.lineTo(68, 336); ctx.lineTo(190, 426); ctx.lineTo(312, 336); ctx.lineTo(312, 108); ctx.closePath();
    ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.save(); ctx.clip();
    const nd = Math.round(this.C * 2.2);
    for (let i = 0; i < nd; i++) { const x = 72 + ((i * 97.3) % 236), y = 116 + ((i * 53.7 + Math.sin(this.t + i) * 6) % 300); U.circle(ctx, x, y, 1.8, U.alpha(C.accent, 0.5)); }
    for (const v of this.vis) {
      const c = this.cls[v.ci]; if (!c) continue;
      const L = 3 + c[1] / 9, w = Math.max(2, L * 0.28);
      ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.a);
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-L + w, -w); ctx.lineTo(L - w, -w); ctx.lineTo(L, 0); ctx.lineTo(L - w, w); ctx.lineTo(-L + w, w); ctx.closePath();
      ctx.fillStyle = U.alpha(C.surface2, 0.9); ctx.fill(); ctx.strokeStyle = C.crystal; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    U.tag(ctx, `TI-301 ${U.fmt(T, 1)} °C`, 190, 470, { align: "center" });
    U.legend(ctx, [[U.alpha(C.accent, 0.6), "creatina dissolvida"], [C.crystal, "cristal (monohidratada)", "sq"]], 56, 62, { size: 11 });
    // curva de solubilidade
    const pts = []; for (let t = 0; t <= 65; t += 1) pts.push([t, csat(t)]);
    const zone = []; for (let t = 0; t <= 65; t += 1) zone.push([t, csat(t) * 1.25]); for (let t = 65; t >= 0; t -= 1) zone.push([t, csat(t)]);
    const ch = U.chart(ctx, 420, 70, 340, 250, { xmin: 0, xmax: 65, ymin: 0, ymax: 60, tx: [0, 20, 40, 60], ty: [0, 15, 30, 45, 60], xlabel: "temperatura (°C)", ylabel: "creatina (g/L)",
      fill: [{ pts: zone, color: U.alpha(C.warn, 0.15) }],
      series: [{ pts, color: C.accent, width: 2.5 }, { pts: this.hist, color: C.heat, width: 2 }] });
    for (const [t, c] of CSAT) U.circle(ctx, ch.sx(t), ch.sy(c), 3.5, C.surface, C.accent, 1.5);
    U.circle(ctx, ch.sx(T), ch.sy(this.C), 6, C.heat, C.surface, 2);
    U.txt(ctx, "solubilidade", ch.sx(52), ch.sy(csat(52)) + 18, { size: 11, font: "mono", color: C.accent });
    U.txt(ctx, "zona metaestável", ch.sx(4), ch.sy(csat(14) * 1.25) - 22, { size: 11, font: "mono", color: C.warn });
    U.txt(ctx, "● dados medidos (4, 20, 50, 60 °C)", 420, 360, { size: 11, font: "mono", color: C.muted });
    const s = this.sigma();
    let msg = this.running ? (s > 0.15 ? "supersaturação alta: chuva de núcleos" : "cristais crescendo") : this.done ? (BATCH.cryst.fines > 0.5 ? "resfriamento rápido: muitos cristais pequenos" : "cristais grandes e bem formados") : "solução saturada a 60 °C";
    U.txt(ctx, msg, 420, 400, { size: 14, weight: 700, color: this.done && BATCH.cryst.fines > 0.5 ? C.warn : C.ink });
  },
  readouts() {
    const s = this.sigma(), L = this.L43();
    return [
      { k: "Solubilidade", v: U.fmt(csat(this.T), 1), u: "g/L" },
      { k: "Dissolvido", v: U.fmt(this.C, 1), u: "g/L" },
      { k: "Supersaturação", v: U.fmt(Math.max(0, s) * 100, 0), u: "%", tone: s > 0.15 ? "warn" : "" },
      { k: "Cristais", v: this.N() > 0 ? U.fmt(this.N() / 1e6, this.N() < 1e7 ? 1 : 0) : "0", u: "mi/L" },
      { k: "Tamanho médio", v: U.fmt(L, 0), u: "µm", tone: this.done ? (L < 150 ? "warn" : "ok") : "" }
    ];
  }
});

/* ---------- CF-401: centrífuga de cesto ---------- */
SCENES.basket = () => ({
  aria: "Centrífuga de cesto: a torta de cristais se forma na parede, a água-mãe sai, e um spray de água lava as impurezas.",
  controls: [
    { type: "range", id: "V", label: "Lavagem (volumes de torta)", min: 0, max: 3, step: 0.25, value: 2, unit: "vol.", fmt: v => U.fmt(v, 2) },
    { type: "button", id: "run", label: "▶ Rodar ciclo", primary: true }
  ],
  PH: [["enchendo", 2], ["centrifugando", 2], ["lavando", 2.5], ["secando", 1.5], ["descarregando", 1.5]],
  init() { this.t = 0; this.ph = -1; this.pt = 0; this.cake = 0; this.imp = 1; this.drops = []; this.done = false; },
  onChange(id) { if (id === "V") BATCH.wash = this.p.V; },
  onButton(id) { if (id === "run") { this.ph = 0; this.pt = 0; this.cake = 0; this.imp = 1; this.done = false; BATCH.wash = this.p.V; } },
  ctrlState(id) { if (id === "run") return { disabled: this.ph >= 0 }; },
  update(dt) {
    this.t += dt;
    if (this.ph >= 0) {
      this.pt += dt;
      const [name, dur] = this.PH[this.ph];
      if (name === "enchendo") this.cake = Math.min(1, this.pt / dur);
      if (name === "lavando") this.imp = Math.exp(-1.6 * this.p.V * Math.min(1, this.pt / dur));
      if (name === "descarregando") this.cake = Math.max(0, 1 - this.pt / dur);
      const spin = name !== "enchendo" && name !== "descarregando";
      if (spin && Math.random() < dt * 30) {
        const side = Math.random() < 0.5 ? -1 : 1, wash = name === "lavando";
        if (name !== "secando" || Math.random() < 0.3) this.drops.push({ x: 400 + side * 132, y: U.rand(170, 360), vx: side * U.rand(150, 260), c: wash ? 1 : 0 });
      }
      if (this.pt >= dur) { this.ph++; this.pt = 0; if (this.ph >= this.PH.length) { this.ph = -1; this.done = true; } }
    }
    for (const d of this.drops) { d.x += d.vx * dt; d.y += 40 * dt; }
    this.drops = this.drops.filter(d => d.x > 234 && d.x < 566);
  },
  draw(ctx, C) {
    const name = this.ph >= 0 ? this.PH[this.ph][0] : this.done ? "ciclo concluído" : "parada";
    const spin = this.ph >= 1 && this.ph <= 3;
    U.rr(ctx, 230, 110, 340, 300, 10); ctx.fillStyle = U.alpha(C.line, 0.2); ctx.fill(); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.stroke();
    U.txt(ctx, "carcaça", 240, 128, { size: 11, font: "mono", color: C.muted });
    // cesto
    ctx.fillStyle = C.surface; ctx.fillRect(268, 150, 264, 230); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(268, 150, 264, 230);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    for (const x of [268, 532]) { ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 380); ctx.stroke(); }
    ctx.setLineDash([]);
    const th = this.cake * 34;
    const cc = U.mix(U.mix(C.surface2, C.crystal, 0.3), C.warn, U.clamp(this.imp * 0.55, 0, 0.55));
    ctx.fillStyle = cc; ctx.fillRect(270, 152, th, 226); ctx.fillRect(530 - th, 152, th, 226);
    if (spin) { for (let k = 0; k < 6; k++) { const y = 160 + ((this.t * 300 + k * 40) % 220); ctx.fillStyle = U.alpha(C.ink, 0.15); ctx.fillRect(275 + th, y, 250 - 2 * th, 3); } }
    if (this.ph === 0) { ctx.fillStyle = U.alpha(C.warn, 0.25); ctx.fillRect(320, 150, 160, 230); U.arrow(ctx, 400, 70, 400, 150, C.warn, 3); U.txt(ctx, "suspensão de cristais", 410, 88, { size: 12, font: "mono" }); }
    if (this.ph === 2) { for (let k = 0; k < 14; k++) { const a = -0.8 + (k / 13) * 1.6, x = 400 + Math.sin(a) * 110 * ((this.t * 2 + k * 0.07) % 1); U.circle(ctx, x, 165 + ((this.t * 200 + k * 20) % 200), 2.5, C.water); } U.txt(ctx, "spray de água", 410, 140, { size: 12, font: "mono", color: C.water }); }
    for (const d of this.drops) U.circle(ctx, d.x, d.y, 2.6, d.c ? C.water : C.warn);
    ctx.fillStyle = C.ink; ctx.fillRect(394, 380, 12, 40); U.rr(ctx, 360, 418, 80, 26, 4); ctx.fill();
    U.txt(ctx, "motor", 400, 435, { size: 11, font: "mono", align: "center", color: C.surface });
    U.arrow(ctx, 570, 400, 650, 440, C.warn, 3); U.txt(ctx, "água-mãe", 656, 452, { size: 12, font: "mono", color: C.warn });
    U.tag(ctx, name.toUpperCase(), 400, 50, { align: "center", stroke: spin ? C.accent : C.ink, color: spin ? C.accent : C.ink });
    // barras
    const bar = (y, lab, frac, col, txtv) => {
      U.txt(ctx, lab, 596, y, { size: 12, font: "mono", color: C.muted });
      U.rr(ctx, 596, y + 8, 140, 12, 6); ctx.fillStyle = C.surface2; ctx.fill();
      U.rr(ctx, 596, y + 8, 140 * U.clamp(frac, 0, 1), 12, 6); ctx.fillStyle = col; ctx.fill();
      U.txt(ctx, txtv, 784, y + 18, { size: 12, font: "mono", align: "right", weight: 600 });
    };
    const impF = Math.exp(-1.6 * this.p.V);
    bar(170, "impurezas", this.done ? impF : this.imp, C.warn, `${U.fmt((this.done ? impF : this.imp) * 100, 0)}%`);
    bar(220, "creatina perdida", 0.015 * this.p.V / 0.06, C.bad, `${U.fmt(1.5 * this.p.V, 1)}%`);
    U.txt(ctx, "Lavar tira impureza,", 596, 290, { size: 12, color: C.muted });
    U.txt(ctx, "mas dissolve produto.", 596, 306, { size: 12, color: C.muted });
    U.legend(ctx, [[C.warn, "água-mãe (sais, impurezas)"], [C.water, "água de lavagem"]], 230, 470, { size: 11 });
  },
  readouts() {
    const impF = Math.exp(-1.6 * this.p.V);
    return [
      { k: "Impurezas superficiais", v: U.fmt(impF * 100, 0), u: "% restantes", tone: impF > 0.2 ? "bad" : impF > 0.05 ? "warn" : "ok" },
      { k: "Perda de creatina", v: U.fmt(1.5 * this.p.V, 1), u: "%", tone: this.p.V > 2.5 ? "warn" : "" },
      { k: "Aceleração", v: "~1.000", u: "× g" },
      { k: "Umidade da torta", v: this.done ? "~8" : "—", u: this.done ? "%" : "" }
    ];
  }
});

/* ---------- DR-501: secador ---------- */
SCENES.dryer = () => ({
  aria: "Secador: a umidade livre evapora primeiro; acima de cerca de 100 °C a água de cristalização sai e a creatina vira anidra.",
  controls: [
    { type: "range", id: "T", label: "Temperatura de secagem", min: 30, max: 140, step: 1, value: 60, unit: "°C" },
    { type: "button", id: "run", label: "▶ Secar", primary: true },
    { type: "button", id: "reset", label: "Reiniciar" }
  ],
  init() { this.t = 0; this.f = 8; this.w = 12.1; this.run = false; this.fly = []; this.rt = 0; },
  onButton(id) { if (id === "reset") this.init(); if (id === "run") { this.run = true; this.rt = 0; } },
  ctrlState(id) { if (id === "run") return { disabled: this.run }; },
  update(dt) {
    this.t += dt;
    if (this.run) {
      const T = this.p.T;
      this.rt += dt;
      const kf = 0.04 + 0.011 * Math.max(0, T - 25);
      const df = this.f * kf * dt; this.f -= df;
      const kw = T > 100 ? 0.016 * (T - 100) / 5 : 0;
      const nb = Math.round(40 * this.w / 12.1);
      this.w -= this.w * kw * dt;
      const na = Math.round(40 * this.w / 12.1);
      for (let i = na; i < nb; i++) this.fly.push({ x: 470 + (i % 8) * 38 + 19, y: 150 + Math.floor(i / 8) * 56 + 28, t: 0, lat: true });
      if (Math.random() < df * 6) this.fly.push({ x: U.rand(470, 770), y: 128, t: 0 });
      if (this.rt > 14) this.run = false;
    }
    for (const q of this.fly) { q.t += dt; q.y -= 60 * dt; q.x += Math.sin(q.t * 6) * 0.5; }
    this.fly = this.fly.filter(q => q.t < 1.6);
  },
  form() { return this.w > 11.5 ? ["monohidratada", "ok"] : this.w > 1 ? ["parcialmente anidra", "warn"] : ["anidra", "bad"]; },
  draw(ctx, C) {
    // secador
    U.rr(ctx, 40, 170, 340, 150, 70); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    U.rr(ctx, 28, 160, 364, 170, 80); ctx.strokeStyle = U.alpha(C.heat, 0.5 + 0.4 * (this.p.T - 30) / 110); ctx.lineWidth = 6; ctx.stroke();
    const a = this.t * (this.run ? 2.5 : 0.4);
    for (let k = 0; k < 6; k++) { const x = 90 + k * 48; ctx.save(); ctx.translate(x, 245); ctx.rotate(a + k); ctx.fillStyle = C.ink; ctx.fillRect(-3, -48, 6, 96); ctx.restore(); }
    ctx.fillStyle = C.ink; ctx.fillRect(40, 242, 340, 6);
    for (let k = 0; k < 22; k++) U.circle(ctx, 60 + (k * 53) % 300, 290 - (k % 3) * 6, 4, U.mix(C.surface2, C.water, U.clamp(this.f / 8, 0, 1) * 0.6), C.crystal, 1);
    U.txt(ctx, "secador de pás a vácuo", 210, 352, { size: 12, font: "mono", align: "center", color: C.muted });
    U.tag(ctx, `TIC-501 ${this.p.T} °C`, 210, 120, { align: "center", stroke: this.p.T > 100 ? C.bad : C.ink });
    // rede cristalina
    U.txt(ctx, "zoom na rede do cristal", 470, 100, { size: 12, font: "mono", color: C.muted });
    U.rr(ctx, 460, 140, 320, 300, 8); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    const shrink = 1 - 0.06 * (1 - this.w / 12.1);
    const na = Math.round(40 * this.w / 12.1);
    for (let i = 0; i < 40; i++) {
      const cx = 470 + (i % 8) * 38 * shrink + 19, cy = 150 + Math.floor(i / 8) * 56 * shrink + 14;
      U.rr(ctx, cx - 14, cy - 7, 28, 14, 5); ctx.fillStyle = U.alpha(C.protein, 0.8); ctx.fill();
      if (i < na) { const wy = cy + 22; U.circle(ctx, cx, wy, 4.2, C.bad); U.circle(ctx, cx - 5, wy + 4, 2.5, C.surface2, C.ink, 0.6); U.circle(ctx, cx + 5, wy + 4, 2.5, C.surface2, C.ink, 0.6); }
    }
    const nf = Math.round(this.f * 2.2);
    for (let i = 0; i < nf; i++) { const x = 476 + (i * 61) % 290; U.circle(ctx, x, 136, 6, U.alpha(C.water, 0.7)); }
    for (const q of this.fly) { const al = 1 - q.t / 1.6; if (q.lat) { U.circle(ctx, q.x, q.y, 4, U.alpha(C.bad, al)); } else U.circle(ctx, q.x, q.y, 5, U.alpha(C.water, al)); }
    U.legend(ctx, [[U.alpha(C.protein, 0.8), "creatina", "sq"], [C.bad, "água de cristalização (H₂O)"], [U.alpha(C.water, 0.7), "umidade livre"]], 40, 470, { size: 11 });
  },
  readouts() {
    const [f, tone] = this.form();
    return [
      { k: "Umidade livre", v: U.fmt(this.f, 1), u: "%", tone: this.f < 0.3 ? "ok" : "" },
      { k: "Água de cristalização", v: U.fmt(this.w, 1), u: "% (alvo 12,1)", tone },
      { k: "Forma", v: f, tone }
    ];
  }
});

/* ---------- ML-601: moinho + peneira ---------- */
SCENES.mill = () => ({
  aria: "Moinho de pinos quebra cristais; uma peneira de 200 mesh deixa passar só as partículas finas. Um histograma mostra a distribuição de tamanho.",
  controls: [{ type: "range", id: "rpm", label: "Rotação do moinho", min: 1000, max: 14000, step: 250, value: 8000, unit: "rpm", fmt: v => U.fmt(v) }],
  init() { this.t = 0; this.in = []; this.out = []; this.acc = 0; },
  D50() { return 350 * Math.pow(1000 / this.p.rpm, 1.1); },
  cdf(x) { const z = (Math.log(x) - Math.log(this.D50())) / Math.log(1.8); return 0.5 * (1 + this.erf(z / Math.SQRT2)); },
  erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; },
  sample() { return Math.exp(Math.log(this.D50()) + U.gauss() * Math.log(1.8)); },
  update(dt) {
    this.t += dt; this.acc += dt * 10;
    while (this.acc > 1) { this.acc--; this.in.push({ x: 200 + U.rand(-14, 14), y: 60, s: U.rand(300, 500) }); }
    for (const q of this.in) { q.y += 120 * dt; if (q.y > 170) { q.dead = true; for (let k = 0; k < 3; k++) this.out.push({ x: 200 + U.rand(-60, 60), y: 280, s: this.sample(), vy: U.rand(60, 120), st: 0 }); } }
    this.in = this.in.filter(q => !q.dead);
    for (const q of this.out) {
      q.y += q.vy * dt;
      if (q.st === 0 && q.y > 352) { if (q.s < 75) q.st = 1; else { q.st = 2; q.vy = -80; } }
      if (q.st === 2) { q.x -= 70 * dt; if (q.y < 300) q.dead = true; }
      if (q.y > 450) q.dead = true;
    }
    this.out = this.out.filter(q => !q.dead);
    if (this.out.length > 260) this.out.splice(0, this.out.length - 260);
  },
  draw(ctx, C) {
    // funil
    ctx.beginPath(); ctx.moveTo(150, 40); ctx.lineTo(250, 40); ctx.lineTo(215, 110); ctx.lineTo(185, 110); ctx.closePath(); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    for (const q of this.in) U.circle(ctx, q.x, q.y, q.s / 50, C.surface2, C.crystal, 1.2);
    // rotor
    U.circle(ctx, 200, 220, 90, C.surface, C.ink, 2);
    const a = this.t * this.p.rpm / 1400;
    for (const [r, n] of [[30, 6], [55, 10], [78, 14]]) for (let k = 0; k < n; k++) { const an = a * (r === 55 ? -1 : 1) + k / n * 6.283; U.circle(ctx, 200 + Math.cos(an) * r, 220 + Math.sin(an) * r, 3.2, C.ink); }
    U.txt(ctx, "moinho de pinos", 300, 226, { size: 11, font: "mono", color: C.muted });
    // peneira
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([6, 3]); ctx.beginPath(); ctx.moveTo(90, 355); ctx.lineTo(310, 355); ctx.stroke(); ctx.setLineDash([]);
    U.txt(ctx, "peneira 200 mesh (74 µm)", 320, 359, { size: 11, font: "mono", color: C.muted });
    for (const q of this.out) { const r = U.clamp(q.s / 40, 0.8, 8); U.circle(ctx, q.x, q.y, r, q.st === 2 ? U.alpha(C.warn, 0.8) : U.mix(C.surface2, C.crystal, 0.4), q.st === 2 ? null : C.crystal, 0.6); }
    U.rr(ctx, 100, 420, 200, 50, 6); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
    U.txt(ctx, "micronizada", 200, 450, { size: 12, font: "mono", align: "center" });
    U.txt(ctx, "← grandes voltam ao moinho", 90, 338, { size: 11, font: "mono", color: C.warn });
    // histograma
    const x0 = 470, y0 = 80, w = 290, h = 250, lo = Math.log10(5), hi = Math.log10(1000), nb = 16;
    ctx.fillStyle = C.surface; ctx.fillRect(x0, y0, w, h);
    let mx = 0; const vals = [];
    for (let i = 0; i < nb; i++) { const a1 = Math.pow(10, lo + (hi - lo) * i / nb), a2 = Math.pow(10, lo + (hi - lo) * (i + 1) / nb); const v = this.cdf(a2) - this.cdf(a1); vals.push([a1, a2, v]); mx = Math.max(mx, v); }
    vals.forEach(([a1, a2, v], i) => { const bh = v / mx * (h - 20); ctx.fillStyle = a2 <= 80 ? C.accent : U.alpha(C.muted, 0.5); ctx.fillRect(x0 + i * w / nb + 1, y0 + h - bh, w / nb - 2, bh); });
    const sx = v => x0 + (Math.log10(v) - lo) / (hi - lo) * w;
    ctx.strokeStyle = C.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx(74), y0); ctx.lineTo(sx(74), y0 + h); ctx.stroke();
    U.txt(ctx, "74 µm", sx(74) + 4, y0 + 14, { size: 11, font: "mono", color: C.bad });
    for (const t of [10, 100, 1000]) U.txt(ctx, `${t}`, sx(t), y0 + h + 14, { size: 11, font: "mono", align: "center", color: C.muted });
    U.txt(ctx, "tamanho da partícula (µm, escala log)", x0 + w, y0 + h + 30, { size: 11, font: "mono", align: "right", color: C.muted });
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + h); ctx.lineTo(x0 + w, y0 + h); ctx.stroke();
    U.txt(ctx, "distribuição de tamanhos", x0, y0 - 10, { size: 11, font: "mono", color: C.muted });
    const d = this.D50();
    U.txt(ctx, d < 30 ? "fino demais: vira poeira e empedra" : d > 150 ? "grosso: dispersa mal na água" : "boa dispersão na água", x0, 400, { size: 14, weight: 700, color: d < 30 || d > 150 ? C.warn : C.ok });
  },
  readouts() {
    const d = this.D50(), pass = this.cdf(74) * 100;
    return [
      { k: "Mediana (D50)", v: U.fmt(d, 0), u: "µm" },
      { k: "Passa 200 mesh", v: U.fmt(pass, 0), u: "%", tone: pass > 80 ? "ok" : pass > 40 ? "warn" : "bad" },
      { k: "Poeira", v: d < 30 ? "alta" : "baixa", tone: d < 30 ? "warn" : "ok" }
    ];
  }
});

/* ---------- QC-701: HPLC e laudo ---------- */
SCENES.qc = () => ({
  aria: "Cromatograma de HPLC do lote com picos de creatinina, creatina e diciandiamida, e um laudo de aprovação.",
  controls: [
    { type: "toggle", id: "zoom", label: "Zoom ×200 nas impurezas" },
    { type: "toggle", id: "rec", label: "Recristalizar o lote" }
  ],
  init() { this.zoom = false; this.rec = false; this.t = 0; this.def = runBatch(9.8, 70, 3); },
  onButton(id) { if (id === "zoom") this.zoom = !this.zoom; if (id === "rec") this.rec = !this.rec; },
  ctrlState(id) { if (id === "zoom") return { pressed: this.zoom }; if (id === "rec") return { pressed: this.rec }; },
  update(dt) { this.t += dt; },
  lot() {
    const r = BATCH.run || this.def, cr = BATCH.cryst || { R: 10, fines: 0.44 }, V = BATCH.wash == null ? 2 : BATCH.wash;
    const occl = 0.035 * (1 + 3 * cr.fines) / (this.rec ? 10 : 1);
    const dcd = occl * r.rD * 1e6, crn = occl * r.rCn * 1e6, salts = 10000 * Math.exp(-1.6 * V) * (this.rec ? 0.1 : 1);
    const tot = dcd + crn + salts;
    const yld = (r.conv - 0.107 - 0.015 * V - (this.rec ? 0.08 : 0)) * 100;
    return { r, cr, V, dcd, crn, salts, tot, purity: 100 - tot / 1e4, yld, own: { run: !!BATCH.run, cryst: !!BATCH.cryst, wash: BATCH.wash != null } };
  },
  draw(ctx, C) {
    const L = this.lot();
    const x0 = 60, y0 = 70, w = 450, h = 290, tmax = 7;
    const peaks = [[1.1, L.salts / 1e6 * 0.5, "sais"], [2.2, L.crn / 1e6 * 1.3, "creatinina"], [3.1, 1, "creatina"], [4.6, L.dcd / 1e6 * 1.6, "DCD"]];
    const sc = this.zoom ? 200 : 1, ymax = 1.05;
    ctx.fillStyle = C.surface; ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = U.alpha(C.line, 0.8); ctx.lineWidth = 1;
    for (let i = 1; i < 7; i++) { const x = x0 + i / tmax * w; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); ctx.stroke(); U.txt(ctx, String(i), x, y0 + h + 14, { size: 11, font: "mono", align: "center", color: C.muted }); }
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    ctx.beginPath();
    for (let i = 0; i <= 700; i++) {
      const t = i / 700 * tmax;
      let y = Math.sin(t * 91.7) * 0.0012 + Math.sin(t * 53.3) * 0.0008;
      for (const [rt, hgt] of peaks) y += hgt * sc * Math.exp(-Math.pow((t - rt) / 0.07, 2));
      const X = x0 + t / tmax * w, Y = y0 + h - 8 - U.clamp(y, -0.02, 2) / ymax * (h - 16);
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + h); ctx.lineTo(x0 + w, y0 + h); ctx.stroke();
    for (const [rt, hgt, nm] of peaks) {
      const v = hgt * sc, X = x0 + rt / tmax * w, Y = y0 + h - 8 - Math.min(v, ymax) / ymax * (h - 16);
      U.txt(ctx, nm + (v > ymax ? " (fora da escala)" : ""), X, Math.max(y0 + 14, Y - 8), { size: 11, font: "mono", align: "center", color: nm === "creatina" ? C.accent : C.ink });
    }
    U.txt(ctx, "tempo de retenção (min) · ilustrativo", x0 + w, y0 + h + 30, { size: 11, font: "mono", align: "right", color: C.muted });
    U.txt(ctx, this.zoom ? "absorbância ×200" : "absorbância", x0, y0 - 10, { size: 11, font: "mono", color: C.muted });
    // origem
    const src = `pH ${U.fmt(L.r.pH, 1)} · ${L.r.T} °C · dosagem ${U.fmt(L.r.td, 2)} h · resfriamento ${L.cr.R} °C/h · lavagem ${U.fmt(L.V, 2)} vol.`;
    U.txt(ctx, "lote: " + src, x0, 432, { size: 11, font: "mono", color: C.muted });
    const miss = [!L.own.run && "R-201", !L.own.cryst && "CR-301", !L.own.wash && "CF-401"].filter(Boolean);
    if (miss.length) U.txt(ctx, `valores padrão em ${miss.join(", ")}: rode essas etapas para usar o seu lote`, x0, 452, { size: 11, font: "mono", color: C.warn });
    // laudo
    const lx = 540, ly = 60, lw = 240, lh = 340;
    U.rr(ctx, lx, ly, lw, lh, 6); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
    U.txt(ctx, "CERTIFICADO DE ANÁLISE", lx + 16, ly + 26, { size: 12, font: "mono", weight: 600 });
    U.txt(ctx, "lote didático", lx + 16, ly + 44, { size: 10, font: "mono", color: C.muted });
    const rows = [
      ["Pureza (HPLC)", `${U.fmt(L.purity, 2)} %`, L.purity >= 99.9],
      ["Creatinina", `${U.fmt(L.crn)} ppm`, null],
      ["Diciandiamida", `${U.fmt(L.dcd)} ppm`, null],
      ["Sais solúveis", `${U.fmt(L.salts)} ppm`, null],
      ["Impurezas totais", `${U.fmt(L.tot)} ppm`, L.tot <= 1000],
      ["Rendimento do lote", `${U.fmt(L.yld, 0)} %`, L.yld >= 70]
    ];
    rows.forEach(([k, v, ok], i) => {
      const y = ly + 76 + i * 30;
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx + 12, y + 10); ctx.lineTo(lx + lw - 12, y + 10); ctx.stroke();
      U.txt(ctx, k, lx + 16, y, { size: 12 });
      U.txt(ctx, v, lx + lw - 16, y, { size: 12, font: "mono", align: "right", weight: 600, color: ok === false ? C.bad : ok ? C.ok : C.ink });
    });
    const pass = L.purity >= 99.9;
    ctx.save(); ctx.translate(lx + lw / 2, ly + 290); ctx.rotate(-0.08);
    U.rr(ctx, -92, -22, 184, 44, 6); ctx.strokeStyle = pass ? C.ok : C.bad; ctx.lineWidth = 3; ctx.stroke();
    U.txt(ctx, pass ? "APROVADO" : "REPROVADO", 0, 2, { size: 26, font: "display", weight: 800, align: "center", base: "middle", color: pass ? C.ok : C.bad });
    ctx.restore();
    U.txt(ctx, "especificação: ≥ 99,9 %", lx + lw / 2, ly + lh + 20, { size: 11, font: "mono", align: "center", color: C.muted });
  },
  readouts() {
    const L = this.lot();
    return [
      { k: "Pureza", v: U.fmt(L.purity, 2), u: "%", tone: L.purity >= 99.9 ? "ok" : "bad" },
      { k: "Impurezas totais", v: U.fmt(L.tot), u: "ppm", tone: L.tot <= 1000 ? "ok" : "bad" },
      { k: "Rendimento", v: U.fmt(L.yld, 0), u: "%", tone: L.yld >= 70 ? "ok" : "warn" }
    ];
  }
});
