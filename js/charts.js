// Gráficos em SVG próprio (sem biblioteca), com animação de entrada e dica ao passar o cursor.
import { $, $$, esc } from './util.js';

const registro = new Map(); let seq = 0;
const tipEl = () => $('#tip');
function mostraTip(html, x, y) {
  const t = tipEl(); t.innerHTML = html; t.classList.add('on');
  const r = t.getBoundingClientRect();
  t.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, x + 14)) + 'px';
  t.style.top = Math.max(8, y - r.height - 12) + 'px';
}
const escondeTip = () => tipEl().classList.remove('on');
const linhaTip = (cor, nome, valor) => `<div><span><i class="dot" style="background:${cor}"></i>${esc(nome)}</span><span>${esc(valor)}</span></div>`;

// Barras agrupadas: series = [{nome, cor, valores[]}], labels[]
export function barras({ labels, series, fmt, rotulo }) {
  const W = 640, H = 250, base = 212, topo = 14, esq = 50, step = (W - esq) / labels.length;
  const max = Math.max(1, ...series.flatMap(s => s.valores)), h = v => v / max * (base - topo);
  const bw = Math.min(22, step / (series.length + 1.6)), gap = 2, tot = series.length * bw + (series.length - 1) * gap;
  const grades = [0.5, 1].map(f => `<line class="gridl" x1="0" x2="${W}" y1="${base - (base - topo) * f}" y2="${base - (base - topo) * f}"/><text x="0" y="${base - (base - topo) * f - 5}">${esc(fmt(max * f))}</text>`).join('');
  const grupos = labels.map((l, i) => {
    const x0 = esq + i * step + (step - tot) / 2;
    const bs = series.map((s, j) => {
      const hh = Math.max(s.valores[i] > 0 ? 3 : 0, h(s.valores[i])), r = Math.min(4, hh);
      const x = x0 + j * (bw + gap), y = base - hh;
      return `<path class="bar" style="animation-delay:${i * 70 + j * 60}ms" fill="${s.cor}" d="M${x} ${base}V${y + r}a${r} ${r} 0 0 1 ${r} -${r}h${bw - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}V${base}z"/>`;
    }).join('');
    const tip = `<b>${esc(l.longo || l.curto)}</b>` + series.map(s => linhaTip(s.cor, s.nome, fmt(s.valores[i]))).join('');
    return `<g class="grp" data-tip="${esc(tip)}"><rect class="hit" x="${esq + i * step}" y="0" width="${step}" height="${H}"/>${bs}<text x="${esq + i * step + step / 2}" y="${base + 20}" text-anchor="middle">${esc(l.curto)}</text></g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(rotulo)}">${grades}<line class="gridl" x1="0" x2="${W}" y1="${base}" y2="${base}"/>${grupos}</svg>`;
}

// Linhas/áreas: series = [{nome, cor, valores[], area}], labels[] (texto do ponto)
export function linhas({ labels, series, fmt, rotulo, zero = false, h = 240 }) {
  const W = 640, H = h, l = 4, r = 4, t = 18, b = 26, n = labels.length;
  const todos = series.flatMap(s => s.valores);
  let min = zero ? 0 : Math.min(...todos), max = Math.max(...todos);
  if (max === min) { max += 1; min -= zero ? 0 : 1; }
  if (!zero) { const m = (max - min) * .12; min -= m; max += m; }
  const X = i => l + (n === 1 ? 0 : i / (n - 1) * (W - l - r)), Y = v => t + (1 - (v - min) / (max - min)) * (H - t - b);
  const id = 'ch' + (++seq);
  registro.set(id, { labels, series, fmt, X, Y, W });
  const grades = [0, .5, 1].map(f => { const v = min + (max - min) * f, y = Y(v); return `<line class="gridl" x1="0" x2="${W}" y1="${y}" y2="${y}"/><text x="2" y="${y - 5}">${esc(fmt(v))}</text>`; }).join('');
  const corpo = series.map((s, k) => {
    const d = s.valores.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
    const area = s.area ? `<defs><linearGradient id="${id}g${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.cor}" stop-opacity=".32"/><stop offset="1" stop-color="${s.cor}" stop-opacity="0"/></linearGradient></defs><path class="area" fill="url(#${id}g${k})" d="${d}L${X(n - 1)} ${H - b}L${X(0)} ${H - b}z"/>` : '';
    return `${area}<path class="line" pathLength="1" stroke="${s.cor}" d="${d}"/>`;
  }).join('');
  const xs = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i)
    .map((i, k, a) => `<text x="${X(i)}" y="${H - 6}" text-anchor="${k === 0 ? 'start' : k === a.length - 1 ? 'end' : 'middle'}">${esc(labels[i])}</text>`).join('');
  const pts = series.map(s => `<circle class="pt" r="5" fill="${s.cor}"/>`).join('');
  return `<svg class="chart" data-chart="${id}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(rotulo)}">${grades}${corpo}<line class="xh" y1="${t}" y2="${H - b}"/>${pts}${xs}</svg>`;
}

export function anel(pct, { cls = '', tam = 120, centro = '' } = {}) {
  const p = Math.max(0, Math.min(100, pct));
  return `<div class="ring" style="width:${tam}px;height:${tam}px"><svg width="${tam}" height="${tam}" viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="42"/><circle class="fg ${cls}" cx="50" cy="50" r="42" pathLength="100" style="--p:${p}"/></svg><div class="mid">${centro}</div></div>`;
}

// Liga interações dos gráficos dentro de `root` (chamar após cada renderização).
export function ligarGraficos(root) {
  $$('.chart .grp', root).forEach(g => {
    g.addEventListener('pointermove', e => mostraTip(g.dataset.tip, e.clientX, e.clientY));
    g.addEventListener('pointerleave', escondeTip);
  });
  $$('svg[data-chart]', root).forEach(svg => {
    const c = registro.get(svg.dataset.chart); if (!c) return;
    const xh = $('.xh', svg), pts = $$('.pt', svg), n = c.labels.length;
    svg.addEventListener('pointermove', e => {
      const box = svg.getBoundingClientRect(), x = (e.clientX - box.left) / box.width * c.W;
      const i = Math.max(0, Math.min(n - 1, Math.round((x - c.X(0)) / ((c.X(n - 1) - c.X(0)) || 1) * (n - 1))));
      svg.classList.add('hov');
      xh.setAttribute('x1', c.X(i)); xh.setAttribute('x2', c.X(i));
      c.series.forEach((s, k) => { pts[k].setAttribute('cx', c.X(i)); pts[k].setAttribute('cy', c.Y(s.valores[i])); });
      mostraTip(`<b>${esc(c.labels[i])}</b>` + c.series.map(s => linhaTip(s.cor, s.nome, c.fmt(s.valores[i]))).join(''), e.clientX, e.clientY);
    });
    svg.addEventListener('pointerleave', () => { svg.classList.remove('hov'); escondeTip(); });
  });
}
export function limparGraficos() { registro.clear(); escondeTip(); }
