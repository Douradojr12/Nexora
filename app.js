import { createRouter } from './router.js';
import { demo } from './demo-data.js';

const $ = (s, el = document) => el.querySelector(s);
const brl = c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }; // sem fuso: datas ISO tratadas como texto
const sum = a => a.reduce((x, y) => x + y, 0);
const ico = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

const routes = [
  { id: 'painel', titulo: 'Painel', icon: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>' },
  { id: 'transacoes', titulo: 'Transações', icon: '<path d="M7 7h13M7 7l3-3M7 7l3 3M17 17H4M17 17l-3-3M17 17l-3 3"/>', vazio: ['Nenhuma transação ainda', 'Aqui ficarão suas receitas e despesas, com busca e filtros.', 'Etapa 3'] },
  { id: 'contas', titulo: 'Contas e cartões', icon: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>', vazio: ['Nenhuma conta cadastrada', 'Contas, cartões, faturas e parcelas aparecerão aqui.', 'Etapa 3'] },
  { id: 'planejamento', titulo: 'Planejamento', icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>', vazio: ['Nenhum orçamento ou meta', 'Defina orçamentos por categoria e metas de economia.', 'Etapa 3'] },
  { id: 'investimentos', titulo: 'Investimentos', icon: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>', vazio: ['Nenhum investimento registrado', 'Acompanhe posições, aportes, rendimentos e simulações.', 'Etapa 4'] },
  { id: 'relatorios', titulo: 'Relatórios', icon: '<path d="M6 3h9l3 3v15H6zM9 12h6M9 16h6"/>', vazio: ['Sem dados para relatórios', 'Comparações mensais e exportação CSV chegam com os dados reais.', 'Etapa 4'] },
  { id: 'assistente', titulo: 'Nexora AI', icon: '<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>', vazio: ['Assistente indisponível', 'A análise local será ativada quando houver dados para analisar.', 'Etapa 5'] },
  { id: 'configuracoes', titulo: 'Configurações', icon: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', vazio: ['Configurações ainda não disponíveis', 'Categorias, backup e restauração serão adicionados aqui.', 'Etapa 2 e 6'] },
];

// --- Componentes reutilizáveis ---
const stat = (label, value, cls = '') => `<div class="card stat"><div class="label">${label}</div><div class="value ${cls}">${value}</div><span class="badge">demonstração</span></div>`;
const empty = ([t, p, etapa]) => `<div class="empty"><h2>${t}</h2><p>${p}</p><span class="badge">Previsto para a ${etapa}</span></div>`;

function barChart() {
  const W = 560, H = 210, base = 180, max = Math.max(...demo.receitas, ...demo.despesas), step = W / demo.meses.length;
  const h = v => (v / max) * 150;
  const bars = demo.meses.map((m, i) => {
    const x = i * step + step / 2;
    return `<rect x="${x - 17}" y="${base - h(demo.receitas[i])}" width="15" height="${h(demo.receitas[i])}" rx="3" fill="#38B76B"/>
      <rect x="${x + 2}" y="${base - h(demo.despesas[i])}" width="15" height="${h(demo.despesas[i])}" rx="3" fill="#E8B04A"/>
      <text x="${x}" y="${base + 18}" text-anchor="middle">${m}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Receitas e despesas dos últimos seis meses (dados de demonstração)"><line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="#364038"/>${bars}</svg>`;
}

function painel() {
  const i = demo.meses.length - 1, rec = demo.receitas[i], des = demo.despesas[i], res = rec - des;
  const totalCat = sum(demo.categorias.map(c => c.valor));
  return `<div class="page-enter">
  <div class="demo-banner" style="--i:0" role="note"><strong>Dados de demonstração.</strong> Os valores abaixo são fictícios e servem só para mostrar o layout.</div>
  <div class="grid stats" style="--i:1">
    ${stat('Saldo total', brl(sum(demo.accounts.map(a => a.saldo))))}
    ${stat('Receitas do mês', brl(rec), 'pos')}
    ${stat('Despesas do mês', brl(des), 'neg')}
    ${stat('Resultado do mês', brl(res), res >= 0 ? 'pos' : 'neg')}
  </div>
  <div class="grid cols-2" style="--i:2">
    <section class="card"><div class="card-head"><h2>Receitas e despesas</h2>
      <div class="legend"><span><i class="dot" style="background:#38B76B"></i>Receitas</span><span><i class="dot" style="background:#E8B04A"></i>Despesas</span></div></div>${barChart()}</section>
    <section class="card"><div class="card-head"><h2>Gastos por categoria</h2><span class="badge">demonstração</span></div>
      ${demo.categorias.map(c => `<div class="bar-row"><div class="top"><span>${c.nome}</span><span class="muted">${brl(c.valor)}</span></div><div class="track" role="progressbar" aria-label="${c.nome}" aria-valuenow="${Math.round(c.valor / totalCat * 100)}" aria-valuemin="0" aria-valuemax="100"><div class="fill" style="width:${c.valor / totalCat * 100}%"></div></div></div>`).join('')}</section>
  </div>
  <div class="grid cols-3" style="--i:3">
    <section class="card"><div class="card-head"><h2>Contas</h2></div><ul class="list">${demo.accounts.map(a => `<li><span>${a.nome}</span><strong>${brl(a.saldo)}</strong></li>`).join('')}</ul></section>
    <section class="card"><div class="card-head"><h2>Próximos vencimentos</h2></div><ul class="list">${demo.vencimentos.map(v => `<li><span>${v.nome}<br><span class="muted small">${dataBR(v.data)}</span></span><strong>${brl(v.valor)}</strong></li>`).join('')}</ul></section>
    <section class="card"><div class="card-head"><h2>Resumo</h2></div><div class="insight"><p>Em outubro, as receitas superaram as despesas em ${brl(res)}.</p><p class="muted small">Exemplo de resumo. A análise real vem com o Nexora AI, a partir dos seus dados.</p></div></section>
  </div>
  <section class="card" style="--i:4;margin-top:18px"><div class="card-head"><h2>Atalhos</h2></div>
    <div class="shortcuts"><button class="btn" data-quick="Nova receita">Nova receita</button><button class="btn" data-quick="Nova despesa">Nova despesa</button><button class="btn" data-quick="Nova transferência">Transferir entre contas</button><button class="btn" data-quick="Nova meta">Criar meta</button></div></section>
  </div>`;
}

// --- Navegação, painel lateral e menu móvel ---
const nav = $('#nav'), main = $('#main'), drawer = $('#drawer'), sidebar = $('#sidebar'), scrim = $('#scrim'), menuBtn = $('#menuBtn');
nav.innerHTML = routes.map(r => `<a href="#/${r.id}" data-id="${r.id}">${`<svg viewBox="0 0 24 24" aria-hidden="true">${r.icon}</svg>`}<span>${r.titulo}</span></a>`).join('');

const setMenu = open => { sidebar.classList.toggle('open', open); scrim.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); };
menuBtn.onclick = () => setMenu(!sidebar.classList.contains('open'));
scrim.onclick = () => setMenu(false);

let lastFocus = null;
function openDrawer(title) {
  lastFocus = document.activeElement;
  $('#drawerTitle').textContent = title;
  $('#drawerBody').innerHTML = '<p>Este formulário será criado na Etapa 3, junto com o armazenamento real dos dados.</p>';
  drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); $('#drawerClose').focus();
}
function closeDrawer() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); lastFocus?.focus(); }
$('#drawerClose').onclick = closeDrawer;
addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); setMenu(false); } });
document.addEventListener('click', e => { const q = e.target.closest('[data-quick]'); if (q) openDrawer(q.dataset.quick); });

const router = createRouter(routes, route => {
  try {
    document.title = `${route.titulo} — Nexora`;
    $('#pageTitle').textContent = route.titulo;
    nav.querySelectorAll('a').forEach(a => a.toggleAttribute('aria-current', a.dataset.id === route.id) || a.removeAttribute('aria-current'));
    nav.querySelector(`[data-id="${route.id}"]`).setAttribute('aria-current', 'page');
    main.innerHTML = route.id === 'painel' ? painel() : `<div class="page-enter">${empty(route.vazio)}</div>`;
    setMenu(false); scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    main.innerHTML = '<div class="empty"><h2>Não foi possível abrir esta página</h2><p>Recarregue a página. Se o problema continuar, volte ao Painel.</p></div>';
  }
});
router.start();
