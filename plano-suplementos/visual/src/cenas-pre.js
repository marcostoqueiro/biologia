/* Cenas da linha de pré-treino. */

/* ---------- EX-101: CO₂ supercrítico ---------- */
SCENES.co2 = () => ({
  aria: "Diagrama de fases do CO₂ com o ponto de operação, e um extrator onde a cafeína sai dos grãos quando o CO₂ está supercrítico.",
  controls: [
    { type: "range", id: "P", label: "Pressão", min: 1, max: 300, step: 1, value: 250, unit: "bar" },
    { type: "range", id: "T", label: "Temperatura", min: -60, max: 80, step: 1, value: 50, unit: "°C" },
    { type: "button", id: "reset", label: "Grãos novos" }
  ],
  init() {
    this.t = 0; this.moving = []; this.pile = 0; this.total = 0;
    this.beans = Array.from({ length: 10 }, (_, i) => ({ x: 470 + (i % 2) * 50 + (Math.floor(i / 2) % 2) * 12, y: 150 + Math.floor(i / 2) * 52, n: 6 }));
    this.total = 60;
  },
  onButton(id) { if (id === "reset") this.init(); },
  Pvap(T) { return Math.exp(10.878 - 2000 / (T + 273.15)); },
  Psub(T) { return Math.exp(16.15 - 3141 / (T + 273.15)); },
  Tmelt(P) { return -56.6 + (P - 5.18) * 0.012; },
  phase() {
    const T = this.p.T, P = this.p.P;
    if (T >= 31 && P >= 73.8) return "supercrítico";
    if (T < -56.6) return P > this.Psub(T) ? "sólido" : "gás";
    if (T < this.Tmelt(P) && P > 5.18) return "sólido";
    if (T < 31 && P > this.Pvap(T)) return "líquido";
    return "gás";
  },
  solv() {
    const ph = this.phase(), T = this.p.T, P = this.p.P;
    if (ph === "supercrítico") return U.clamp(Math.pow((P - 73.8) / (90 + 3 * (T - 31)) + 0.25, 0.7), 0, 1);
    if (ph === "líquido") return 0.35;
    if (ph === "gás") return U.clamp(0.03 * P / 73.8, 0, 0.03);
    return 0;
  },
  update(dt) {
    this.t += dt;
    const s = this.solv();
    for (const b of this.beans) {
      if (b.n > 0 && Math.random() < s * dt * 0.9 * b.n / 6) { b.n--; this.moving.push({ x: b.x + U.rand(-8, 8), y: b.y, st: 0 }); }
    }
    for (const m of this.moving) {
      if (m.st === 0) { m.y -= 80 * dt; m.x += Math.sin(this.t * 4 + m.y) * 0.4; if (m.y < 112) { m.st = 1; m.y = 100; } }
      else if (m.st === 1) { m.x += 140 * dt; if (m.x > 680) { m.st = 2; } }
      else { m.y += 90 * dt; if (m.y > 330 - Math.min(this.pile, 60) * 0.6) { m.dead = true; this.pile++; } }
    }
    this.moving = this.moving.filter(m => !m.dead);
  },
  draw(ctx, C) {
    // diagrama de fases
    const x0 = 50, y0 = 60, w = 330, h = 300;
    const sx = T => x0 + (T + 80) / 160 * w;
    const sy = P => y0 + h - Math.log10(U.clamp(P, 1, 400)) / Math.log10(400) * h;
    ctx.fillStyle = C.surface; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = U.alpha(C.accent, 0.12); ctx.fillRect(sx(31), y0, x0 + w - sx(31), sy(73.8) - y0);
    const vap = [], sub = [], mel = [];
    for (let T = -56.6; T <= 31; T += 1) vap.push([sx(T), sy(this.Pvap(T))]);
    vap.push([sx(31), sy(73.8)]);
    for (let T = -80; T <= -56.6; T += 1) sub.push([sx(T), sy(this.Psub(T))]);
    sub.push([sx(-56.6), sy(5.18)]);
    for (let P = 5.18; P <= 400; P *= 1.2) mel.push([sx(this.Tmelt(P)), sy(P)]);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    for (const L of [vap, sub, mel]) { ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
    ctx.setLineDash([4, 4]); ctx.strokeStyle = U.alpha(C.accent, 0.8); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(sx(31), sy(73.8)); ctx.lineTo(sx(31), y0); ctx.moveTo(sx(31), sy(73.8)); ctx.lineTo(x0 + w, sy(73.8)); ctx.stroke(); ctx.setLineDash([]);
    U.circle(ctx, sx(31), sy(73.8), 4.5, C.accent); U.circle(ctx, sx(-56.6), sy(5.18), 4, C.ink);
    U.txt(ctx, "ponto crítico", x0 + w - 4, sy(73.8) + 14, { size: 10, font: "mono", color: C.accent, align: "right" });
    U.txt(ctx, "31 °C · 73,8 bar", x0 + w - 4, sy(73.8) + 26, { size: 10, font: "mono", color: C.accent, align: "right" });
    U.txt(ctx, "ponto triplo", sx(-56.6) + 6, sy(5.18) + 14, { size: 10, font: "mono", color: C.muted });
    U.txt(ctx, "SÓLIDO", sx(-72), sy(60), { size: 12, font: "mono", weight: 600, color: C.muted });
    U.txt(ctx, "LÍQUIDO", sx(-25), sy(150), { size: 12, font: "mono", weight: 600, color: C.muted });
    U.txt(ctx, "GÁS", sx(10), sy(3), { size: 12, font: "mono", weight: 600, color: C.muted });
    U.txt(ctx, "SUPERCRÍTICO", sx(55), sy(105), { size: 12, font: "mono", weight: 600, color: C.accent, align: "center" });
    for (const P of [1, 10, 100, 300]) U.txt(ctx, String(P), x0 - 6, sy(P), { size: 11, font: "mono", align: "right", base: "middle", color: C.muted });
    for (const T of [-80, -40, 0, 40, 80]) U.txt(ctx, String(T), sx(T), y0 + h + 14, { size: 11, font: "mono", align: "center", color: C.muted });
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, w, h);
    U.txt(ctx, "pressão (bar, log)", x0, y0 - 10, { size: 11, font: "mono", color: C.muted });
    U.txt(ctx, "temperatura (°C)", x0 + w, y0 + h + 30, { size: 11, font: "mono", align: "right", color: C.muted });
    const px = sx(this.p.T), py = sy(this.p.P);
    U.circle(ctx, px, py, 8, C.heat, C.surface, 2.5);
    // extrator
    U.rr(ctx, 440, 100, 120, 300, 22); ctx.fillStyle = U.alpha(C.accent, 0.04 + 0.2 * this.solv()); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke();
    for (const b of this.beans) {
      ctx.beginPath(); ctx.ellipse(b.x + 6, b.y, 20, 13, 0.3, 0, 6.283); ctx.fillStyle = U.mix(C.ok, C.whey, 0.5); ctx.fill(); ctx.strokeStyle = U.mix(C.ok, C.ink, 0.4); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x - 8, b.y - 4); ctx.quadraticCurveTo(b.x + 6, b.y + 2, b.x + 20, b.y + 4); ctx.stroke();
      for (let k = 0; k < b.n; k++) U.circle(ctx, b.x - 4 + (k % 3) * 8, b.y - 4 + Math.floor(k / 3) * 8, 2.2, C.heat);
    }
    U.txt(ctx, "extrator", 500, 420, { size: 11, font: "mono", align: "center", color: C.muted });
    U.txt(ctx, "grãos verdes úmidos", 500, 436, { size: 11, font: "mono", align: "center", color: C.muted });
    ctx.strokeStyle = C.muted; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(500, 100); ctx.lineTo(500, 86); ctx.lineTo(690, 86); ctx.lineTo(690, 180); ctx.stroke();
    U.rr(ctx, 650, 180, 80, 160, 14); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    U.txt(ctx, "separador", 690, 360, { size: 11, font: "mono", align: "center", color: C.muted });
    U.txt(ctx, "pressão baixa", 690, 376, { size: 11, font: "mono", align: "center", color: C.muted });
    const ph = Math.min(this.pile, 60) * 0.6;
    ctx.fillStyle = C.surface2; ctx.strokeStyle = C.crystal; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(656, 334); ctx.lineTo(690, 334 - ph); ctx.lineTo(724, 334); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const m of this.moving) U.circle(ctx, m.x, m.y, 2.6, C.heat);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(730, 200); ctx.lineTo(770, 200); ctx.lineTo(770, 460); ctx.lineTo(500, 460); ctx.lineTo(500, 400); ctx.stroke();
    U.txt(ctx, "CO₂ recomprimido volta", 640, 452, { size: 11, font: "mono", align: "center", color: C.muted });
    U.legend(ctx, [[C.heat, "cafeína"], [U.mix(C.ok, C.whey, 0.5), "grão de café verde"]], 440, 50, { size: 11 });
  },
  readouts() {
    const ph = this.phase(), s = this.solv();
    const left = this.beans.reduce((a, b) => a + b.n, 0);
    return [
      { k: "Estado do CO₂", v: ph, tone: ph === "supercrítico" ? "ok" : ph === "líquido" ? "warn" : "bad" },
      { k: "Poder de dissolução", v: U.fmt(s * 100, 0), u: "% (ilustr.)" },
      { k: "Cafeína extraída", v: U.fmt((1 - left / this.total) * 100, 0), u: "%" }
    ];
  }
});

/* ---------- MX-201: premix + misturador em V ---------- */
SCENES.blend = () => ({
  aria: "Misturador em V com partículas de base e de cafeína; amostras de 10 doses mostram quanta cafeína cada scoop recebe.",
  N: 40000,
  controls: [
    { type: "toggle", id: "premix", label: "Usar premix (cafeína pré-diluída)" },
    { type: "button", id: "spin", label: "Girar +50 rotações", primary: true },
    { type: "button", id: "sample", label: "Coletar 10 doses" },
    { type: "button", id: "reset", label: "Esvaziar" }
  ],
  init(keep) {
    if (!keep) this.premix = false;
    this.rot = 0; this.target = 0; this.ang = 0; this.doses = null; this.t = 0;
    const N = this.N, u = new Float32Array(N), v = new Float32Array(N), c = new Float32Array(N);
    const nc = this.premix ? 8000 : 800, cv = this.premix ? 0.1 : 1, sp = this.premix ? 0.09 : 0.04;
    for (let i = 0; i < N; i++) {
      if (i < nc) { u[i] = U.clamp(0.14 + U.gauss() * sp, 0.01, 0.49); v[i] = U.clamp(0.82 + U.gauss() * sp, 0.01, 0.99); c[i] = cv; }
      else { u[i] = Math.random(); v[i] = Math.random(); c[i] = 0; }
    }
    this.u = u; this.v = v; this.c = c; this.cTot = nc * cv;
  },
  onButton(id) {
    if (id === "premix") { this.premix = !this.premix; this.init(true); }
    if (id === "spin") this.target += 50;
    if (id === "sample") this.sample();
    if (id === "reset") this.init(true);
  },
  ctrlState(id) { if (id === "premix") return { pressed: this.premix }; if (id === "spin") return { disabled: this.target > this.rot }; },
  mixOnce() {
    const { u, v, N } = this;
    // cada rotação: parte do pó troca de braço (divide e recombina), o resto escorrega e difunde
    for (let i = 0; i < N; i++) {
      let half = u[i] >= 0.5 ? 0.5 : 0;
      if (Math.random() < 0.15) half = 0.5 - half;
      let la = u[i] - (u[i] >= 0.5 ? 0.5 : 0) + U.gauss() * 0.03 + 0.04 * Math.sin(6.283 * v[i]);
      if (la < 0) la = -la;
      if (la > 0.5) la = 1 - la;
      let b = v[i] + U.gauss() * 0.03;
      if (b < 0) b = -b;
      if (b > 1) b = 2 - b;
      u[i] = U.clamp(half + la, 0, 0.9999);
      v[i] = U.clamp(b, 0, 1);
    }
  },
  sample() {
    const r = 0.178, out = [];
    for (let k = 0; k < 10; k++) {
      const cu = U.rand(0.1, 0.9), cv = U.rand(0.15, 0.85);
      let sc = 0, n = 0;
      for (let i = 0; i < this.N; i++) { const du = this.u[i] - cu, dv = this.v[i] - cv; if (du * du + dv * dv < r * r) { sc += this.c[i]; n++; } }
      out.push(200 * (sc / Math.max(n, 1)) / (this.cTot / this.N));
    }
    this.doses = out;
  },
  update(dt) {
    this.t += dt;
    if (this.target > this.rot) {
      const sp = U.reduced ? 1 : 4;
      this.ang += dt * sp * 6.283;
      while (this.ang >= 6.283) { this.ang -= 6.283; this.rot++; this.mixOnce(); }
      if (this.target <= this.rot) this.ang = 0;
    }
  },
  stats() {
    if (!this.doses) return null;
    const m = this.doses.reduce((a, b) => a + b, 0) / 10;
    const sd = Math.sqrt(this.doses.reduce((a, b) => a + (b - m) ** 2, 0) / 9);
    return { m, rsd: sd / m * 100, min: Math.min(...this.doses), max: Math.max(...this.doses) };
  },
  draw(ctx, C) {
    // misturador
    const px = 230, py = 240;
    ctx.save(); ctx.translate(px, py); ctx.rotate(this.ang);
    const arms = [[-1], [1]];
    const apex = [0, 70], len = 190, wid = 82;
    for (const [s] of arms) {
      const dir = [s * Math.sin(0.62), -Math.cos(0.62)], perp = [-dir[1], dir[0]];
      ctx.beginPath();
      const p = (al, ac) => [apex[0] + dir[0] * al * len + perp[0] * ac * wid, apex[1] + dir[1] * al * len + perp[1] * ac * wid];
      const q = [p(0, -0.5), p(1, -0.5), p(1, 0.5), p(0, 0.5)];
      ctx.moveTo(...q[0]); q.slice(1).forEach(pt => ctx.lineTo(...pt)); ctx.closePath();
      ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    }
    const step = 14;
    for (let i = 0; i < this.N; i += (this.c[i] > 0 ? 1 : step)) {
      const s = this.u[i] < 0.5 ? -1 : 1, ac = (this.u[i] < 0.5 ? this.u[i] : this.u[i] - 0.5) * 2 - 0.5, al = this.v[i];
      const dir = [s * Math.sin(0.62), -Math.cos(0.62)], perp = [-dir[1], dir[0]];
      const x = apex[0] + dir[0] * al * len * 0.96 + perp[0] * ac * wid * 0.9, y = apex[1] + dir[1] * al * len * 0.96 + perp[1] * ac * wid * 0.9;
      if (this.c[i] > 0) { if (i % (this.premix ? 8 : 2)) continue; ctx.fillStyle = this.premix ? U.alpha(C.heat, 0.65) : C.heat; ctx.fillRect(x - 1.6, y - 1.6, 3.2, 3.2); }
      else { ctx.fillStyle = U.alpha(C.whey, 0.55); ctx.fillRect(x - 1, y - 1, 2, 2); }
    }
    ctx.restore();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 210, py); ctx.lineTo(px - 150, py); ctx.moveTo(px + 150, py); ctx.lineTo(px + 210, py); ctx.stroke();
    U.circle(ctx, px, py, 5, C.ink);
    U.txt(ctx, `${this.rot} rotações`, px, 470, { size: 16, font: "mono", align: "center", weight: 600 });
    U.legend(ctx, [[C.heat, this.premix ? "premix (10% cafeína)" : "cafeína pura", "sq"], [C.whey, "base (citrulina, beta-alanina…)", "sq"]], 30, 34, { size: 11 });
    // doses
    const x0 = 480, y0 = 80, w = 290, h = 260, ymax = 500;
    ctx.fillStyle = C.surface; ctx.fillRect(x0, y0, w, h);
    const sy = v => y0 + h - v / ymax * h;
    ctx.fillStyle = U.alpha(C.ok, 0.15); ctx.fillRect(x0, sy(220), w, sy(180) - sy(220));
    ctx.strokeStyle = C.ok; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x0, sy(200)); ctx.lineTo(x0 + w, sy(200)); ctx.stroke(); ctx.setLineDash([]);
    for (const t of [0, 100, 200, 300, 400, 500]) U.txt(ctx, String(t), x0 - 6, sy(t), { size: 11, font: "mono", align: "right", base: "middle", color: C.muted });
    U.txt(ctx, "cafeína por dose (mg) · alvo 200 ± 10%", x0, y0 - 10, { size: 11, font: "mono", color: C.muted });
    if (this.doses) {
      const bw = w / 10;
      this.doses.forEach((d, i) => {
        const v = Math.min(d, ymax), ok = d >= 180 && d <= 220;
        ctx.fillStyle = ok ? C.accent : C.bad; ctx.fillRect(x0 + i * bw + 4, sy(v), bw - 8, y0 + h - sy(v));
        U.txt(ctx, String(i + 1), x0 + i * bw + bw / 2, y0 + h + 14, { size: 10, font: "mono", align: "center", color: C.muted });
        if (d > ymax) U.txt(ctx, U.fmt(d), x0 + i * bw + bw / 2, y0 + 12, { size: 10, font: "mono", align: "center", color: C.surface });
      });
      const st = this.stats();
      const good = st.rsd <= 5;
      U.txt(ctx, good ? "Uniforme: toda dose perto de 200 mg." : st.rsd <= 15 ? "Quase lá: ainda varia demais." : "Desigual: doses muito diferentes.", x0, 380, { size: 13, weight: 700, color: good ? C.ok : C.bad });
      if (!this.premix && this.rot >= 150 && !good) { U.txt(ctx, "Mesmo bem misturado, poucas partículas", x0, 402, { size: 12, color: C.muted }); U.txt(ctx, "de cafeína caem de forma desigual em", x0, 418, { size: 12, color: C.muted }); U.txt(ctx, "cada scoop. Tente o premix.", x0, 434, { size: 12, color: C.muted }); }
    } else {
      U.txt(ctx, "Gire e depois colete 10 doses.", x0 + w / 2, y0 + h / 2, { size: 13, align: "center", color: C.muted });
    }
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + h); ctx.lineTo(x0 + w, y0 + h); ctx.stroke();
  },
  readouts() {
    const st = this.stats();
    return [
      { k: "Rotações", v: U.fmt(this.rot) },
      { k: "Variação (RSD)", v: st ? U.fmt(st.rsd, 1) : "—", u: st ? "%" : "", tone: st ? (st.rsd <= 5 ? "ok" : "bad") : "" },
      { k: "Menor dose", v: st ? U.fmt(st.min) : "—", u: st ? "mg" : "" },
      { k: "Maior dose", v: st ? U.fmt(st.max) : "—", u: st ? "mg" : "", tone: st && st.max > 260 ? "bad" : "" }
    ];
  }
});

/* ---------- EN-301: umidade e empedramento ---------- */
SCENES.humid = () => ({
  aria: "Bandeja de pó higroscópico: acima da umidade crítica as partículas absorvem água, formam pontes e empedram.",
  controls: [
    { type: "range", id: "RH", label: "Umidade relativa do ar", min: 20, max: 90, step: 1, value: 35, unit: "%" },
    { type: "toggle", id: "sio2", label: "Antiumectante (SiO₂)" },
    { type: "button", id: "reset", label: "Pó novo" }
  ],
  init() {
    this.t = 0; this.sio2 = this.sio2 || false; this.parts = []; this.bonds = [];
    for (let j = 0; j < 9; j++) for (let i = 0; i < 20; i++) {
      this.parts.push({ x: 150 + i * 25 + (j % 2) * 12 + U.rand(-3, 3), y: 240 + j * 21 + U.rand(-3, 3), h: Math.random() < 0.45, m: 0 });
    }
    const P = this.parts;
    for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) if (Math.hypot(P[a].x - P[b].x, P[a].y - P[b].y) < 27) this.bonds.push({ a, b, liq: 0, sol: false });
  },
  onButton(id) { if (id === "reset") this.init(); if (id === "sio2") this.sio2 = !this.sio2; },
  ctrlState(id) { if (id === "sio2") return { pressed: this.sio2 }; },
  crh() { return this.sio2 ? 67 : 55; },
  update(dt) {
    this.t += dt;
    const RH = this.p.RH, crh = this.crh();
    for (const q of this.parts) {
      if (RH > crh) q.m = Math.min(1, q.m + dt * (q.h ? 0.12 : 0.02) * (RH - crh) / 20);
      else q.m = Math.max(0, q.m - dt * 0.05);
    }
    for (const b of this.bonds) {
      const A = this.parts[b.a], B = this.parts[b.b];
      const wet = Math.max(A.m, B.m);
      if (wet > 0.35) b.liq = Math.min(1, b.liq + dt * 0.6 * (this.sio2 ? 0.35 : 1));
      else if (b.liq > 0) { if (b.liq > 0.6) b.sol = true; b.liq = Math.max(0, b.liq - dt * 0.4); }
    }
  },
  draw(ctx, C) {
    const RH = this.p.RH;
    for (let k = 0; k < Math.round(RH * 0.9); k++) { const x = 140 + ((k * 73.1) % 520), y = 80 + ((k * 41.3 + this.t * 20) % 130); U.circle(ctx, x, y, 1.8, U.alpha(C.water, 0.6)); }
    U.txt(ctx, "vapor d'água no ar", 140, 70, { size: 11, font: "mono", color: C.water });
    U.rr(ctx, 120, 224, 560, 210, 8); ctx.fillStyle = U.alpha(C.line, 0.25); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    for (const b of this.bonds) {
      const A = this.parts[b.a], B = this.parts[b.b];
      if (b.sol) { ctx.strokeStyle = U.alpha(C.crystal, 0.95); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); }
      if (b.liq > 0.05) { ctx.strokeStyle = U.alpha(C.water, 0.25 + 0.5 * b.liq); ctx.lineWidth = 3 + 5 * b.liq; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); }
    }
    for (const q of this.parts) {
      const r = 8.5 + q.m * 2.5;
      U.circle(ctx, q.x, q.y, r, q.h ? U.mix(C.protein, C.water, q.m * 0.5) : U.mix(C.whey, C.water, q.m * 0.3), U.alpha(C.ink, 0.35), 0.8);
      if (this.sio2) { U.circle(ctx, q.x - 4, q.y - 4, 1.4, C.muted); U.circle(ctx, q.x + 4, q.y + 2, 1.4, C.muted); }
    }
    // higrômetro
    const hx = 730, hy = 120;
    U.circle(ctx, hx, hy, 46, C.surface, C.ink, 2);
    const crh = this.crh();
    for (let v = 20; v <= 90; v += 10) { const a = Math.PI * (0.75 + 1.5 * (v - 20) / 70); ctx.strokeStyle = v >= crh ? C.bad : C.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * 36, hy + Math.sin(a) * 36); ctx.lineTo(hx + Math.cos(a) * 44, hy + Math.sin(a) * 44); ctx.stroke(); }
    const a = Math.PI * (0.75 + 1.5 * (RH - 20) / 70);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * 34, hy + Math.sin(a) * 34); ctx.stroke();
    U.txt(ctx, `${RH}%`, hx, hy + 24, { size: 14, font: "mono", align: "center", weight: 700 });
    U.txt(ctx, `crítica ~${crh}%`, hx, hy + 64, { size: 11, font: "mono", align: "center", color: C.bad });
    U.legend(ctx, [[C.protein, "citrulina malato (higroscópica)"], [C.whey, "outros ingredientes"], [C.water, "ponte líquida", "line"], [C.crystal, "ponte sólida", "line"]], 120, 470, { size: 11 });
    U.txt(ctx, "1 s na tela ≈ 1 h de exposição · umidade crítica ilustrativa", 680, 452, { size: 10, font: "mono", align: "right", color: C.muted });
  },
  readouts() {
    const water = this.parts.reduce((s, q) => s + q.m * (q.h ? 6 : 1.5), 0) / this.parts.length;
    const liq = this.bonds.filter(b => b.liq > 0.3).length, sol = this.bonds.filter(b => b.sol).length;
    const state = sol > 40 ? ["empedrado", "bad"] : liq > 20 || sol > 5 ? ["grudando", "warn"] : ["solto", "ok"];
    return [
      { k: "Água absorvida", v: U.fmt(water, 1), u: "%" },
      { k: "Pontes líquidas", v: U.fmt(liq) },
      { k: "Pontes sólidas", v: U.fmt(sol), tone: sol > 5 ? "bad" : "" },
      { k: "Estado do pó", v: state[0], tone: state[1] }
    ];
  }
});
