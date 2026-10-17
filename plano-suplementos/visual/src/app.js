/* Liga tudo: abas de área, P&ID, bancada, ficha técnica e palco 3D. */

(() => {
  const $ = id => document.getElementById(id);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } }
  };
  const state = { tab: "whey", st: { whey: 0, creatina: 0, pre: 0 }, rx: null };

  Bench.mount({ canvas: $("scene"), wrap: $("scene-wrap"), controls: $("controls"), readouts: $("readouts"), play: $("scene-play"), title: $("scene-ttl") });

  /* ---------- palco 3D ---------- */
  const scrubEl = $("scrub");
  Stage.init($("stage"), $("stage-msg"), {
    onStep: k => renderStory(k),
    onU: v => { if (document.activeElement !== scrubEl) scrubEl.value = v; }
  });
  scrubEl.addEventListener("input", () => Stage.scrub(+scrubEl.value));
  $("rx-prev").addEventListener("click", () => Stage.prev());
  $("rx-next").addEventListener("click", () => Stage.next());
  $("rx-restart").addEventListener("click", () => Stage.restart());
  const playBtn = $("rx-play");
  playBtn.addEventListener("click", () => { const a = Stage.play(); playBtn.setAttribute("aria-pressed", a ? "true" : "false"); playBtn.textContent = a ? "❚❚ Pausar" : "▶ Reproduzir tudo"; });
  const swayBtn = $("rx-sway");
  swayBtn.setAttribute("aria-pressed", Stage.sway() ? "true" : "false");
  swayBtn.addEventListener("click", () => { const v = !Stage.sway(); Stage.setSway(v); swayBtn.setAttribute("aria-pressed", v ? "true" : "false"); });

  function loadRx(k) {
    state.rx = k;
    const R = RX[k];
    $("rx-title").textContent = R.title;
    scrubEl.max = String(REACT[k].frames.length - 1);
    scrubEl.value = "0";
    document.querySelectorAll("#rx-chips .chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.k === k ? "true" : "false"));
    playBtn.setAttribute("aria-pressed", "false");
    playBtn.textContent = "▶ Reproduzir tudo";
    $("stage").setAttribute("aria-label", `Modelo 3D: ${R.title}. ${R.sub}`);
    Stage.load(k);
  }

  function renderStory(k) {
    const R = RX[state.rx];
    if (!R) return;
    const st = $("story");
    st.innerHTML = `<h3>${R.title}</h3><p class="sub">${R.sub}</p><ol class="steps">${R.steps.map((s, i) => `
      <li class="${i === k ? "on" : ""}"><button type="button" data-i="${i}" aria-expanded="${i === k}">${s.t}</button>
      ${i === k ? `<div class="body"><p>${s.txt}</p>${s.why ? `<div class="why"><b>Por quê</b>${s.why}</div>` : ""}</div>` : ""}</li>`).join("")}</ol>`;
    st.querySelectorAll("button[data-i]").forEach(b => b.addEventListener("click", () => Stage.goStep(+b.dataset.i)));
    $("rx-step-lab").textContent = `passo ${k + 1} de ${R.steps.length} · ${R.steps[k].t}`;
    $("rx-prev").disabled = k === 0;
    $("rx-next").disabled = k === R.steps.length - 1;
    if (!Stage.isAuto() && playBtn.getAttribute("aria-pressed") === "true") { playBtn.setAttribute("aria-pressed", "false"); playBtn.textContent = "▶ Reproduzir tudo"; }
  }

  /* ---------- linha e ficha ---------- */
  function renderTab(tab) {
    state.tab = tab;
    store.set("pdp-tab", tab);
    const L = LINES[tab];
    document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", t.dataset.tab === tab ? "true" : "false"));
    $("panel").setAttribute("aria-labelledby", "tab-" + tab);
    $("line-intro").textContent = L.intro;
    $("pid").innerHTML = PID.build(L);
    $("pid").querySelectorAll(".st").forEach(g => {
      const go = () => selectStation(+g.dataset.i, true);
      g.addEventListener("click", go);
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    $("rx-chips").innerHTML = L.rx.map(k => `<button type="button" class="chip" data-k="${k}" aria-pressed="false">${RX[k].title}</button>`).join("");
    $("rx-chips").querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => loadRx(c.dataset.k)));
    selectStation(state.st[tab], false);
    loadRx(L.rx[0]);
  }

  function selectStation(i, scroll) {
    const L = LINES[state.tab], n = L.stations.length;
    i = U.clamp(i, 0, n - 1);
    state.st[state.tab] = i;
    const st = L.stations[i];
    $("pid").querySelectorAll(".st").forEach(g => g.classList.toggle("on", +g.dataset.i === i));
    $("counter").textContent = `Etapa ${i + 1} de ${n} · ${st.tag}`;
    $("prev").disabled = i === 0;
    $("next").disabled = i === n - 1;
    const g = $("pid").querySelector(`.st[data-i="${i}"]`), box = $("pid");
    if (g && box.scrollWidth > box.clientWidth) {
      const x = 92 + i * 150 - box.clientWidth / 2;
      box.scrollTo({ left: Math.max(0, x), behavior: scroll && !U.reduced ? "smooth" : "auto" });
    }
    const sh = $("sheet");
    sh.innerHTML = `
      <div class="sheet-head"><span class="tagchip">${st.tag}</span><h3>${st.name}</h3></div>
      <div class="blk"><h4>O que acontece</h4><p>${st.what}</p></div>
      <div class="blk why"><h4>Por que funciona</h4><p>${st.why}</p></div>
      ${st.chart ? `<canvas class="xchart" id="xchart" role="img" aria-label="Frações em função do pH: nitrogênio livre da sarcosina, cianamida neutra, velocidade relativa de formação de creatina e de diciandiamida."></canvas>` : ""}
      <div class="blk"><h4>Números reais</h4><dl class="nums">${st.nums.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl></div>
      <div class="blk risk"><h4>Se der errado</h4><p>${st.risk}</p></div>
      ${st.rx ? `<button type="button" class="btn link-3d" id="go3d">Ver a reação em 3D ↓</button>` : ""}`;
    if (st.rx) $("go3d").addEventListener("click", () => { loadRx(st.rx); $("reacoes").scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" }); });
    Bench.show(`${state.tab}-${i}`, st, st.chart ? $("xchart") : null);
    requestAnimationFrame(() => Bench.drawX());
  }

  $("prev").addEventListener("click", () => selectStation(state.st[state.tab] - 1, true));
  $("next").addEventListener("click", () => selectStation(state.st[state.tab] + 1, true));
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => renderTab(t.dataset.tab)));
  document.querySelector(".tabs").addEventListener("keydown", e => {
    const tabs = [...document.querySelectorAll(".tab")], i = tabs.findIndex(t => t.dataset.tab === state.tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const j = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
      tabs[j].focus(); renderTab(tabs[j].dataset.tab);
    }
  });

  const hash = (location.hash || "").replace("#", "");
  const first = LINES[hash] ? hash : (LINES[store.get("pdp-tab")] ? store.get("pdp-tab") : "whey");
  renderTab(first);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => Bench.redraw());
})();
