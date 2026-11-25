import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Draw, DEFAULTS, runDraw, randomSeed, paddleGeometry, globeShape } from './physics.js';

const $ = (id) => document.getElementById(id);
const pad2 = (n) => String(n).padStart(2, '0');
const ROXO = '#930089';

// ---------- parâmetros editáveis ----------
const FIELDS = [
  ['ballDiameter', 'Diâmetro da bola (mm)', 1000, 40, 60, 0.5],
  ['ballMass', 'Massa da bola (g)', 1000, 40, 100, 1],
  ['globeRadius', 'Raio do globo (cm)', 100, 20, 40, 1],
  ['globeDepth', 'Profundidade do globo (cm)', 100, 28, 80, 1],
  ['rpm', 'Rotação do globo (rpm)', 1, 10, 55, 1],
  ['paddles', 'Hastes na parede', 1, 0, 12, 1],
  ['crossbars', 'Hastes diametrais', 1, 0, 3, 1],
  ['restitution', 'Elasticidade bola-bola', 1, 0.3, 0.95, 0.01],
  ['friction', 'Atrito', 1, 0, 1, 0.05],
  ['mixTime', 'Mistura inicial (s)', 1, 2, 30, 1],
  ['interval', 'Intervalo entre bolas (s)', 1, 1, 10, 0.5],
];
const params = { ...DEFAULTS };

function buildParamInputs() {
  const box = $('params');
  for (const [key, label, scale, min, max, step] of FIELDS) {
    const row = document.createElement('label');
    row.className = 'row';
    const val = +(params[key] * scale).toFixed(3);
    row.innerHTML = `<span>${label}</span><input type="number" id="p_${key}" value="${val}" min="${min}" max="${max}" step="${step}">`;
    box.appendChild(row);
    row.querySelector('input').addEventListener('change', (e) => {
      const v = Math.min(max, Math.max(min, Number(e.target.value) || min));
      e.target.value = v;
      params[key] = v / scale;
      resetScene();
    });
  }
}

// ---------- cena 3D ----------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color('#14101c');
const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 20);
camera.position.set(0.95, 0.3, 2.15);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0.3, -0.12, 0);
controls.enableDamping = true;
controls.minDistance = 0.5;
controls.maxDistance = 4;

scene.add(new THREE.HemisphereLight('#ffffff', '#3a2a4a', 1.1));
const sun = new THREE.DirectionalLight('#ffffff', 1.6);
sun.position.set(1, 2, 2);
scene.add(sun);

const globeGroup = new THREE.Group(); // gira com o globo
const staticGroup = new THREE.Group(); // base, tubo, canaleta
scene.add(globeGroup, staticGroup);
const ballMeshes = [];
let trayStart = new THREE.Vector3();

function ballTexture(n) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const hue = ((n - 1) * 360) / 25;
  g.fillStyle = `hsl(${hue} 70% 45%)`;
  g.fillRect(0, 0, 256, 128);
  for (const cx of [64, 192]) {
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(cx, 64, 30, 38, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111';
    g.font = 'bold 44px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(cx, 67); g.scale(0.8, 1); g.fillText(pad2(n), 0, 0); g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const textures = [];
for (let n = 1; n <= 25; n++) textures.push(ballTexture(n));

function clearGroup(g) {
  for (const o of [...g.children]) {
    g.remove(o);
    o.traverse?.((m) => { m.geometry?.dispose(); });
  }
}

function buildScene() {
  clearGroup(globeGroup); clearGroup(staticGroup);
  for (const m of ballMeshes) { scene.remove(m); m.geometry.dispose(); }
  ballMeshes.length = 0;
  const R = params.globeRadius;

  const { F, zB, zPort } = globeShape(params);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.13, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.004, R + 0.004, F - zB, 48, 1, true), glassMat);
  wall.rotation.x = Math.PI / 2;
  wall.position.z = (F + zB) / 2;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R + 0.004, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
  dome.rotation.x = -Math.PI / 2; // polo voltado para trás
  dome.position.z = zB;
  const front = new THREE.Mesh(new THREE.CircleGeometry(R + 0.004, 48), glassMat);
  front.position.z = F;
  globeGroup.add(wall, dome, front);
  const ringMat = new THREE.MeshStandardMaterial({ color: '#dfe6ee', metalness: 0.2, roughness: 0.5 });
  for (const [z, thick] of [[F, 0.011], [zB, 0.005]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.008, thick, 10, 72), ringMat);
    ring.position.z = z;
    globeGroup.add(ring);
  }
  const pg = paddleGeometry(params);
  const padMat = new THREE.MeshStandardMaterial({ color: '#e8eef5', metalness: 0.3, roughness: 0.4 });
  for (let k = 0; k < params.paddles; k++) {
    const th = (k * 2 * Math.PI) / params.paddles;
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(pg.radius, pg.zHi - pg.zLo, 4, 10), padMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(pg.rho * Math.cos(th), pg.rho * Math.sin(th), (pg.zHi + pg.zLo) / 2);
    globeGroup.add(bar);
  }
  for (let k = 0; k < params.crossbars; k++) {
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(pg.radius, pg.barHalf * 2, 4, 10), padMat);
    bar.rotation.z = (k * Math.PI) / params.crossbars - Math.PI / 2;
    bar.position.z = zPort;
    globeGroup.add(bar);
  }

  // estrutura fixa: eixo, tubo de saída e canaleta das bolas sorteadas
  const metal = new THREE.MeshStandardMaterial({ color: '#5b4a78', metalness: 0.5, roughness: 0.45 });
  // o tambor real é apoiado por trás, deixando a frente livre
  const zBack = zB - R - 0.04;
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, R + 0.25, 0.03), metal);
  leg.position.set(0, -(R + 0.25) / 2, zBack);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 16), metal);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0, 0, zBack + 0.02);
  staticGroup.add(leg, hub);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.03, 2 * R + 0.3), metal);
  base.position.set(0.35, -R - 0.25, 0);
  staticGroup.add(base);
  const tubeMat = new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.1, 20, 1, true), tubeMat);
  tube.position.set(0, -R - 0.05, zPort);
  staticGroup.add(tube);
  const trayY = -R - 0.13;
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.008, 0.07), metal);
  tray.position.set(0.42, trayY - 0.03, zPort);
  staticGroup.add(tray);
  trayStart = new THREE.Vector3(0.84, trayY, zPort);

  for (let i = 0; i < 25; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(params.ballDiameter / 2, 24, 16),
      new THREE.MeshStandardMaterial({ map: textures[i], roughness: 0.45 }),
    );
    scene.add(mesh);
    ballMeshes.push(mesh);
  }
}

// ---------- estado do sorteio ao vivo ----------
let draw = null;
let running = false;
let speed = 1;
let acc = 0;
let lastT = 0;
const exits = new Map(); // nº da bola -> {t, from, slot}

function trayPos(slot) {
  return new THREE.Vector3(trayStart.x - slot * (params.ballDiameter + 0.004), trayStart.y, trayStart.z);
}

function resetScene(seed) {
  running = false;
  exits.clear();
  buildScene();
  draw = new Draw(params, seed ?? randomSeed());
  $('seed').value = draw.seed;
  $('btnStart').textContent = 'Iniciar sorteio';
  renderLive();
  syncMeshes();
}

function syncMeshes() {
  globeGroup.rotation.z = draw.angle;
  for (const b of draw.balls) {
    const m = ballMeshes[b.n - 1];
    const ex = exits.get(b.n);
    if (ex) {
      // animação da bola descendo o tubo e rolando pela canaleta
      const k = Math.min(1, ex.t);
      const drop = new THREE.Vector3(0, trayStart.y, trayStart.z);
      const end = trayPos(ex.slot);
      if (k < 0.35) m.position.lerpVectors(ex.from, drop, k / 0.35);
      else m.position.lerpVectors(drop, end, (k - 0.35) / 0.65);
      if (k >= 1) m.quaternion.set(0, 0, 0, 1); // número virado para a frente
      else m.rotation.z -= 0.2;
    } else {
      m.position.set(b.x, b.y, b.z);
      m.quaternion.set(b.qx, b.qy, b.qz, b.qw);
    }
  }
}

function renderLive() {
  const el = $('liveOrder');
  el.innerHTML = '';
  for (const n of draw.drawn) {
    const s = document.createElement('span');
    s.className = 'ball';
    s.textContent = pad2(n);
    el.appendChild(s);
  }
  const left = params.picks - draw.drawn.length;
  let status = 'Pronto. Clique em “Iniciar sorteio”.';
  if (draw.done) status = 'Sorteio concluído.';
  else if (running) status = draw.portOpen ? 'Captação aberta…' : `Misturando… faltam ${left} bolas`;
  else if (draw.time > 0) status = 'Pausado.';
  $('status').textContent = status;
  $('clock').textContent = `${draw.time.toFixed(1)} s simulados`;
  $('btnUse').disabled = !draw.done;
}

function finishLive() {
  running = false;
  $('btnStart').textContent = 'Novo sorteio';
  renderLive();
}

function frame(t) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(0.05, (t - lastT) / 1000 || 0);
  lastT = t;
  if (running && draw && !draw.done) {
    acc += elapsed * speed;
    let changed = false;
    const budget = performance.now() + 12; // não travar o quadro em velocidades altas
    while (acc >= draw.p.dt && !draw.done && performance.now() < budget) {
      acc -= draw.p.dt;
      const n = draw.step();
      if (n) {
        const b = draw.balls[n - 1];
        exits.set(n, { t: 0, from: new THREE.Vector3(b.x, b.y, b.z), slot: draw.drawn.length - 1 });
        changed = true;
      }
    }
    if (acc > 0.5) acc = 0;
    if (draw.done) finishLive();
    else if (changed || Math.floor(t / 200) !== Math.floor((t - elapsed * 1000) / 200)) renderLive();
  }
  for (const ex of exits.values()) ex.t += elapsed * 1.2 * Math.max(1, speed / 2);
  if (draw) syncMeshes();
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  controls.update();
  renderer.render(scene, camera);
}

// ---------- jogos gerados ----------
const games = []; // {seed, order[], nums[] (ordenado)}

function addGame(seed, order) {
  games.push({ seed, order: order.slice(), nums: order.slice().sort((a, b) => a - b) });
}

function renderGames() {
  const box = $('games');
  box.innerHTML = '';
  games.forEach((g, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    let grid = '';
    for (let n = 1; n <= 25; n++) grid += `<i class="${g.nums.includes(n) ? 'on' : ''}">${pad2(n)}</i>`;
    card.innerHTML = `<header><b>Jogo ${i + 1}</b><small title="Semente: repete exatamente este sorteio">semente ${g.seed}</small></header><div class="grid">${grid}</div>`;
    box.appendChild(card);
  });
  $('gamesCount').textContent = games.length ? `${games.length} jogo(s)` : 'Nenhum jogo gerado ainda.';
  for (const id of ['btnPng', 'btnTxt', 'btnPrint', 'btnClear']) $(id).disabled = !games.length;

  const freq = new Array(26).fill(0);
  for (const g of games) for (const n of g.nums) freq[n]++;
  const max = Math.max(1, ...freq);
  let html = '';
  for (let n = 1; n <= 25; n++) {
    html += `<div class="fq"><span>${pad2(n)}</span><div><b style="width:${(freq[n] / max) * 100}%"></b></div><em>${freq[n]}</em></div>`;
  }
  $('freq').innerHTML = games.length ? html : '';
  $('freqBox').hidden = !games.length;
}

let batchRunning = false;
function generateBatch() {
  if (batchRunning) { batchRunning = false; return; }
  const total = Math.min(500, Math.max(1, Math.floor(Number($('qty').value) || 1)));
  $('qty').value = total;
  batchRunning = true;
  $('btnBatch').textContent = 'Cancelar';
  let made = 0;
  const tick = () => {
    const until = performance.now() + 60;
    while (batchRunning && made < total && performance.now() < until) {
      const r = runDraw(params, randomSeed());
      if (r.complete) { addGame(r.seed, r.order); made++; }
    }
    $('batchStatus').textContent = `Simulando… ${made}/${total}`;
    if (batchRunning && made < total) return setTimeout(tick, 0);
    batchRunning = false;
    $('btnBatch').textContent = 'Simular e gerar';
    $('batchStatus').textContent = `${made} sorteio(s) simulado(s).`;
    renderGames();
  };
  setTimeout(tick, 0);
}

// ---------- exportação ----------
function gamesCanvas() {
  const cols = Math.min(4, games.length), rows = Math.ceil(games.length / cols);
  const cw = 250, ch = 300, m = 24, head = 70;
  const c = document.createElement('canvas');
  c.width = m + cols * (cw + m);
  c.height = head + rows * (ch + m) + 34;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = ROXO; g.fillRect(0, 0, c.width, 50);
  g.fillStyle = '#fff'; g.font = 'bold 22px Arial'; g.textBaseline = 'middle';
  g.fillText('Lotofácil — jogos do simulador', m, 26);
  games.forEach((gm, i) => {
    const x = m + (i % cols) * (cw + m), y = head + Math.floor(i / cols) * (ch + m);
    g.strokeStyle = ROXO; g.lineWidth = 2; g.strokeRect(x, y, cw, ch);
    g.fillStyle = ROXO; g.font = 'bold 16px Arial'; g.textAlign = 'left';
    g.fillText(`Jogo ${i + 1}`, x + 12, y + 20);
    g.fillStyle = '#777'; g.font = '11px Arial'; g.textAlign = 'right';
    g.fillText(`semente ${gm.seed}`, x + cw - 12, y + 20);
    for (let n = 1; n <= 25; n++) {
      const cx = x + 15 + ((n - 1) % 5) * 45 + 20, cy = y + 42 + Math.floor((n - 1) / 5) * 50 + 22;
      const on = gm.nums.includes(n);
      g.beginPath(); g.arc(cx, cy, 19, 0, Math.PI * 2);
      g.fillStyle = on ? ROXO : '#fff'; g.fill();
      g.strokeStyle = on ? ROXO : '#c9c9c9'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = on ? '#fff' : '#b5b5b5';
      g.font = 'bold 16px Arial'; g.textAlign = 'center';
      g.fillText(pad2(n), cx, cy + 1);
    }
  });
  g.fillStyle = '#777'; g.font = '11px Arial'; g.textAlign = 'left';
  g.fillText('Gerado por simulação física. Não aumenta a chance de acerto: todas as combinações são igualmente prováveis.', m, c.height - 16);
  return c;
}

function download(name, href) {
  const a = document.createElement('a');
  a.download = name; a.href = href;
  document.body.appendChild(a); a.click(); a.remove();
}

function exportPng() {
  gamesCanvas().toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    download('jogos-lotofacil.png', url);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
}

function exportTxt() {
  const lines = games.map((g, i) => `Jogo ${pad2(i + 1)}: ${g.nums.map(pad2).join(' ')}   (ordem de saída: ${g.order.map(pad2).join('-')}; semente ${g.seed})`);
  const url = URL.createObjectURL(new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' }));
  download('jogos-lotofacil.txt', url);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------- eventos ----------
$('btnStart').addEventListener('click', () => {
  if (draw.done) resetScene();
  running = !running;
  if (running) acc = 0;
  $('btnStart').textContent = running ? 'Pausar' : 'Continuar';
  renderLive();
});
$('btnReset').addEventListener('click', () => resetScene());
$('btnSeed').addEventListener('click', () => {
  const s = Number($('seed').value);
  resetScene(Number.isFinite(s) ? s >>> 0 : undefined);
});
$('speed').addEventListener('change', (e) => { speed = Number(e.target.value); });
$('btnUse').addEventListener('click', () => {
  if (!draw.done) return;
  if (!games.some((g) => g.seed === draw.seed && g.order.join() === draw.drawn.join())) addGame(draw.seed, draw.drawn);
  renderGames();
});
$('btnBatch').addEventListener('click', generateBatch);
$('btnPng').addEventListener('click', exportPng);
$('btnTxt').addEventListener('click', exportTxt);
$('btnPrint').addEventListener('click', () => window.print());
$('btnClear').addEventListener('click', () => { games.length = 0; renderGames(); });

buildParamInputs();
resetScene();
renderGames();
requestAnimationFrame(frame);

// ganchos para testes automatizados
window.__sim = { get draw() { return draw; }, games, setSpeed: (s) => { speed = s; } };
