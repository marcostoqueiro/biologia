/* Bancada: hospeda a cena da estação (canvas 800 × 500 lógico), controles e leituras. */

const SCENES = {};

const Bench = (() => {
  let canvas, ctx, wrap, ctrlBox, roBox, playBtn, ttl, xcanvas = null;
  let scene = null, key = null, scale = 1, running = !U.reduced, visible = true, last = 0, roT = 0;
  const cache = {};
  let buttons = [];

  function mount(el) {
    canvas = el.canvas; wrap = el.wrap; ctrlBox = el.controls; roBox = el.readouts; playBtn = el.play; ttl = el.title;
    ctx = canvas.getContext("2d");
    playBtn.addEventListener("click", () => { running = !running; setPlay(); });
    setPlay();
    try { new ResizeObserver(() => { size(); draw(); }).observe(wrap); } catch (e) { addEventListener("resize", () => { size(); draw(); }); }
    try {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(wrap);
    } catch (e) { visible = true; }
    requestAnimationFrame(loop);
  }

  function setPlay() {
    playBtn.textContent = running ? "❚❚ Pausar animação" : "▶ Animar";
    playBtn.setAttribute("aria-pressed", running ? "false" : "true");
  }

  function show(k, st, xc) {
    key = k; xcanvas = xc || null;
    if (!cache[k]) {
      const s = SCENES[st.scene]();
      s.p = {};
      for (const c of s.controls) if (c.type === "range") s.p[c.id] = c.value;
      s.init();
      cache[k] = s;
    }
    scene = cache[k];
    ttl.textContent = `${st.tag} · simulação didática`;
    canvas.setAttribute("aria-label", scene.aria || st.name);
    controls();
    size();
    draw();
    readouts();
  }

  function fmtCtl(c, v) { return (c.fmt ? c.fmt(v) : U.fmt(v, (String(c.step).split(".")[1] || "").length)) + (c.unit ? " " + c.unit : ""); }

  function controls() {
    ctrlBox.innerHTML = "";
    buttons = [];
    const btns = document.createElement("div");
    btns.className = "btns";
    for (const c of scene.controls) {
      const id = `c-${key}-${c.id}`;
      if (c.type === "range") {
        const box = document.createElement("div");
        box.className = "ctl";
        box.innerHTML = `<label for="${id}"><span>${c.label}</span><output for="${id}"></output></label><input type="range" id="${id}" min="${c.min}" max="${c.max}" step="${c.step}">`;
        const inp = box.querySelector("input"), out = box.querySelector("output");
        inp.value = scene.p[c.id];
        out.textContent = fmtCtl(c, scene.p[c.id]);
        inp.addEventListener("input", () => {
          scene.p[c.id] = +inp.value;
          out.textContent = fmtCtl(c, scene.p[c.id]);
          if (scene.onChange) scene.onChange(c.id, scene.p[c.id]);
          states();
          if (!running) draw();
          readouts();
          drawX();
        });
        ctrlBox.appendChild(box);
      } else {
        const b = document.createElement("button");
        b.type = "button";
        b.id = id;
        b.className = "btn" + (c.primary ? " primary" : "");
        b.textContent = c.label;
        if (c.type === "toggle") b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", () => {
          scene.onButton(c.id);
          if (!running) { running = true; setPlay(); }
          states();
          draw();
          readouts();
        });
        buttons.push([c, b]);
        btns.appendChild(b);
      }
    }
    if (btns.children.length) ctrlBox.appendChild(btns);
    states();
  }

  function states() {
    for (const [c, b] of buttons) {
      const st = (scene.ctrlState && scene.ctrlState(c.id)) || {};
      b.disabled = !!st.disabled;
      if (st.label) b.textContent = st.label;
      if (c.type === "toggle") b.setAttribute("aria-pressed", st.pressed ? "true" : "false");
    }
  }

  function size() {
    const w = Math.max(wrap.clientWidth, 560), h = Math.round(w * 0.625);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    scale = w / 800 * dpr;
  }

  function draw() {
    if (!scene) return;
    const C = U.colors();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.surface2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.lineJoin = "round";
    scene.draw(ctx, C);
  }

  function drawX() {
    if (!xcanvas || !scene || !scene.xchart) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = xcanvas.clientWidth, h = xcanvas.clientHeight;
    if (!w) return;
    if (xcanvas.width !== Math.round(w * dpr)) { xcanvas.width = Math.round(w * dpr); xcanvas.height = Math.round(h * dpr); }
    const x = xcanvas.getContext("2d");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, w, h);
    scene.xchart(x, w, h, U.colors());
  }

  function readouts() {
    if (!scene) return;
    roBox.innerHTML = scene.readouts().map(r =>
      `<div class="ro ${r.tone || ""}"><span class="k">${r.k}</span><span class="v">${r.v}${r.u ? `<small>${r.u}</small>` : ""}</span></div>`).join("");
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0);
    last = ts;
    if (!scene || !running || !visible || document.hidden) return;
    scene.update(dt);
    draw();
    roT += dt;
    if (roT > 0.25) { roT = 0; readouts(); states(); drawX(); }
  }

  return { mount, show, drawX, redraw: () => { draw(); drawX(); } };
})();
