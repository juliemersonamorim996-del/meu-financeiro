<script>
(() => {
'use strict';
/* =========================================================
   Gráficos em SVG desenhados na largura real do cartão
   ========================================================= */
const { esc, brl, brl0, nf } = window.MF;
const V = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
let INK = '#8FA1BB', GRID = 'rgba(143,161,187,.13)', GREEN = '#22E3A5', TEXT = '#EAF1FA', SOLID = '#0A1526', LINE = '#26395C', BLUE = '#2F9BFF', RED = '#FF5A6E', GOLD = '#E9B949';
function theme() {
  INK = V('--muted') || INK; GRID = V('--grid') || GRID; GREEN = V('--green') || GREEN; TEXT = V('--text') || TEXT;
  SOLID = V('--solid') || SOLID; LINE = V('--line-2') || LINE; BLUE = V('--blue') || BLUE; RED = V('--red') || RED; GOLD = V('--gold') || GOLD;
}

function nice(max, ticks = 4) {
  if (!(max > 0)) return { top: 100 * ticks, step: 100, ticks };
  const raw = max / ticks, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 5 ? 5 : 10) * mag;
  const k = Math.max(1, Math.ceil(max / step - 1e-9));
  return { top: step * k, step, ticks: k };
}
const axisFmt = v => v >= 100000 ? 'R$ ' + nf(v / 1000, 0) + ' mil' : brl0(v);
const short = v => v >= 10000 ? nf(v / 1000, 1).replace(',0', '') + ' mil' : brl0(v);

function tipLayer(el, pts, onClick) {
  const svg = el.querySelector('svg'); if (!svg || !pts.length) return;
  let tip = el.querySelector('.tip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; el.appendChild(tip); }
  const near = e => { const r = svg.getBoundingClientRect(), x = e.clientX - r.left; let best = pts[0]; for (const p of pts) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p; return best; };
  svg.addEventListener('pointermove', e => { const p = near(e); tip.hidden = false; tip.innerHTML = p.html; tip.style.left = Math.min(Math.max(p.x, 60), el.clientWidth - 60) + 'px'; tip.style.top = p.y + 'px'; });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  if (onClick) { svg.style.cursor = 'pointer'; svg.addEventListener('click', e => onClick(near(e))); }
}

// Linha com área (Receitas Mensais)
function line(el, o) {
  theme();
  const W = Math.max(260, el.clientWidth), H = o.h || 220, pl = 70, pr = 16, pt = 34, pb = 30, v = o.values, n = v.length;
  const { top, step, ticks } = nice(Math.max(...v, 0) * 1.05);
  const X = i => pl + (n <= 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (n - 1));
  const Y = y => pt + (H - pt - pb) * (1 - y / top);
  let g = '';
  for (let k = 0; k <= ticks; k++) { const y = Y(k * step); g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="${GRID}"/><text x="${pl - 12}" y="${y + 4}" text-anchor="end" font-size="12" fill="${INK}">${axisFmt(k * step)}</text>`; }
  const every = Math.max(1, Math.ceil(n * 40 / (W - pl)));
  v.forEach((_, i) => { g += `<line x1="${X(i)}" x2="${X(i)}" y1="${pt}" y2="${H - pb}" stroke="${GRID}" stroke-dasharray="2 4"/>`; if ((n - 1 - i) % every === 0) g += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="${INK}">${esc(o.labels[i])}</text>`; });
  const P = v.map((y, i) => [X(i), Y(y)]);
  const d = P.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const hi = o.hi ?? n - 1, hp = P[hi];
  const label = brl(v[hi]), lw = label.length * 7.4 + 18, lx = Math.min(Math.max(hp[0] - lw / 2, pl), W - lw - 2);
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">
  <defs><linearGradient id="${o.id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GREEN}" stop-opacity=".32"/><stop offset="1" stop-color="${GREEN}" stop-opacity="0"/></linearGradient>
  <filter id="${o.id}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>
  ${g}
  <path d="${d}L${P[n - 1][0]} ${H - pb}L${P[0][0]} ${H - pb}Z" fill="url(#${o.id}a)"/>
  <path d="${d}" fill="none" stroke="${GREEN}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
  ${P.map((p, i) => i === hi ? '' : `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${GREEN}" stroke="${SOLID}" stroke-width="2"/>`).join('')}
  <circle cx="${hp[0]}" cy="${hp[1]}" r="10" fill="${GREEN}" opacity=".45" filter="url(#${o.id}g)"/>
  <circle cx="${hp[0]}" cy="${hp[1]}" r="6" fill="${GREEN}" stroke="${SOLID}" stroke-width="2"/>
  <rect x="${lx}" y="${Math.max(2, hp[1] - 40)}" width="${lw}" height="26" rx="7" fill="${SOLID}" stroke="${LINE}"/>
  <text x="${lx + lw / 2}" y="${Math.max(2, hp[1] - 40) + 17.5}" text-anchor="middle" font-size="13" font-weight="600" fill="${TEXT}">${label}</text>
  </svg>`;
  tipLayer(el, P.map((p, i) => ({ x: p[0], y: p[1], html: `${brl(v[i])}<small>${esc(o.full ? o.full[i] : o.labels[i])}</small>` })));
}

// Barras por categoria (com ícone e nome embaixo)
function bars(el, o) {
  theme();
  const items = o.items, n = Math.max(1, items.length), W = Math.max(260, el.clientWidth), H = o.h || 170, pl = 62, pt = 26, pb = 2;
  const { top, step, ticks } = nice(Math.max(...items.map(i => i.value), 0) * 1.08);
  const Y = y => pt + (H - pt - pb) * (1 - y / top), col = (W - pl) / n, bw = Math.min(46, col * .56);
  let g = '', defs = '';
  for (let k = 0; k <= ticks; k++) { const y = Y(k * step); g += `<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="${GRID}"/><text x="${pl - 12}" y="${y + 4}" text-anchor="end" font-size="12" fill="${INK}">${axisFmt(k * step)}</text>`; }
  items.forEach((it, i) => {
    const x = pl + col * i + (col - bw) / 2, y = Y(it.value), h = Math.max(2, H - pb - y);
    defs += `<linearGradient id="${o.id}${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${it.color}"/><stop offset="1" stop-color="${it.color}" stop-opacity=".62"/></linearGradient>`;
    g += `<rect x="${x}" y="${H - pb - h}" width="${bw}" height="${h}" rx="3" fill="url(#${o.id}${i})"/>`;
    g += `<text x="${x + bw / 2}" y="${H - pb - h - 8}" text-anchor="middle" font-size="${col < 62 ? 11 : 12}" font-weight="600" fill="${TEXT}">${col < 62 ? short(it.value) : brl0(it.value)}</text>`;
  });
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}"><defs>${defs}</defs>${g}</svg>
  <div class="bar-labels" style="grid-template-columns:repeat(${n},minmax(0,1fr));padding-left:${pl}px">${items.map(it => `<div title="${esc(it.label)}">${window.MF.ic(it.icon)}<span>${esc(it.label)}</span></div>`).join('')}</div>`;
  const pts = items.map((it, i) => ({ x: pl + col * i + col / 2, y: Y(it.value), html: `${brl(it.value)}<small>${esc(it.label)}</small>` }));
  tipLayer(el, pts, o.onClick ? p => o.onClick(pts.indexOf(p)) : null);
}

// Barras diárias do mês, com linha do limite por dia
function days(el, o) {
  theme();
  const v = o.values, n = v.length, W = Math.max(260, el.clientWidth), H = o.h || 190, pl = 62, pt = 16, pb = 26;
  const { top, step, ticks } = nice(Math.max(...v, o.limit || 0, 0) * 1.08);
  const Y = y => pt + (H - pt - pb) * (1 - y / top), col = (W - pl) / n, bw = Math.max(2, col * .64);
  let g = '';
  for (let k = 0; k <= ticks; k++) { const y = Y(k * step); g += `<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="${GRID}"/><text x="${pl - 12}" y="${y + 4}" text-anchor="end" font-size="12" fill="${INK}">${axisFmt(k * step)}</text>`; }
  v.forEach((val, i) => {
    const x = pl + col * i + (col - bw) / 2, y = Y(val), h = Math.max(val ? 2 : 0, H - pb - y);
    const c = i === o.hi ? GREEN : (o.limit && val > o.limit ? RED : BLUE);
    g += `<rect x="${x}" y="${H - pb - h}" width="${bw}" height="${h}" rx="${Math.min(3, bw / 3)}" fill="${c}" opacity="${i > o.last ? .25 : .92}"/>`;
    if ((i + 1) % 5 === 0 || i === 0) g += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="11.5" fill="${INK}">${i + 1}</text>`;
  });
  if (o.limit) { const y = Y(o.limit); g += `<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="5 5"/><text x="${W - 4}" y="${y - 6}" text-anchor="end" font-size="11.5" font-weight="600" fill="${GOLD}">limite/dia ${brl0(o.limit)}</text>`; }
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">${g}</svg>`;
  const pts = v.map((val, i) => ({ i, x: pl + col * i + col / 2, y: Y(val), html: `${brl(val)}<small>dia ${i + 1}</small>` }));
  tipLayer(el, pts, o.onClick ? p => o.onClick(p.i) : null);
}

// Rosca (retorna HTML — não depende da largura)
function donut(items, size = 190, th = 30, center = '') {
  theme();
  const tot = items.reduce((s, i) => s + i.value, 0), r = (size - th) / 2, C = 2 * Math.PI * r, gap = items.length > 1 ? 3 : 0;
  let acc = 0, segs = '';
  if (tot > 0) items.forEach(it => {
    const len = it.value / tot * C;
    if (len > 0.5) segs += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${it.color}" stroke-width="${th}" stroke-dasharray="${Math.max(0.1, len - gap)} ${C}" stroke-dashoffset="${-acc}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
    acc += len;
  });
  else segs = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${GRID}" stroke-width="${th}"/>`;
  return `<div class="donut" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${segs}</svg><div class="c">${center}</div></div>`;
}

// Área simples (rentabilidade acumulada)
function spark(el, o) {
  theme();
  const W = Math.max(200, el.clientWidth), H = o.h || 120, p = o.points, n = p.length;
  if (n < 2) { el.innerHTML = `<div class="sub" style="height:${H}px;display:grid;place-items:center">Ainda sem histórico suficiente</div>`; return; }
  const vals = p.map(q => q.v), mn = Math.min(0, ...vals), mx = Math.max(...vals, mn + 1e-6);
  const X = i => 4 + i * (W - 12) / (n - 1), Y = y => 10 + (H - 18) * (1 - (y - mn) / (mx - mn));
  const step = Math.max(1, Math.floor(n / 160)), P = [];
  for (let i = 0; i < n; i += step) P.push([X(i), Y(vals[i]), i]);
  if (P.at(-1)[2] !== n - 1) P.push([X(n - 1), Y(vals[n - 1]), n - 1]);
  const d = P.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(''), e = P.at(-1);
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">
  <defs><linearGradient id="${o.id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GREEN}" stop-opacity=".45"/><stop offset="1" stop-color="${GREEN}" stop-opacity="0"/></linearGradient></defs>
  <path d="${d}L${e[0]} ${H}L${P[0][0]} ${H}Z" fill="url(#${o.id}s)"/>
  <path d="${d}" fill="none" stroke="${GREEN}" stroke-width="2.2" stroke-linejoin="round"/>
  <circle cx="${e[0]}" cy="${e[1]}" r="4.5" fill="${GREEN}" stroke="${SOLID}" stroke-width="1.5"/></svg>`;
  tipLayer(el, P.map(q => ({ x: q[0], y: q[1], html: `${(vals[q[2]] >= 0 ? '+' : '')}${nf(vals[q[2]] * 100, 2)}%<small>${p[q[2]].d.split('-').reverse().join('/')}</small>` })));
}

// Barras agrupadas: entradas x gastos por mês
function pairs(el, o) {
  theme();
  const W = Math.max(280, el.clientWidth), H = o.h || 230, pl = 70, pt = 14, pb = 28, n = o.labels.length;
  const { top, step, ticks } = nice(Math.max(...o.a, ...o.b, 0) * 1.05);
  const Y = y => pt + (H - pt - pb) * (1 - y / top), col = (W - pl) / n, bw = Math.min(18, col * .32);
  let g = '';
  for (let k = 0; k <= ticks; k++) { const y = Y(k * step); g += `<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="${GRID}"/><text x="${pl - 12}" y="${y + 4}" text-anchor="end" font-size="12" fill="${INK}">${axisFmt(k * step)}</text>`; }
  o.labels.forEach((l, i) => {
    const cx = pl + col * i + col / 2;
    [[o.a[i], GREEN, -bw - 1], [o.b[i], RED, 1]].forEach(([val, c, dx]) => { const h = Math.max(val ? 2 : 0, H - pb - Y(val)); g += `<rect x="${cx + dx}" y="${H - pb - h}" width="${bw}" height="${h}" rx="3" fill="${c}" opacity=".9"/>`; });
    g += `<text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="11.5" fill="${INK}">${esc(l)}</text>`;
  });
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">${g}</svg>`;
  tipLayer(el, o.labels.map((l, i) => ({ x: pl + col * i + col / 2, y: Y(Math.max(o.a[i], o.b[i])), html: `<span style="color:${GREEN}">+${brl(o.a[i])}</span><br><span style="color:${RED}">−${brl(o.b[i])}</span><small>${esc(o.full ? o.full[i] : l)}</small>` })));
}

// Projeção do simulador: total x quanto você colocou
function proj(el, o) {
  theme();
  const W = Math.max(260, el.clientWidth), H = o.h || 200, pl = 72, pr = 10, pt = 14, pb = 26, n = o.total.length;
  const { top, step, ticks } = nice(Math.max(...o.total, 0) * 1.04);
  const X = i => pl + i * (W - pl - pr) / Math.max(1, n - 1), Y = y => pt + (H - pt - pb) * (1 - y / top);
  let g = '';
  for (let k = 0; k <= ticks; k++) { const y = Y(k * step); g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="${GRID}"/><text x="${pl - 12}" y="${y + 4}" text-anchor="end" font-size="12" fill="${INK}">${axisFmt(k * step)}</text>`; }
  const every = Math.max(1, Math.ceil(n / 8));
  for (let i = 0; i < n; i += every) g += `<text x="${X(i)}" y="${H - 7}" text-anchor="middle" font-size="11.5" fill="${INK}">${i}m</text>`;
  const path = arr => arr.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Projeção do saldo">
  <defs><linearGradient id="pjA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GREEN}" stop-opacity=".3"/><stop offset="1" stop-color="${GREEN}" stop-opacity="0"/></linearGradient></defs>
  ${g}<path d="${path(o.total)}L${X(n - 1)} ${H - pb}L${X(0)} ${H - pb}Z" fill="url(#pjA)"/>
  <path d="${path(o.invested)}" fill="none" stroke="${BLUE}" stroke-width="2" stroke-dasharray="5 5"/>
  <path d="${path(o.total)}" fill="none" stroke="${GREEN}" stroke-width="2.6"/></svg>`;
  tipLayer(el, o.total.map((v, i) => ({ x: X(i), y: Y(v), html: `${brl(v)}<small>mês ${i} · você colocou ${brl(o.invested[i])}</small>` })));
}

window.MF.charts = { line, bars, days, donut, spark, pairs, proj, nice };
})();
</script>
