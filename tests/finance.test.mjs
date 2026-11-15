// Testes do motor financeiro com valores conhecidos. Executar: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../js/finance.js';

const cartao = { id: 'c1', nome: 'X', limite: 500000, fechamento: 25, vencimento: 5 };
const base = () => ({ lancamentos: [], cartoes: [cartao], compras: [], faturasPagas: {}, consorcios: [], investimentos: [] });

test('datas: soma de meses e dia ajustado ao fim do mês', () => {
  assert.equal(F.addMonths('2026-11', 2), '2027-01');
  assert.equal(F.addMonths('2026-01', -1), '2025-12');
  assert.equal(F.dataNoMes('2026-02', 31), '2026-02-28');
  assert.equal(F.addDias('2026-12-30', 3), '2027-01-02');
  assert.equal(F.diffMeses('2026-11', '2027-02'), 3);
});

test('recorrente repete a partir do início e para no fim', () => {
  const s = base();
  s.lancamentos.push({ id: 'a', tipo: 'receita', valor: 500000, data: '2026-08-31', recorrente: true, fim: '2026-10', categoria: 'Salário' });
  assert.equal(F.lancamentosDoMes(s, '2026-07').length, 0);
  assert.equal(F.lancamentosDoMes(s, '2026-09')[0].data, '2026-09-30');
  assert.equal(F.lancamentosDoMes(s, '2026-10').length, 1);
  assert.equal(F.lancamentosDoMes(s, '2026-11').length, 0);
});

test('fatura: compra antes do fechamento vence no mês seguinte; no dia do fechamento pula um ciclo', () => {
  assert.equal(F.primeiraFatura('2026-11-24', cartao), '2026-12');
  assert.equal(F.primeiraFatura('2026-11-25', cartao), '2027-01');
  assert.equal(F.primeiraFatura('2026-11-10', { fechamento: 3, vencimento: 10 }), '2026-12');
  assert.equal(F.primeiraFatura('2026-11-02', { fechamento: 3, vencimento: 10 }), '2026-11');
});

test('parcelas somam exatamente o valor da compra', () => {
  const p = F.parcelasDaCompra({ valor: 10000, parcelas: 3, data: '2026-11-10' }, cartao);
  assert.deepEqual(p.map(x => x.valor), [3334, 3333, 3333]);
  assert.deepEqual(p.map(x => x.ym), ['2026-12', '2027-01', '2027-02']);
});

test('limite usado cai quando a fatura é paga; compra não conta duas vezes no mês', () => {
  const s = base();
  s.compras.push({ id: 'k', cartaoId: 'c1', valor: 120000, parcelas: 3, data: '2026-11-10', categoria: 'Compras' });
  s.lancamentos.push({ id: 'r', tipo: 'receita', valor: 300000, data: '2026-12-05', categoria: 'Salário' },
    { id: 'd', tipo: 'despesa', valor: 50000, data: '2026-12-08', categoria: 'Moradia' });
  assert.equal(F.limiteUsado(s, cartao), 120000);
  const r = F.resumoMes(s, '2026-12', '2026-11-15');
  assert.equal(r.faturas, 40000); assert.equal(r.despesas, 90000); assert.equal(r.sobra, 210000);
  assert.deepEqual(r.categorias, [{ nome: 'Moradia', valor: 50000 }, { nome: 'Compras', valor: 40000 }]);
  assert.equal(F.resumoMes(s, '2026-11', '2026-11-15').despesas, 0);
  s.faturasPagas['c1|2026-12'] = true;
  assert.equal(F.limiteUsado(s, cartao), 80000);
  assert.equal(F.faturaAtualYm(s, cartao, '2026-12-10'), '2027-01');
});

test('status da fatura', () => {
  const s = base();
  s.compras.push({ id: 'k', cartaoId: 'c1', valor: 9000, parcelas: 1, data: '2026-11-10', categoria: 'Lazer' });
  const st = h => F.faturaDoMes(s, cartao, '2026-12', h).status;
  assert.equal(st('2026-11-15'), 'aberta');
  assert.equal(st('2026-11-25'), 'fechada');
  assert.equal(st('2026-12-06'), 'vencida');
  assert.equal(st('2026-10-01'), 'futura');
  s.faturasPagas['c1|2026-12'] = true;
  assert.equal(st('2026-12-06'), 'paga');
});

test('consórcio: parcelas restantes, valores e próxima parcela', () => {
  const c = { id: 'z', nome: 'Carro', parcela: 105000, total: 72, pagas: 19, vencimento: 15 };
  const i = F.consorcioInfo(c, '2026-11-15');
  assert.equal(i.faltam, 53); assert.equal(i.pago, 1995000); assert.equal(i.restante, 5565000); assert.equal(i.pct, 26);
  assert.equal(i.termino, '2031-03');
  const s = base(); s.consorcios.push(c);
  assert.equal(F.proximaParcelaConsorcio(s, c, '2026-11-20'), '2026-11-15');
  s.lancamentos.push({ id: 'p', tipo: 'despesa', valor: 105000, data: '2026-11-20', consorcioId: 'z', categoria: 'Consórcio' });
  assert.equal(F.proximaParcelaConsorcio(s, c, '2026-11-20'), '2026-12-15');
  assert.equal(F.proximaParcelaConsorcio(s, { ...c, pagas: 72 }, '2026-11-20'), null);
});

test('vencimentos: fatura em aberto, parcela atrasada e despesa fixa', () => {
  const s = base();
  s.compras.push({ id: 'k', cartaoId: 'c1', valor: 9000, parcelas: 1, data: '2026-11-10', categoria: 'Lazer' });
  s.consorcios.push({ id: 'z', nome: 'Carro', parcela: 100, total: 2, pagas: 0, vencimento: 10 });
  s.lancamentos.push({ id: 'a', tipo: 'despesa', descricao: 'Aluguel', valor: 5, data: '2026-01-28', recorrente: true, categoria: 'Moradia' });
  const v = F.proximosVencimentos(s, '2026-11-15');
  assert.deepEqual(v.map(x => [x.tipo, x.data, x.atrasado]), [['consorcio', '2026-11-10', true], ['fixa', '2026-11-28', false], ['fatura', '2026-12-05', false]]);
});

test('simulador: juros compostos conferidos à mão', () => {
  const s = F.simular({ inicial: 100000, mensal: 0, taxaAnual: 12, meses: 12 });
  assert.equal(s.final, 112000); assert.equal(s.juros, 12000);
  const z = F.simular({ inicial: 0, mensal: 10000, taxaAnual: 0, meses: 24 });
  assert.equal(z.final, 240000); assert.equal(z.juros, 0); assert.equal(z.pontos.length, 25);
  const a = F.simular({ inicial: 0, mensal: 100000, taxaAnual: 12, meses: 12 });
  const i = Math.pow(1.12, 1 / 12) - 1;
  assert.equal(a.final, Math.round(100000 * (Math.pow(1 + i, 12) - 1) / i));
});
