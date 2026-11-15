// Utilitários de interface: formatação, ícones, avisos, contadores animados.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const brl = c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const brlCurto = c => {
  const v = c / 100, a = Math.abs(v);
  if (a >= 1e6) return `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (a >= 1e3) return `R$ ${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};
export const num = (v, d = 2) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const pad = n => String(n).padStart(2, '0');
export const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const dataBR = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const mesLongo = ym => { const [y, m] = ym.split('-'); return `${MESES[+m - 1]} de ${y}`; };
export const mesCurto = ym => MESES[+ym.slice(5) - 1].slice(0, 3);
export const diaMes = iso => `${+iso.slice(8)} de ${MESES[+iso.slice(5, 7) - 1].slice(0, 3)}`;
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const reduz = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const P = {
  painel: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  troca: '<path d="M7 7h13M7 7l3-3M7 7l3 3M17 17H4M17 17l-3-3M17 17l-3 3"/>',
  cartao: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  grafico: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  cambio: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.2 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
  ia: '<path d="M12 3l1.8 4.9L19 9.5l-5.2 1.6L12 16l-1.8-4.9L5 9.5l5.2-1.6zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  mais: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  esq: '<path d="M15 6l-6 6 6 6"/>', dir: '<path d="M9 6l6 6-6 6"/>',
  sobe: '<path d="M12 19V5M6 11l6-6 6 6"/>', desce: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  repete: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3"/>',
  ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', alerta: '<path d="M12 3l9.5 17h-19zM12 10v4M12 17.5v.5"/>',
  lampada: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  carteira: '<path d="M3 7a2 2 0 012-2h13v4M3 7v10a2 2 0 002 2h15V9H5a2 2 0 01-2-2zM16 14h.5"/>',
  envia: '<path d="M4 12l16-8-6 16-3-7z"/>', recarrega: '<path d="M20 11A8 8 0 006 6.3L4 8M4 4v4h4M4 13a8 8 0 0014 4.7l2-1.7M20 20v-4h-4"/>',
  lixo: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', baixa: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', sobeArq: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', escudo: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/>',
};
export const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

export function toast(msg, ruim = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (ruim ? ' bad' : '');
  el.setAttribute('role', 'status');
  el.innerHTML = icon(ruim ? 'alerta' : 'ok') + `<span>${esc(msg)}</span>`;
  $('#toasts').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 2800);
}

// Contador animado: <span data-count="12345" data-fmt="brl">R$ 123,45</span>
const FMT = { brl, int: v => Math.round(v).toLocaleString('pt-BR'), pct: v => `${Math.round(v)}%` };
export function contar(root) {
  if (reduz()) return;
  $$('[data-count]', root).forEach(el => {
    const fim = +el.dataset.count, f = FMT[el.dataset.fmt || 'brl'], t0 = performance.now(), dur = 1100;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(2, -10 * p);
      el.textContent = f(p >= 1 ? fim : fim * e);
      if (p < 1 && el.isConnected) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
export const count = (v, fmt = 'brl') => `<span class="num" data-count="${v}" data-fmt="${fmt}">${FMT[fmt](v)}</span>`;

// Markdown mínimo e seguro (escapa tudo antes): negrito, listas, títulos e parágrafos.
export function md(src) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>').replace(/`([^`]+)`/g, '<code>$1</code>');
  let html = '', lista = null;
  const fecha = () => { if (lista) { html += `</${lista}>`; lista = null; } };
  for (const raw of String(src).split('\n')) {
    const l = raw.trim();
    let m;
    if (!l) { fecha(); continue; }
    if ((m = l.match(/^#{1,6}\s+(.*)/))) { fecha(); html += `<h4>${inline(m[1])}</h4>`; }
    else if ((m = l.match(/^[-*•]\s+(.*)/))) { if (lista !== 'ul') { fecha(); html += '<ul>'; lista = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^\d+[.)]\s+(.*)/))) { if (lista !== 'ol') { fecha(); html += '<ol>'; lista = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
    else { fecha(); html += `<p>${inline(l)}</p>`; }
  }
  fecha();
  return html;
}
