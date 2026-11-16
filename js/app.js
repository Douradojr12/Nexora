// Casca da aplicação: rotas, renderização, ações (data-act), chat e efeitos visuais.
import * as F from './finance.js';
import * as P from './pages.js';
import { state, ui, commit, salvarQuieto, aoMudar, temDados, exportar, importar, apagarTudo, carregarExemplo } from './store.js';
import { $, $$, esc, icon, toast, contar, hojeISO, uid, num, md } from './util.js';
import { ligarGraficos, limparGraficos } from './charts.js';
import { abrirGaveta, fecharGaveta, confirmar, mascaraDinheiro, lerDinheiro, formLancamento, formCartao, formCompra, formConsorcio, formInvestimento } from './forms.js';
import { cambio, atualizarCambio } from './cambio.js';
import { interpretar } from './parser.js';
import { SISTEMA, contexto, conversarClaude, responderLocal } from './ai.js';

const rotas = [
  { id: 'painel', titulo: 'Painel', icon: 'painel', pg: P.painel },
  { id: 'lancamentos', titulo: 'Receitas e despesas', icon: 'troca', pg: P.lancamentos },
  { id: 'cartoes', titulo: 'Cartões e faturas', icon: 'cartao', pg: P.cartoes },
  { id: 'consorcios', titulo: 'Consórcios', icon: 'alvo', pg: P.consorcios },
  { id: 'investimentos', titulo: 'Investimentos', icon: 'grafico', pg: P.investimentos },
  { id: 'cambio', titulo: 'Câmbio', icon: 'cambio', pg: P.cambioPg },
  { id: 'assistente', titulo: 'Nexora AI', icon: 'ia', pg: P.assistente, tag: 'IA' },
  { id: 'configuracoes', titulo: 'Configurações', icon: 'config', pg: P.configuracoes },
];
const nav = $('#nav'), main = $('#main'), sidebar = $('#sidebar'), scrim = $('#scrim'), menuBtn = $('#menuBtn');
nav.innerHTML = rotas.map(r => `<a href="#/${r.id}" data-id="${r.id}">${icon(r.icon)}<span>${r.titulo}</span>${r.tag ? `<span class="tag">${r.tag}</span>` : ''}</a>`).join('');
let rota = rotas[0];

function render(semEntrada = false) {
  try {
    limparGraficos();
    main.innerHTML = `<div class="page stack${semEntrada ? ' no-enter' : ''}">${rota.pg(hojeISO())}</div>`;
    $$('.page > *', main).forEach((el, i) => el.style.setProperty('--i', i));
    ligarGraficos(main); mascaraDinheiro(main);
    if (!semEntrada) contar(main);
    montar[rota.id]?.();
  } catch (err) {
    console.error(err);
    main.innerHTML = '<div class="card empty"><h2>Não foi possível abrir esta página</h2><p>Recarregue a página. Se o problema continuar, volte ao Painel.</p></div>';
  }
}
function navegar() {
  const id = location.hash.replace(/^#\//, '') || 'painel';
  rota = rotas.find(r => r.id === id) || rotas[0];
  document.title = `${rota.titulo} — Nexora`;
  $('#pageTitle').textContent = rota.titulo;
  $$('a', nav).forEach(a => a.dataset.id === rota.id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  setMenu(false); render(); scrollTo(0, 0);
}
const setMenu = on => { sidebar.classList.toggle('open', on); menuBtn.setAttribute('aria-expanded', on); scrim.classList.toggle('open', on || $('#drawer').classList.contains('open')); };
menuBtn.onclick = () => setMenu(!sidebar.classList.contains('open'));
scrim.onclick = () => { fecharGaveta(); setMenu(false); };
$('#drawerClose').onclick = fecharGaveta;
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#confirm').open) { fecharGaveta(); setMenu(false); } });
addEventListener('hashchange', navegar);
aoMudar(() => render(true));

// ---------- Montagem por página (ouvintes que não são cliques) ----------
const montar = {
  investimentos() {
    const refaz = () => { $('#simOut').innerHTML = P.simResultado(); ligarGraficos($('#simOut')); };
    $$('[data-sim]', main).forEach(inp => inp.addEventListener('input', () => {
      const k = inp.dataset.sim;
      let v = k === 'taxa' ? Math.min(100, Math.max(0, parseFloat(inp.value) || 0)) : k === 'anos' ? +inp.value : lerDinheiro(inp.value);
      salvarQuieto(s => { s.sim[k] = v; });
      if (k === 'anos') $('#simAnosL').textContent = `${v} ano${v > 1 ? 's' : ''}`;
      refaz();
    }));
  },
  cambio() {
    const v = $('#convV'), m = $('#convM'); if (!v) return;
    const up = () => { ui.conv = { valor: v.value, moeda: m.value }; $('#convOut').innerHTML = P.convResultado(); };
    v.addEventListener('input', up); m.addEventListener('change', up);
  },
  assistente() {
    const log = $('#chatLog'); log.scrollTop = log.scrollHeight;
    $('#chatForm').addEventListener('submit', e => { e.preventDefault(); const inp = $('#chatIn'); enviar(inp.value); inp.value = ''; });
  },
  configuracoes() {
    $('#impFile').addEventListener('change', async e => {
      const arq = e.target.files[0]; if (!arq) return;
      if (temDados(state) && !await confirmar('Restaurar backup?', 'Os dados atuais serão substituídos pelos do arquivo.', 'Restaurar')) return;
      try { importar(await arq.text()); toast('Backup restaurado'); } catch { toast('Arquivo de backup inválido', true); }
    });
  },
};

// ---------- Chat ----------
let quadro = 0;
function pintaUltima() {
  cancelAnimationFrame(quadro);
  quadro = requestAnimationFrame(() => {
    const log = $('#chatLog'); if (!log) return;
    const m = ui.chat.at(-1), el = log.lastElementChild;
    if (m && el && m.text) el.innerHTML = md(m.text);
    log.scrollTop = log.scrollHeight;
  });
}
async function enviar(texto) {
  texto = texto.trim();
  if (!texto || ui.ocupado) return;
  const hoje = hojeISO(), bot = { role: 'assistant', text: '' };
  ui.chat.push({ role: 'user', text: texto }, bot); ui.ocupado = true;
  const log = $('#chatLog');
  if (log) { if (ui.chat.length === 2) log.innerHTML = ''; log.insertAdjacentHTML('beforeend', ui.chat.slice(-2).map(P.msgHtml).join('')); log.scrollTop = log.scrollHeight; }
  try {
    if (state.ai.key) {
      try {
        const hist = ui.chat.slice(0, -1).slice(-21);
        while (hist.length && hist[0].role !== 'user') hist.shift();
        const parada = await conversarClaude({
          key: state.ai.key, model: state.ai.model, system: SISTEMA + contexto(state, hoje),
          messages: hist.map(m => ({ role: m.role, content: m.text })), onText: t => { bot.text += t; pintaUltima(); },
        });
        if (!bot.text) bot.text = parada === 'refusal' ? 'Não posso ajudar com esse pedido. Tente reformular a pergunta sobre suas finanças.' : 'Não recebi uma resposta. Tente novamente.';
      } catch (err) {
        bot.text = `**Não consegui falar com o Claude.** ${err.message || ''}\n\nResposta em modo local:\n\n${responderLocal(texto, state, hoje)}`;
      }
    } else {
      await new Promise(r => setTimeout(r, 600));
      bot.text = responderLocal(texto, state, hoje);
    }
  } finally { ui.ocupado = false; pintaUltima(); }
}

// ---------- Ações ----------
const baixar = (nome, txt) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
const acoes = {
  novo() {
    const op = (act, attrs, ic, t, d) => `<button class="menu-opt" data-act="${act}" ${attrs}><i>${icon(ic)}</i><span><b>${t}</b><span>${d}</span></span></button>`;
    abrirGaveta('O que você quer lançar?', 'Fale, escreva ou escolha uma opção.',
      `<div style="margin-bottom:18px">${P.rapido()}</div>` + op('add-lanc', 'data-kind="despesa"', 'desce', 'Despesa', 'Conta, mercado, aluguel…') + op('add-lanc', 'data-kind="salario"', 'repete', 'Salário / receita fixa', 'Entra todo mês automaticamente') +
      op('add-lanc', 'data-kind="variavel"', 'sobe', 'Receita variável', 'Freela, venda, bônus…') + (state.cartoes.length ? op('add-compra', `data-id="${(state.cartoes.find(c => c.id === ui.cartaoId) || state.cartoes[0]).id}"`, 'cartao', 'Compra no cartão', 'À vista ou parcelada') : '') +
      op('add-cartao', '', 'cartao', 'Cartão de crédito', 'Limite, fechamento e vencimento') + op('add-cons', '', 'alvo', 'Consórcio', 'Parcela e quantas faltam') + op('add-inv', '', 'grafico', 'Investimento', 'Valor aplicado e valor atual'));
  },
  'add-lanc': d => formLancamento(d.kind), 'edit-lanc': d => formLancamento(null, d.id),
  'add-cartao': () => formCartao(), 'edit-cartao': d => formCartao(d.id),
  'add-compra': d => formCompra(d.id), 'edit-compra': d => formCompra(null, d.id),
  'add-cons': () => formConsorcio(), 'edit-cons': d => formConsorcio(d.id),
  'add-inv': () => formInvestimento(), 'edit-inv': d => formInvestimento(d.id),
  mes(d) { ui.ym = F.addMonths(ui.ym, +d.d); render(true); },
  'mes-hoje'() { ui.ym = F.ymOf(hojeISO()); render(true); },
  filtro(d) { ui.filtro = d.v; render(true); },
  'sel-cartao'(d) { ui.cartaoId = d.id; ui.fatYm = null; render(true); },
  fat(d) { const c = state.cartoes.find(x => x.id === ui.cartaoId) || state.cartoes[0]; ui.fatYm = F.addMonths(ui.fatYm || F.faturaAtualYm(state, c, hojeISO()), +d.d); render(true); },
  'ver-fatura'(d) { ui.cartaoId = d.id; ui.fatYm = d.ym; location.hash = '#/cartoes'; },
  'pagar-fatura'(d) {
    const k = `${d.id}|${d.ym}`, paga = !!state.faturasPagas[k];
    ui.fatYm = d.ym;
    commit(s => { if (paga) delete s.faturasPagas[k]; else s.faturasPagas[k] = true; });
    toast(paga ? 'Pagamento desfeito' : 'Fatura paga — limite liberado');
  },
  'pagar-cons'(d) {
    const c = state.consorcios.find(x => x.id === d.id); if (!c || c.pagas >= c.total) return;
    commit(s => { c.pagas++; s.lancamentos.push({ id: uid(), tipo: 'despesa', descricao: `Parcela ${c.nome}`, categoria: 'Consórcio', valor: c.parcela, data: hojeISO(), recorrente: false, consorcioId: c.id }); });
    toast(c.pagas >= c.total ? 'Consórcio quitado. Parabéns!' : `Parcela registrada — faltam ${c.total - c.pagas}`);
  },
  voz(d, el) { ouvir(el); },
  async instalar() {
    if (!promptInstalar) return toast('Use o menu do navegador: "Adicionar à tela inicial"');
    promptInstalar.prompt(); await promptInstalar.userChoice; promptInstalar = null;
  },
  'sim-taxa'(d) { const i = $('#simTaxa'); i.value = d.v; i.dispatchEvent(new Event('input')); },
  cambio() { atualizarCambio(true); toast('Atualizando cotação…'); },
  'ai-sug'(d, el) { enviar(el.textContent); },
  async demo() {
    if (temDados(state) && !state.demo && !await confirmar('Carregar dados de exemplo?', 'Seus dados atuais serão substituídos por dados fictícios. Faça um backup antes, se precisar.', 'Substituir')) return;
    carregarExemplo(); ui.cartaoId = ui.fatYm = null; fecharGaveta(); toast('Dados de exemplo carregados');
    if (rota.id !== 'painel') location.hash = '#/painel';
  },
  async limpar() {
    if (!await confirmar('Apagar todos os dados?', 'Lançamentos, cartões, consórcios e investimentos serão removidos deste navegador. Esta ação não pode ser desfeita.', 'Apagar tudo')) return;
    apagarTudo(); ui.cartaoId = ui.fatYm = null; ui.chat = []; toast('Tudo limpo. Vamos começar!');
  },
  exportar() { baixar(`nexora-backup-${hojeISO()}.json`, exportar()); toast('Backup baixado'); },
  importar() { $('#impFile').click(); },
  'cfg-nome'() { commit(s => { s.perfil.nome = $('#cfgNome').value.trim(); }); toast('Perfil salvo'); },
  'cfg-ia'() {
    const k = $('#cfgKey').value.trim(), m = $('#cfgModel').value;
    if (k && !k.startsWith('sk-ant-')) return toast('A chave deve começar com sk-ant-', true);
    commit(s => { s.ai.key = k; s.ai.model = m; }); toast(k ? 'Claude ativado na Nexora AI' : 'Preferências salvas');
  },
  'cfg-ia-off'() { commit(s => { s.ai.key = ''; }); toast('Chave removida'); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = acoes[el.dataset.act]; if (f) { e.preventDefault(); f(el.dataset, el); }
});

// ---------- Lançamento rápido por frase (texto ou voz) ----------
function lancarFrase(texto) {
  texto = texto.trim(); if (!texto) return;
  const r = interpretar(texto, { cartoes: state.cartoes, hoje: hojeISO() });
  const base = { valor: r.valor, descricao: r.descricao, categoria: r.categoria, data: r.data };
  if (r.tipo === 'compra') formCompra(r.cartaoId, null, { ...base, cartaoId: r.cartaoId, parcelas: r.parcelas });
  else if (r.tipo === 'receita') formLancamento('variavel', null, base);
  else formLancamento('despesa', null, { ...base, pagamento: r.pagamento });
  if (!r.valor) toast('Não achei o valor na frase — preencha e salve', true);
}
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-quick]'); if (!f) return;
  e.preventDefault(); const t = f.elements.q.value; f.elements.q.value = ''; lancarFrase(t);
});
const Reconhecedor = window.SpeechRecognition || window.webkitSpeechRecognition;
let escuta = null;
function ouvir(botao) {
  if (!Reconhecedor) return toast('Seu navegador não tem ditado aqui. Use o microfone do teclado.', true);
  if (escuta) { escuta.stop(); return; }
  const form = botao.closest('form'), campo = form.elements.q, rec = escuta = new Reconhecedor();
  let final = '';
  rec.lang = 'pt-BR'; rec.interimResults = true; rec.maxAlternatives = 1;
  rec.onstart = () => { form.classList.add('ouvindo'); campo.value = ''; campo.placeholder = 'Ouvindo… pode falar'; };
  rec.onresult = ev => { final = ''; let tudo = ''; for (const r of ev.results) { tudo += r[0].transcript; if (r.isFinal) final += r[0].transcript; } if (campo.isConnected) campo.value = tudo; };
  rec.onerror = ev => { if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') toast('Permita o uso do microfone para falar', true); else if (ev.error !== 'aborted' && ev.error !== 'no-speech') toast('Não consegui ouvir. Tente de novo.', true); };
  rec.onend = () => {
    escuta = null; form.classList.remove('ouvindo'); campo.placeholder = 'Ex.: 40 reais de mercado no pix';
    const t = (final || campo.value).trim(); if (t) { campo.value = ''; lancarFrase(t); }
  };
  try { rec.start(); } catch { escuta = null; }
}

// ---------- Aplicativo instalável (PWA) ----------
let promptInstalar = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstalar = e; });
addEventListener('appinstalled', () => { promptInstalar = null; toast('Nexora instalado na tela inicial'); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});

// ---------- Efeitos: brilho que segue o cursor e inclinação 3D dos cartões ----------
document.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  const card = e.target.closest?.('.card');
  if (card) { const r = card.getBoundingClientRect(); card.style.setProperty('--mx', `${e.clientX - r.left}px`); card.style.setProperty('--my', `${e.clientY - r.top}px`); }
  const w = e.target.closest?.('.cc-wrap');
  if (w) {
    const cc = w.firstElementChild, r = w.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    cc.style.setProperty('--ry', `${(x - .5) * 16}deg`); cc.style.setProperty('--rx', `${(.5 - y) * 14}deg`);
    cc.style.setProperty('--sx', `${x * 100}%`); cc.style.setProperty('--sy', `${y * 100}%`);
  }
}, { passive: true });
document.addEventListener('pointerout', e => { const w = e.target.closest?.('.cc-wrap'); if (w && !w.contains(e.relatedTarget)) { const cc = w.firstElementChild; cc.style.setProperty('--rx', '0deg'); cc.style.setProperty('--ry', '0deg'); } });

// ---------- Cotação no cabeçalho ----------
addEventListener('nexora:cambio', () => {
  if (cambio) $('#usdVal').textContent = `R$ ${num(cambio.usd.valor)}`;
  const foco = document.activeElement;
  if ((rota.id === 'cambio' || rota.id === 'painel') && !(main.contains(foco) && /INPUT|SELECT/.test(foco.tagName))) render(true);
});
if (cambio) $('#usdVal').textContent = `R$ ${num(cambio.usd.valor)}`;
atualizarCambio();
setInterval(() => { if (!document.hidden) atualizarCambio(); }, 60e3);

navegar();
if (new URLSearchParams(location.search).has('lancar')) { history.replaceState(null, '', location.pathname + location.hash); acoes.novo(); }
