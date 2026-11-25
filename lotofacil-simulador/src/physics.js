// Motor físico do sorteio: 25 esferas rígidas dentro de um globo (tambor) fixo com rotor de pás.
// Unidades SI (m, kg, s). Sem dependências: roda igual no navegador e no Node.

export const DEFAULTS = {
  ballDiameter: 0.050, // 50 mm (dado divulgado pela Caixa)
  ballMass: 0.066, // 66 g (dado divulgado pela Caixa)
  massTol: 0.0003, // ± variação de fabricação por bola (kg)
  diamTol: 0.0002, // ± variação de fabricação por bola (m)
  // Globo: medido em fotos do Espaço da Sorte usando as bolas (50 mm) como régua.
  // Tambor FIXO (os tubos de carga entram por cima): frente plana com aro,
  // corpo cilíndrico curto e fundo abaulado. Quem gira é o rotor interno.
  globeRadius: 0.285, // abertura interna do aro ~57 cm (± 5% na foto de frente)
  globeDepth: 0.39, // profundidade ~1,4 × raio (± 15%, foto em perspectiva)
  hubRadius: 0.07, // cubo central do rotor: disco de ~14–22 cm na foto
  paddles: 3, // pás de acrílico radiais (a foto mostra 3; pode haver 4)
  rods: 3, // hastes metálicas radiais a 120° (encaixes visíveis no cubo)
  rpm: 34, // estimativa: não dá para medir em foto
  restitution: 0.72, // bola-bola (borracha maciça)
  wallRestitution: 0.6, // bola-acrílico
  friction: 0.4,
  airDrag: 0.02, // arrasto linear simplificado (1/s)
  spinDamping: 0.3, // resistência ao rolamento simplificada (1/s)
  gravity: 9.81,
  mixTime: 8, // s de mistura antes da 1ª bola
  interval: 2.5, // s de mistura entre retiradas
  picks: 15,
  total: 25,
  dt: 1 / 400,
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return (Math.random() * 4294967296) >>> 0;
}

// Tambor com eixo em z: frente plana em z = F, parede cilíndrica de zB até F
// e fundo em meia-esfera (centro em z = zB) atrás.
export function globeShape(p) {
  const R = p.globeRadius;
  const depth = Math.max(p.globeDepth, R + 0.08);
  const F = depth / 2, zB = R - depth / 2;
  return { R, depth, F, zB, zPort: (zB + F) / 2 };
}

// Rotor: cubo cilíndrico no eixo, pás planas radiais e hastes radiais finas.
export function rotorGeometry(p) {
  const s = globeShape(p);
  return {
    hub: p.hubRadius, ro: s.R - 0.008, // folga pá-parede menor que uma bola
    zLo: s.zB - 0.7 * s.R, zHi: s.F - 0.012, half: 0.004,
    rodR: 0.005, rodZ: s.F - 0.045,
  };
}

// Raio externo da pá na profundidade z (acompanha o fundo abaulado).
export function vaneOuter(p, z) {
  const s = globeShape(p), g = rotorGeometry(p);
  if (z >= s.zB) return g.ro;
  return Math.min(g.ro, Math.sqrt(Math.max(0, s.R ** 2 - (z - s.zB) ** 2)) - 0.008);
}

export class Draw {
  constructor(params = {}, seed = randomSeed()) {
    this.p = { ...DEFAULTS, ...params };
    this.seed = seed >>> 0;
    const rnd = mulberry32(this.seed);
    const p = this.p;
    this.time = 0;
    this.angle = rnd() * Math.PI * 2; // posição angular do rotor
    this.omega = (p.rpm * 2 * Math.PI) / 60;
    this.drawn = []; // números na ordem de saída
    this.done = false;
    this.nextPick = p.mixTime;
    this.portOpen = false;
    this.rot = rotorGeometry(p);
    this.shape = globeShape(p);
    const { F, zB } = this.shape;

    this.balls = [];
    const R = p.globeRadius;
    for (let i = 0; i < p.total; i++) {
      const r = (p.ballDiameter + (rnd() * 2 - 1) * p.diamTol) / 2;
      const m = p.ballMass + (rnd() * 2 - 1) * p.massTol;
      let x, y, z, ok, tries = 0;
      do {
        // posição inicial aleatória dentro do globo, sem sobreposição
        const lim = R - r - 0.05;
        x = (rnd() * 2 - 1) * lim;
        y = (rnd() * 2 - 1) * lim;
        z = zB - lim + rnd() * (F - r - 0.02 - (zB - lim));
        ok = Math.hypot(x, y, Math.min(0, z - zB)) < lim && Math.hypot(x, y) > p.hubRadius + r + 0.01;
        for (let j = 0; ok && j < this.balls.length; j++) {
          const b = this.balls[j];
          const d = Math.hypot(x - b.x, y - b.y, z - b.z);
          if (d < r + b.r + 0.002) ok = false;
        }
      } while (!ok && ++tries < 5000);
      this.balls.push({
        n: i + 1, r, m, I: 0.4 * m * r * r,
        x, y, z, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0,
        qx: 0, qy: 0, qz: 0, qw: 1, // orientação (para o desenho)
        active: true,
      });
    }
  }

  // Contato de uma bola com superfície de massa infinita (parede ou pá).
  // (nx,ny,nz) aponta da superfície para a bola; (sx,sy,sz) é a velocidade da superfície.
  _hitSurface(b, nx, ny, nz, pen, sx, sy, sz, e) {
    b.x += nx * pen; b.y += ny * pen; b.z += nz * pen;
    const rx = -b.r * nx, ry = -b.r * ny, rz = -b.r * nz;
    const cx = b.vx + (b.wy * rz - b.wz * ry) - sx;
    const cy = b.vy + (b.wz * rx - b.wx * rz) - sy;
    const cz = b.vz + (b.wx * ry - b.wy * rx) - sz;
    const vn = cx * nx + cy * ny + cz * nz;
    if (vn >= 0) return;
    const rest = vn > -0.15 ? 0 : e; // sem quique em contatos lentos (apoio)
    const jn = -(1 + rest) * vn * b.m;
    b.vx += (nx * jn) / b.m; b.vy += (ny * jn) / b.m; b.vz += (nz * jn) / b.m;
    const tx = cx - vn * nx, ty = cy - vn * ny, tz = cz - vn * nz;
    const vt = Math.hypot(tx, ty, tz);
    if (vt < 1e-9) return;
    const jt = Math.min(this.p.friction * jn, (vt * b.m * 2) / 7);
    const Jx = (-jt * tx) / vt, Jy = (-jt * ty) / vt, Jz = (-jt * tz) / vt;
    b.vx += Jx / b.m; b.vy += Jy / b.m; b.vz += Jz / b.m;
    b.wx += (ry * Jz - rz * Jy) / b.I;
    b.wy += (rz * Jx - rx * Jz) / b.I;
    b.wz += (rx * Jy - ry * Jx) / b.I;
  }

  _hitBalls(a, b) {
    let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    const rs = a.r + b.r;
    if (d2 >= rs * rs || d2 === 0) return;
    const d = Math.sqrt(d2);
    const nx = dx / d, ny = dy / d, nz = dz / d;
    const pen = rs - d;
    const ima = 1 / a.m, imb = 1 / b.m, ims = ima + imb;
    const ca = (pen * ima) / ims, cb = (pen * imb) / ims;
    a.x -= nx * ca; a.y -= ny * ca; a.z -= nz * ca;
    b.x += nx * cb; b.y += ny * cb; b.z += nz * cb;
    // velocidade relativa no ponto de contato (a em relação a b)
    const rax = a.r * nx, ray = a.r * ny, raz = a.r * nz;
    const rbx = -b.r * nx, rby = -b.r * ny, rbz = -b.r * nz;
    const cx = a.vx + (a.wy * raz - a.wz * ray) - b.vx - (b.wy * rbz - b.wz * rby);
    const cy = a.vy + (a.wz * rax - a.wx * raz) - b.vy - (b.wz * rbx - b.wx * rbz);
    const cz = a.vz + (a.wx * ray - a.wy * rax) - b.vz - (b.wx * rby - b.wy * rbx);
    const vn = cx * nx + cy * ny + cz * nz;
    if (vn <= 0) return;
    const rest = vn < 0.15 ? 0 : this.p.restitution;
    const jn = ((1 + rest) * vn) / ims;
    a.vx -= nx * jn * ima; a.vy -= ny * jn * ima; a.vz -= nz * jn * ima;
    b.vx += nx * jn * imb; b.vy += ny * jn * imb; b.vz += nz * jn * imb;
    const tx = cx - vn * nx, ty = cy - vn * ny, tz = cz - vn * nz;
    const vt = Math.hypot(tx, ty, tz);
    if (vt < 1e-9) return;
    const k = ims + (a.r * a.r) / a.I + (b.r * b.r) / b.I;
    const jt = Math.min(this.p.friction * jn, vt / k);
    const Jx = (-jt * tx) / vt, Jy = (-jt * ty) / vt, Jz = (-jt * tz) / vt; // sobre a
    a.vx += Jx * ima; a.vy += Jy * ima; a.vz += Jz * ima;
    b.vx -= Jx * imb; b.vy -= Jy * imb; b.vz -= Jz * imb;
    a.wx += (ray * Jz - raz * Jy) / a.I;
    a.wy += (raz * Jx - rax * Jz) / a.I;
    a.wz += (rax * Jy - ray * Jx) / a.I;
    b.wx -= (rby * Jz - rbz * Jy) / b.I;
    b.wy -= (rbz * Jx - rbx * Jz) / b.I;
    b.wz -= (rbx * Jy - rby * Jx) / b.I;
  }

  // Avança um passo. Retorna o número da bola retirada neste passo, ou 0.
  step() {
    if (this.done) return 0;
    const p = this.p, dt = p.dt, R = p.globeRadius, w = this.omega;
    const balls = this.balls;
    this.time += dt;
    this.angle += w * dt;
    const lin = Math.max(0, 1 - p.airDrag * dt);
    const ang = Math.max(0, 1 - p.spinDamping * dt);

    for (const b of balls) {
      if (!b.active) continue;
      b.vy -= p.gravity * dt;
      b.vx *= lin; b.vy *= lin; b.vz *= lin;
      b.wx *= ang; b.wy *= ang; b.wz *= ang;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      // orientação: q += 0.5 * dt * (w ⊗ q)
      const h = 0.5 * dt, { qx, qy, qz, qw } = b;
      b.qx += h * (b.wx * qw + b.wy * qz - b.wz * qy);
      b.qy += h * (b.wy * qw + b.wz * qx - b.wx * qz);
      b.qz += h * (b.wz * qw + b.wx * qy - b.wy * qx);
      b.qw += h * (-b.wx * qx - b.wy * qy - b.wz * qz);
      const ql = Math.hypot(b.qx, b.qy, b.qz, b.qw);
      b.qx /= ql; b.qy /= ql; b.qz /= ql; b.qw /= ql;
    }

    for (let i = 0; i < balls.length; i++) {
      if (!balls[i].active) continue;
      for (let j = i + 1; j < balls.length; j++) {
        if (balls[j].active) this._hitBalls(balls[i], balls[j]);
      }
    }

    const { hub, ro, zLo, zHi, half, rodR, rodZ } = this.rot;
    const { F, zB, zPort } = this.shape;
    for (const b of balls) {
      if (!b.active) continue;
      // pás (placas radiais) e hastes do rotor: ponto mais próximo no plano da pá
      const nV = p.paddles, nT = nV + p.rods;
      for (let k = 0; k < nT; k++) {
        const isRod = k >= nV;
        const th = isRod
          ? this.angle + ((k - nV + 0.5) * 2 * Math.PI) / p.rods
          : this.angle + (k * 2 * Math.PI) / nV;
        const ux = Math.cos(th), uy = Math.sin(th);
        const cz = isRod ? rodZ : Math.max(zLo, Math.min(zHi, b.z));
        let uo = ro;
        if (cz < zB) uo = Math.min(ro, Math.sqrt(Math.max(0, R * R - (cz - zB) ** 2)) - 0.008);
        if (uo <= hub) continue;
        const cu = Math.max(hub, Math.min(uo, b.x * ux + b.y * uy));
        const px = ux * cu, py = uy * cu;
        const dx = b.x - px, dy = b.y - py, dz = b.z - cz;
        const d = Math.hypot(dx, dy, dz), lim = b.r + (isRod ? rodR : half);
        if (d < lim && d > 0) {
          this._hitSurface(b, dx / d, dy / d, dz / d, lim - d, -w * py, w * px, 0, p.wallRestitution);
        }
      }
      // cubo central girando
      const dh = Math.hypot(b.x, b.y);
      if (hub > 0 && dh < hub + b.r && dh > 0) {
        const nx = b.x / dh, ny = b.y / dh;
        this._hitSurface(b, nx, ny, 0, hub + b.r - dh, -w * ny * hub, w * nx * hub, 0, p.wallRestitution);
      }
      // parede fixa
      const dzb = Math.min(0, b.z - zB); // atrás de zB vale a meia-esfera; à frente, o cilindro
      const d = Math.hypot(b.x, b.y, dzb);
      if (d > R - b.r) {
        this._hitSurface(b, -b.x / d, -b.y / d, -dzb / d, d - (R - b.r), 0, 0, 0, p.wallRestitution);
      }
      if (b.z > F - b.r) { // tampa frontal plana
        this._hitSurface(b, 0, 0, -1, b.z - (F - b.r), 0, 0, 0, p.wallRestitution);
      }
    }

    // Retirada: no instante programado a boca de captação (fundo do globo) abre
    // e a primeira bola a assentar nela desce para o tubo.
    this.portOpen = this.time >= this.nextPick;
    if (this.portOpen) {
      let best = null, bestOff = Infinity;
      for (const b of balls) {
        if (!b.active) continue;
        const d = Math.hypot(b.x, b.y);
        if (d < R - b.r - 0.004 || b.y > 0) continue; // precisa estar encostada no fundo
        const off = Math.hypot(b.x, b.z - zPort);
        if (off < b.r * 0.6 && off < bestOff) { best = b; bestOff = off; }
      }
      if (best) {
        best.active = false;
        this.drawn.push(best.n);
        this.nextPick = this.time + p.interval;
        this.portOpen = false;
        if (this.drawn.length >= p.picks) this.done = true;
        return best.n;
      }
    }
    return 0;
  }
}

// Roda um sorteio completo sem desenhar nada. Retorna os números na ordem de saída.
export function runDraw(params, seed) {
  const d = new Draw(params, seed);
  const maxSteps = Math.ceil(600 / d.p.dt); // trava de segurança: 10 min simulados
  for (let i = 0; i < maxSteps && !d.done; i++) d.step();
  return { seed: d.seed, order: d.drawn.slice(), time: d.time, complete: d.done };
}
