// Cotações em tempo real. Fonte principal: AwesomeAPI (economia.awesomeapi.com.br); reserva: Frankfurter (taxa diária do BCE).
// Nenhum dado do usuário é enviado — são apenas consultas públicas de cotação.
const KEY = 'nexora:cambio';
export let cambio = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } })();
export let estado = cambio ? 'cache' : 'vazio'; // vazio | carregando | ok | cache | erro
let pendente = null;

const json = async url => { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };
const isoDia = d => d.toISOString().slice(0, 10);

async function awesome() {
  const [ult, serie] = await Promise.all([
    json('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL'),
    json('https://economia.awesomeapi.com.br/json/daily/USD-BRL/30'),
  ]);
  const q = o => ({ valor: +o.bid, pct: +o.pctChange, max: +o.high, min: +o.low });
  if (!ult.USDBRL || !Array.isArray(serie)) throw new Error('Resposta inesperada');
  return {
    fonte: 'AwesomeAPI', usd: q(ult.USDBRL), eur: ult.EURBRL ? q(ult.EURBRL) : null, btc: ult.BTCBRL ? q(ult.BTCBRL) : null,
    serie: serie.map(p => ({ d: isoDia(new Date(+p.timestamp * 1000)), v: +p.bid })).reverse(),
  };
}
async function frankfurter() {
  const ini = isoDia(new Date(Date.now() - 45 * 864e5));
  const [u, e] = await Promise.all([json(`https://api.frankfurter.app/${ini}..?from=USD&to=BRL`), json('https://api.frankfurter.app/latest?from=EUR&to=BRL')]);
  const serie = Object.entries(u.rates).map(([d, r]) => ({ d, v: r.BRL })).slice(-30);
  if (serie.length < 2) throw new Error('Resposta inesperada');
  const a = serie.at(-1).v, b = serie.at(-2).v;
  return { fonte: 'Frankfurter (BCE, fechamento diário)', usd: { valor: a, pct: (a / b - 1) * 100, max: null, min: null }, eur: { valor: e.rates.BRL, pct: null }, btc: null, serie };
}

export function atualizarCambio(forcar = false) {
  if (pendente) return pendente;
  if (!forcar && cambio && Date.now() - cambio.ts < 55e3) return Promise.resolve(cambio);
  estado = 'carregando';
  pendente = awesome().catch(frankfurter).then(d => {
    cambio = { ...d, ts: Date.now() }; estado = 'ok';
    try { localStorage.setItem(KEY, JSON.stringify(cambio)); } catch {}
  }).catch(err => { console.warn('Cotação indisponível:', err.message); estado = cambio ? 'cache' : 'erro'; })
    .finally(() => { pendente = null; dispatchEvent(new Event('nexora:cambio')); });
  return pendente;
}
