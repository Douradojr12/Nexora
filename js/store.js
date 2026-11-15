// Estado da aplicação, salvo apenas neste navegador (localStorage). Valores em centavos.
import { ymOf, addMonths, dataNoMes, mesesComFatura } from './finance.js';
import { hojeISO, uid } from './util.js';

const KEY = 'nexora:v1';
export const MODELOS = [
  ['claude-opus-5-5', 'Claude Opus 5.5 (recomendado)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5'],
  ['claude-haiku-5-5', 'Claude Haiku 5.5 (mais econômico)'], ['claude-fable-5-2', 'Claude Fable 5.2 (mais avançado)'],
];
export const CAT_DESPESA = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Assinaturas', 'Compras', 'Contas', 'Consórcio', 'Outros'];
export const CAT_RECEITA = ['Salário', 'Freelance', 'Vendas', 'Rendimentos', 'Bônus', 'Outros'];

const vazio = () => ({
  v: 1, demo: false, perfil: { nome: '' }, ai: { key: '', model: MODELOS[0][0] },
  lancamentos: [], cartoes: [], compras: [], faturasPagas: {}, consorcios: [], investimentos: [],
  sim: { inicial: 100000, mensal: 50000, taxa: 11, anos: 10 },
});
function normaliza(d) {
  const b = vazio();
  if (!d || typeof d !== 'object') return b;
  for (const k of ['lancamentos', 'cartoes', 'compras', 'consorcios', 'investimentos']) if (Array.isArray(d[k])) b[k] = d[k];
  if (d.faturasPagas && typeof d.faturasPagas === 'object') b.faturasPagas = d.faturasPagas;
  Object.assign(b.perfil, d.perfil); Object.assign(b.ai, d.ai); Object.assign(b.sim, d.sim);
  if (!MODELOS.some(m => m[0] === b.ai.model)) b.ai.model = MODELOS[0][0];
  b.demo = !!d.demo;
  return b;
}
function load() { try { return normaliza(JSON.parse(localStorage.getItem(KEY))); } catch { return vazio(); } }

export let state = load();
export const ui = { ym: ymOf(hojeISO()), filtro: 'tudo', cartaoId: null, fatYm: null, conv: { valor: '100,00', moeda: 'USD' }, chat: [], ocupado: false };

const ouvintes = new Set();
export const aoMudar = f => ouvintes.add(f);
export function commit(fn) {
  fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error('Falha ao salvar', e); }
  ouvintes.forEach(f => f());
}
export function salvarQuieto(fn) { fn(state); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
export const temDados = s => s.lancamentos.length + s.cartoes.length + s.consorcios.length + s.investimentos.length > 0;

export function exportar() { const c = structuredClone(state); c.ai.key = ''; return JSON.stringify(c, null, 2); } // a chave da IA nunca vai no backup
export function importar(txt) {
  const d = JSON.parse(txt);
  if (!d || d.v !== 1 || !Array.isArray(d.lancamentos)) throw new Error('Arquivo não reconhecido');
  const key = state.ai.key;
  commit(() => { state = normaliza(d); state.ai.key = key; });
}
export function apagarTudo() { const ai = state.ai, perfil = state.perfil; commit(() => { state = vazio(); state.ai = ai; state.perfil = perfil; }); }

// Dados de exemplo (fictícios), gerados em torno da data de hoje. Marcados com demo:true.
export function carregarExemplo() {
  const hoje = hojeISO(), ym = ymOf(hoje), m = n => addMonths(ym, n), d = (n, dia) => dataNoMes(m(n), dia);
  const s = vazio();
  s.demo = true; s.ai = state.ai; s.perfil = state.perfil;
  const L = (tipo, descricao, categoria, valor, data, recorrente = false, extra = {}) => s.lancamentos.push({ id: uid(), tipo, descricao, categoria, valor, data, recorrente, ...extra });
  L('receita', 'Salário', 'Salário', 680000, d(-7, 5), true);
  L('despesa', 'Aluguel', 'Moradia', 190000, d(-7, 10), true);
  L('despesa', 'Internet fibra', 'Contas', 11990, d(-7, 12), true);
  L('despesa', 'Academia', 'Saúde', 12990, d(-7, 8), true);
  L('despesa', 'Plano de celular', 'Contas', 6990, d(-7, 20), true);
  const frees = [0, 85000, 0, 120000, 42000, 0, 96000], merc = [91240, 87410, 99830, 84560, 102300, 93870, 58120], luz = [18420, 20110, 23780, 21050, 19630, 22490, 0];
  for (let i = -6; i <= 0; i++) {
    const k = i + 6;
    if (frees[k]) L('receita', 'Projeto freelance', 'Freelance', frees[k], d(i, 18));
    if (i < 0 || hoje >= d(i, 14)) L('despesa', 'Supermercado', 'Alimentação', merc[k], d(i, 14));
    if (luz[k]) L('despesa', 'Conta de luz', 'Contas', luz[k], d(i, 15));
    if (i < 0) L('despesa', 'Combustível', 'Transporte', 24000 + k * 1730, d(i, 22));
  }
  L('receita', 'Venda de bicicleta usada', 'Vendas', 65000, d(-2, 9));
  const c1 = { id: uid(), nome: 'Nexora Black', bandeira: 'Mastercard', final: '4821', limite: 1200000, fechamento: 25, vencimento: 5, cor: 'onix' };
  const c2 = { id: uid(), nome: 'Dia a dia', bandeira: 'Visa', final: '0937', limite: 450000, fechamento: 3, vencimento: 10, cor: 'esmeralda' };
  s.cartoes.push(c1, c2);
  const C = (cartaoId, descricao, categoria, valor, parcelas, data) => s.compras.push({ id: uid(), cartaoId, descricao, categoria, valor, parcelas, data });
  C(c1.id, 'Notebook', 'Compras', 489900, 10, d(-4, 12));
  C(c1.id, 'Passagens aéreas', 'Lazer', 186000, 6, d(-2, 3));
  C(c1.id, 'Curso de inglês', 'Educação', 238800, 12, d(-5, 20));
  C(c2.id, 'Geladeira', 'Compras', 329900, 8, d(-3, 15));
  for (let i = -6; i <= 0; i++) {
    C(c2.id, 'Streaming de filmes', 'Assinaturas', 5590, 1, d(i, 2));
    C(c2.id, 'Streaming de música', 'Assinaturas', 2190, 1, d(i, 2));
    if (i < 0 || hoje >= d(i, 7)) C(c1.id, 'Restaurante', 'Alimentação', 14200 + (i + 6) * 1350, 1, d(i, 7));
    if (i < 0) C(c2.id, 'Farmácia', 'Saúde', 6800 + (i + 6) * 940, 1, d(i, 19));
  }
  for (const c of s.cartoes) for (const f of mesesComFatura(s, c)) if (dataNoMes(f, c.vencimento) < hoje) s.faturasPagas[`${c.id}|${f}`] = true;
  const cons = { id: uid(), nome: 'Consórcio do carro', administradora: 'Administradora Exemplo', carta: 8000000, parcela: 105000, total: 72, pagas: 19, vencimento: 15, contemplado: false };
  s.consorcios.push(cons);
  for (let i = -6; i < 0; i++) L('despesa', `Parcela ${cons.nome}`, 'Consórcio', cons.parcela, d(i, 15), false, { consorcioId: cons.id });
  s.investimentos.push(
    { id: uid(), nome: 'Tesouro Selic', tipo: 'Tesouro Direto', aplicado: 1200000, atual: 1264000 },
    { id: uid(), nome: 'CDB liquidez diária', tipo: 'Renda fixa', aplicado: 800000, atual: 841000 },
    { id: uid(), nome: 'Carteira de ações', tipo: 'Ações', aplicado: 500000, atual: 532000 });
  commit(() => { state = s; });
}
