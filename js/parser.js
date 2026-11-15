// Interpreta frases como "comprei 40 reais em comida no mercado Extra no pix" e devolve um lançamento sugerido.
// Função pura: recebe o texto, os cartões cadastrados e a data de hoje (ISO). Valores em centavos.
import { addDias, addMonths, dataNoMes, ymOf } from './finance.js';

const semAcento = s => s.normalize('NFC').split('').map(c => c.normalize('NFD')[0].toLowerCase()).join(''); // mesmo comprimento do original
const CATS = [
  ['Assinaturas', /netflix|spotify|assinatura|streaming|prime video|disney|youtube premium|hbo|globoplay/],
  ['Alimentacao', /comida|mercado|supermercado|restaurante|lanche|pizza|ifood|almoc|jantar|janta|cafe|padaria|acougue|feira|hamburguer|marmita|sorvete|bebida|cerveja|churrasco|sushi|hortifruti/],
  ['Transporte', /uber|taxi|gasolina|combustivel|etanol|alcool|onibus|metro|estacionamento|pedagio|posto|passagem|mecanico|oficina|ipva|pneu/],
  ['Saude', /farmacia|remedio|medic|consulta|dentista|exame|academia|hospital|plano de saude|psicolog|terapia/],
  ['Moradia', /aluguel|condominio|iptu|reforma|movel|moveis/],
  ['Contas', /\bluz\b|energia|\bagua\b|internet|telefone|plano de celular|conta de celular|\bgas\b|boleto/],
  ['Educacao', /curso|faculdade|escola|livro|mensalidade|material escolar|aula/],
  ['Lazer', /cinema|show|viagem|festa|ingresso|\bbar\b|balada|hotel|passeio|jogo|praia/],
  ['Compras', /roupa|tenis|sapato|shopping|presente|eletronico|celular|notebook|loja|perfume|maquiagem/],
];
const NOME_CAT = { Alimentacao: 'Alimentação', Saude: 'Saúde', Educacao: 'Educação' };
const RECEITAS = [['Salário', /salario|pagamento do mes|holerite/], ['Freelance', /freela|freelance|bico|servico|projeto/], ['Vendas', /vendi|venda/], ['Rendimentos', /rendimento|dividendo|juros/], ['Bônus', /bonus|premio|comissao|decimo/]];
const PAGAMENTOS = [['Pix', /\bpix\b/], ['Dinheiro', /\b(?:dinheiro|especie)\b/], ['Débito', /\bdebito\b/], ['Boleto', /\bboleto\b/], ['Transferência', /\b(?:transferencia|ted|doc)\b/]];
const PREP = '(?:n[oa]|pel[oa]|via|por|com(?: o| a)?|em|de|usando(?: o)?)';

export function interpretar(texto, { cartoes = [], hoje }) {
  const orig = String(texto).normalize('NFC').trim(), n = semAcento(orig), fora = new Array(orig.length).fill(false);
  const marca = (i, len) => { for (let k = i; k < i + len; k++) fora[k] = true; };
  const livre = (i, len) => { for (let k = i; k < i + len; k++) if (fora[k]) return false; return true; };
  const acha = re => { const m = re.exec(n); if (m && livre(m.index, m[0].length)) { marca(m.index, m[0].length); return m; } return null; };
  const out = { tipo: 'despesa', valor: 0, descricao: '', categoria: 'Outros', data: hoje, pagamento: '', cartaoId: null, parcelas: 1 };

  // data
  let m;
  if (acha(/\banteontem\b/)) out.data = addDias(hoje, -2);
  else if (acha(/\bontem\b/)) out.data = addDias(hoje, -1);
  else if ((m = acha(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const ano = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : hoje.slice(0, 4), mes = Math.min(12, Math.max(1, +m[2]));
    out.data = dataNoMes(`${ano}-${String(mes).padStart(2, '0')}`, +m[1]);
    if (!m[3] && out.data > hoje) out.data = dataNoMes(`${ano - 1}-${String(mes).padStart(2, '0')}`, +m[1]);
  } else if ((m = acha(/\b(?:n?o )?dia (\d{1,2})\b/))) {
    out.data = dataNoMes(ymOf(hoje), +m[1]);
    if (out.data > hoje) out.data = dataNoMes(addMonths(ymOf(hoje), -1), +m[1]);
  }
  acha(/\bhoje\b/);

  // parcelas
  if ((m = acha(/\b(?:parcelad[oa] )?(?:em )?(\d{1,2})\s*(?:x\b|vezes|parcelas?)(?: sem juros)?/))) out.parcelas = Math.min(48, Math.max(1, +m[1]));
  else if (acha(/\ba vista\b/)) out.parcelas = 1;

  // cartão: pelo nome cadastrado ou pela palavra "cartão"/"crédito"
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const c of [...cartoes].sort((a, b) => b.nome.length - a.nome.length)) {
    const nome = semAcento(c.nome.trim()); if (nome.length < 2) continue;
    if (acha(new RegExp(`(?:\\b${PREP}\\s+)?(?:cartao(?: de credito)?\\s+(?:d[oa]\\s+)?)?\\b${esc(nome)}\\b`))) { out.cartaoId = c.id; break; }
  }
  const credito = acha(new RegExp(`(?:\\b${PREP}\\s+)?\\b(?:cartao de credito|cartao|credito)\\b`));
  if (!out.cartaoId && credito && cartoes.length) out.cartaoId = cartoes[0].id;
  if (!out.cartaoId && credito) out.pagamento = 'Crédito';
  if (!out.cartaoId && out.parcelas > 1 && cartoes.length) out.cartaoId = cartoes[0].id;

  // forma de pagamento
  for (const [nome, re] of PAGAMENTOS) if (acha(new RegExp(`(?:\\b${PREP}\\s+)?${re.source}`))) { if (!out.pagamento) out.pagamento = nome; break; }

  // valor: prefere número com "R$" ou "reais"; senão o primeiro número livre
  const reNum = /(r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?(\s*mil\b)?(\s*(?:reais|real|contos?|pilas?)\b)?/g, cands = [];
  while ((m = reNum.exec(n))) if (livre(m.index, m[0].length)) cands.push(m);
  const v = cands.find(c => c[1] || c[5]) || cands[0];
  if (v) {
    let cent = Math.round(parseInt(v[2].replace(/\./g, ''), 10) * (v[4] ? 1000 : 1) * 100) + (v[3] ? parseInt(v[3].padEnd(2, '0'), 10) : 0);
    marca(v.index, v[0].length);
    const c2 = new RegExp('^\\s*e\\s+(\\d{1,2})\\s*centavos?').exec(n.slice(v.index + v[0].length));
    if (c2) { cent += +c2[1]; marca(v.index + v[0].length, c2[0].length); }
    out.valor = cent;
  }

  // tipo e categoria
  const receita = /\b(recebi|ganhei|entrou|caiu|vendi|me pagaram|salario|receita)\b/.test(n) && !/\b(comprei|gastei|paguei)\b/.test(n);
  if (receita) { out.tipo = 'receita'; out.categoria = (RECEITAS.find(([, re]) => re.test(n)) || ['Outros'])[0]; out.cartaoId = null; out.parcelas = 1; }
  else { const c = CATS.find(([, re]) => re.test(n)); if (c) out.categoria = NOME_CAT[c[0]] || c[0]; if (out.cartaoId) { out.tipo = 'compra'; out.pagamento = ''; } }

  // descrição: o que sobrou, sem verbos e conectores nas pontas
  let d = orig.split('').map((ch, i) => fora[i] ? ' ' : ch).join('').replace(/[.,;:!?]+/g, ' ').replace(/\s+/g, ' ').trim();
  const ini = /^(?:eu|comprei|gastei|paguei|pago|pagar|recebi|ganhei|entrou|caiu|vendi|lan[çc]ar?|lan[çc]a|anotar?|adicionar?|registrar?|coloca|colocar|uma?|uns|umas|de|do|da|em|com|no|na|o|a|reais|real|por|pra|para|e)\s+/i;
  const fim = /\s+(?:de|do|da|em|com|no|na|o|a|por|pra|para|e|foi|deu|custou)$/i;
  for (let ant; ant !== d;) { ant = d; d = (d + ' ').replace(ini, '').trim().replace(fim, '').trim(); }
  if (/^(?:de|em|no|na|o|a|e|por)$/i.test(d)) d = '';
  out.descricao = (d ? d[0].toUpperCase() + d.slice(1) : out.categoria).slice(0, 60);
  return out;
}
