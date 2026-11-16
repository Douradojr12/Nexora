// Telas. Cada função devolve HTML a partir do estado; as interações ficam em app.js (data-act).
import * as F from './finance.js';
import { state, ui, temDados, MODELOS } from './store.js';
import { esc, brl, brlCurto, num, icon, count, dataBR, diaMes, mesLongo, mesCurto, md } from './util.js';
import { barras, linhas, anel } from './charts.js';
import { diagnostico, cartoesResumo } from './ai.js';
import { cambio, estado as estadoCambio } from './cambio.js';
import { dinheiro } from './forms.js';
import * as N from './nuvem.js';

const pc = (a, b) => b ? Math.round(a / b * 100) : 0;
const vazio = (ic, t, p, botoes) => `<div class="card empty"><div class="orb">${icon(ic)}</div><h2>${t}</h2><p>${p}</p><div class="row" style="justify-content:center">${botoes}</div></div>`;
const btn = (act, rotulo, ic, cls = '', attrs = '') => `<button class="btn ${cls}" data-act="${act}" ${attrs}>${ic ? icon(ic) : ''}${rotulo}</button>`;
const banner = () => state.demo ? `<div class="demo-banner" role="note"><span><strong>Dados de exemplo.</strong> Os valores são fictícios, só para você conhecer o Nexora.</span>${btn('limpar', 'Apagar e começar do zero', '', 'btn-sm')}</div>` : '';
// Lançamento rápido por frase (texto ou voz)
export const rapido = () => `<form class="quick" data-quick autocomplete="off"><span class="quick-ic">${icon('ia')}</span><input class="quick-in" name="q" maxlength="200" placeholder="Ex.: 40 reais de mercado no pix" aria-label="Lançar por frase"><button class="quick-mic" type="button" data-act="voz" aria-label="Falar" title="Falar">${icon('mic')}</button><button class="btn btn-primary quick-go" aria-label="Lançar">${icon('envia')}</button></form>`;
const navMes = (ym, hoje) => `<div class="monthnav"><button class="icon-btn" data-act="mes" data-d="-1" aria-label="Mês anterior">${icon('esq')}</button><strong>${mesLongo(ym)}</strong><button class="icon-btn" data-act="mes" data-d="1" aria-label="Próximo mês">${icon('dir')}</button>${ym !== F.ymOf(hoje) ? `<button class="chip" data-act="mes-hoje">Mês atual</button>` : ''}</div>`;
const corUso = u => u > 80 ? 'bad' : u > 50 ? 'warn' : '';
const STATUS = { paga: ['ok', 'Paga'], vencida: ['bad', 'Vencida'], fechada: ['warn', 'Fechada'], aberta: ['', 'Aberta'], futura: ['', 'Futura'] };

function insightHtml(i) { return `<div class="insight ${i.tipo}"><i>${icon(i.tipo === 'alerta' ? 'alerta' : i.tipo === 'dica' ? 'lampada' : 'ok')}</i><div><b>${esc(i.titulo)}</b><p>${esc(i.texto)}</p></div></div>`; }
function vencItem(v) { return `<a class="item" href="#/${v.rota}" style="text-decoration:none;color:inherit"><span class="ico ${v.tipo === 'fatura' ? 'cr' : 'out'}">${icon(v.tipo === 'fatura' ? 'cartao' : v.tipo === 'consorcio' ? 'alvo' : 'repete')}</span><span class="body"><b>${esc(v.nome)}</b><span>${v.atrasado ? '<span class="neg">Em atraso · </span>' : ''}${diaMes(v.data)}</span></span><span class="amt num">${brl(v.valor)}</span></a>`; }
function pillDolar() {
  if (!cambio) return estadoCambio === 'erro' ? '<span class="dim small">Cotação indisponível</span>' : '<span class="skel" style="width:120px;display:inline-block"></span>';
  const p = cambio.usd.pct;
  return `<span class="quote-big num" style="font-size:2rem">R$ ${num(cambio.usd.valor, 4)}</span>${p != null ? ` <span class="badge ${p >= 0 ? 'ok' : 'bad'}">${p >= 0 ? '▲' : '▼'} ${num(Math.abs(p))}%</span>` : ''}`;
}

// ---------- Painel ----------
export function painel(hoje) {
  if (!temDados(state)) return `
  <section class="card welcome" data-gl><span class="eyebrow">Bem-vindo ao Nexora</span>
    <h2 class="serif">Seu dinheiro, <em>claro</em> como nunca.</h2>
    <p class="muted" style="max-width:56ch;margin:0 auto 26px">Controle salário, despesas, cartões, faturas e consórcios em um só lugar — com simulador de investimentos, dólar em tempo real e uma IA que analisa seus gastos.</p>
    <div class="row" style="justify-content:center">${btn('add-lanc', 'Cadastrar meu salário', 'mais', 'btn-primary', 'data-kind="salario"')}${btn('demo', 'Ver com dados de exemplo', 'ia', 'btn-gold')}</div></section>
  <div class="grid g-3">${[['carteira', 'Receitas e despesas', 'Salário fixo, renda variável e gastos por categoria.'], ['cartao', 'Cartões e faturas', 'Limite, disponível e parcelas em cada fatura.'], ['alvo', 'Consórcios', 'Quanto paga, quantas faltam e quando termina.'], ['grafico', 'Simulador', 'Veja seus aportes crescerem com juros compostos.'], ['cambio', 'Dólar ao vivo', 'Cotação, gráfico de 30 dias e conversor.'], ['ia', 'Nexora AI', 'Diagnóstico, alertas e dicas sob medida.']]
    .map(([i, t, p]) => `<div class="card lift feat"><i>${icon(i)}</i><div><b>${t}</b><p>${p}</p></div></div>`).join('')}</div>`;

  const ymHoje = F.ymOf(hoje), ym = ui.ym, r = F.resumoMes(state, ym, hoje), serie = F.serieMeses(state, ym, 6, hoje);
  const cr = cartoesResumo(state), venc = F.proximosVencimentos(state, hoje), { itens } = diagnostico(state, hoje);
  const inv = state.investimentos.reduce((t, i) => t + i.atual, 0), apl = state.investimentos.reduce((t, i) => t + i.aplicado, 0);
  const h = new Date().getHours(), oi = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const gasto = pc(r.despesas, r.receitas), maxCat = r.categorias[0]?.valor || 1;
  return `${banner()}
  <div>${rapido()}<p class="dim xs" style="margin:8px 6px 0">Escreva ou fale o que aconteceu — eu preencho o lançamento e você só confirma.</p></div>
  <div class="spread">${navMes(ym, hoje)}${ym > ymHoje ? '<span class="badge gold">Previsão: lançamentos fixos e faturas já lançadas</span>' : ''}</div>
  <section class="card hero" data-gl>
    <div style="position:relative;z-index:1"><span class="eyebrow">${mesLongo(ym)}</span>
      <h2 class="hello serif">${oi}${state.perfil.nome ? `, ${esc(state.perfil.nome)}` : ''}.</h2>
      <p class="muted">${!r.receitas && !r.despesas ? 'Nenhum lançamento neste mês ainda.' : ym > ymHoje ? (r.sobra >= 0 ? 'Pela previsão, este mês fecha no azul.' : 'Pela previsão, as despesas passam das receitas.') : ym < ymHoje ? (r.sobra >= 0 ? 'Este mês fechou no azul.' : 'Neste mês as despesas passaram das receitas.') : r.sobra >= 0 ? 'Você está fechando o mês no azul.' : 'As despesas passaram das receitas neste mês.'}</p>
      <div class="big ${r.sobra < 0 ? 'neg' : ''}">${count(r.sobra)}</div>
      <p class="muted small">${ym > ymHoje ? 'Sobra prevista' : 'Sobra do mês'}${r.receitas ? ` · ${pc(r.sobra, r.receitas)}% da sua renda` : ''}</p>
      <div class="row mt">${btn('add-lanc', 'Despesa', 'desce', 'btn-sm', 'data-kind="despesa"')}${btn('add-lanc', 'Receita', 'sobe', 'btn-sm', 'data-kind="variavel"')}<a class="btn btn-sm btn-gold" href="#/assistente">${icon('ia')}Perguntar à IA</a></div></div>
    <div class="hero-side">
      <div class="flow"><div class="top"><span>Receitas</span><strong class="num">${brl(r.receitas)}</strong></div><div class="track"><div class="fill" style="width:${r.receitas ? 100 : 0}%"></div></div></div>
      <div class="flow"><div class="top"><span>Despesas${r.receitas ? ` · ${gasto}% da renda` : ''}</span><strong class="num">${brl(r.despesas)}</strong></div><div class="track"><div class="fill ${gasto > 100 ? 'bad' : 'gold'}" style="width:${r.despesas ? Math.min(100, r.receitas ? gasto : 100) : 0}%"></div></div></div>
    </div></section>
  <div class="grid g-4">
    <div class="card kpi lift"><div class="label"><i>${icon('sobe')}</i>Receitas do mês</div><div class="value">${count(r.receitas)}</div><div class="foot">Fixa ${brlCurto(r.receitaFixa)} · variável ${brlCurto(r.receitaVariavel)}</div></div>
    <div class="card kpi lift"><div class="label"><i class="r">${icon('desce')}</i>Despesas do mês</div><div class="value">${count(r.despesas)}</div><div class="foot">${brlCurto(r.faturas)} em faturas de cartão</div></div>
    <div class="card kpi lift"><div class="label"><i class="g">${icon('cartao')}</i>Limite disponível</div><div class="value">${count(cr.disponivel)}</div><div class="foot">${cr.limite ? `${cr.uso}% de ${brlCurto(cr.limite)} em uso` : 'Nenhum cartão cadastrado'}</div></div>
    <div class="card kpi lift"><div class="label"><i>${icon('grafico')}</i>Investido</div><div class="value">${count(inv)}</div><div class="foot">${apl ? `<span class="${inv >= apl ? 'pos' : 'neg'}">${inv >= apl ? '+' : ''}${num((inv / apl - 1) * 100)}%</span> sobre o aplicado` : 'Nenhum investimento'}</div></div>
  </div>
  <div class="grid g-32">
    <section class="card"><div class="card-head"><h2>Receitas e despesas</h2><div class="legend"><span><i class="dot" style="background:var(--s-rec)"></i>Receitas</span><span><i class="dot" style="background:var(--s-des)"></i>Despesas</span></div></div>
      ${barras({ labels: serie.map(s => ({ curto: mesCurto(s.ym), longo: mesLongo(s.ym) })), series: [{ nome: 'Receitas', cor: 'var(--s-rec)', valores: serie.map(s => s.receitas) }, { nome: 'Despesas', cor: 'var(--s-des)', valores: serie.map(s => s.despesas) }], fmt: brlCurto, rotulo: 'Receitas e despesas dos últimos seis meses' })}</section>
    <section class="card"><div class="card-head"><h2>Para onde foi o dinheiro</h2><span class="sub">${mesLongo(ym)}</span></div>
      ${r.categorias.length ? r.categorias.slice(0, 6).map((c, i) => `<div class="bar-row"><div class="top"><span>${esc(c.nome)}</span><span class="num"><strong>${brl(c.valor)}</strong> <span class="dim">· ${pc(c.valor, r.despesas)}%</span></span></div><div class="track"><div class="fill" style="width:${c.valor / maxCat * 100}%;animation-delay:${.2 + i * .08}s"></div></div></div>`).join('') : '<p class="muted small">Nenhuma despesa lançada neste mês.</p>'}</section>
  </div>
  <div class="grid g-3">
    <section class="card"><div class="card-head"><h2>${icon('calendario')}Próximos vencimentos</h2></div>${venc.length ? `<div class="list">${venc.slice(0, 5).map(vencItem).join('')}</div>` : '<p class="muted small">Nada vence nos próximos 35 dias.</p>'}</section>
    <section class="card"><div class="card-head"><h2>${icon('ia')}Nexora AI</h2><a class="small" href="#/assistente">Ver análise completa</a></div><div class="stack" style="gap:10px">${itens.slice(0, 2).map(insightHtml).join('') || '<p class="muted small">Lance receitas e despesas para receber dicas.</p>'}</div></section>
    <section class="card"><div class="card-head"><h2>${icon('cambio')}Dólar hoje</h2><span class="badge"><i class="live"></i>ao vivo</span></div><div>${pillDolar()}</div>
      <p class="dim xs" style="margin:8px 0 14px">${cambio ? `Atualizado às ${new Date(cambio.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
      ${state.consorcios.slice(0, 2).map(c => { const i = F.consorcioInfo(c, hoje); return `<div class="bar-row"><div class="top"><span>${esc(c.nome)}</span><span class="dim">faltam ${i.faltam} de ${c.total}</span></div><div class="track"><div class="fill gold" style="width:${i.pct}%"></div></div></div>`; }).join('')}
      <a class="btn btn-sm mt" href="#/cambio">Abrir câmbio e conversor</a></section>
  </div>`;
}

// ---------- Lançamentos ----------
export function lancamentos(hoje) {
  const ym = ui.ym, r = F.resumoMes(state, ym, hoje);
  let ls = F.lancamentosDoMes(state, ym).map(l => ({ ...l, k: 'l' }));
  if (ui.filtro !== 'receitas') for (const c of state.cartoes) { const f = F.faturaDoMes(state, c, ym, hoje); if (f.total) ls.push({ k: 'f', data: f.vencimento, descricao: `Fatura ${c.nome}`, valor: f.total, status: f.status, cartaoId: c.id }); }
  if (ui.filtro === 'receitas') ls = ls.filter(l => l.tipo === 'receita');
  if (ui.filtro === 'despesas') ls = ls.filter(l => l.k === 'f' || l.tipo === 'despesa');
  ls.sort((a, b) => b.data.localeCompare(a.data));
  let dia = '', lista = '';
  for (const l of ls) {
    if (l.data !== dia) { dia = l.data; lista += `<div class="day-h">${diaMes(dia)}${dia === hoje ? ' · hoje' : ''}</div>`; }
    lista += l.k === 'f'
      ? `<button class="item" data-act="ver-fatura" data-id="${l.cartaoId}" data-ym="${ym}"><span class="ico cr">${icon('cartao')}</span><span class="body"><b>${esc(l.descricao)}</b><span>Cartão de crédito · ${STATUS[l.status][1].toLowerCase()}</span></span><span class="amt num">− ${brl(l.valor)}</span></button>`
      : `<button class="item" data-act="edit-lanc" data-id="${l.id}"><span class="ico ${l.tipo === 'receita' ? 'in' : 'out'}">${icon(l.tipo === 'receita' ? 'sobe' : 'desce')}</span><span class="body"><b>${esc(l.descricao)}</b><span>${esc(l.categoria)}${l.pagamento ? ` · ${esc(l.pagamento)}` : ''}${l.recorrente ? ' · fixo mensal' : ''}</span></span><span class="amt num ${l.tipo === 'receita' ? 'pos' : ''}">${l.tipo === 'receita' ? '+' : '−'} ${brl(l.valor)}</span></button>`;
  }
  const seg = [['tudo', 'Tudo'], ['receitas', 'Receitas'], ['despesas', 'Despesas']].map(([v, t]) => `<button data-act="filtro" data-v="${v}" aria-pressed="${ui.filtro === v}">${t}</button>`).join('');
  return `${banner()}
  <div class="spread">${navMes(ym, hoje)}
    <div class="row">${btn('add-lanc', 'Salário / fixa', 'repete', '', 'data-kind="salario"')}${btn('add-lanc', 'Receita variável', 'sobe', '', 'data-kind="variavel"')}${btn('add-lanc', 'Despesa', 'desce', 'btn-primary', 'data-kind="despesa"')}</div></div>
  <div class="grid g-4">
    <div class="card kpi"><div class="label"><i>${icon('repete')}</i>Salário e receitas fixas</div><div class="value">${count(r.receitaFixa)}</div></div>
    <div class="card kpi"><div class="label"><i>${icon('sobe')}</i>Receita variável</div><div class="value">${count(r.receitaVariavel)}</div></div>
    <div class="card kpi"><div class="label"><i class="r">${icon('desce')}</i>Despesas</div><div class="value">${count(r.despesas)}</div><div class="foot">${brlCurto(r.despesasFixas)} fixas · ${brlCurto(r.faturas)} em faturas</div></div>
    <div class="card kpi"><div class="label"><i class="g">${icon('carteira')}</i>Sobra do mês</div><div class="value ${r.sobra < 0 ? 'neg' : 'pos'}">${count(r.sobra)}</div></div>
  </div>
  <section class="card"><div class="card-head"><h2>Movimentações</h2><div class="seg" role="group" aria-label="Filtrar">${seg}</div></div>
    ${lista ? `<div class="list">${lista}</div>` : `<div class="empty"><div class="orb">${icon('troca')}</div><h2>Nada por aqui em ${mesLongo(ym)}</h2><p>Adicione seu salário, uma receita variável ou uma despesa para começar.</p></div>`}</section>`;
}

// ---------- Cartões ----------
const ccHtml = (c, sel) => `<button class="cc-wrap ${sel ? 'sel' : ''}" data-act="sel-cartao" data-id="${c.id}" aria-pressed="${sel}" aria-label="Cartão ${esc(c.nome)}"><div class="cc t-${esc(c.cor || 'esmeralda')}">
  <div class="spread"><span class="nm">${esc(c.nome)}</span><span class="chip-el"></span></div>
  <div class="no">•••• •••• •••• ${esc(c.final || '0000')}</div>
  <div class="spread"><div><small>Disponível</small><b class="num">${brl(c.limite - F.limiteUsado(state, c))}</b></div><span class="brandn">${esc(c.bandeira)}</span></div></div></button>`;

export function cartoes(hoje) {
  if (!state.cartoes.length) return banner() + vazio('cartao', 'Cadastre seu primeiro cartão', 'Informe o limite, o dia de fechamento e o vencimento. Depois é só lançar as compras: eu calculo o disponível e monto cada fatura.', btn('add-cartao', 'Novo cartão', 'mais', 'btn-primary'));
  const c = state.cartoes.find(x => x.id === ui.cartaoId) || state.cartoes[0];
  const usado = F.limiteUsado(state, c), uso = pc(usado, c.limite), cr = cartoesResumo(state);
  const ym = ui.fatYm || F.faturaAtualYm(state, c, hoje), f = F.faturaDoMes(state, c, ym, hoje), [sc, st] = STATUS[f.status];
  return `${banner()}
  <div class="spread"><p class="muted">Limite total <strong class="num" style="color:var(--text)">${brl(cr.limite)}</strong> · disponível <strong class="num pos">${brl(cr.disponivel)}</strong></p>${btn('add-cartao', 'Novo cartão', 'mais')}</div>
  <div class="cc-rail">${state.cartoes.map(x => ccHtml(x, x.id === c.id)).join('')}</div>
  <div class="grid g-23">
    <section class="card"><div class="card-head"><h2>${esc(c.nome)}</h2>${btn('edit-cartao', 'Editar', 'config', 'btn-sm btn-ghost', `data-id="${c.id}"`)}</div>
      <div class="row" style="gap:22px;flex-wrap:nowrap;margin-bottom:14px">${anel(uso, { cls: corUso(uso), tam: 128, centro: `<b class="num">${uso}%</b><span>do limite</span>` })}
        <div style="flex:1;min-width:0"><span class="dim small">Disponível para compras</span><div class="num" style="font-size:1.7rem;font-weight:700">${count(c.limite - usado)}</div><span class="small ${usado > c.limite ? 'neg' : 'muted'}">${usado > c.limite ? 'Limite ultrapassado' : `de ${brl(c.limite)}`}</span></div></div>
      <div class="stat-line"><span>Limite total</span><span class="num">${brl(c.limite)}</span></div>
      <div class="stat-line"><span>Usado (faturas e parcelas a vencer)</span><span class="num">${brl(usado)}</span></div>
      <div class="stat-line"><span>Fechamento</span><span>todo dia ${c.fechamento}</span></div>
      <div class="stat-line"><span>Vencimento</span><span>todo dia ${c.vencimento}</span></div>
      ${btn('add-compra', 'Lançar compra', 'mais', 'btn-primary mt', `data-id="${c.id}" style="width:100%"`)}</section>
    <section class="card"><div class="card-head"><div class="monthnav"><button class="icon-btn" data-act="fat" data-d="-1" aria-label="Fatura anterior">${icon('esq')}</button><strong>Fatura de ${mesCurto(ym)}/${ym.slice(2, 4)}</strong><button class="icon-btn" data-act="fat" data-d="1" aria-label="Próxima fatura">${icon('dir')}</button></div><span class="badge ${sc}">${st}</span></div>
      <div class="spread" style="margin-bottom:8px"><div><div class="num" style="font-size:2rem;font-weight:700">${count(f.total)}</div><span class="muted small">Fecha em ${dataBR(f.fechamento)} · vence em ${dataBR(f.vencimento)}</span></div>
        ${f.total ? btn('pagar-fatura', f.paga ? 'Desfazer pagamento' : 'Marcar como paga', f.paga ? 'recarrega' : 'ok', f.paga ? 'btn-sm' : 'btn-primary', `data-id="${c.id}" data-ym="${ym}"`) : ''}</div>
      ${f.itens.length ? `<div class="list">${f.itens.sort((a, b) => b.compra.data.localeCompare(a.compra.data)).map(i => `<button class="item" data-act="edit-compra" data-id="${i.compra.id}"><span class="ico cr">${esc(i.compra.categoria.slice(0, 2).toUpperCase())}</span><span class="body"><b>${esc(i.compra.descricao)}</b><span>${dataBR(i.compra.data)} · ${esc(i.compra.categoria)}${i.de > 1 ? ` · parcela ${i.n} de ${i.de}` : ''}</span></span><span class="amt num">${brl(i.valor)}</span></button>`).join('')}</div>` : '<p class="muted small" style="padding:18px 0">Nenhuma compra nesta fatura.</p>'}</section>
  </div>`;
}

// ---------- Consórcios ----------
export function consorcios(hoje) {
  if (!state.consorcios.length) return banner() + vazio('alvo', 'Acompanhe seu consórcio', 'Informe o valor da parcela, o total de parcelas e quantas já pagou. Eu mostro quantas faltam, quanto falta pagar e quando termina.', btn('add-cons', 'Novo consórcio', 'mais', 'btn-primary'));
  const inf = state.consorcios.map(c => ({ c, i: F.consorcioInfo(c, hoje) })), ativos = inf.filter(x => x.i.faltam);
  const mensal = ativos.reduce((t, x) => t + x.c.parcela, 0), pago = inf.reduce((t, x) => t + x.i.pago, 0), resta = inf.reduce((t, x) => t + x.i.restante, 0);
  return `${banner()}
  <div class="spread"><p class="muted">${state.consorcios.length} consórcio(s) · ${ativos.length} em andamento</p>${btn('add-cons', 'Novo consórcio', 'mais')}</div>
  <div class="grid g-3">
    <div class="card kpi"><div class="label"><i class="g">${icon('calendario')}</i>Compromisso mensal</div><div class="value">${count(mensal)}</div></div>
    <div class="card kpi"><div class="label"><i>${icon('ok')}</i>Já pago</div><div class="value">${count(pago)}</div></div>
    <div class="card kpi"><div class="label"><i class="r">${icon('alvo')}</i>Falta pagar</div><div class="value">${count(resta)}</div></div>
  </div>
  <div class="grid g-2">${inf.map(({ c, i }) => { const prox = F.proximaParcelaConsorcio(state, c, hoje); return `
    <section class="card lift"><div class="card-head"><div><h2>${esc(c.nome)}</h2>${c.administradora ? `<span class="sub">${esc(c.administradora)}</span>` : ''}</div><div class="row">${c.contemplado ? '<span class="badge gold">Contemplado</span>' : ''}${i.faltam ? '' : '<span class="badge ok">Quitado</span>'}${btn('edit-cons', 'Editar', 'config', 'btn-sm btn-ghost', `data-id="${c.id}"`)}</div></div>
      <div class="row" style="gap:22px;flex-wrap:nowrap">${anel(i.pct, { cls: 'gold', tam: 136, centro: `<b class="num">${i.faltam}</b><span>${i.faltam === 1 ? 'parcela<br>restante' : 'parcelas<br>restantes'}</span>` })}
        <div style="flex:1;min-width:0"><span class="dim small">Parcela mensal</span><div class="num" style="font-size:1.6rem;font-weight:700">${brl(c.parcela)}</div><span class="muted small">${c.pagas} de ${c.total} pagas · ${i.pct}% concluído</span>
        ${prox ? `<div class="small" style="margin-top:6px">${prox < hoje ? `<span class="neg">Parcela em atraso desde ${dataBR(prox)}</span>` : `Próxima: <strong>${dataBR(prox)}</strong>`}</div>` : ''}</div></div>
      <div class="mt"><div class="stat-line"><span>Já pago</span><span class="num">${brl(i.pago)}</span></div><div class="stat-line"><span>Falta pagar</span><span class="num">${brl(i.restante)}</span></div>
      ${c.carta ? `<div class="stat-line"><span>Carta de crédito</span><span class="num">${brl(c.carta)}</span></div>` : ''}<div class="stat-line"><span>Término previsto</span><span>${i.termino ? mesLongo(i.termino) : '—'}</span></div></div>
      ${i.faltam ? btn('pagar-cons', 'Registrar parcela paga', 'ok', 'btn-primary mt', `data-id="${c.id}" style="width:100%"`) : ''}</section>`; }).join('')}</div>
  <p class="dim xs">O término previsto considera uma parcela por mês a partir de agora. Reajustes da administradora não são projetados — atualize o valor da parcela quando mudar.</p>`;
}

// ---------- Investimentos ----------
export function simResultado() {
  const s = state.sim, meses = s.anos * 12, r = F.simular({ inicial: s.inicial, mensal: s.mensal, taxaAnual: s.taxa, meses });
  const passo = Math.max(1, Math.round(meses / 60)), pts = r.pontos.filter((p, i) => i % passo === 0 || i === meses);
  const rot = p => p.m === 0 ? 'Hoje' : p.m % 12 === 0 ? `${p.m / 12} ano${p.m > 12 ? 's' : ''}` : `${Math.floor(p.m / 12)}a ${p.m % 12}m`;
  return `<span class="dim small">Valor final em ${s.anos} ano${s.anos > 1 ? 's' : ''}</span><div class="num gold" style="font-size:clamp(1.8rem,4vw,2.6rem);font-weight:700;line-height:1.1;margin-bottom:12px">${brl(r.final)}</div>
    <div class="grid g-2" style="gap:12px;margin-bottom:16px">
      <div><span class="dim small">Total investido</span><div class="num" style="font-size:1.2rem;font-weight:650">${brl(r.investido)}</div></div>
      <div><span class="dim small">Juros ganhos</span><div class="num pos" style="font-size:1.2rem;font-weight:650">${brl(r.juros)}</div></div></div>
    <div class="legend" style="margin-bottom:6px"><span><i class="dot" style="background:var(--s-des)"></i>Com rendimento</span><span><i class="dot" style="background:var(--s-inv)"></i>Só o que você investiu</span></div>
    ${linhas({ labels: pts.map(rot), series: [{ nome: 'Com rendimento', cor: 'var(--s-des)', valores: pts.map(p => p.total), area: true }, { nome: 'Investido', cor: 'var(--s-inv)', valores: pts.map(p => p.investido) }], fmt: brlCurto, zero: true, rotulo: 'Evolução do investimento ao longo do tempo' })}
    <p class="dim xs" style="margin-top:10px">Taxa equivalente de ${num(r.taxaMensal, 3)}% ao mês. ${r.final > 0 ? `Os juros representam ${pc(r.juros, r.final)}% do valor final. ` : ''}Simulação com taxa constante, sem impostos, taxas ou inflação — não é garantia de rentabilidade.</p>`;
}
export function investimentos() {
  const s = state.sim, tot = state.investimentos.reduce((t, i) => t + i.atual, 0), apl = state.investimentos.reduce((t, i) => t + i.aplicado, 0);
  return `${banner()}
  <div class="grid g-23">
    <section class="card"><div class="card-head"><h2>${icon('grafico')}Simulador de investimentos</h2></div>
      <div class="field"><label for="simInicial">Quanto você já tem (R$)</label><input class="input money" id="simInicial" data-money data-sim="inicial" inputmode="numeric" value="${dinheiro(s.inicial)}"></div>
      <div class="field"><label for="simMensal">Aporte mensal (R$)</label><input class="input money" id="simMensal" data-money data-sim="mensal" inputmode="numeric" value="${dinheiro(s.mensal)}"></div>
      <div class="field"><label for="simTaxa">Rentabilidade (% ao ano)</label><input class="input" id="simTaxa" data-sim="taxa" type="number" step="0.1" min="0" max="100" value="${s.taxa}">
        <div class="chips" style="margin-top:6px">${[[6, 'Conservador 6%'], [11, 'Moderado 11%'], [15, 'Arrojado 15%']].map(([v, t]) => `<button class="chip" type="button" data-act="sim-taxa" data-v="${v}">${t}</button>`).join('')}</div><span class="hint">Cenários hipotéticos. Use a taxa do seu investimento.</span></div>
      <div class="field"><label for="simAnos">Prazo: <strong id="simAnosL">${s.anos} ano${s.anos > 1 ? 's' : ''}</strong></label><input id="simAnos" data-sim="anos" type="range" min="1" max="40" value="${s.anos}"></div></section>
    <section class="card"><div class="card-head"><h2>Resultado</h2><span class="badge gold">juros compostos</span></div><div id="simOut">${simResultado()}</div></section>
  </div>
  <section class="card"><div class="card-head"><h2>${icon('carteira')}Meus investimentos</h2>${btn('add-inv', 'Adicionar', 'mais', 'btn-sm')}</div>
    ${state.investimentos.length ? `<div class="row" style="gap:28px;margin-bottom:10px"><div><span class="dim small">Patrimônio investido</span><div class="num" style="font-size:1.7rem;font-weight:700">${count(tot)}</div></div><div><span class="dim small">Rendimento</span><div class="num ${tot >= apl ? 'pos' : 'neg'}" style="font-size:1.2rem;font-weight:650">${tot >= apl ? '+' : '−'} ${brl(Math.abs(tot - apl))}${apl ? ` (${num(Math.abs(tot / apl - 1) * 100)}%)` : ''}</div></div></div>
    <div class="list">${state.investimentos.map(i => { const g = i.atual - i.aplicado; return `<button class="item" data-act="edit-inv" data-id="${i.id}"><span class="ico in">${icon('grafico')}</span><span class="body"><b>${esc(i.nome)}</b><span>${esc(i.tipo)} · aplicado ${brl(i.aplicado)} · ${pc(i.atual, tot)}% da carteira</span></span><span class="amt"><span class="num">${brl(i.atual)}</span><br><span class="small num ${g >= 0 ? 'pos' : 'neg'}">${g >= 0 ? '+' : '−'}${num(i.aplicado ? Math.abs(g) / i.aplicado * 100 : 0)}%</span></span></button>`; }).join('')}</div>`
    : '<p class="muted small">Cadastre suas aplicações para acompanhar o patrimônio e o rendimento.</p>'}</section>`;
}

// ---------- Câmbio ----------
export function convResultado() {
  if (!cambio) return '—';
  const q = ui.conv.moeda === 'EUR' && cambio.eur ? cambio.eur.valor : cambio.usd.valor, sim = ui.conv.moeda === 'EUR' && cambio.eur ? '€' : 'US$';
  const v = parseInt(ui.conv.valor.replace(/\D/g, '') || '0', 10) / 100;
  return `<div class="stat-line"><span>${sim} ${num(v)} valem</span><span class="num gold">R$ ${num(v * q)}</span></div><div class="stat-line"><span>R$ ${num(v)} compram</span><span class="num gold">${sim} ${num(v / q)}</span></div>`;
}
export function cambioPg() {
  if (!cambio) return estadoCambio === 'erro'
    ? vazio('cambio', 'Cotação indisponível agora', 'Não consegui falar com o serviço de cotações. Verifique sua conexão e tente de novo.', btn('cambio', 'Tentar novamente', 'recarrega', 'btn-primary'))
    : `<div class="card"><div class="skel" style="width:40%;height:44px;margin-bottom:18px"></div><div class="skel" style="height:200px"></div></div>`;
  const u = cambio.usd, sv = cambio.serie.map(p => p.v), var30 = sv.length > 1 ? (sv.at(-1) / sv[0] - 1) * 100 : 0;
  const mini = (nome, q, casas) => q ? `<div class="card kpi lift"><div class="label"><i class="g">${icon('cambio')}</i>${nome}</div><div class="value num">R$ ${num(q.valor, casas)}</div>${q.pct != null ? `<div class="foot"><span class="${q.pct >= 0 ? 'pos' : 'neg'}">${q.pct >= 0 ? '▲' : '▼'} ${num(Math.abs(q.pct))}%</span> no dia</div>` : ''}</div>` : '';
  return `<div class="grid g-32">
    <section class="card"><div class="card-head"><h2>Dólar comercial</h2><div class="row"><span class="badge"><i class="live"></i>${estadoCambio === 'cache' ? 'última consulta' : 'ao vivo'}</span>${btn('cambio', 'Atualizar', 'recarrega', 'btn-sm btn-ghost')}</div></div>
      <div class="row" style="align-items:baseline"><span class="quote-big num">R$ ${num(u.valor, 4)}</span>${u.pct != null ? `<span class="badge ${u.pct >= 0 ? 'ok' : 'bad'}" style="font-size:.85rem">${u.pct >= 0 ? '▲' : '▼'} ${num(Math.abs(u.pct))}% hoje</span>` : ''}</div>
      <p class="dim xs" style="margin:8px 0 16px">Atualizado em ${new Date(cambio.ts).toLocaleString('pt-BR')} · Fonte: ${esc(cambio.fonte)}</p>
      ${linhas({ labels: cambio.serie.map(p => dataBR(p.d).slice(0, 5)), series: [{ nome: 'Dólar', cor: 'var(--accent)', valores: sv, area: true }], fmt: v => 'R$ ' + num(v), rotulo: 'Cotação do dólar nos últimos 30 dias' })}</section>
    <div class="stack">
      <section class="card"><div class="card-head"><h2>Conversor</h2></div>
        <div class="two"><div class="field"><label for="convV">Valor</label><input class="input money" id="convV" data-money inputmode="numeric" value="${esc(ui.conv.valor)}"></div>
        <div class="field"><label for="convM">Moeda</label><select class="input" id="convM"><option value="USD"${ui.conv.moeda === 'USD' ? ' selected' : ''}>Dólar (US$)</option>${cambio.eur ? `<option value="EUR"${ui.conv.moeda === 'EUR' ? ' selected' : ''}>Euro (€)</option>` : ''}</select></div></div>
        <div id="convOut">${convResultado()}</div></section>
      <section class="card"><div class="card-head"><h2>Resumo</h2></div>
        ${u.max ? `<div class="stat-line"><span>Máxima do dia</span><span class="num">R$ ${num(u.max, 4)}</span></div><div class="stat-line"><span>Mínima do dia</span><span class="num">R$ ${num(u.min, 4)}</span></div>` : ''}
        <div class="stat-line"><span>Variação em ${sv.length} dias</span><span class="num ${var30 >= 0 ? 'pos' : 'neg'}">${var30 >= 0 ? '+' : '−'}${num(Math.abs(var30))}%</span></div>
        <div class="stat-line"><span>Maior no período</span><span class="num">R$ ${num(Math.max(...sv), 4)}</span></div><div class="stat-line"><span>Menor no período</span><span class="num">R$ ${num(Math.min(...sv), 4)}</span></div></section>
    </div></div>
  <div class="grid g-3">${mini('Dólar', u, 4)}${mini('Euro', cambio.eur, 4)}${mini('Bitcoin', cambio.btc, 0)}</div>
  <p class="dim xs">Cotação comercial de referência. O valor em casas de câmbio e cartões inclui spread e IOF.</p>`;
}

// ---------- Nexora AI ----------
export const msgHtml = m => `<div class="msg ${m.role === 'user' ? 'user' : 'bot'}">${m.role === 'user' ? esc(m.text) : m.text ? md(m.text) : '<span class="typing" aria-label="Escrevendo"><i></i><i></i><i></i></span>'}</div>`;
export function assistente(hoje) {
  const { itens, nota } = diagnostico(state, hoje), on = !!state.ai.key;
  const faixa = nota == null ? '' : nota >= 80 ? 'Saúde financeira ótima' : nota >= 60 ? 'No caminho certo' : nota >= 40 ? 'Pede atenção' : 'Situação crítica';
  const sug = ['Como estou este mês?', 'Onde posso economizar?', 'Como estão meus cartões?', 'Quanto falta do consórcio?', `Como fica ${mesLongo(F.addMonths(F.ymOf(hoje), 1)).split(' de ')[0]}?`, 'Compare com o mês passado', 'Quais contas vencem em breve?'];
  return `${banner()}<div class="grid g-23">
    <div class="stack">
      <section class="card"><div class="card-head"><h2>Diagnóstico</h2><span class="sub">análise local</span></div>
        ${nota == null ? '<p class="muted small">Lance receitas e despesas deste mês para eu calcular sua saúde financeira.</p>' : `<div class="row" style="gap:20px;flex-wrap:nowrap">${anel(nota, { cls: nota >= 60 ? '' : nota >= 40 ? 'warn' : 'bad', tam: 124, centro: `<b class="num" data-count="${nota}" data-fmt="int">${nota}</b><span>de 100</span>` })}<div><b style="font-size:1.1rem">${faixa}</b><p class="muted small">Indicador simples calculado com sobra do mês, uso do cartão, atrasos e reserva. Não é score de crédito.</p></div></div>`}</section>
      <section class="card"><div class="card-head"><h2>${icon('lampada')}Alertas e dicas</h2></div><div class="stack" style="gap:10px">${itens.map(insightHtml).join('') || '<p class="muted small">Sem dados suficientes ainda.</p>'}</div></section>
    </div>
    <section class="card chat"><div class="chat-head"><div class="ai-orb"></div><div style="flex:1"><b>Nexora AI</b><div class="xs dim">${on ? `Conectada ao ${esc(MODELOS.find(m => m[0] === state.ai.model)?.[1].split(' (')[0] || 'Claude')}` : 'Modo local — respostas a partir dos seus dados'}</div></div>${on ? '<span class="badge ok">Claude</span>' : `<a class="btn btn-sm btn-gold" href="#/configuracoes">${icon('ia')}Ativar Claude</a>`}</div>
      <div class="chat-log" id="chatLog" aria-live="polite">${ui.chat.length ? ui.chat.map(msgHtml).join('') : `<div class="msg bot"><p>Olá${state.perfil.nome ? `, ${esc(state.perfil.nome)}` : ''}! Sou a <strong>Nexora AI</strong>. Analiso suas receitas, despesas, cartões e consórcios e respondo com base nos seus números.</p><p>Escolha uma sugestão abaixo ou escreva sua pergunta.</p></div>`}</div>
      <div class="chat-foot"><div class="chips">${sug.map(t => `<button class="chip" data-act="ai-sug">${t}</button>`).join('')}</div>
        <form class="chat-form" id="chatForm"><input class="input" id="chatIn" placeholder="Ex.: quanto vou gastar em dezembro?" autocomplete="off" maxlength="2000" aria-label="Mensagem"><button class="btn btn-primary" aria-label="Enviar">${icon('envia')}</button></form></div></section>
  </div>`;
}

// ---------- Configurações ----------
export const textoSync = () => { const s = N.situacao; return s.estado === 'sincronizando' ? 'Sincronizando…' : s.estado === 'erro' ? `Não sincronizado: ${s.erro}` : s.hora ? `Sincronizado às ${new Date(s.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando sincronização'; };
function contaCard() {
  const u = N.usuario();
  if (!N.ativa) return `<section class="card"><div class="card-head"><h2>${icon('nuvem')}Conta e sincronização</h2><span class="badge">Não configurado</span></div><p class="muted small">O servidor de contas ainda não foi configurado. Por enquanto os dados ficam só neste navegador.</p></section>`;
  if (!u) return `<section class="card"><div class="card-head"><h2>${icon('nuvem')}Conta e sincronização</h2><span class="badge">Sem conta</span></div><p class="muted small" style="margin-bottom:14px">Entre ou crie uma conta para usar os mesmos dados no celular e no computador.</p>${btn('conta-entrar', 'Entrar ou criar conta', 'nuvem', 'btn-primary')}</section>`;
  return `<section class="card"><div class="card-head"><h2>${icon('nuvem')}Conta e sincronização</h2><span class="badge ${N.situacao.estado === 'erro' ? 'bad' : 'ok'}">${N.situacao.estado === 'erro' ? 'Com erro' : 'Conectada'}</span></div>
      <div class="stat-line"><span>Conta</span><span>${esc(u.email)}</span></div><div class="stat-line"><span>Situação</span><span>${esc(textoSync())}</span></div>
      <div class="row mt">${btn('conta-sync', 'Sincronizar agora', 'recarrega')}${btn('conta-sair', 'Sair da conta', 'sair', 'btn-danger')}</div>
      <p class="dim xs" style="margin-top:12px">Ao sair, os dados são apagados deste aparelho e continuam salvos na sua conta. A chave da IA não é enviada para a conta.</p></section>`;
}
export function configuracoes() {
  return `${banner()}<div class="grid g-2">
    <section class="card"><div class="card-head"><h2>Perfil</h2></div>
      <div class="field"><label for="cfgNome">Como devo te chamar?</label><input class="input" id="cfgNome" maxlength="30" value="${esc(state.perfil.nome)}" placeholder="Seu nome"></div>${btn('cfg-nome', 'Salvar', 'ok', 'btn-primary')}</section>
    <section class="card"><div class="card-head"><h2>${icon('ia')}Nexora AI com Claude</h2><span class="badge ${state.ai.key ? 'ok' : ''}">${state.ai.key ? 'Ativa' : 'Opcional'}</span></div>
      <p class="muted small" style="margin-bottom:14px">Sem chave, a IA funciona em modo local. Com uma chave da API da Anthropic, você conversa com o Claude sobre suas finanças.</p>
      <div class="field"><label for="cfgKey">Chave da API (sk-ant-…)</label><input class="input" id="cfgKey" type="password" autocomplete="off" value="${esc(state.ai.key)}" placeholder="sk-ant-..."><span class="hint">Fica salva só neste navegador e é enviada apenas à Anthropic. Use em dispositivo pessoal; o uso é cobrado na sua conta da API.</span></div>
      <div class="field"><label for="cfgModel">Modelo</label><select class="input" id="cfgModel">${MODELOS.map(([v, t]) => `<option value="${v}"${v === state.ai.model ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="row">${btn('cfg-ia', 'Salvar', 'ok', 'btn-primary')}${state.ai.key ? btn('cfg-ia-off', 'Remover chave', 'lixo', 'btn-danger') : ''}</div></section>
    ${contaCard()}
    <section class="card"><div class="card-head"><h2>${icon('escudo')}Seus dados</h2></div>
      <p class="muted small" style="margin-bottom:14px">${N.usuario() ? 'Seus dados estão na sua conta e neste aparelho. O backup em arquivo é uma cópia extra.' : 'Tudo fica guardado apenas neste navegador. Faça backup para não perder ao limpar o histórico ou trocar de aparelho.'}</p>
      <div class="row">${btn('exportar', 'Baixar backup', 'baixa')}${btn('importar', 'Restaurar backup', 'sobeArq')}<input type="file" id="impFile" accept="application/json,.json" hidden></div></section>
    <section class="card"><div class="card-head"><h2>${icon('celular')}Usar como aplicativo</h2></div>
      <p class="muted small" style="margin-bottom:14px">Coloque o Nexora na tela inicial do celular para abrir em um toque, em tela cheia.</p>
      <div id="instalarBox">${btn('instalar', 'Instalar o Nexora', 'baixa', 'btn-primary')}</div>
      <p class="dim xs" style="margin-top:12px"><strong>Android (Chrome):</strong> menu ⋮ → "Adicionar à tela inicial" ou "Instalar app". <strong>iPhone (Safari):</strong> botão Compartilhar → "Adicionar à Tela de Início".</p></section>
    <section class="card"><div class="card-head"><h2>Recomeçar</h2></div>
      <p class="muted small" style="margin-bottom:14px">Carregue dados fictícios para explorar o Nexora ou apague tudo para começar do zero.</p>
      <div class="row">${btn('demo', 'Carregar dados de exemplo', 'ia')}${btn('limpar', 'Apagar todos os dados', 'lixo', 'btn-danger')}</div></section>
  </div>`;
}
