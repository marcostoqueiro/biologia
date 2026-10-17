/* Palco 3D: reações em bolas e varetas com Three.js.
   Quadros-chave vêm de reacoes.json; entre quadros, cada átomo gira em torno do
   seu "pai" numa árvore de ligações persistentes (slerp), o que preserva os
   comprimentos de ligação; átomos que trocam de parceiro (H transferido) andam em linha reta. */

const Stage = (() => {
  const ELC = { C: [0x5d6973, 0.36], H: [0xf1f4f6, 0.24], N: [0x4a78ff, 0.34], O: [0xf0453a, 0.33], S: [0xf2c94c, 0.42] };
  const AMBER = 0xf2b84b;
  let ok = false, renderer, scene, camera, group, canvas, visible = true;
  let D = null, R = null, key = null, F = [], trees = [], nF = 0;
  let atoms = [], bonds = [], lpDots = [], dLabs = [], chLabs = [], nameLabs = [], arrows = [], pocket = null, pocketLab = null;
  let u = 0, stepI = 0, anim = null, auto = false, autoT = 0, hlSet = new Set();
  let rotX = -0.2, rotY = 0.25, dist = 20, autoDist = 20, zoomK = 1, sway = !U.reduced, swayT = 0, lastTs = 0;
  let onStep = () => {}, onU = () => {};
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const tmpQ = new THREE.Quaternion(), YAX = V(0, 1, 0);

  function init(cv, msg, cb) {
    canvas = cv; onStep = cb.onStep || onStep; onU = cb.onU || onU;
    try {
      if (!window.THREE) throw new Error("three");
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      ok = true;
    } catch (e) {
      ok = false;
      msg.hidden = false;
      msg.textContent = "Não foi possível abrir o 3D neste navegador (WebGL indisponível). Os passos e explicações continuam ao lado.";
      canvas.hidden = true;
      return;
    }
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d141b);
    camera = new THREE.PerspectiveCamera(35, 4 / 3, 0.1, 400);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.85); d1.position.set(6, 9, 12); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0x9fb8ff, 0.35); d2.position.set(-8, -5, -6); scene.add(d2);
    group = new THREE.Group(); scene.add(group);
    resize();
    try { new ResizeObserver(resize).observe(canvas); } catch (e) { addEventListener("resize", resize); }
    try { new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(canvas); } catch (e) { /* sempre visível */ }
    pointer();
    requestAnimationFrame(loop);
  }

  function resize() {
    if (!ok) return;
    const w = canvas.clientWidth || 640, h = canvas.clientHeight || 480;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---------- texto em sprite ---------- */
  function textSprite(text, o = {}) {
    const fs = 64, pad = o.pill ? 22 : 6;
    const c = document.createElement("canvas"), x = c.getContext("2d");
    x.font = `${o.weight || 700} ${fs}px ${o.font || U.FONTS.body}`;
    const w = Math.ceil(x.measureText(text).width) + pad * 2, h = fs + pad * 1.4;
    c.width = w; c.height = h;
    x.font = `${o.weight || 700} ${fs}px ${o.font || U.FONTS.body}`;
    if (o.pill) { x.fillStyle = o.bg || "rgba(10,16,22,0.82)"; U.rr(x, 0, 0, w, h, h / 2); x.fill(); if (o.stroke) { x.strokeStyle = o.stroke; x.lineWidth = 4; x.stroke(); } }
    x.fillStyle = o.color || "#ffffff";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(text, w / 2, h / 2 + 3);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const m = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    const s = new THREE.Sprite(m);
    const sh = o.h || 0.5;
    s.scale.set(sh * w / h, sh, 1);
    s.renderOrder = 10;
    s.userData.aspect = w / h;
    s.userData.h = sh;
    return s;
  }
  function chargeSprite(sign) {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d");
    x.fillStyle = sign > 0 ? "#e8564a" : "#4f86ff";
    x.beginPath(); x.arc(32, 32, 28, 0, 6.283); x.fill();
    x.strokeStyle = "#ffffff"; x.lineWidth = 7; x.beginPath(); x.moveTo(18, 32); x.lineTo(46, 32);
    if (sign > 0) { x.moveTo(32, 18); x.lineTo(32, 46); }
    x.stroke();
    const tex = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(0.34, 0.34, 1); s.renderOrder = 11;
    s.userData.aspect = 1; s.userData.h = 0.3;
    return s;
  }

  function clear() {
    while (group.children.length) {
      const o = group.children.pop();
      o.traverse(n => { if (n.geometry && n.geometry !== SPH && n.geometry !== CYL && n.geometry !== CONE) n.geometry.dispose(); if (n.material) { if (n.material.map) n.material.map.dispose(); n.material.dispose(); } });
    }
    atoms = []; bonds = []; lpDots = []; dLabs = []; chLabs = []; nameLabs = []; arrows = []; pocket = null; pocketLab = null;
  }
  let SPH, CYL, CONE;

  /* ---------- carga de uma reação ---------- */
  function load(k) {
    if (!ok) { key = k; R = RX[k]; D = REACT[k]; stepI = 0; onStep(0); return; }
    if (!SPH) { SPH = new THREE.SphereGeometry(1, 28, 20); CYL = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true); CONE = new THREE.ConeGeometry(0.13, 0.34, 14); }
    clear();
    key = k; R = RX[k]; D = REACT[k];
    const n = D.el.length;
    nF = D.frames.length;
    F = D.frames.map(fr => { const a = []; for (let i = 0; i < n; i++) a.push(V(fr[3 * i], fr[3 * i + 1], fr[3 * i + 2])); return a; });
    for (let i = 0; i < n; i++) {
      const [col, r] = ELC[D.el[i]] || [0xaaaaaa, 0.35];
      const m = new THREE.Mesh(SPH, new THREE.MeshStandardMaterial({ color: col, roughness: 0.38, metalness: 0.05, emissive: 0x000000 }));
      m.scale.setScalar(r);
      group.add(m);
      atoms.push({ m, r, col });
      const cs = { p: chargeSprite(1), n: chargeSprite(-1) };
      cs.p.visible = cs.n.visible = false;
      group.add(cs.p); group.add(cs.n);
      chLabs.push(cs);
    }
    for (const [i, j, ord] of D.bonds) {
      const lines = [];
      for (let k2 = 0; k2 < 3; k2++) {
        const mk = idx => { const mm = new THREE.Mesh(CYL, new THREE.MeshStandardMaterial({ color: atoms[idx].col, roughness: 0.45, transparent: true })); mm.visible = false; group.add(mm); return mm; };
        lines.push([mk(i), mk(j)]);
      }
      bonds.push({ i, j, ord, lines });
    }
    for (let q = 0; q < 8; q++) { const d = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: AMBER, transparent: true })); d.scale.setScalar(0.085); d.visible = false; group.add(d); lpDots.push(d); }
    for (let q = 0; q < 3; q++) {
      const tube = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, depthTest: false }));
      const cone = new THREE.Mesh(CONE, new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, depthTest: false }));
      tube.renderOrder = cone.renderOrder = 9; tube.visible = cone.visible = false;
      group.add(tube); group.add(cone);
      arrows.push({ tube, cone });
    }
    if (k === "cafeina") {
      const prof = [];
      for (let t = 0; t <= 1.0001; t += 0.1) prof.push(new THREE.Vector2(0.4 + 3.3 * Math.sin(t * 1.35), -1.6 + 2.2 * (1 - Math.cos(t * 1.35))));
      const g = new THREE.LatheGeometry(prof, 40);
      pocket = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x79a2ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, roughness: 0.6 }));
      pocket.rotation.x = Math.PI / 2;
      pocket.position.set(D.pocket[0], D.pocket[1], D.pocket[2] - 0.6);
      group.add(pocket);
      pocketLab = textSprite("receptor A₂A (esquemático)", { pill: true, h: 0.32, color: "#cfe0ff", weight: 400 });
      pocketLab.position.set(D.pocket[0], D.pocket[1] - 3.9, D.pocket[2]);
      group.add(pocketLab);
    }
    trees = [];
    for (let f = 0; f < nF - 1; f++) trees.push(buildTree(f));
    // anotações resolvidas para índices
    R.steps.forEach(s => {
      const a = s.ann || {};
      const ix = m => D.names[String(m)];
      s._lp = (a.lp || []).map(ix);
      s._dp = (a.dp || []).map(([m, t]) => [ix(m), t]);
      s._hl = (a.hl || []).map(ix);
      s._ar = (a.ar || []).map(([fr, to]) => [fr[0] === "bd" ? ["bd", ix(fr[1]), ix(fr[2])] : [fr[0], ix(fr[1])], to[0] === "bd" ? ["bd", ix(to[1]), ix(to[2])] : [to[0], ix(to[1])]]);
      s._lab = (a.lab || []).map(([ms, t]) => [ms.map(ix).filter(v => v != null), t]);
    });
    // rótulos e sinais de carga parcial (pool)
    for (let q = 0; q < 3; q++) { const s = textSprite(" ", {}); s.visible = false; group.add(s); dLabs.push(s); }
    autoDist = fitFor(radius(F[0]));
    zoomK = 1;
    rotX = -0.2; rotY = 0.25;
    anim = null; auto = false;
    goStep(0, true);
  }

  function buildTree(f) {
    const n = D.el.length, adj = Array.from({ length: n }, () => []);
    for (const { i, j, ord } of bonds) if (ord[f] > 0 && ord[f + 1] > 0) { adj[i].push(j); adj[j].push(i); }
    const parent = new Int32Array(n).fill(-2), order = [];
    const cands = [...Array(n).keys()].sort((a, b) => (D.el[b] !== "H") - (D.el[a] !== "H") || adj[b].length - adj[a].length);
    for (const r of cands) {
      if (parent[r] !== -2) continue;
      parent[r] = -1; order.push(r);
      const qu = [r];
      while (qu.length) { const x = qu.shift(); for (const y of adj[x]) if (parent[y] === -2) { parent[y] = x; order.push(y); qu.push(y); } }
    }
    return { parent, order };
  }

  function slerp(a, b, t) {
    let d = U.clamp(a.dot(b), -1, 1);
    if (d > 0.9995) return a.clone().lerp(b, t).normalize();
    if (d < -0.9995) {
      const ax = Math.abs(a.x) < 0.9 ? V(1, 0, 0) : V(0, 1, 0);
      const perp = ax.cross(a).normalize();
      return a.clone().applyAxisAngle(perp, Math.PI * t);
    }
    const th = Math.acos(d), s = Math.sin(th);
    return a.clone().multiplyScalar(Math.sin((1 - t) * th) / s).add(b.clone().multiplyScalar(Math.sin(t * th) / s));
  }

  function positions(uu) {
    let f = Math.floor(uu), t = uu - f;
    if (f >= nF - 1) { f = nF - 2; t = 1; }
    if (f < 0) { f = 0; t = 0; }
    const A = F[f], B = F[f + 1], P = new Array(A.length), tr = trees[f];
    for (const i of tr.order) {
      const p = tr.parent[i];
      if (p < 0) P[i] = A[i].clone().lerp(B[i], t);
      else {
        const va = A[i].clone().sub(A[p]), vb = B[i].clone().sub(B[p]);
        const la = va.length(), lb = vb.length();
        P[i] = P[p].clone().add(slerp(va.divideScalar(la), vb.divideScalar(lb), t).multiplyScalar(la + (lb - la) * t));
      }
    }
    return { P, f, t };
  }

  function radius(P) { let r = 0; for (const p of P) r = Math.max(r, p.length()); return r + 1.3; }
  function fitFor(r) {
    const vf = camera.fov * Math.PI / 360;
    const hf = Math.atan(Math.tan(vf) * camera.aspect);
    return r / Math.sin(Math.min(vf, hf)) * 0.95;
  }
  function scaleSprite(sp, k) { sp.scale.set(sp.userData.h * sp.userData.aspect * k, sp.userData.h * k, 1); }

  /* ---------- passos ---------- */
  function goStep(k, instant) {
    if (!R) return;
    stepI = U.clamp(k, 0, R.steps.length - 1);
    const s = R.steps[stepI];
    if (!ok) { onStep(stepI); return; }
    const now = performance.now();
    if (s.f.length === 1) {
      const from = u, to = s.f[0];
      anim = instant || Math.abs(from - to) < 1e-3 ? { kind: "hold", t0: now, from: to, to, dur: 0 } : { kind: "move", t0: now, from, to, dur: 900 };
      if (instant) u = to;
    } else {
      u = s.f[0];
      anim = { kind: "tr", t0: now, from: s.f[0], to: s.f[1], a: s._ar.length ? 900 : 200, m: 2400 };
    }
    onStep(stepI);
  }

  function annAlpha(now) {
    const s = R.steps[stepI];
    if (!anim) return { arr: 0, other: 1 };
    const el = now - anim.t0;
    if (anim.kind === "tr") {
      if (el < anim.a) return { arr: el / anim.a, other: 1 };
      if (el < anim.a + anim.m) return { arr: 1, other: 1 };
      return { arr: U.clamp(1 - (el - anim.a - anim.m) / 700, 0, 1), other: 1 };
    }
    if (anim.kind === "scrub") return { arr: anim.inside ? 1 : 0, other: 1 };
    return { arr: s.f.length > 1 ? 0 : 0, other: 1 };
  }

  function tick(now) {
    if (!anim) return;
    const el = now - anim.t0;
    if (anim.kind === "move") { const t = U.clamp(el / anim.dur, 0, 1); u = U.lerp(anim.from, anim.to, U.ease(t)); if (t >= 1) anim.done = true; }
    if (anim.kind === "hold") anim.done = true;
    if (anim.kind === "tr") {
      const t = U.clamp((el - anim.a) / anim.m, 0, 1);
      u = U.lerp(anim.from, anim.to, U.ease(t));
      if (el > anim.a + anim.m + 700) anim.done = true;
    }
    if (anim.kind === "scrub") anim.done = true;
    onU(u);
    if (auto && anim.done) {
      autoT += 16;
      const s = R.steps[stepI];
      const wait = s.f.length > 1 ? 2200 : 3800;
      if (!anim.doneAt) anim.doneAt = now;
      if (now - anim.doneAt > wait) {
        if (stepI < R.steps.length - 1) goStep(stepI + 1);
        else { auto = false; onStep(stepI); }
      }
    }
  }

  function scrub(val) {
    auto = false;
    u = val;
    let k = 0;
    R.steps.forEach((s, i) => { if (s.f[0] <= val + 1e-6) k = i; });
    for (let i = R.steps.length - 1; i >= 0; i--) { const s = R.steps[i]; if (s.f.length > 1 && val > s.f[0] && val < s.f[1]) { k = i; break; } }
    const s = R.steps[k];
    anim = { kind: "scrub", t0: performance.now(), inside: s.f.length > 1 && val > s.f[0] + 0.02 && val < s.f[1] - 0.02 };
    if (k !== stepI) { stepI = k; onStep(k); }
  }

  /* ---------- desenho ---------- */
  function neighbors(i, f) { const out = []; for (const b of bonds) if (b.ord[f] > 0) { if (b.i === i) out.push(b.j); else if (b.j === i) out.push(b.i); } return out; }
  function lpDir(i, P, f, view) {
    const nb = neighbors(i, f);
    const s = V(0, 0, 0);
    for (const j of nb) s.add(P[j].clone().sub(P[i]).normalize());
    if (nb.length === 0) return V(0, 1, 0);
    if (s.length() < 0.35 && nb.length >= 2) return P[nb[0]].clone().sub(P[i]).cross(P[nb[1]].clone().sub(P[i])).normalize().multiplyScalar(view.dot(P[nb[0]].clone().sub(P[i]).cross(P[nb[1]].clone().sub(P[i]))) < 0 ? -1 : 1);
    return s.multiplyScalar(-1).normalize();
  }

  function render(now, dt) {
    if (!ok || !D) return;
    const { P, f, t } = positions(u);
    autoDist += (fitFor(radius(P)) - autoDist) * Math.min(1, dt * 2.5);
    dist = autoDist * zoomK;
    const k = dist / 14;
    const fN = t < 0.5 ? f : f + 1;
    const s = R.steps[stepI];
    const al = annAlpha(now);
    group.rotation.set(rotX, rotY + (sway ? 0.32 * Math.sin(swayT * 0.45) : 0), 0);
    group.updateMatrixWorld();
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    const inv = group.quaternion.clone().invert();
    const camL = camera.position.clone().applyQuaternion(inv);
    const right = V(1, 0, 0).applyQuaternion(inv), up = V(0, 1, 0).applyQuaternion(inv);
    const pulse = 0.45 + 0.25 * Math.sin(now / 260);
    hlSet = new Set(s._hl);
    // átomos e cargas
    atoms.forEach((a, i) => {
      a.m.position.copy(P[i]);
      a.m.material.emissive.setHex(hlSet.has(i) ? AMBER : 0x000000);
      a.m.material.emissiveIntensity = hlSet.has(i) ? pulse : 0;
      const ch = D.charges[fN][i];
      const pos = P[i].clone().add(right.clone().multiplyScalar(a.r + 0.16)).add(up.clone().multiplyScalar(a.r + 0.16));
      chLabs[i].p.visible = ch > 0; chLabs[i].n.visible = ch < 0;
      chLabs[i].p.position.copy(pos); chLabs[i].n.position.copy(pos);
      scaleSprite(chLabs[i].p, k); scaleSprite(chLabs[i].n, k);
    });
    // ligações
    for (const b of bonds) {
      const oa = b.ord[f], ob = b.ord[Math.min(f + 1, nF - 1)];
      const o = oa + (ob - oa) * t;
      const pa = P[b.i], pb = P[b.j];
      const dir = pb.clone().sub(pa), len = dir.length();
      dir.divideScalar(len || 1);
      const mid = pa.clone().add(pb).multiplyScalar(0.5);
      let w = dir.clone().cross(camL.clone().sub(mid).normalize());
      if (w.length() < 1e-3) w = dir.clone().cross(V(0, 0, 1));
      w.normalize();
      const nmax = Math.max(Math.ceil(oa - 1e-6), Math.ceil(ob - 1e-6));
      const offs = nmax <= 1 ? [0] : nmax === 2 ? [-0.075, 0.075] : [-0.12, 0, 0.12];
      const forming = oa === 0 && ob > 0, breaking = ob === 0 && oa > 0;
      b.lines.forEach((pair, k) => {
        let alpha = k < offs.length ? U.clamp(o - k, 0, 1) : 0;
        if (forming && k === 0) alpha = t;
        if (breaking && k === 0) alpha = 1 - t;
        const vis = alpha > 0.02;
        pair.forEach((m, h) => {
          m.visible = vis;
          if (!vis) return;
          const off = w.clone().multiplyScalar(offs[k] || 0);
          const p0 = (h === 0 ? pa : mid).clone().add(off), p1 = (h === 0 ? mid : pb).clone().add(off);
          m.position.copy(p0).add(p1).multiplyScalar(0.5);
          const rr = nmax > 1 ? 0.06 : 0.1;
          m.scale.set(rr, p0.distanceTo(p1), rr);
          m.quaternion.setFromUnitVectors(YAX, dir);
          const col = (forming || breaking) && k === 0 ? AMBER : atoms[h === 0 ? b.i : b.j].col;
          m.material.color.setHex(col);
          m.material.opacity = alpha;
          m.material.depthWrite = alpha > 0.6;
        });
      });
    }
    // pares livres
    lpDots.forEach(d => { d.visible = false; });
    s._lp.forEach((i, q) => {
      if (q > 3) return;
      const view = camL.clone().sub(P[i]).normalize();
      const dr = lpDir(i, P, fN, view);
      const perp = dr.clone().cross(view).normalize().multiplyScalar(0.09);
      const base = P[i].clone().add(dr.clone().multiplyScalar(atoms[i].r + 0.24));
      const a = lpDots[q * 2], b = lpDots[q * 2 + 1];
      a.position.copy(base).add(perp); b.position.copy(base).sub(perp);
      a.visible = b.visible = true;
      a.material.opacity = b.material.opacity = al.other;
    });
    // cargas parciais
    dLabs.forEach(d => { d.visible = false; });
    s._dp.forEach(([i, txt], q) => {
      if (q > 2) return;
      let sp = dLabs[q];
      if (sp.userData.txt !== txt) {
        group.remove(sp); sp.material.map.dispose(); sp.material.dispose();
        sp = dLabs[q] = textSprite(txt, { color: "#f2b84b", h: 0.34, font: U.FONTS.body, weight: 700 });
        sp.userData.txt = txt; group.add(sp);
      }
      sp.visible = true;
      scaleSprite(sp, k);
      // fora das ligações do átomo, no plano da tela
      const view = camL.clone().sub(P[i]).normalize();
      const away = V(0, 0, 0);
      for (const j of neighbors(i, fN)) away.sub(P[j].clone().sub(P[i]).normalize());
      away.sub(view.clone().multiplyScalar(away.dot(view)));
      if (away.length() < 0.3) away.copy(up);
      away.normalize();
      sp.position.copy(P[i]).add(away.multiplyScalar(atoms[i].r + 0.2 + 0.28 * k));
    });
    // rótulos de moléculas
    while (nameLabs.length < s._lab.length) { const sp = textSprite(" ", {}); group.add(sp); nameLabs.push(sp); }
    nameLabs.forEach((sp, q) => {
      const L = s._lab[q];
      if (!L) { sp.visible = false; return; }
      if (sp.userData.txt !== L[1]) {
        group.remove(sp); sp.material.map.dispose(); sp.material.dispose();
        sp = nameLabs[q] = textSprite(L[1], { pill: true, h: 0.36, color: "#e9f0f5", weight: 700 });
        sp.userData.txt = L[1]; group.add(sp);
      }
      const c = V(0, 0, 0); L[0].forEach(i => c.add(P[i])); c.divideScalar(Math.max(L[0].length, 1));
      let mu = 0; L[0].forEach(i => { mu = Math.max(mu, P[i].clone().sub(c).dot(up)); });
      sp.position.copy(c).add(up.clone().multiplyScalar(mu + 0.8 + 0.6 * k));
      scaleSprite(sp, k);
      sp.visible = true;
      sp.material.opacity = al.other;
    });
    // setas
    arrows.forEach(a => { a.tube.visible = a.cone.visible = false; });
    s._ar.forEach(([fr, to], q) => {
      if (q > 2 || al.arr <= 0.01) return;
      const pt = (spec, end) => {
        if (spec[0] === "bd") return P[spec[1]].clone().add(P[spec[2]]).multiplyScalar(0.5);
        if (spec[0] === "lp") { const view = camL.clone().sub(P[spec[1]]).normalize(); return P[spec[1]].clone().add(lpDir(spec[1], P, fN, view).multiplyScalar(atoms[spec[1]].r + 0.28)); }
        return P[spec[1]].clone();
      };
      const S = pt(fr), E0 = pt(to);
      const dv = E0.clone().sub(S), L = dv.length();
      const E = to[0] === "at" ? E0.clone().sub(dv.clone().normalize().multiplyScalar(Math.min(atoms[to[1]].r + 0.12, L * 0.3))) : E0;
      const mid = S.clone().add(E).multiplyScalar(0.5);
      let nrm = dv.clone().cross(camL.clone().sub(mid).normalize());
      if (nrm.length() < 1e-3) nrm = up.clone();
      nrm.normalize();
      const ctrl = mid.add(nrm.multiplyScalar(Math.max(0.5, L * 0.45)));
      const curve = new THREE.QuadraticBezierCurve3(S, ctrl, E);
      const a = arrows[q];
      a.tube.geometry.dispose();
      a.tube.geometry = new THREE.TubeGeometry(curve, 24, 0.045, 6, false);
      const tg = curve.getTangent(1).normalize();
      a.cone.position.copy(E).sub(tg.clone().multiplyScalar(0.12));
      a.cone.quaternion.setFromUnitVectors(YAX, tg);
      a.tube.visible = a.cone.visible = true;
      a.tube.material.opacity = a.cone.material.opacity = al.arr;
    });
    if (pocket) {
      const pa = U.clamp(u - (R.pocketFrom - 1), 0, 1);
      pocket.material.opacity = 0.2 * pa;
      pocket.visible = pa > 0.01;
      pocketLab.visible = pa > 0.5;
      scaleSprite(pocketLab, k);
    }
    renderer.render(scene, camera);
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    if (!ok || !visible || document.hidden || !D) return;
    if (sway && !drag) swayT += dt;
    tick(ts);
    render(ts, dt);
  }

  /* ---------- ponteiro ---------- */
  let drag = false, pts = new Map(), pinch0 = 0, dist0 = 0;
  function pointer() {
    canvas.addEventListener("pointerdown", e => {
      canvas.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      drag = true;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = zoomK; }
    });
    canvas.addEventListener("pointermove", e => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch0 > 0) zoomK = U.clamp(dist0 * pinch0 / d, 0.45, 2.2);
        return;
      }
      rotY += (e.clientX - prev[0]) * 0.009;
      rotX = U.clamp(rotX + (e.clientY - prev[1]) * 0.009, -1.4, 1.4);
    });
    const end = e => { pts.delete(e.pointerId); if (!pts.size) drag = false; pinch0 = 0; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("wheel", e => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomK = U.clamp(zoomK * (1 + e.deltaY * 0.002), 0.45, 2.2);
    }, { passive: false });
    canvas.addEventListener("dblclick", () => { rotX = -0.2; rotY = 0.25; zoomK = 1; swayT = 0; });
  }

  return {
    init, load, goStep, scrub,
    next: () => { auto = false; if (stepI < R.steps.length - 1) goStep(stepI + 1); },
    prev: () => { auto = false; if (stepI > 0) goStep(stepI - 1); },
    restart: () => { auto = false; goStep(0, true); },
    play: () => { auto = !auto; if (auto) { if (stepI >= R.steps.length - 1) goStep(0, true); else goStep(stepI + 1); } return auto; },
    isAuto: () => auto,
    setSway: v => { sway = v; },
    sway: () => sway,
    frames: () => nF,
    step: () => stepI,
    ok: () => ok
  };
})();
