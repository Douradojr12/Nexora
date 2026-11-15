// Motor financeiro — funções puras. Valores sempre em centavos inteiros; datas como texto ISO (sem fuso).
const pad = n => String(n).padStart(2, '0');
const sum = a => a.reduce((x, y) => x + y, 0);

export const ymOf = iso => iso.slice(0, 7);
export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${pad(t % 12 + 1)}`;
}
export const diffMeses = (a, b) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };
export const diasNoMes = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
export const dataNoMes = (ym, dia) => `${ym}-${pad(Math.min(Math.max(1, dia), diasNoMes(ym)))}`;
export function addDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// Lançamentos do mês. Recorrentes (fixos) repetem todo mês a partir do mês inicial, até `fim` (AAAA-MM, inclusive).
export function lancamentosDoMes(state, ym) {
  const out = [];
  for (const l of state.lancamentos) {
    const ini = ymOf(l.data);
    if (l.recorrente) {
      if (ym >= ini && (!l.fim || ym <= l.fim)) out.push({ ...l, data: dataNoMes(ym, +l.data.slice(8)) });
    } else if (ini === ym) out.push(l);
  }
  return out.sort((a, b) => b.data.localeCompare(a.data));
}

// --- Cartões ---
// Regra: compra feita no dia do fechamento ou depois entra na fatura seguinte.
// A fatura é identificada pelo mês do vencimento. Se o vencimento é em dia <= fechamento, vence no mês seguinte ao fechamento.
export function primeiraFatura(dataISO, cartao) {
  let fecha = ymOf(dataISO);
  if (+dataISO.slice(8) >= cartao.fechamento) fecha = addMonths(fecha, 1);
  return cartao.vencimento > cartao.fechamento ? fecha : addMonths(fecha, 1);
}
// Parcelas de uma compra: divisão inteira; os centavos que sobram vão na 1ª parcela.
export function parcelasDaCompra(compra, cartao) {
  const n = Math.max(1, compra.parcelas | 0), base = Math.floor(compra.valor / n), resto = compra.valor - base * n;
  const ym0 = primeiraFatura(compra.data, cartao);
  return Array.from({ length: n }, (_, i) => ({ ym: addMonths(ym0, i), n: i + 1, de: n, valor: base + (i === 0 ? resto : 0) }));
}
export const faturaPaga = (state, cartaoId, ym) => !!state.faturasPagas[`${cartaoId}|${ym}`];

export function faturaDoMes(state, cartao, ym, hoje) {
  const itens = [];
  for (const c of state.compras) {
    if (c.cartaoId !== cartao.id) continue;
    const p = parcelasDaCompra(c, cartao).find(p => p.ym === ym);
    if (p) itens.push({ compra: c, n: p.n, de: p.de, valor: p.valor });
  }
  const vencimento = dataNoMes(ym, cartao.vencimento);
  const fechaYm = cartao.vencimento > cartao.fechamento ? ym : addMonths(ym, -1);
  const fechamento = dataNoMes(fechaYm, cartao.fechamento);
  const abertura = dataNoMes(addMonths(fechaYm, -1), cartao.fechamento);
  const paga = faturaPaga(state, cartao.id, ym);
  let status = 'futura';
  if (paga) status = 'paga';
  else if (hoje > vencimento) status = 'vencida';
  else if (hoje >= fechamento) status = 'fechada';
  else if (hoje >= abertura) status = 'aberta';
  return { ym, itens, total: sum(itens.map(i => i.valor)), vencimento, fechamento, paga, status };
}
// Meses que têm alguma parcela neste cartão.
export function mesesComFatura(state, cartao) {
  const s = new Set();
  for (const c of state.compras) if (c.cartaoId === cartao.id) parcelasDaCompra(c, cartao).forEach(p => s.add(p.ym));
  return [...s].sort();
}
// Limite usado = todas as parcelas em faturas ainda não pagas (inclui parcelas futuras).
export function limiteUsado(state, cartao) {
  let t = 0;
  for (const c of state.compras) if (c.cartaoId === cartao.id)
    for (const p of parcelasDaCompra(c, cartao)) if (!faturaPaga(state, cartao.id, p.ym)) t += p.valor;
  return t;
}
export function faturaAtualYm(state, cartao, hoje) {
  const aberta = mesesComFatura(state, cartao).find(ym => !faturaPaga(state, cartao.id, ym));
  return aberta || primeiraFatura(hoje, cartao);
}

// --- Resumo do mês ---
// Despesas = lançamentos de despesa + faturas de cartão que vencem no mês (a compra não conta de novo).
export function resumoMes(state, ym, hoje) {
  const ls = lancamentosDoMes(state, ym);
  const rec = ls.filter(l => l.tipo === 'receita'), des = ls.filter(l => l.tipo === 'despesa');
  const porCategoria = {};
  const add = (k, v) => { porCategoria[k] = (porCategoria[k] || 0) + v; };
  des.forEach(l => add(l.categoria, l.valor));
  let faturas = 0;
  for (const c of state.cartoes) {
    const f = faturaDoMes(state, c, ym, hoje);
    faturas += f.total;
    f.itens.forEach(i => add(i.compra.categoria, i.valor));
  }
  const receitas = sum(rec.map(l => l.valor)), diretas = sum(des.map(l => l.valor));
  return {
    ym, receitas,
    receitaFixa: sum(rec.filter(l => l.recorrente).map(l => l.valor)),
    receitaVariavel: sum(rec.filter(l => !l.recorrente).map(l => l.valor)),
    despesas: diretas + faturas, despesasDiretas: diretas,
    despesasFixas: sum(des.filter(l => l.recorrente).map(l => l.valor)),
    faturas, sobra: receitas - diretas - faturas,
    categorias: Object.entries(porCategoria).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
  };
}
export const serieMeses = (state, ymFim, n, hoje) => Array.from({ length: n }, (_, i) => resumoMes(state, addMonths(ymFim, i - n + 1), hoje));

// --- Consórcio ---
export function consorcioInfo(c, hoje) {
  const faltam = Math.max(0, c.total - c.pagas);
  return {
    faltam, pago: c.pagas * c.parcela, restante: faltam * c.parcela,
    pct: c.total ? Math.round(c.pagas / c.total * 100) : 0,
    termino: faltam ? addMonths(ymOf(hoje), faltam - 1) : null,
  };
}
export function proximaParcelaConsorcio(state, c, hoje) {
  if (c.pagas >= c.total) return null;
  const ym = ymOf(hoje);
  const pagouEsteMes = state.lancamentos.some(l => l.consorcioId === c.id && ymOf(l.data) === ym);
  return dataNoMes(pagouEsteMes ? addMonths(ym, 1) : ym, c.vencimento);
}

// --- Próximos vencimentos (inclui atrasados) ---
export function proximosVencimentos(state, hoje, dias = 35) {
  const ate = addDias(hoje, dias), out = [];
  for (const c of state.cartoes) for (const ym of mesesComFatura(state, c)) {
    const f = faturaDoMes(state, c, ym, hoje);
    if (!f.paga && f.total > 0 && f.vencimento <= ate) out.push({ tipo: 'fatura', nome: `Fatura ${c.nome}`, data: f.vencimento, valor: f.total, rota: 'cartoes' });
  }
  for (const c of state.consorcios) {
    const d = proximaParcelaConsorcio(state, c, hoje);
    if (d && d <= ate) out.push({ tipo: 'consorcio', nome: `Parcela ${c.nome}`, data: d, valor: c.parcela, rota: 'consorcios' });
  }
  for (const ym of [ymOf(hoje), addMonths(ymOf(hoje), 1)])
    for (const l of lancamentosDoMes(state, ym))
      if (l.recorrente && l.tipo === 'despesa' && l.data >= hoje && l.data <= ate) out.push({ tipo: 'fixa', nome: l.descricao, data: l.data, valor: l.valor, rota: 'lancamentos' });
  return out.map(v => ({ ...v, atrasado: v.data < hoje })).sort((a, b) => a.data.localeCompare(b.data));
}

// --- Simulador de investimentos (juros compostos, aporte no fim de cada mês) ---
export function simular({ inicial, mensal, taxaAnual, meses }) {
  const i = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
  let total = inicial, investido = inicial;
  const pontos = [{ m: 0, investido, total }];
  for (let m = 1; m <= meses; m++) {
    total = total * (1 + i) + mensal; investido += mensal;
    pontos.push({ m, investido, total: Math.round(total) });
  }
  const final = Math.round(total);
  return { pontos, final, investido, juros: final - investido, taxaMensal: i * 100 };
}
