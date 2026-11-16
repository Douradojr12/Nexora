import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { responderLocal, mesesNaFrase, esquecerMes, contexto } = await import('../js/ai.js');

const hoje = '2026-11-16';
const s = { perfil: { nome: '' }, demo: false, cartoes: [{ id: 'c1', nome: 'Black', bandeira: 'Visa', limite: 500000, fechamento: 25, vencimento: 5 }], faturasPagas: {}, consorcios: [], investimentos: [],
  lancamentos: [
    { id: '1', tipo: 'receita', descricao: 'Salário', categoria: 'Salário', valor: 500000, data: '2026-10-05', recorrente: true },
    { id: '2', tipo: 'despesa', descricao: 'Aluguel', categoria: 'Moradia', valor: 150000, data: '2026-10-10', recorrente: true },
    { id: '3', tipo: 'despesa', descricao: 'Mercado', categoria: 'Alimentação', valor: 40000, data: '2026-11-12', recorrente: false, pagamento: 'Pix' },
    { id: '4', tipo: 'despesa', descricao: 'Ceia de Natal', categoria: 'Alimentação', valor: 30000, data: '2026-12-20', recorrente: false },
  ],
  compras: [{ id: 'k', cartaoId: 'c1', descricao: 'Notebook', categoria: 'Compras', valor: 300000, parcelas: 3, data: '2026-11-10' }] };

test('entende meses por nome, relativos e com ano', () => {
  const n = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  assert.deepEqual(mesesNaFrase(n('como fica dezembro?'), hoje), ['2026-12']);
  assert.deepEqual(mesesNaFrase(n('e janeiro'), hoje), ['2027-01']);
  assert.deepEqual(mesesNaFrase(n('gastos de março de 2026'), hoje), ['2026-03']);
  assert.deepEqual(mesesNaFrase(n('mês que vem'), hoje), ['2026-12']);
  assert.deepEqual(mesesNaFrase(n('compare outubro com dezembro'), hoje), ['2026-10', '2026-12']);
  assert.deepEqual(mesesNaFrase(n('onde posso economizar?'), hoje), []);
});
test('responde sobre dezembro com os números de dezembro e avisa que é previsão', () => {
  esquecerMes();
  const r = responderLocal('Como vai ser dezembro?', s, hoje);
  assert.match(r, /Resumo de dezembro de 2026 \(previsão\)/);
  assert.match(r, /Receitas: \*\*R\$\s5\.000,00\*\*/);
  assert.match(r, /Despesas: \*\*R\$\s2\.800,00\*\*/); // aluguel 1500 + ceia 300 + 1ª parcela do notebook 1000
  assert.match(r, /Sobra prevista: \*\*R\$\s2\.200,00\*\*/);
  // pergunta seguinte sem citar o mês continua em dezembro
  assert.match(responderLocal('e as despesas?', s, hoje), /Despesas de dezembro de 2026/);
  assert.match(responderLocal('quanto de alimentação?', s, hoje), /Alimentação em dezembro de 2026 \(previsão\): R\$\s300,00/);
  assert.match(responderLocal('e este mês?', s, hoje), /Resumo de novembro de 2026/);
});
test('faturas do mês, comparação e mês vazio', () => {
  esquecerMes();
  assert.match(responderLocal('qual a fatura de janeiro?', s, hoje), /Faturas que vencem em janeiro de 2027: R\$\s1\.000,00/);
  assert.match(responderLocal('compare novembro com dezembro', s, hoje), /novembro de 2026 × dezembro de 2026[\s\S]*Compras\*\*: R\$\s0,00 → R\$\s1\.000,00/);
  esquecerMes();
  assert.match(responderLocal('compare com o mês passado', s, hoje), /outubro de 2026 × novembro de 2026/);
  assert.match(responderLocal('como foi março de 2026?', s, hoje), /Não encontrei nenhum lançamento em \*\*março de 2026\*\*/);
});
test('contexto do Claude inclui a previsão dos próximos meses', () => {
  const c = contexto(s, hoje);
  assert.match(c, /dezembro de 2026: R\$\s5\.000,00 \/ R\$\s2\.800,00 \/ R\$\s2\.200,00/);
  assert.match(c, /Lançamentos de dezembro de 2026[\s\S]*Ceia de Natal/);
});
