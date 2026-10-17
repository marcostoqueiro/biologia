/* Cenas da linha de whey. Coordenadas lógicas 800 × 500. */

/* ---------- T-101: coagulação ---------- */
SCENES.coag = () => ({
  aria: "Micelas de caseína com cabeleira de κ-caseína; a quimosina corta a cabeleira e as micelas se agregam em coalhada, liberando o soro.",
  controls: [
    { type: "range", id: "temp", label: "Temperatura do leite", min: 10, max: 50, step: 1, value: 32, unit: "°C" },
    { type: "button", id: "rennet", label: "Adicionar coalho", primary: true },
    { type: "button", id: "drain", label: "Cortar e dessorar" },
    { type: "button", id: "reset", label: "Reiniciar" }
  ],
  box: { x0: 70, x1: 730, y0: 78, y1: 420 },
  init() {
    const b = this.box;
    this.t = 0; this.rennet = false; this.drain = 0; this.out = 0;
    this.mic = []; this.enz = []; this.wp = []; this.gmp = []; this.links = [];
    for (let i = 0; i < 16; i++) {
      this.mic.push({ x: U.rand(b.x0 + 40, b.x1 - 40), y: U.rand(b.y0 + 40, b.y1 - 40), vx: 0, vy: 0, r: 17,
        hairs: Array.from({ length: 12 }, () => 1), cut: 0, a0: Math.random() * 6.28 });
    }
    for (let i = 0; i < 46; i++) this.wp.push({ x: U.rand(b.x0 + 10, b.x1 - 10), y: U.rand(b.y0 + 10, b.y1 - 10), vx: 0, vy: 0, k: i % 3 });
  },
  act() { const T = this.p.temp; return Math.exp(-Math.pow((T - 38) / 10, 2)) * (T > 45 ? Math.exp(-(T - 45) / 3) : 1); },
  agg() { const T = this.p.temp; return U.clamp((T - 14) / 14, 0, 1); },
  onButton(id) {
    if (id === "reset") return this.init();
    if (id === "rennet" && !this.rennet) {
      this.rennet = true;
      const b = this.box;
      for (let i = 0; i < 9; i++) this.enz.push({ x: U.rand(b.x0 + 20, b.x1 - 20), y: b.y0 + 10, vx: 0, vy: 60, cd: 0, a: Math.random() * 6 });
    }
    if (id === "drain" && this.aggFrac() >= 0.5 && !this.drain) this.drain = 0.001;
  },
  ctrlState(id) {
    if (id === "rennet") return { disabled: this.rennet };
    if (id === "drain") return { disabled: !(this.aggFrac() >= 0.5) || this.drain > 0 };
  },
  cutFrac() { let c = 0; for (const m of this.mic) c += m.cut; return c / (this.mic.length * 12); },
  aggFrac() { const s = new Set(); for (const [a, b] of this.links) { s.add(a); s.add(b); } return s.size / this.mic.length; },
  brown(o, s, dt, damp) {
    o.vx += U.gauss() * s * Math.sqrt(dt); o.vy += U.gauss() * s * Math.sqrt(dt);
    const k = Math.exp(-damp * dt); o.vx *= k; o.vy *= k;
    o.x += o.vx * dt; o.y += o.vy * dt;
  },
  wall(o, r) {
    const b = this.box, top = this.level();
    if (o.x < b.x0 + r) { o.x = b.x0 + r; o.vx = Math.abs(o.vx); }
    if (o.x > b.x1 - r) { o.x = b.x1 - r; o.vx = -Math.abs(o.vx); }
    if (o.y < top + r) { o.y = top + r; o.vy = Math.abs(o.vy); }
    if (o.y > b.y1 - r) { o.y = b.y1 - r; o.vy = -Math.abs(o.vy); }
  },
  level() { return U.lerp(this.box.y0, this.box.y1 - 150, U.clamp(this.drain, 0, 1)); },
  update(dt) {
    if (this.rennet) this.t += dt;
    if (this.drain > 0 && this.drain < 1) this.drain = Math.min(1, this.drain + dt / 7);
    const act = this.act(), agg = this.agg();
    for (const m of this.mic) {
      this.brown(m, 26, dt, 2.5);
      if (this.drain) m.vy += 40 * this.drain * dt;
      this.wall(m, m.r + 6);
    }
    // ligações (pontes de cálcio) mantêm distância
    for (const [a, b] of this.links) {
      const A = this.mic[a], B = this.mic[b];
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, t = 2 * A.r + 4;
      const k = (d - t) / d * 0.5;
      A.x += dx * k; A.y += dy * k; B.x -= dx * k; B.y -= dy * k;
    }
    // colisões
    for (let i = 0; i < this.mic.length; i++) for (let j = i + 1; j < this.mic.length; j++) {
      const A = this.mic[i], B = this.mic[j];
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d < 2 * A.r + 6) {
        const sticky = A.cut >= 7 && B.cut >= 7;
        const linked = this.links.some(([a, b]) => (a === i && b === j) || (a === j && b === i));
        if (sticky && !linked && Math.random() < agg * dt * 30) this.links.push([i, j]);
        else if (!linked && d < 2 * A.r + 4) {
          const k = (2 * A.r + 4 - d) / (d || 1) * 0.5;
          A.x -= dx * k; A.y -= dy * k; B.x += dx * k; B.y += dy * k;
        }
      }
    }
    for (const e of this.enz) {
      this.brown(e, 260, dt, 1.6);
      this.wall(e, 8);
      e.a += dt * 8; e.cd -= dt;
      if (e.cd > 0 || act < 0.02) continue;
      for (const m of this.mic) {
        if (Math.hypot(m.x - e.x, m.y - e.y) < m.r + 12 && m.cut < 12) {
          const idx = m.hairs.findIndex(h => h);
          if (idx < 0) continue;
          m.hairs[idx] = 0; m.cut++;
          const an = m.a0 + idx / 12 * 6.283;
          this.gmp.push({ x: m.x + Math.cos(an) * (m.r + 6), y: m.y + Math.sin(an) * (m.r + 6), vx: Math.cos(an) * 40, vy: Math.sin(an) * 40, a: an });
          e.cd = 0.35 / Math.max(act, 0.05);
          break;
        }
      }
    }
    const b = this.box;
    const flowOut = o => {
      if (!this.drain) return false;
      o.vy += 160 * dt; o.vx += (400 - o.x) * 0.6 * dt;
      if (o.y > b.y1 - 6 && Math.abs(o.x - 400) < 30) { this.out++; return true; }
      return false;
    };
    this.wp = this.wp.filter(w => { this.brown(w, 90, dt, 2); const g = flowOut(w); if (!g) this.wall(w, 4); return !g; });
    this.gmp = this.gmp.filter(g => { this.brown(g, 90, dt, 2); g.a += dt; const o = flowOut(g); if (!o) this.wall(g, 4); return !o; });
  },
  draw(ctx, C) {
    const b = this.box, top = this.level(), af = this.aggFrac();
    U.legend(ctx, [[C.surface2, "micela de caseína"], [C.protein, "κ-caseína", "line"], [C.ok, "quimosina (coalho)"], [C.whey, "proteínas do soro"], [C.heat, "GMP", "line"]], 70, 50);
    // tanque
    U.rr(ctx, b.x0 - 8, b.y0 - 8, b.x1 - b.x0 + 16, b.y1 - b.y0 + 16, 26);
    ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); U.rr(ctx, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, 20); ctx.clip();
    ctx.fillStyle = U.alpha(C.whey, 0.07 + 0.16 * af);
    ctx.fillRect(b.x0, top, b.x1 - b.x0, b.y1 - top);
    if (this.drain) { ctx.strokeStyle = U.alpha(C.whey, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x0, top); ctx.lineTo(b.x1, top); ctx.stroke(); }
    // pontes de cálcio
    ctx.lineWidth = 3; ctx.strokeStyle = U.alpha(C.crystal, 0.9);
    this.links.forEach(([i, j], n) => {
      const A = this.mic[i], B = this.mic[j];
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      if (n < 3) U.txt(ctx, "Ca²⁺", (A.x + B.x) / 2 + 4, (A.y + B.y) / 2 - 4, { size: 11, font: "mono", color: C.muted });
    });
    for (const m of this.mic) {
      m.hairs.forEach((h, k) => {
        const an = m.a0 + k / 12 * 6.283;
        ctx.strokeStyle = h ? C.protein : U.alpha(C.protein, 0.45);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x + Math.cos(an) * m.r, m.y + Math.sin(an) * m.r);
        const L = h ? 9 + Math.sin(this.t * 3 + k) : 2.5;
        ctx.lineTo(m.x + Math.cos(an) * (m.r + L), m.y + Math.sin(an) * (m.r + L));
        ctx.stroke();
      });
      U.circle(ctx, m.x, m.y, m.r, C.surface2, C.ink, 1.3);
      U.circle(ctx, m.x - 5, m.y - 4, 2.4, U.alpha(C.muted, 0.5));
      U.circle(ctx, m.x + 5, m.y + 3, 2.4, U.alpha(C.muted, 0.5));
      U.circle(ctx, m.x + 1, m.y - 7, 2, U.alpha(C.muted, 0.5));
    }
    for (const w of this.wp) U.circle(ctx, w.x, w.y, w.k === 0 ? 4 : 3, w.k === 1 ? U.mix(C.whey, C.ink, 0.25) : C.whey);
    ctx.strokeStyle = C.heat; ctx.lineWidth = 2.2;
    for (const g of this.gmp) { ctx.beginPath(); ctx.moveTo(g.x - Math.cos(g.a) * 4, g.y - Math.sin(g.a) * 4); ctx.lineTo(g.x + Math.cos(g.a) * 4, g.y + Math.sin(g.a) * 4); ctx.stroke(); }
    for (const e of this.enz) {
      const mouth = 0.35 + 0.25 * Math.sin(e.a);
      ctx.beginPath(); ctx.moveTo(e.x, e.y);
      ctx.arc(e.x, e.y, 8, e.a * 0.2 + mouth, e.a * 0.2 + 6.283 - mouth);
      ctx.closePath(); ctx.fillStyle = this.act() > 0.05 ? C.ok : C.muted; ctx.fill();
    }
    ctx.restore();
    // saída
    ctx.fillStyle = C.surface; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.fillRect(388, b.y1 + 8, 24, 30); ctx.strokeRect(388, b.y1 + 8, 24, 30);
    if (this.drain) {
      ctx.fillStyle = U.alpha(C.whey, 0.6); ctx.fillRect(390, b.y1 + 8, 20, 30);
      U.arrow(ctx, 412, b.y1 + 30, 470, b.y1 + 30, C.whey, 3);
      U.txt(ctx, "soro → C-201", 476, b.y1 + 34, { size: 13, font: "mono", color: C.ink });
    }
    let st = "Leite: as micelas se repelem.";
    if (this.rennet && this.act() < 0.05) st = "Coalho inativo nessa temperatura.";
    else if (this.rennet && af < 0.2) st = "Quimosina cortando a κ-caseína…";
    else if (af >= 0.2 && !this.drain) st = this.agg() < 0.3 ? "Frio demais: micelas cortadas mal se juntam." : "Formando a coalhada (gel de caseína).";
    if (this.drain) st = this.drain < 1 ? "Dessorando: o soro escorre." : "Coalhada → queijo. Soro → próxima etapa.";
    U.txt(ctx, st, 70, 22, { size: 14, color: C.ink, weight: 700, base: "middle" });
  },
  readouts() {
    const cf = this.cutFrac(), af = this.aggFrac();
    return [
      { k: "κ-caseína cortada", v: U.fmt(cf * 100), u: "%" },
      { k: "Micelas agregadas", v: U.fmt(af * 100), u: "%" },
      { k: "Atividade do coalho", v: U.fmt(this.act() * 100), u: "%", tone: this.act() < 0.3 ? "warn" : "" },
      { k: "Tempo", v: U.fmt(this.t * 2), u: "min" }
    ];
  }
});

/* ---------- C-201: centrífuga de pratos ---------- */
SCENES.centri = () => ({
  aria: "Corte de uma centrífuga de pratos: gordura migra para o centro e sai como creme; finos de caseína vão para a parede e saem como lodo.",
  controls: [
    { type: "range", id: "rpm", label: "Rotação", min: 0, max: 7000, step: 100, value: 5500, unit: "rpm", fmt: v => U.fmt(v) }
  ],
  init() {
    this.t = 0; this.parts = []; this.sludge = 0; this.flash = 0; this.fatCream = 1; this.fatWhey = 0;
    this.creamN = 0; this.wheyN = 0;
    for (let i = 0; i < 70; i++) this.spawn(true);
  },
  R(y) { if (y < 120) return 70; const u = U.clamp((y - 120) / 270, 0, 1); return 70 + 190 * Math.pow(Math.sin(Math.PI * Math.min(u * 0.9 + 0.1, 1)), 0.55); },
  spawn(any) {
    const r = Math.random(), k = r < 0.42 ? "fat" : r < 0.6 ? "fine" : "liq";
    const y = any ? U.rand(150, 380) : 385;
    this.parts.push({ k, side: Math.random() < 0.5 ? -1 : 1, r: U.rand(45, this.R(y) - 15), y, s: k === "fat" ? U.rand(2.5, 4.5) : k === "fine" ? U.rand(3, 4.5) : 1.8, st: 0 });
  },
  phys() {
    const rpm = this.p.rpm, rcf = 1.118e-5 * 20 * rpm * rpm, g = 9.81 * Math.max(rcf, 1), mu = 0.8e-3;
    const v = (drho, d) => 2 / 9 * drho * g * Math.pow(d / 2, 2) / mu * 1000; // mm/s
    return { rcf, vf: v(-95, 3e-6), vc: v(60, 20e-6) };
  },
  update(dt) {
    const P = this.phys();
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    const vis = mm => Math.sign(mm) * Math.min(110, 34 * Math.log10(1 + Math.abs(mm) * 60));
    const on = this.p.rpm > 300;
    for (const q of this.parts) {
      if (q.st === 0) {
        q.y -= 26 * dt;
        q.r += (Math.random() - 0.5) * 30 * dt;
        if (on) {
          if (q.k === "fat") q.r += vis(P.vf) * dt * 0.6;
          if (q.k === "fine") q.r += vis(P.vc) * dt * 0.6;
          if (q.k === "liq") q.r += 4 * dt;
        }
        const R = this.R(q.y);
        if (q.k === "fine" && q.r > R - 10) { q.st = 2; }
        q.r = U.clamp(q.r, 36, R - 8);
        if (q.k === "fat" && q.r < 44 && on) q.st = 1;
        if (q.y < 128) { q.st = q.k === "fat" && q.r < 60 ? 1 : 3; }
      } else if (q.st === 1) { q.y -= 70 * dt; q.r = U.lerp(q.r, 18, dt * 3); }
      else if (q.st === 2) { q.y += 40 * dt; q.r = this.R(q.y) - 8; if (q.y > 388) { q.dead = true; this.sludge++; } }
      else if (q.st === 3) { q.y -= 60 * dt; q.r = U.lerp(q.r, 120, dt * 3); }
      if ((q.st === 1 || q.st === 3) && q.y < 80) {
        q.dead = true;
        if (q.k === "fat") { if (q.st === 1) this.creamN++; else this.wheyN++; }
      }
    }
    this.parts = this.parts.filter(q => !q.dead);
    while (this.parts.length < 70) this.spawn(false);
    if (this.sludge > 14) { this.sludge = 0; this.flash = 0.6; }
    const tot = this.creamN + this.wheyN;
    if (tot > 30) { this.creamN *= 0.97; this.wheyN *= 0.97; }
  },
  residual() { const tot = this.creamN + this.wheyN; if (tot < 3) return this.p.rpm > 300 ? 0.05 : 0.3; return U.clamp(0.3 * this.wheyN / tot, 0.02, 0.3); },
  draw(ctx, C) {
    const cx = 400, P = this.phys();
    U.legend(ctx, [[C.whey, "glóbulo de gordura"], [C.crystal, "fino de caseína", "sq"], [U.alpha(C.water, 0.8), "soro"]], 40, 34);
    // carcaça
    U.rr(ctx, cx - 300, 62, 600, 372, 18); ctx.fillStyle = U.alpha(C.line, 0.18); ctx.fill(); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.2; ctx.stroke();
    // tambor
    ctx.beginPath();
    for (let y = 110; y <= 395; y += 5) ctx.lineTo(cx + this.R(y), y);
    for (let y = 395; y >= 110; y -= 5) ctx.lineTo(cx - this.R(y), y);
    ctx.closePath(); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; ctx.stroke();
    // pratos
    ctx.strokeStyle = U.alpha(C.muted, 0.55); ctx.lineWidth = 1.4;
    for (let y0 = 170; y0 <= 380; y0 += 18) for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + s * 42, y0); ctx.lineTo(cx + s * (this.R(y0 - 70) - 18), y0 - 72); ctx.stroke();
    }
    // tubo central e eixo
    ctx.fillStyle = C.surface2; ctx.fillRect(cx - 10, 70, 20, 300); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.strokeRect(cx - 10, 70, 20, 300);
    ctx.fillStyle = C.ink; ctx.fillRect(cx - 5, 396, 10, 52); U.rr(ctx, cx - 40, 446, 80, 26, 4); ctx.fill();
    U.txt(ctx, "motor", cx, 463, { size: 11, font: "mono", align: "center", color: C.surface });
    // marcas de rotação no topo
    const w = this.p.rpm / 7000 * 7;
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * 6.283 + this.t * w, x = cx + Math.cos(a) * 66;
      if (Math.sin(a) > 0) U.circle(ctx, x, 112 + Math.sin(a) * 4, 3, C.accent);
    }
    // partículas
    for (const q of this.parts) {
      const x = cx + q.side * q.r;
      if (q.k === "fat") U.circle(ctx, x, q.y, q.s, C.whey, U.mix(C.whey, C.ink, 0.35), 1);
      else if (q.k === "fine") { ctx.fillStyle = C.crystal; ctx.fillRect(x - q.s, q.y - q.s, q.s * 2, q.s * 2); }
      else U.circle(ctx, x, q.y, q.s, U.alpha(C.water, 0.7));
    }
    // lodo
    ctx.fillStyle = U.alpha(C.crystal, 0.5 + this.flash);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * (this.R(380) - 2), 380); ctx.lineTo(cx + s * (this.R(395)), 395); ctx.lineTo(cx + s * (this.R(395) - 26), 395); ctx.closePath(); ctx.fill(); }
    // saídas
    U.arrow(ctx, cx - 20, 92, cx - 150, 92, C.whey, 3); U.txt(ctx, "creme", cx - 156, 96, { size: 13, align: "right", font: "mono" });
    U.arrow(ctx, cx + 120, 92, cx + 250, 92, C.water, 3); U.txt(ctx, "soro clarificado", cx + 256, 96, { size: 13, font: "mono" });
    U.arrow(ctx, cx, 40, cx, 70, C.whey, 3); U.txt(ctx, "soro da T-101", cx + 10, 52, { size: 12, font: "mono", color: C.muted });
    U.txt(ctx, this.flash > 0 ? "descarga de lodo!" : "lodo", cx + 285, 404, { size: 12, font: "mono", align: "right", color: this.flash > 0 ? C.bad : C.muted });
    U.txt(ctx, "v = 2(ρp − ρf)·g·r² / 9μ", 740, 470, { size: 13, font: "mono", align: "right", color: C.muted });
    U.txt(ctx, `${U.fmt(P.rcf)} × g`, 60, 470, { size: 22, font: "display", weight: 700, color: C.accent });
  },
  readouts() {
    const P = this.phys(), res = this.residual();
    return [
      { k: "Aceleração", v: U.fmt(P.rcf), u: "× g" },
      { k: "Glóbulo de gordura sobe a", v: U.fmt(Math.abs(P.vf), Math.abs(P.vf) < 0.1 ? 4 : 2), u: "mm/s" },
      { k: "Gordura no soro", v: U.fmt(res, 2), u: "%", tone: res > 0.12 ? "bad" : res > 0.06 ? "warn" : "ok" }
    ];
  }
});

/* ---------- HX-301: pasteurizador ---------- */
SCENES.pasteur = () => ({
  aria: "Trocador de calor a placas com soro e água quente em contracorrente, e um zoom mostrando bactérias morrendo e proteínas desdobrando com a temperatura.",
  controls: [
    { type: "range", id: "T", label: "Temperatura", min: 60, max: 95, step: 0.5, value: 72, unit: "°C", fmt: v => U.fmt(v, 1) },
    { type: "range", id: "hold", label: "Tempo de retenção", min: 5, max: 30, step: 1, value: 15, unit: "s" }
  ],
  init() {
    this.t = 0;
    this.bac = Array.from({ length: 36 }, (_, i) => ({ a: Math.random() * 6.28, r: Math.sqrt(Math.random()) * 105, ang: Math.random() * 6.28, life: 1, i }));
    this.prot = Array.from({ length: 6 }, (_, i) => ({ x: 560 + (i % 3) * 70, y: 150 + Math.floor(i / 3) * 150, u: 0 }));
  },
  model() {
    const T = this.p.T, h = this.p.hold;
    const D = 2 * Math.pow(10, (72 - T) / 7);
    const lr = h / D;
    const den = 1 - Math.exp(-0.001 * Math.pow(10, (T - 72) / 9) * h);
    return { lr, den };
  },
  update(dt) {
    this.t += dt;
    const { lr, den } = this.model();
    const alive = Math.round(36 * Math.min(1, Math.pow(10, -lr)));
    this.bac.forEach((b, i) => { const target = i < alive ? 1 : 0; b.life += (target - b.life) * Math.min(1, dt * 2.5); b.ang += dt * (0.6 + b.life); });
    const nd = den * 6;
    this.prot.forEach((p, i) => { const target = U.clamp(nd - i, 0, 1); p.u += (target - p.u) * Math.min(1, dt * 2); });
  },
  draw(ctx, C) {
    const T = this.p.T, { lr, den } = this.model();
    // trocador de placas
    const x0 = 60, x1 = 400, y0 = 110, y1 = 360, n = 9;
    U.rr(ctx, x0 - 12, y0 - 20, x1 - x0 + 24, y1 - y0 + 40, 6); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    const cw = (x1 - x0) / (n + 1);
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * cw;
      if (i < n) {
        const hot = i % 2 === 1;
        ctx.fillStyle = U.alpha(hot ? C.heat : C.whey, hot ? 0.18 : 0.22);
        ctx.fillRect(x + 3, y0, cw - 6, y1 - y0);
        ctx.strokeStyle = hot ? C.heat : U.mix(C.whey, C.ink, 0.3); ctx.lineWidth = 2;
        for (let k = 0; k < 5; k++) {
          const ph = ((this.t * 40 * (hot ? 1 : -1)) % 50 + 50) % 50;
          const yy = y0 + 10 + ((k * 50 + ph) % (y1 - y0 - 20));
          ctx.beginPath(); const dir = hot ? 1 : -1;
          ctx.moveTo(x + cw * 0.25, yy - 5 * dir); ctx.lineTo(x + cw / 2, yy + 5 * dir); ctx.lineTo(x + cw * 0.75, yy - 5 * dir); ctx.stroke();
        }
      }
      ctx.fillStyle = C.ink; ctx.fillRect(x - 1.5, y0 - 6, 3, y1 - y0 + 12);
    }
    U.txt(ctx, "placas de inox (~0,5 mm)", x0, y0 - 32, { size: 12, font: "mono", color: C.muted });
    U.arrow(ctx, x0 - 50, y1 - 20, x0 - 14, y1 - 20, C.whey, 3); U.txt(ctx, "soro 8 °C", x0 - 52, y1 - 30, { size: 12, font: "mono" });
    U.arrow(ctx, x1 + 14, y0 + 20, x1 + 60, y0 + 20, C.whey, 3); U.txt(ctx, `${U.fmt(T, 1)} °C`, x1 + 18, y0 + 10, { size: 12, font: "mono", weight: 600 });
    U.arrow(ctx, x1 + 60, y1 - 20, x1 + 14, y1 - 20, C.heat, 3); U.txt(ctx, `água ${U.fmt(T + 4, 0)} °C`, x1 + 16, y1 - 30, { size: 12, font: "mono" });
    // tubo de retenção
    ctx.strokeStyle = U.mix(C.whey, C.heat, U.clamp((T - 60) / 35, 0, 1)); ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(60, 408);
    for (let k = 0; k < 11; k++) {
      const x = 60 + k * 28;
      if (k % 2 === 0) { ctx.lineTo(x, 444); ctx.arc(x + 14, 444, 14, Math.PI, 0, true); }
      else { ctx.lineTo(x, 408); ctx.arc(x + 14, 408, 14, Math.PI, 0, false); }
    }
    ctx.stroke(); ctx.lineCap = "butt";
    U.txt(ctx, `tubo de retenção · ${this.p.hold} s a ${U.fmt(T, 1)} °C`, 60, 486, { size: 13, font: "mono", color: C.ink });
    // zoom
    const zx = 625, zy = 225, zr = 125;
    ctx.save(); ctx.beginPath(); ctx.arc(zx, zy, zr, 0, 6.283); ctx.fillStyle = C.surface; ctx.fill(); ctx.clip();
    for (const b of this.bac) {
      const x = zx + Math.cos(b.a) * b.r, y = zy + Math.sin(b.a) * b.r;
      ctx.save(); ctx.translate(x, y); ctx.rotate(b.ang);
      U.rr(ctx, -9, -3.5, 18, 7, 3.5); ctx.fillStyle = b.life > 0.5 ? U.alpha(C.ok, 0.35 + 0.6 * b.life) : U.alpha(C.muted, 0.25 + 0.3 * b.life); ctx.fill();
      ctx.restore();
    }
    for (const [i, p] of this.prot.entries()) {
      const x = zx - 70 + (i % 3) * 70, y = zy - 50 + Math.floor(i / 3) * 100;
      ctx.strokeStyle = p.u > 0.5 ? C.heat : C.protein; ctx.lineWidth = 2.6; ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const s = k / 40;
        const fx = Math.cos(s * 18) * (6 + s * 10), fy = Math.sin(s * 18) * (6 + s * 10) * 0.8;
        const ux = (s - 0.5) * 60, uy = Math.sin(s * 14 + i) * 5;
        const xx = x + U.lerp(fx, ux, p.u), yy = y + U.lerp(fy, uy, p.u);
        k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
    U.circle(ctx, zx, zy, zr, null, C.ink, 2);
    U.txt(ctx, "zoom: bactérias e β-lactoglobulina", zx, zy + zr + 22, { size: 12, font: "mono", align: "center", color: C.muted });
    U.legend(ctx, [[C.ok, "bactéria viva", "sq"], [C.muted, "morta", "sq"], [C.protein, "proteína dobrada", "line"], [C.heat, "desnaturada", "line"]], 60, 34, { size: 11 });
    U.txt(ctx, lr > 5 ? "seguro" : "sobram bactérias", 470, 470, { size: 15, weight: 700, color: lr > 5 ? C.ok : C.bad });
    U.txt(ctx, den > 0.15 ? "proteína sofrendo" : "proteína preservada", 780, 470, { size: 15, weight: 700, align: "right", color: den > 0.15 ? C.bad : C.ok });
  },
  readouts() {
    const { lr, den } = this.model();
    const surv = 1e6 * Math.pow(10, -lr);
    return [
      { k: "Redução de Listeria", v: lr > 12 ? "> 12" : U.fmt(lr, 1), u: "log", tone: lr >= 5 ? "ok" : "bad" },
      { k: "Sobreviventes (de 1 milhão)", v: surv < 0.01 ? "< 0,01" : U.fmt(surv, surv < 10 ? 2 : 0), tone: lr >= 5 ? "ok" : "bad" },
      { k: "β-Lg desnaturada", v: U.fmt(den * 100, 1), u: "%", tone: den > 0.15 ? "bad" : den > 0.05 ? "warn" : "ok" }
    ];
  }
});

/* ---------- UF-401: ultrafiltração + diafiltração ---------- */
SCENES.uf = () => ({
  aria: "Canal de ultrafiltração: água, lactose e minerais atravessam a membrana; proteínas ficam. Um tanque mostra volume e composição.",
  CUTS: [1, 5, 10, 50, 100],
  controls: [
    { type: "range", id: "tmp", label: "Pressão transmembrana", min: 0.5, max: 6, step: 0.1, value: 2.5, unit: "bar", fmt: v => U.fmt(v, 1) },
    { type: "range", id: "cut", label: "Corte da membrana", min: 0, max: 4, step: 1, value: 2, unit: "kDa", fmt: v => String([1, 5, 10, 50, 100][v]) },
    { type: "toggle", id: "df", label: "Diafiltração (água)" },
    { type: "button", id: "reset", label: "Reiniciar" }
  ],
  init() {
    this.V = 1000; this.m = { p: 7, l: 48, mi: 6 }; this.water = 0; this.parts = []; this.acc = 0; this.t = 0; this.J = 0; this.Jp = 0; this.Jl = 0;
    this.df = false;
  },
  onButton(id) { if (id === "reset") this.init(); if (id === "df") this.df = !this.df; },
  ctrlState(id) { if (id === "df") return { pressed: this.df }; },
  sieve(mw) { const co = this.CUTS[this.p.cut]; return 1 / (1 + Math.pow(mw / (0.5 * co), 3)); },
  protS() { return [[0.5, 36], [0.2, 14], [0.05, 66], [0.1, 150], [0.15, 30]].reduce((a, [f, mw]) => a + f * this.sieve(mw), 0); },
  conc() { return this.m.p / this.V * 100; },
  update(dt) {
    this.t += dt;
    const dth = dt / 60;
    const c = Math.max(this.conc(), 0.3);
    this.Jp = 22 * this.p.tmp;
    this.Jl = 16 * Math.log(25 / c);
    let J = Math.min(this.Jp, this.Jl);
    if (!this.df && this.V <= 40) J = 0;
    this.J = J;
    const dV = J * 60 * dth;
    if (dV > 0) {
      const sl = this.sieve(0.342), sm = 0.8 * this.sieve(0.1), sp = this.protS();
      this.m.l -= sl * this.m.l / this.V * dV;
      this.m.mi -= sm * this.m.mi / this.V * dV;
      this.m.p -= sp * this.m.p / this.V * dV;
      if (this.df) this.water += dV; else this.V -= dV;
    }
    // partículas
    this.acc += dt * 26;
    while (this.acc > 1) { this.acc--; this.spawn(); }
    const gel = this.gel();
    const drift = 6 + 7 * this.p.tmp;
    for (const q of this.parts) {
      if (!q.perm) {
        q.x += (q.slow ? 70 : 135) * dt;
        q.y += (drift * (q.k === "w" ? 1.6 : 1) + U.gauss() * 40) * dt;
        if (q.y < 104 + q.r) q.y = 104 + q.r;
        const lim = 254 - q.r - (q.k === "p" ? gel : 0);
        if (q.y > lim) {
          const s = q.k === "w" ? 1 : q.k === "l" ? this.sieve(0.342) : q.k === "m" ? 0.8 * this.sieve(0.1) : this.sieve(q.mw);
          if (!q.tested) { q.tested = true; q.pass = Math.random() < s * (J > 0 ? 1 : 0); }
          if (q.pass) { q.perm = true; q.y = 266; }
          else { q.y = lim; q.slow = q.k === "p"; q.tested = Math.random() < 0.5 ? q.tested : false; }
        }
        if (q.x > 772) q.dead = true;
      } else {
        q.x += 55 * dt; q.y += 45 * dt;
        if (q.y > 388 || q.x > 772) q.dead = true;
      }
    }
    this.parts = this.parts.filter(q => !q.dead);
  },
  gel() { return U.clamp(Math.max(0, this.Jp / Math.max(this.Jl, 1) - 1) * 9 + this.conc() / 25 * 8, 0, 20); },
  spawn() {
    const c = this.conc();
    const w = { w: 3, l: 3 * (this.m.l / this.V) / 0.048, m: 0.8 * (this.m.mi / this.V) / 0.006, p: Math.min(6, 1.3 * Math.pow(c / 0.7, 0.6)) };
    const tot = w.w + w.l + w.m + w.p;
    let r = Math.random() * tot, k = "w";
    for (const key of ["w", "l", "m", "p"]) { if (r < w[key]) { k = key; break; } r -= w[key]; }
    let mw = 0, rad = 2, sub = 0;
    if (k === "l") rad = 3.5;
    if (k === "m") rad = 2;
    if (k === "p") {
      const x = Math.random();
      [mw, rad, sub] = x < 0.55 ? [36, 7.5, 0] : x < 0.8 ? [14, 5.5, 1] : x < 0.9 ? [66, 9.5, 2] : [150, 12, 3];
    }
    this.parts.push({ k, mw, r: rad, sub, x: 200, y: U.rand(110, 245), slow: false });
  },
  draw(ctx, C) {
    const prot = this.m.p / (this.m.p + this.m.l + this.m.mi) * 100;
    // tanque
    const tx = 30, ty = 120, tw = 112, th = 270;
    U.txt(ctx, "TANQUE", tx, ty - 14, { size: 12, font: "mono", color: C.muted });
    U.rr(ctx, tx, ty, tw, th, 10); ctx.fillStyle = C.surface; ctx.fill();
    const lv = U.clamp(this.V / 1000, 0, 1) * (th - 8);
    ctx.save(); U.rr(ctx, tx, ty, tw, th, 10); ctx.clip();
    ctx.fillStyle = U.alpha(C.whey, 0.18 + 0.5 * U.clamp(prot / 90, 0, 1)); ctx.fillRect(tx, ty + th - lv - 4, tw, lv + 4);
    ctx.restore();
    U.rr(ctx, tx, ty, tw, th, 10); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    U.txt(ctx, `${U.fmt(this.V)} L`, tx + tw / 2, ty + th - 14, { size: 15, font: "mono", align: "center", weight: 600 });
    // composição (extrato seco)
    const bx = 150, by = ty, bh = th, tot = this.m.p + this.m.l + this.m.mi;
    let yy = by + bh;
    for (const [v, col] of [[this.m.p, C.protein], [this.m.l, U.mix(C.surface2, C.ink, 0.25)], [this.m.mi, C.crystal]]) {
      const h = v / tot * bh; ctx.fillStyle = col; ctx.fillRect(bx, yy - h, 14, h); yy -= h;
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(bx, by, 14, bh);
    U.txt(ctx, `${U.fmt(prot, 0)}%`, bx + 7, by + bh + 18, { size: 13, font: "mono", align: "center", weight: 600, color: C.protein });
    U.txt(ctx, "proteína", bx + 7, by + bh + 32, { size: 10, font: "mono", align: "center", color: C.muted });
    if (this.df) { U.arrow(ctx, tx + 30, 62, tx + 30, ty - 4, C.water, 3); U.txt(ctx, "água", tx + 38, 74, { size: 12, font: "mono", color: C.water }); }
    // módulo
    const mx0 = 190, mx1 = 780;
    U.rr(ctx, mx0, 96, mx1 - mx0, 300, 12); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = U.alpha(C.water, 0.06); ctx.fillRect(mx0 + 2, 260, mx1 - mx0 - 4, 134);
    const gel = this.gel();
    ctx.fillStyle = U.alpha(C.protein, 0.25); ctx.fillRect(mx0 + 2, 254 - gel, mx1 - mx0 - 4, gel);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.setLineDash([12, 4]); ctx.beginPath(); ctx.moveTo(mx0, 257); ctx.lineTo(mx1, 257); ctx.stroke(); ctx.setLineDash([]);
    U.txt(ctx, `membrana · corte ${this.CUTS[this.p.cut]} kDa`, mx0 + 10, 280, { size: 12, font: "mono", color: C.muted });
    U.txt(ctx, "PERMEADO", mx0 + 10, 386, { size: 12, font: "mono", color: C.water });
    U.txt(ctx, "RETENTADO (fluxo tangencial →)", mx0 + 10, 90, { size: 12, font: "mono", color: C.muted });
    if (gel > 6) U.txt(ctx, "camada-gel", mx1 - 10, 248 - gel, { size: 11, font: "mono", align: "right", color: C.protein });
    // tubos
    ctx.strokeStyle = C.muted; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tx + tw, ty + th - 30); ctx.lineTo(172, ty + th - 30); ctx.lineTo(172, 175); ctx.lineTo(mx0, 175); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx1, 130); ctx.lineTo(mx1 + 10, 130); ctx.lineTo(mx1 + 10, 50); ctx.lineTo(tx + tw - 20, 50); ctx.lineTo(tx + tw - 20, ty); ctx.stroke();
    U.txt(ctx, "volta ao tanque", 480, 44, { size: 11, font: "mono", align: "center", color: C.muted });
    U.arrow(ctx, mx1 - 30, 400, mx1 - 30, 440, C.water, 3); U.txt(ctx, "permeado: lactose + sais", mx1 - 40, 452, { size: 12, font: "mono", align: "right", color: C.water });
    // partículas
    const pc = [C.protein, U.mix(C.protein, C.heat, 0.4), U.mix(C.protein, C.ink, 0.35), U.mix(C.protein, C.ok, 0.4)];
    for (const q of this.parts) {
      if (q.k === "w") U.circle(ctx, q.x, q.y, 1.8, U.alpha(C.water, 0.75));
      else if (q.k === "l") { ctx.fillStyle = U.mix(C.surface2, C.ink, 0.35); ctx.fillRect(q.x - 3, q.y - 3, 6, 6); }
      else if (q.k === "m") U.circle(ctx, q.x, q.y, 2.2, C.crystal);
      else U.circle(ctx, q.x, q.y, q.r, U.alpha(pc[q.sub], 0.85), pc[q.sub], 1);
    }
    U.legend(ctx, [[C.water, "água"], [U.mix(C.surface2, C.ink, 0.35), "lactose 0,34 kDa", "sq"], [C.crystal, "minerais"], [pc[1], "α-La 14"], [pc[0], "β-Lg 36"], [pc[2], "BSA 66"], [pc[3], "IgG 150"]], 190, 470, { size: 11 });
    let msg = "";
    if (!this.df && this.V <= 40) msg = "Concentração máxima. Ligue a diafiltração para lavar a lactose.";
    else if (this.Jp > this.Jl * 1.15) msg = "Pressão acima do fluxo limite: só engrossa a camada-gel.";
    else if (this.protS() > 0.1) msg = "Membrana aberta demais: proteína escapando.";
    if (msg) U.txt(ctx, msg, 780, 24, { size: 13, align: "right", weight: 700, color: C.warn, base: "middle" });
  },
  readouts() {
    const prot = this.m.p / (this.m.p + this.m.l + this.m.mi) * 100;
    const lost = (1 - this.m.p / 7) * 100;
    let prod = prot >= 80 ? "WPC 80" : prot >= 34 ? "WPC 34+" : "soro";
    return [
      { k: "Proteína (extrato seco)", v: U.fmt(prot, 1), u: "%", tone: prot >= 80 ? "ok" : "" },
      { k: "Produto", v: prod, tone: prot >= 80 ? "ok" : "" },
      { k: "Fator de concentração", v: U.fmt(1000 / this.V, 1), u: "×" },
      { k: "Lactose removida", v: U.fmt((1 - this.m.l / 48) * 100, 1), u: "%" },
      { k: "Fluxo", v: U.fmt(this.J, 1), u: "L/m²·h" },
      { k: "Proteína perdida", v: U.fmt(lost, 1), u: "%", tone: lost > 5 ? "bad" : lost > 2 ? "warn" : "ok" },
      { k: "Água de diafiltração", v: U.fmt(this.water / Math.max(this.V, 1), 1), u: "volumes" }
    ];
  }
});

/* ---------- IX-501: troca iônica ---------- */
SCENES.ix = () => ({
  aria: "Esfera de resina com cargas negativas; proteínas positivas em pH ácido grudam, lactose passa; na eluição as proteínas se soltam.",
  controls: [
    { type: "range", id: "pH", label: "pH do soro na carga", min: 3, max: 7, step: 0.1, value: 4.0, unit: "", fmt: v => U.fmt(v, 1) },
    { type: "toggle", id: "elute", label: "Eluir (pH 7,5 + sal)" },
    { type: "button", id: "reset", label: "Reiniciar" }
  ],
  bx: 430, by: 250, br: 96, CAP: 26,
  P: { blg: { pI: 5.2, Z: 14, r: 8, n: "β-Lg" }, ala: { pI: 4.5, Z: 10, r: 6, n: "α-La" }, gmp: { pI: 3.5, Z: 8, r: 5, n: "GMP" } },
  init() { this.parts = []; this.acc = 0; this.elute = false; this.stuck = 0; this.eluate = 0; this.lacOut = 0; this.t = 0; },
  onButton(id) { if (id === "reset") this.init(); if (id === "elute") this.elute = !this.elute; },
  ctrlState(id) { if (id === "elute") return { pressed: this.elute }; },
  pH() { return this.elute ? 7.5 : this.p.pH; },
  z(k, pH) { if (k === "lac") return 0; const q = this.P[k]; return q.Z * Math.tanh((q.pI - pH) / 1.1); },
  update(dt) {
    this.t += dt;
    if (!this.elute) {
      this.acc += dt * 7;
      while (this.acc > 1) {
        this.acc--;
        const r = Math.random(), k = r < 0.45 ? "lac" : r < 0.75 ? "blg" : r < 0.9 ? "ala" : "gmp";
        this.parts.push({ k, x: 90, y: U.rand(90, 400), vx: 70, vy: 0, st: 0 });
      }
    }
    const pH = this.pH();
    let n = 0;
    for (const q of this.parts) if (q.st === 1) n++;
    this.stuck = n;
    for (const q of this.parts) {
      const z = this.z(q.k, pH), rad = q.k === "lac" ? 4 : this.P[q.k].r;
      if (q.st === 1) {
        if (z < 0.5) { q.st = 2; const a = q.a; q.vx = Math.cos(a) * 80 + 40; q.vy = Math.sin(a) * 80; }
        else { q.x = this.bx + Math.cos(q.a) * (this.br + rad); q.y = this.by + Math.sin(q.a) * (this.br + rad); continue; }
      }
      const dx = this.bx - q.x, dy = this.by - q.y, d = Math.hypot(dx, dy);
      if (q.k !== "lac") {
        const f = z * 2200 / Math.max(d * d / 100, 30);
        q.vx += dx / d * f * dt * (q.st === 2 ? 0 : 1); q.vy += dy / d * f * dt * (q.st === 2 ? 0 : 1);
        if (q.st === 2 && z < 0) { q.vx -= dx / d * 120 * dt; q.vy -= dy / d * 120 * dt; }
      }
      q.vx += (70 - q.vx) * dt * 1.2; q.vy += (U.gauss() * 30 - q.vy * 0.8) * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (d < this.br + rad) {
        if (q.k !== "lac" && z > 1.2 && this.stuck < this.CAP && q.st === 0) { q.st = 1; q.a = Math.atan2(q.y - this.by, q.x - this.bx); this.stuck++; }
        else { const a = Math.atan2(q.y - this.by, q.x - this.bx); q.x = this.bx + Math.cos(a) * (this.br + rad); q.y = this.by + Math.sin(a) * (this.br + rad); q.vy += Math.sin(a) * 40; }
      }
      q.y = U.clamp(q.y, 84, 410);
      if (q.x > 770) { q.dead = true; if (q.st === 2) this.eluate++; else if (q.k === "lac") this.lacOut++; }
    }
    this.parts = this.parts.filter(q => !q.dead);
  },
  draw(ctx, C) {
    const pH = this.pH();
    // coluna miniatura
    U.rr(ctx, 26, 90, 40, 300, 14); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 26; i++) U.circle(ctx, 36 + (i % 3) * 10, 104 + Math.floor(i / 3) * 31, 4.5, U.alpha(C.crystal, 0.6));
    U.txt(ctx, "coluna", 46, 410, { size: 11, font: "mono", align: "center", color: C.muted });
    ctx.strokeStyle = U.alpha(C.muted, 0.6); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(66, 200); ctx.lineTo(this.bx - this.br, this.by - 60); ctx.moveTo(66, 230); ctx.lineTo(this.bx - this.br, this.by + 60); ctx.stroke(); ctx.setLineDash([]);
    // esfera
    const g = ctx.createRadialGradient(this.bx - 30, this.by - 30, 10, this.bx, this.by, this.br);
    g.addColorStop(0, U.alpha(C.crystal, 0.25)); g.addColorStop(1, U.alpha(C.crystal, 0.6));
    U.circle(ctx, this.bx, this.by, this.br, g, C.ink, 2);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * 6.283, x = this.bx + Math.cos(a) * (this.br - 12), y = this.by + Math.sin(a) * (this.br - 12);
      U.txt(ctx, "−", x, y, { size: 15, align: "center", base: "middle", color: C.water, weight: 700 });
    }
    U.txt(ctx, "resina", this.bx, this.by - 6, { size: 14, align: "center", font: "mono", weight: 600 });
    U.txt(ctx, "–SO₃⁻", this.bx, this.by + 14, { size: 12, align: "center", font: "mono", color: C.muted });
    // partículas
    for (const q of this.parts) {
      if (q.k === "lac") { ctx.fillStyle = U.mix(C.surface2, C.ink, 0.35); ctx.fillRect(q.x - 3.5, q.y - 3.5, 7, 7); continue; }
      const P = this.P[q.k], z = this.z(q.k, pH);
      const col = q.k === "gmp" ? C.heat : q.k === "ala" ? U.mix(C.protein, C.heat, 0.4) : C.protein;
      U.circle(ctx, q.x, q.y, P.r, U.alpha(col, 0.85), col, 1);
      U.txt(ctx, z > 0.5 ? "+" : z < -0.5 ? "−" : "", q.x, q.y + 0.5, { size: P.r + 4, align: "center", base: "middle", color: C.surface, weight: 700 });
    }
    // entrada/saída
    U.arrow(ctx, 76, 450, 150, 450, this.elute ? C.water : C.whey, 3);
    U.txt(ctx, this.elute ? "eluente pH 7,5 + sal" : `soro pH ${U.fmt(this.p.pH, 1)}`, 160, 455, { size: 13, font: "mono" });
    U.arrow(ctx, 640, 450, 720, 450, C.muted, 3);
    U.txt(ctx, this.elute ? "→ eluato (proteína)" : "→ lactose, minerais", 726, 438, { size: 12, font: "mono", align: "right", color: C.muted });
    // régua de pI
    const rx0 = 520, rx1 = 780, ry = 60, sx = v => rx0 + (v - 2) / 7 * (rx1 - rx0);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rx0, ry); ctx.lineTo(rx1, ry); ctx.stroke();
    for (let v = 2; v <= 9; v++) { ctx.beginPath(); ctx.moveTo(sx(v), ry - 3); ctx.lineTo(sx(v), ry + 3); ctx.stroke(); U.txt(ctx, String(v), sx(v), ry + 16, { size: 10, font: "mono", align: "center", color: C.muted }); }
    for (const [v, s, col, dy] of [[3.5, "GMP", C.heat, 10], [4.5, "α-La", U.mix(C.protein, C.heat, 0.4), 22], [5.2, "β-Lg", C.protein, 10]]) {
      U.circle(ctx, sx(v), ry, 4, col); U.txt(ctx, s, sx(v), ry - dy, { size: 10, font: "mono", align: "center", color: col });
    }
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.moveTo(sx(pH), ry + 22); ctx.lineTo(sx(pH) - 6, ry + 32); ctx.lineTo(sx(pH) + 6, ry + 32); ctx.fill();
    U.txt(ctx, "pI (ponto isoelétrico) · ▲ pH atual", rx0, ry - 40, { size: 11, font: "mono", color: C.muted });
    U.legend(ctx, [[C.protein, "β-Lg"], [U.mix(C.protein, C.heat, 0.4), "α-La"], [C.heat, "GMP"], [U.mix(C.surface2, C.ink, 0.35), "lactose", "sq"]], 90, 40, { size: 12 });
    if (this.stuck >= this.CAP && !this.elute) U.txt(ctx, "Resina saturada: hora de eluir.", 430, 480, { size: 13, align: "center", weight: 700, color: C.warn });
  },
  readouts() {
    const pH = this.pH(), z = this.z("blg", pH);
    return [
      { k: "pH", v: U.fmt(pH, 1) },
      { k: "Carga da β-Lg", v: (z > 0 ? "+" : "") + U.fmt(z, 0) },
      { k: "Ocupação da resina", v: U.fmt(this.stuck / this.CAP * 100), u: "%" },
      { k: "Proteína recolhida", v: U.fmt(this.eluate), u: "partíc.", tone: this.eluate > 0 ? "ok" : "" },
      { k: "Lactose no eluato", v: "0", u: "partíc." }
    ];
  }
});

/* ---------- R-551: hidrólise enzimática ---------- */
SCENES.hydro = () => ({
  aria: "Proteases cortando cadeias de proteína em peptídeos menores; o grau de hidrólise e o amargor sobem.",
  controls: [
    { type: "range", id: "T", label: "Temperatura", min: 30, max: 80, step: 1, value: 55, unit: "°C" },
    { type: "button", id: "stop", label: "Inativar (aquecer a 85 °C)", primary: true },
    { type: "button", id: "reset", label: "Reiniciar" }
  ],
  init() {
    this.t = 0; this.on = true; this.cuts = 0; this.total = 0;
    this.frags = [];
    for (let i = 0; i < 6; i++) {
      const beads = Array.from({ length: 16 }, () => Math.random() < 0.38);
      this.total += beads.length - 1;
      this.frags.push({ beads, x: 140 + (i % 3) * 200, y: 150 + Math.floor(i / 3) * 170, vx: 0, vy: 0, folded: true, u: 0, rot: Math.random() * 6, ph: Math.random() * 6 });
    }
    this.enz = Array.from({ length: 5 }, () => ({ x: U.rand(80, 720), y: U.rand(90, 420), vx: 0, vy: 0, a: 0, cd: 0 }));
  },
  onButton(id) { if (id === "reset") this.init(); if (id === "stop") this.on = false; },
  ctrlState(id) { if (id === "stop") return { disabled: !this.on }; },
  act() { if (!this.on) return 0; const T = this.p.T; return Math.exp(-Math.pow((T - 57) / 11, 2)) * (T > 68 ? Math.exp(-(T - 68) / 3) : 1); },
  pos(f) {
    const n = f.beads.length, pts = [];
    for (let k = 0; k < n; k++) {
      const s = k / Math.max(n - 1, 1);
      const a = s * 9 + f.rot, rr = 8 + s * 26;
      const fx = Math.cos(a) * rr, fy = Math.sin(a) * rr;
      const ux = (k - (n - 1) / 2) * 13 * Math.cos(f.rot * 0.2), uy = (k - (n - 1) / 2) * 13 * Math.sin(f.rot * 0.2) + Math.sin(k * 0.9 + f.ph) * 6;
      pts.push([f.x + U.lerp(fx, ux, f.u), f.y + U.lerp(fy, uy, f.u)]);
    }
    return pts;
  },
  update(dt) {
    this.t += dt;
    const act = this.act();
    for (const f of this.frags) {
      f.vx += U.gauss() * 30 * Math.sqrt(dt); f.vy += U.gauss() * 30 * Math.sqrt(dt);
      f.vx *= Math.exp(-2 * dt); f.vy *= Math.exp(-2 * dt);
      f.x = U.clamp(f.x + f.vx * dt, 70, 730); f.y = U.clamp(f.y + f.vy * dt, 90, 420);
      if (!f.folded) f.u = Math.min(1, f.u + dt * 1.5);
      f.rot += dt * 0.15;
    }
    for (const e of this.enz) {
      e.vx += U.gauss() * 160 * Math.sqrt(dt); e.vy += U.gauss() * 160 * Math.sqrt(dt);
      e.vx *= Math.exp(-1.5 * dt); e.vy *= Math.exp(-1.5 * dt);
      e.x = U.clamp(e.x + e.vx * dt * (0.3 + act), 60, 740); e.y = U.clamp(e.y + e.vy * dt * (0.3 + act), 80, 430);
      e.a += dt * 6 * act; e.cd -= dt;
      if (e.cd > 0 || act < 0.03) continue;
      for (let i = 0; i < this.frags.length; i++) {
        const f = this.frags[i];
        if (f.beads.length < 3) continue;
        const pts = this.pos(f);
        for (let k = 1; k < pts.length - 1; k++) {
          if (Math.hypot(pts[k][0] - e.x, pts[k][1] - e.y) < 14) {
            const a = { ...f, beads: f.beads.slice(0, k + 1), folded: false, x: pts[Math.floor(k / 2)][0], y: pts[Math.floor(k / 2)][1], ph: Math.random() * 6 };
            const b = { ...f, beads: f.beads.slice(k + 1), folded: false, x: pts[Math.floor((k + pts.length) / 2)][0], y: pts[Math.floor((k + pts.length) / 2)][1], ph: Math.random() * 6 };
            a.vx = -20; b.vx = 20;
            this.frags.splice(i, 1, a, b);
            this.cuts++;
            e.cd = 0.5 / Math.max(act, 0.1);
            break;
          }
        }
        if (e.cd > 0) break;
      }
    }
  },
  draw(ctx, C) {
    U.legend(ctx, [[C.heat, "aminoácido hidrofóbico (amargo)"], [C.protein, "aminoácido polar"], [C.ok, "protease"]], 60, 36);
    U.rr(ctx, 50, 66, 700, 384, 16); ctx.fillStyle = U.alpha(C.whey, 0.08); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    for (const f of this.frags) {
      const pts = this.pos(f);
      ctx.strokeStyle = U.alpha(C.muted, 0.8); ctx.lineWidth = 2; ctx.beginPath();
      pts.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      pts.forEach((p, k) => {
        const hyd = f.beads[k];
        const exposed = !f.folded || k > f.beads.length * 0.55;
        U.circle(ctx, p[0], p[1], 5.5, hyd ? (exposed ? C.heat : U.alpha(C.heat, 0.45)) : C.protein, C.surface, 1);
      });
    }
    for (const e of this.enz) {
      const mouth = 0.4 + 0.3 * Math.sin(e.a);
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, 11, e.a * 0.3 + mouth, e.a * 0.3 + 6.283 - mouth); ctx.closePath();
      ctx.fillStyle = this.act() > 0.03 ? C.ok : C.muted; ctx.fill();
    }
    const dh = this.cuts / this.total * 100;
    U.txt(ctx, !this.on ? "Enzima inativada: o grau de hidrólise ficou fixo." : this.act() < 0.1 ? "Fora da faixa da enzima: quase nada acontece." : "Proteases cortando ligações peptídicas…", 750, 36, { size: 13, align: "right", weight: 700, base: "middle", color: !this.on ? C.ok : C.ink });
    // amargor
    const bit = U.clamp(dh / 30, 0, 1);
    U.txt(ctx, "AMARGOR", 60, 478, { size: 11, font: "mono", color: C.muted });
    U.rr(ctx, 130, 468, 240, 12, 6); ctx.fillStyle = C.surface2; ctx.fill();
    U.rr(ctx, 130, 468, 240 * bit, 12, 6); ctx.fillStyle = U.mix(C.whey, C.heat, bit); ctx.fill();
  },
  readouts() {
    const dh = this.cuts / this.total * 100;
    return [
      { k: "Grau de hidrólise", v: U.fmt(dh, 1), u: "%" },
      { k: "Peptídeos", v: U.fmt(this.frags.length) },
      { k: "Atividade da enzima", v: U.fmt(this.act() * 100), u: "%", tone: !this.on ? "" : this.act() < 0.3 ? "warn" : "ok" },
      { k: "Amargor", v: U.fmt(U.clamp(dh / 3, 0, 10), 1), u: "/10", tone: dh > 20 ? "bad" : dh > 10 ? "warn" : "" }
    ];
  }
});

/* ---------- EV-601: evaporador a vácuo ---------- */
SCENES.evap = () => ({
  aria: "Evaporador de filme descendente: menos pressão faz a água ferver a temperatura mais baixa.",
  controls: [
    { type: "range", id: "P", label: "Pressão absoluta", min: 50, max: 1013, step: 1, value: 160, unit: "mbar", fmt: v => U.fmt(v) }
  ],
  init() { this.t = 0; this.bub = []; },
  Tb(Pm) { const mm = Pm * 0.750062; return 1730.63 / (8.07131 - Math.log10(mm)) - 233.426; },
  update(dt) {
    this.t += dt;
    const T = this.Tb(this.p.P);
    if (Math.random() < dt * 18) this.bub.push({ x: 120 + Math.floor(Math.random() * 4) * 46 + 23, y: 400, r: U.rand(2, 4) });
    for (const b of this.bub) { b.y -= dt * (90 + (100 - T)); b.x += Math.sin(this.t * 5 + b.y * 0.1) * 0.3; }
    this.bub = this.bub.filter(b => b.y > 82);
  },
  draw(ctx, C) {
    const T = this.Tb(this.p.P);
    // casco com vapor
    U.rr(ctx, 100, 70, 200, 350, 10); ctx.fillStyle = U.alpha(C.heat, 0.1); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    U.arrow(ctx, 40, 140, 98, 140, C.heat, 3); U.txt(ctx, "vapor de", 14, 116, { size: 11, font: "mono" }); U.txt(ctx, "aquecimento", 14, 129, { size: 11, font: "mono" });
    for (let i = 0; i < 4; i++) {
      const x = 120 + i * 46;
      ctx.fillStyle = C.surface; ctx.fillRect(x, 80, 30, 330); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.strokeRect(x, 80, 30, 330);
      ctx.strokeStyle = C.whey; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -this.t * 60;
      ctx.beginPath(); ctx.moveTo(x + 3, 82); ctx.lineTo(x + 3, 408); ctx.moveTo(x + 27, 82); ctx.lineTo(x + 27, 408); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const b of this.bub) U.circle(ctx, b.x, b.y, b.r, null, U.alpha(C.water, 0.8), 1.3);
    U.txt(ctx, "filme de concentrado", 200, 440, { size: 12, font: "mono", align: "center", color: C.muted });
    U.arrow(ctx, 200, 30, 200, 66, C.whey, 3); U.txt(ctx, "entra concentrado", 210, 42, { size: 12, font: "mono" });
    U.arrow(ctx, 200, 422, 200, 470, C.whey, 3); U.txt(ctx, "sai mais concentrado", 210, 466, { size: 12, font: "mono" });
    // condensador e vácuo
    ctx.strokeStyle = C.muted; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(300, 100); ctx.lineTo(360, 100); ctx.stroke();
    U.rr(ctx, 360, 70, 70, 120, 8); ctx.fillStyle = U.alpha(C.water, 0.15); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    U.txt(ctx, "condensador", 395, 210, { size: 11, font: "mono", align: "center", color: C.muted });
    ctx.beginPath(); ctx.moveTo(430, 130); ctx.lineTo(470, 130); ctx.strokeStyle = C.muted; ctx.lineWidth = 3; ctx.stroke();
    U.circle(ctx, 488, 130, 18, C.surface, C.ink, 2);
    const ga = -Math.PI * 0.75 + (1 - this.p.P / 1013) * Math.PI * 1.5;
    ctx.strokeStyle = C.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(488, 130); ctx.lineTo(488 + Math.cos(ga - Math.PI / 2) * 13, 130 + Math.sin(ga - Math.PI / 2) * 13); ctx.stroke();
    U.txt(ctx, "bomba de vácuo", 488, 166, { size: 11, font: "mono", align: "center", color: C.muted });
    // termômetro
    const risk = T > 75 ? C.bad : T > 65 ? C.warn : C.ok;
    U.thermo(ctx, 360, 260, 150, (T - 20) / 85, `${U.fmt(T, 1)} °C`, risk);
    U.txt(ctx, "ebulição", 360, 440, { size: 11, font: "mono", align: "center", color: C.muted });
    // curva
    const pts = []; for (let P = 30; P <= 1013; P += 10) pts.push([P, this.Tb(P)]);
    const ch = U.chart(ctx, 470, 230, 290, 200, { xmin: 0, xmax: 1013, ymin: 20, ymax: 105, series: [{ pts, color: C.water, width: 2.5 }], tx: [0, 250, 500, 750, 1000], ty: [20, 40, 60, 80, 100], xlabel: "pressão (mbar)", ylabel: "ebulição da água (°C)" , band: { y1: 72, y2: 105, color: U.alpha(C.bad, 0.08) } });
    U.circle(ctx, ch.sx(this.p.P), ch.sy(T), 6, C.accent, C.surface, 2);
    U.txt(ctx, "zona de risco à proteína", 755, ch.sy(100) + 4, { size: 10, font: "mono", align: "right", color: C.bad, base: "top" });
  },
  readouts() {
    const T = this.Tb(this.p.P);
    return [
      { k: "Pressão", v: U.fmt(this.p.P), u: "mbar" },
      { k: "Água ferve a", v: U.fmt(T, 1), u: "°C", tone: T > 75 ? "bad" : T > 65 ? "warn" : "ok" },
      { k: "Risco à proteína", v: T > 75 ? "alto" : T > 65 ? "atenção" : "baixo", tone: T > 75 ? "bad" : T > 65 ? "warn" : "ok" }
    ];
  }
});

/* ---------- SD-701: spray dryer ---------- */
SCENES.spray = () => ({
  aria: "Câmara de secagem por atomização: gotas pulverizadas secam enquanto caem; a temperatura da gota fica no bulbo úmido até secar.",
  controls: [
    { type: "range", id: "Tin", label: "Ar de entrada", min: 140, max: 220, step: 1, value: 180, unit: "°C" },
    { type: "range", id: "d", label: "Tamanho da gota", min: 20, max: 220, step: 5, value: 60, unit: "µm" },
    { type: "toggle", id: "agl", label: "Aglomeração + lecitina" }
  ],
  init() { this.t = 0; this.drops = []; this.acc = 0; this.wet = 0; this.agl = false; this.pile = []; },
  onButton(id) { if (id === "agl") this.agl = !this.agl; },
  ctrlState(id) { if (id === "agl") return { pressed: this.agl }; },
  m() {
    const Tin = this.p.Tin, d = this.p.d;
    const Twb = 0.22 * Tin + 8, Tout = 0.45 * Tin + 5;
    const tdry = 0.0325 * d * d / (Tin - Twb);
    const R = 30 * (50 / d);
    return { Twb, Tout, tdry, R, frac: tdry / R };
  },
  wall(y) { return y < 300 ? 150 : 150 - (y - 300) * 150 / 140; },
  update(dt) {
    this.t += dt;
    const M = this.m();
    this.acc += dt * 40;
    while (this.acc > 1) {
      this.acc--;
      const s = Math.random() < 0.5 ? -1 : 1;
      this.drops.push({ x: 330, y: 100, vx: s * U.rand(60, 140), vy: U.rand(0, 20), age: 0, dead: false });
    }
    const life = 4.2;
    for (const q of this.drops) {
      q.age += dt;
      q.vy += 55 * dt * (0.6 + this.p.d / 150); q.vx *= Math.exp(-1.8 * dt);
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.dry = U.clamp(q.age / (life * M.frac), 0, 1);
      const w = this.wall(q.y);
      if (Math.abs(q.x - 330) > w - 4) {
        q.x = 330 + Math.sign(q.x - 330) * (w - 4); q.vx *= -0.3;
        if (q.dry < 1) { q.dead = true; this.wet = Math.min(this.wet + 1, 60); }
      }
      if (q.y > 436) { q.dead = true; if (q.dry >= 1 && this.pile.length < 140) this.pile.push({ x: U.rand(560, 720), y: 0, c: this.agl ? Math.floor(U.rand(3, 6)) : 1 }); }
    }
    this.drops = this.drops.filter(q => !q.dead);
    this.wet = Math.max(0, this.wet - dt * 1.5);
    if (this.pile.length > 120) this.pile.splice(0, 20);
  },
  draw(ctx, C) {
    const M = this.m();
    // câmara
    ctx.beginPath(); ctx.moveTo(180, 90); ctx.lineTo(480, 90); ctx.lineTo(480, 300); ctx.lineTo(345, 440); ctx.lineTo(315, 440); ctx.lineTo(180, 300); ctx.closePath();
    const g = ctx.createLinearGradient(0, 90, 0, 440);
    g.addColorStop(0, U.alpha(C.heat, 0.18)); g.addColorStop(1, U.alpha(C.heat, 0.04));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    // atomizador
    ctx.fillStyle = C.ink; ctx.fillRect(322, 62, 16, 32);
    ctx.beginPath(); ctx.ellipse(330, 100, 22, 6, 0, 0, 6.283); ctx.fillStyle = C.surface; ctx.fill(); ctx.stroke();
    for (let k = 0; k < 6; k++) { const a = this.t * 12 + k; if (Math.sin(a) > 0) U.circle(ctx, 330 + Math.cos(a) * 20, 100 + Math.sin(a) * 5, 2, C.accent); }
    U.arrow(ctx, 230, 50, 290, 88, C.heat, 3); U.arrow(ctx, 430, 50, 370, 88, C.heat, 3);
    U.txt(ctx, `ar ${this.p.Tin} °C`, 160, 46, { size: 13, font: "mono", weight: 600, color: C.heat });
    U.txt(ctx, "concentrado", 342, 56, { size: 11, font: "mono", color: C.muted });
    // gotas
    for (const q of this.drops) {
      const rad = (1.6 + this.p.d / 40) * (1 - 0.35 * q.dry);
      U.circle(ctx, q.x, q.y, rad, q.dry < 1 ? U.mix(C.water, C.whey, q.dry) : U.mix(C.whey, C.surface2, 0.4));
    }
    // depósitos úmidos
    if (this.wet > 1) {
      ctx.fillStyle = U.alpha(C.water, U.clamp(this.wet / 40, 0.15, 0.6));
      ctx.fillRect(176, 220, 8, 80); ctx.fillRect(476, 220, 8, 80);
      U.txt(ctx, "gotas molhadas grudando na parede!", 330, 470, { size: 13, align: "center", weight: 700, color: C.bad });
    }
    // ciclone e pó
    ctx.strokeStyle = C.muted; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(330, 440); ctx.lineTo(330, 460); ctx.lineTo(540, 460); ctx.stroke();
    U.rr(ctx, 550, 360, 190, 100, 8); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    U.txt(ctx, this.agl ? "pó aglomerado (instantâneo)" : "pó fino", 645, 352, { size: 12, font: "mono", align: "center", color: C.muted });
    this.pile.forEach((p, i) => {
      const x = 562 + (i * 37) % 166, y = 448 - Math.floor(i / 5) * 3.2;
      if (p.c > 1) for (let k = 0; k < p.c; k++) U.circle(ctx, x + Math.cos(k * 2.1) * 3.5, y + Math.sin(k * 2.1) * 3.5, 2.6, U.mix(C.whey, C.surface2, 0.4), U.alpha(C.ink, 0.25), 0.6);
      else U.circle(ctx, x, y, 1.6, U.mix(C.whey, C.surface2, 0.4));
    });
    // gráfico de temperatura
    const T = []; const A = []; const tmax = Math.max(M.tdry * 1.6, 2);
    for (let i = 0; i <= 60; i++) {
      const t = i / 60 * tmax;
      const td = t < M.tdry ? M.Twb : M.Twb + (M.Tout - 5 - M.Twb) * (1 - Math.exp(-(t - M.tdry) / (0.25 * tmax)));
      T.push([t, td]); A.push([t, this.p.Tin - (this.p.Tin - M.Tout) * (t / tmax)]);
    }
    const tTicks = [0, tmax / 2, tmax];
    U.chart(ctx, 560, 70, 200, 200, { xmin: 0, xmax: tmax, ymin: 0, ymax: 230, series: [{ pts: A, color: C.heat, width: 2, dash: [5, 4] }, { pts: T, color: C.water, width: 2.5 }], ty: [0, 50, 100, 150, 200], tx: tTicks, fx: v => U.fmt(v, 1), xlabel: "tempo (s)", ylabel: "°C" });
    U.legend(ctx, [[C.heat, "ar", "line"], [C.water, "gota", "line"]], 560, 312, { size: 11 });
  },
  readouts() {
    const M = this.m(), ok = M.frac < 1;
    const moist = ok ? U.clamp(3.5 + Math.max(0, 80 - M.Tout) * 0.12, 3, 8) : NaN;
    return [
      { k: "Temperatura da gota", v: U.fmt(M.Twb, 0), u: "°C", tone: "ok" },
      { k: "Ar de saída", v: U.fmt(M.Tout, 0), u: "°C", tone: M.Tout > 95 ? "bad" : "" },
      { k: "Tempo para secar", v: U.fmt(M.tdry, 1), u: "s" },
      { k: "Seca a", v: ok ? U.fmt(M.frac * 100, 0) : "não seca", u: ok ? "% da queda" : "", tone: ok ? (M.frac > 0.7 ? "warn" : "ok") : "bad" },
      { k: "Umidade do pó", v: ok ? U.fmt(moist, 1) : "úmido", u: ok ? "%" : "", tone: !ok || moist > 5 ? "bad" : "ok" },
      { k: "Molha na água em", v: this.agl ? "~10" : "> 60", u: "s", tone: this.agl ? "ok" : "warn" }
    ];
  }
});
