/* Diagrama P&ID da linha: símbolos de equipamento em SVG, tubulação com fluxo animado. */

const PID = (() => {
  const SP = 150, CY = 96, X0 = 92;
  const STREAM = { whey: "var(--whey)", heat: "var(--heat)", water: "var(--water)" };

  const SYM = {
    tank: () => `
      <path class="eqf" style="fill:var(--whey)" d="M-30,-4 h60 v26 q0,22 -30,22 q-30,0 -30,-22 z"/>
      <path class="eq" d="M-30,-40 h60 v62 q0,22 -30,22 q-30,0 -30,-22 z"/>
      <path class="eqd" d="M0,-50 V24 M-14,24 h28 M-8,-50 h16 v-6 h-16 z"/>`,
    centrifuge: () => `
      <path class="eq" d="M-12,-44 h24 l22,30 v18 l-22,26 h-24 l-22,-26 v-18 z"/>
      <path class="eqm" d="M-24,-10 l14,-16 M-24,0 l20,-22 M-22,10 l24,-26 M24,-10 l-14,-16 M24,0 l-20,-22 M22,10 l-24,-26"/>
      <path class="eqd" d="M0,30 v12 M-14,42 h28 v8 h-28 z"/>`,
    plates: () => `
      <rect class="eq" x="-38" y="-34" width="76" height="62" rx="3"/>
      <path class="eqm" d="M-28,-30 v54 M-20,-30 v54 M-12,-30 v54 M-4,-30 v54 M4,-30 v54 M12,-30 v54 M20,-30 v54 M28,-30 v54"/>
      <path class="eqd" style="stroke:var(--heat)" d="M-30,38 l8,-6 l8,6 l8,-6 l8,6 l8,-6 l8,6 l8,-6 l8,6"/>`,
    membrane: () => `
      <rect class="eq" x="-42" y="-18" width="84" height="36" rx="18"/>
      <path class="eqd" stroke-dasharray="4 3" d="M-34,0 h68"/>
      <path class="eqd" d="M0,18 v16 M-8,30 l8,6 l8,-6"/>`,
    column: () => `
      <rect class="eq" x="-17" y="-46" width="34" height="90" rx="12"/>
      <g class="eqm"><circle cx="-7" cy="-26" r="4"/><circle cx="6" cy="-20" r="4"/><circle cx="-5" cy="-10" r="4"/><circle cx="7" cy="-2" r="4"/><circle cx="-6" cy="8" r="4"/><circle cx="6" cy="16" r="4"/><circle cx="-4" cy="26" r="4"/></g>`,
    reactor: () => `
      <path class="eq" d="M-34,-30 h68 v42 q0,26 -34,26 q-34,0 -34,-26 z"/>
      <path class="eqm" d="M-28,-24 h56 v36 q0,20 -28,20 q-28,0 -28,-20 z"/>
      <path class="eqd" d="M0,-48 V18 M-14,18 h28 M-10,-48 h20 v-8 h-20 z"/>`,
    evaporator: () => `
      <rect class="eq" x="-34" y="-46" width="30" height="86" rx="4"/>
      <path class="eqm" d="M-27,-42 v78 M-19,-42 v78 M-11,-42 v78"/>
      <path class="eq" d="M6,-10 h26 v30 q0,12 -13,12 q-13,0 -13,-12 z"/>
      <path class="eqd" d="M-4,30 h10 M19,-10 v-22 h-6"/>`,
    spraydryer: () => `
      <path class="eq" d="M-26,-34 h52 v34 l-26,34 l-26,-34 z"/>
      <rect class="eq" x="-7" y="-46" width="14" height="10" rx="2"/>
      <path class="eqm" d="M0,-30 l-14,14 M0,-30 l14,14 M0,-30 v18"/>
      <path class="eqd" d="M0,34 v10"/>`,
    furnace: () => `
      <g transform="rotate(-8)">
        <rect class="eq" x="-44" y="-16" width="88" height="32" rx="14"/>
        <path class="eqd" style="stroke:var(--heat)" d="M-26,6 q4,-12 8,0 q4,-12 8,0 M2,6 q4,-12 8,0 q4,-12 8,0"/>
      </g>
      <path class="eqd" d="M-30,24 l-6,18 M30,14 l6,22"/>`,
    crystallizer: () => `
      <path class="eq" d="M-30,-36 h60 v40 l-30,30 l-30,-30 z"/>
      <g class="eqm"><path d="M-14,-10 l6,-8 l6,8 l-6,8 z"/><path d="M6,-18 l5,-7 l5,7 l-5,7 z"/><path d="M-4,8 l5,-7 l5,7 l-5,7 z"/></g>
      <path class="eqd" d="M0,-46 v20"/>`,
    basket: () => `
      <rect class="eq" x="-32" y="-30" width="64" height="52" rx="4"/>
      <path class="eqm" stroke-dasharray="3 4" d="M-24,-26 v44 M24,-26 v44"/>
      <path class="eqd" d="M0,22 v14 M-12,36 h24 v8 h-12 z"/>
      <path class="eqd" d="M-14,-40 a16,6 0 1 0 28,0" />
      <path class="head" style="fill:var(--ink)" d="M14,-40 l-6,-4 l2,7 z"/>`,
    dryer: () => `
      <rect class="eq" x="-40" y="-18" width="80" height="38" rx="18"/>
      <path class="eqm" d="M-26,-12 l10,26 M-8,-12 l10,26 M10,-12 l10,26"/>
      <path class="eqd" style="stroke:var(--heat)" d="M-20,-30 q5,-6 0,-12 M0,-30 q5,-6 0,-12 M20,-30 q5,-6 0,-12"/>`,
    mill: () => `
      <circle class="eq" cx="0" cy="-4" r="32"/>
      <g class="eqm"><circle cx="0" cy="-4" r="20"/><circle cx="0" cy="-4" r="9"/></g>
      <g class="eqd"><circle cx="0" cy="-24" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="-17" cy="6" r="2.5"/><circle cx="20" cy="-14" r="2"/><circle cx="-20" cy="-14" r="2"/></g>
      <path class="eqd" stroke-dasharray="3 3" d="M-28,38 h56"/>`,
    lab: () => `
      <rect class="eq" x="-38" y="-34" width="76" height="56" rx="4"/>
      <path class="eqd" style="stroke:var(--accent)" d="M-32,12 h10 l4,-30 l4,30 h8 l3,-10 l3,10 h10 l2,-5 l2,5 h12"/>
      <path class="eqd" d="M-20,22 v10 M20,22 v10 M-28,32 h56"/>`,
    extractor: () => `
      <rect class="eq" x="-20" y="-44" width="40" height="88" rx="14" style="stroke-width:3"/>
      <g class="eqm"><ellipse cx="-6" cy="-14" rx="6" ry="4"/><ellipse cx="7" cy="-4" rx="6" ry="4"/><ellipse cx="-5" cy="8" rx="6" ry="4"/><ellipse cx="6" cy="20" rx="6" ry="4"/></g>
      <circle class="eq" cx="28" cy="-36" r="9"/><path class="eqd" d="M28,-36 l5,-4"/>`,
    blender: () => `
      <path class="eq" d="M-36,-34 l22,-8 l14,44 l14,-44 l22,8 l-26,64 h-20 z"/>
      <path class="eqd" d="M-44,0 h88"/>
      <circle class="eqd" cx="0" cy="0" r="4"/>`,
    filler: () => `
      <path class="eq" d="M-28,-44 h56 l-18,30 h-20 z"/>
      <path class="eqd" d="M0,-14 v14"/>
      <path class="eq" d="M-18,10 h36 v26 q0,4 -4,4 h-28 q-4,0 -4,-4 z"/>
      <path class="eqm" d="M-18,16 h36"/>`
  };

  function wrapName(s) {
    if (s.length <= 18) return [s];
    const words = s.split(" ");
    let best = [s], bd = 1e9;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
      const d = Math.abs(a.length - b.length);
      if (d < bd) { bd = d; best = [a, b]; }
    }
    return best;
  }

  function build(line) {
    const n = line.stations.length;
    const W = X0 + (n - 1) * SP + 110, H = 214;
    let s = `<svg class="pid" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="Diagrama da linha de produção de ${line.name}">`;
    // entrada
    const first = line.stations[0];
    s += `<text x="10" y="${CY - 30}" class="side-txt">${line.start}</text>`;
    s += `<path class="pipe" d="M10,${CY} H${X0 - 50}"/><path class="flow" style="stroke:${STREAM[first.stream]}" d="M10,${CY} H${X0 - 50}"/>`;
    s += `<path class="head" style="fill:var(--muted)" d="M${X0 - 48},${CY} l-9,-5 v10 z"/>`;
    line.stations.forEach((st, i) => {
      const cx = X0 + i * SP;
      if (i < n - 1) {
        const x1 = cx + 50, x2 = cx + SP - 50;
        const col = STREAM[line.stations[i + 1].stream] || "var(--muted)";
        s += `<path class="pipe" d="M${x1},${CY} H${x2}"/><path class="flow" style="stroke:${col}" d="M${x1},${CY} H${x2 - 2}"/>`;
        s += `<path class="head" style="fill:var(--muted)" d="M${x2 + 2},${CY} l-9,-5 v10 z"/>`;
      }
      const lines = wrapName(st.name);
      s += `<g class="st" data-i="${i}" tabindex="0" role="button" aria-label="Etapa ${i + 1}: ${st.tag}, ${st.name}">`;
      s += `<rect class="hit" x="${cx - SP / 2 + 6}" y="8" width="${SP - 12}" height="${H - 14}" rx="8"/>`;
      if (st.out) {
        s += `<path class="side" d="M${cx + 28},${CY - 50} V${CY - 62}"/><path class="head" style="fill:var(--muted)" d="M${cx + 28},${CY - 66} l-4,7 h8 z"/>`;
        s += `<text class="side-txt" x="${cx + 28}" y="${CY - 72}" text-anchor="middle">${st.out}</text>`;
      }
      if (st.in) {
        s += `<text class="side-txt" x="${cx - 28}" y="${CY - 72}" text-anchor="middle">${st.in}</text>`;
        s += `<path class="side" d="M${cx - 28},${CY - 66} V${CY - 54}"/><path class="head" style="fill:var(--muted)" d="M${cx - 28},${CY - 50} l-4,-7 h8 z"/>`;
      }
      s += `<g transform="translate(${cx},${CY})">${SYM[st.kind]()}</g>`;
      s += `<text class="tag-txt" x="${cx}" y="${CY + 70}" text-anchor="middle" font-size="12.5" font-weight="500"><tspan class="num">${String(i + 1).padStart(2, "0")} · </tspan>${st.tag}</text>`;
      lines.forEach((ln, k) => {
        s += `<text class="nm-txt" x="${cx}" y="${CY + 88 + k * 15}" text-anchor="middle" font-size="12.5">${ln}</text>`;
      });
      s += `</g>`;
    });
    s += `</svg>`;
    return s;
  }

  return { build };
})();
