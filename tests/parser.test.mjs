import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretar } from '../js/parser.js';

const cartoes = [{ id: 'c1', nome: 'Nexora Black' }, { id: 'c2', nome: 'Nubank' }];
const I = (t, c = cartoes) => interpretar(t, { cartoes: c, hoje: '2026-11-15' });

test('despesa no pix com local', () => {
  const r = I('comprei 40 reais em comida no mercado Extra no pix');
  assert.deepEqual([r.tipo, r.valor, r.categoria, r.pagamento, r.data, r.descricao], ['despesa', 4000, 'Alimentação', 'Pix', '2026-11-15', 'Comida no mercado Extra']);
});
test('formatos de valor', () => {
  assert.equal(I('gastei R$ 1.234,56 no dentista').valor, 123456);
  assert.equal(I('paguei 89,9 de internet').valor, 8990);
  assert.equal(I('gastei 2 mil reais na oficina').valor, 200000);
  assert.equal(I('Uber 23 reais e 50 centavos').valor, 2350);
  assert.equal(I('almoço').valor, 0);
});
test('compra parcelada no cartão pelo nome', () => {
  const r = I('Comprei um tênis de 600 reais no Nubank em 3 vezes');
  assert.deepEqual([r.tipo, r.valor, r.cartaoId, r.parcelas, r.categoria, r.descricao], ['compra', 60000, 'c2', 3, 'Compras', 'Tênis']);
  const s = I('gasolina 150 no cartão de crédito');
  assert.deepEqual([s.tipo, s.cartaoId, s.categoria, s.descricao], ['compra', 'c1', 'Transporte', 'Gasolina']);
  const t = I('gasolina 150 no crédito', []);
  assert.deepEqual([t.tipo, t.pagamento], ['despesa', 'Crédito']);
});
test('receitas', () => {
  const r = I('recebi 1500 de um freela ontem');
  assert.deepEqual([r.tipo, r.valor, r.categoria, r.data, r.descricao], ['receita', 150000, 'Freelance', '2026-11-14', 'Freela']);
  assert.equal(I('vendi uma bicicleta por 650 reais').categoria, 'Vendas');
});
test('datas', () => {
  assert.equal(I('farmácia 35 reais dia 12').data, '2026-11-12');
  assert.equal(I('farmácia 35 reais dia 28').data, '2026-10-28');
  assert.equal(I('paguei 200 de luz em 03/11').data, '2026-11-03');
  assert.equal(I('cinema 60 reais anteontem no débito').pagamento, 'Débito');
});
test('número que não é valor não vira valor', () => {
  const r = I('paguei 45 reais no uber dia 10');
  assert.deepEqual([r.valor, r.data, r.categoria], [4500, '2026-11-10', 'Transporte']);
  assert.equal(I('2 pizzas por R$ 90 no ifood').valor, 9000);
});
