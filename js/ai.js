// Nexora AI — duas camadas:
// 1) Análise local determinística (sempre disponível, nada sai do navegador).
// 2) Opcional: conversa com o Claude (API da Anthropic) usando a chave do próprio usuário.
//    Sem backend e sem etapa de build, a chamada é feita por fetch direto do navegador.
import * as F from './finance.js';
import { brl, mesLongo, dataBR } from './util.js';
import { cambio } from './cambio.js';

const pc = (a, b) => b ? Math.round(a / b * 100) : 0;
const somaInv = s => ({ aplicado: s.investimentos.reduce((t, i) => t + i.aplicado, 0), atual: s.investimentos.reduce((t, i) => t + i.atual, 0) });
export function cartoesResumo(s) {
  const limite = s.cartoes.reduce((t, c) => t + c.limite, 0), usado = s.cartoes.reduce((t, c) => t + F.limiteUsado(s, c), 0);
  return { limite, usado, disponivel: limite - usado, uso: pc(usado, limite) };
}

// Diagnóstico: lista de {tipo: 'alerta'|'dica'|'ok', titulo, texto} + nota de 0 a 100 (indicador simples, não é score de crédito).
export function diagnostico(s, hoje) {
  const ym = F.ymOf(hoje), r = F.resumoMes(s, ym, hoje), ant = F.resumoMes(s, F.addMonths(ym, -1), hoje);
  const out = [], add = (tipo, titulo, texto) => out.push({ tipo, titulo, texto });
  if (!r.receitas && !r.despesas) return { itens: [], nota: null, r };
  let nota = 100;
  const taxa = pc(r.sobra, r.receitas);
  if (!r.receitas) { nota -= 30; add('alerta', 'Nenhuma receita neste mês', `Há ${brl(r.despesas)} em despesas e nenhuma receita lançada em ${mesLongo(ym)}. Cadastre seu salário para a análise ficar correta.`); }
  else if (r.sobra < 0) { nota -= 40; add('alerta', 'Você está gastando mais do que ganha', `Faltam ${brl(-r.sobra)} para fechar ${mesLongo(ym)}. Veja a maior categoria abaixo e adie o que não for essencial.`); }
  else if (taxa < 10) { nota -= 20; add('dica', `Sobra apertada: ${taxa}% da renda`, `Sobram ${brl(r.sobra)}. Uma meta comum é guardar pelo menos 10% a 20% — seriam ${brl(Math.round(r.receitas * .1))} a ${brl(Math.round(r.receitas * .2))}.`); }
  else if (taxa < 20) { nota -= 8; add('ok', `Você guarda ${taxa}% da renda`, `Sobram ${brl(r.sobra)} neste mês. Chegando a 20% (${brl(Math.round(r.receitas * .2))}) você acelera bastante a reserva.`); }
  else add('ok', `Ótimo: ${taxa}% da renda sobrando`, `Sobram ${brl(r.sobra)} em ${mesLongo(ym)}. Programe uma transferência automática para investimentos logo após receber.`);

  const top = r.categorias[0];
  if (top && r.despesas) add('dica', `${top.nome} é seu maior gasto`, `${brl(top.valor)} — ${pc(top.valor, r.despesas)}% das despesas do mês. Reduzir 10% aqui libera ${brl(Math.round(top.valor * .1))} por mês (${brl(Math.round(top.valor * 1.2))} por ano).`);
  for (const c of r.categorias) {
    const a = ant.categorias.find(x => x.nome === c.nome);
    if (a && a.valor > 0 && c.valor > a.valor * 1.25 && c.valor - a.valor > 5000) { add('alerta', `${c.nome} subiu ${pc(c.valor - a.valor, a.valor)}%`, `Foram ${brl(c.valor)} contra ${brl(a.valor)} no mês anterior (+${brl(c.valor - a.valor)}).`); break; }
  }
  const cr = cartoesResumo(s);
  if (cr.limite) {
    if (cr.uso > 80) { nota -= 20; add('alerta', `${cr.uso}% do limite dos cartões usado`, `Restam só ${brl(cr.disponivel)} de ${brl(cr.limite)}. Evite novas compras parceladas até as faturas baixarem.`); }
    else if (cr.uso > 50) { nota -= 10; add('dica', `${cr.uso}% do limite comprometido`, `${brl(cr.usado)} em parcelas e faturas abertas. Acima de 50% o orçamento dos próximos meses fica engessado.`); }
    else if (cr.uso > 30) nota -= 4;
    if (r.receitas && r.faturas > r.receitas * .3) { nota -= r.faturas > r.receitas * .4 ? 15 : 8; add('alerta', 'Faturas pesadas neste mês', `As faturas que vencem em ${mesLongo(ym)} somam ${brl(r.faturas)} — ${pc(r.faturas, r.receitas)}% da sua renda.`); }
  }
  const venc = F.proximosVencimentos(s, hoje), atras = venc.filter(v => v.atrasado);
  if (atras.length) { nota -= 15; add('alerta', `${atras.length} conta(s) em atraso`, atras.map(v => `${v.nome} (${dataBR(v.data)}, ${brl(v.valor)})`).join('; ') + '. Atrasos geram juros e multa — priorize estes pagamentos.'); }
  if (r.receitas && r.despesasFixas > r.receitas * .5) add('dica', 'Custos fixos acima de 50% da renda', `Suas despesas fixas somam ${brl(r.despesasFixas)}. Vale renegociar aluguel, planos e assinaturas.`);
  for (const c of s.consorcios) {
    const i = F.consorcioInfo(c, hoje);
    if (i.faltam) add('ok', `${c.nome}: faltam ${i.faltam} parcelas`, `Você já pagou ${i.pct}% (${brl(i.pago)}). Restam ${brl(i.restante)}, com término previsto em ${mesLongo(i.termino)}.${r.receitas ? ` A parcela consome ${pc(c.parcela, r.receitas)}% da renda.` : ''}`);
  }
  const inv = somaInv(s);
  if (r.despesas) {
    const meses = inv.atual / r.despesas;
    if (meses < 3) { nota -= 8; add('dica', 'Monte sua reserva de emergência', `Seus investimentos cobrem ${meses.toFixed(1).replace('.', ',')} mês(es) de despesas. O ideal é de 3 a 6 meses (${brl(r.despesas * 3)} a ${brl(r.despesas * 6)}) em aplicação com liquidez diária.`); }
    else if (meses >= 6) add('ok', 'Reserva de emergência completa', `Você tem ${meses.toFixed(1).replace('.', ',')} meses de despesas investidos. Já dá para diversificar o que passar disso.`);
  }
  const ordem = { alerta: 0, dica: 1, ok: 2 };
  return { itens: out.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]), nota: Math.max(0, Math.min(100, nota)), r };
}

// Resumo em texto dos dados, usado como contexto para o Claude.
export function contexto(s, hoje) {
  const ym = F.ymOf(hoje), L = [];
  L.push(`Data de hoje: ${dataBR(hoje)}. Moeda: real (BRL).${s.perfil.nome ? ` Nome do usuário: ${s.perfil.nome}.` : ''}${s.demo ? ' ATENÇÃO: estes são dados de exemplo (fictícios).' : ''}`);
  L.push('\n## Últimos 6 meses (receitas / despesas / sobra)');
  for (const r of F.serieMeses(s, ym, 6, hoje)) L.push(`- ${mesLongo(r.ym)}: ${brl(r.receitas)} / ${brl(r.despesas)} / ${brl(r.sobra)}`);
  const r = F.resumoMes(s, ym, hoje);
  L.push(`\n## Mês atual\nReceita fixa (salário): ${brl(r.receitaFixa)}; receita variável: ${brl(r.receitaVariavel)}; despesas fixas: ${brl(r.despesasFixas)}; faturas de cartão que vencem no mês: ${brl(r.faturas)}.`);
  L.push('Despesas por categoria: ' + (r.categorias.map(c => `${c.nome} ${brl(c.valor)}`).join('; ') || 'nenhuma'));
  L.push('\n## Cartões de crédito');
  for (const c of s.cartoes) {
    const u = F.limiteUsado(s, c), f = F.faturaDoMes(s, c, F.faturaAtualYm(s, c, hoje), hoje);
    L.push(`- ${c.nome} (${c.bandeira}): limite ${brl(c.limite)}, usado ${brl(u)}, disponível ${brl(c.limite - u)}; fecha dia ${c.fechamento}, vence dia ${c.vencimento}; próxima fatura ${brl(f.total)} em ${dataBR(f.vencimento)} (${f.status}).`);
  }
  if (!s.cartoes.length) L.push('Nenhum cartão cadastrado.');
  L.push('\n## Consórcios');
  for (const c of s.consorcios) { const i = F.consorcioInfo(c, hoje); L.push(`- ${c.nome}: carta ${brl(c.carta)}, parcela ${brl(c.parcela)}, ${c.pagas} de ${c.total} pagas (faltam ${i.faltam}), já pago ${brl(i.pago)}, a pagar ${brl(i.restante)}${c.contemplado ? ', contemplado' : ', não contemplado'}.`); }
  if (!s.consorcios.length) L.push('Nenhum consórcio cadastrado.');
  L.push('\n## Investimentos');
  for (const i of s.investimentos) L.push(`- ${i.nome} (${i.tipo}): aplicado ${brl(i.aplicado)}, valor atual ${brl(i.atual)}.`);
  if (!s.investimentos.length) L.push('Nenhum investimento cadastrado.');
  const v = F.proximosVencimentos(s, hoje);
  L.push('\n## Próximos vencimentos\n' + (v.map(x => `- ${x.nome}: ${brl(x.valor)} em ${dataBR(x.data)}${x.atrasado ? ' (ATRASADO)' : ''}`).join('\n') || 'Nenhum.'));
  if (cambio) L.push(`\n## Câmbio\nDólar comercial: R$ ${cambio.usd.valor.toFixed(4)} (consulta de ${new Date(cambio.ts).toLocaleString('pt-BR')}).`);
  return L.join('\n');
}

export const SISTEMA = `Você é a Nexora AI, assistente de finanças pessoais dentro do aplicativo Nexora, usado no Brasil.
Responda sempre em português do Brasil, de forma direta, acolhedora e prática, usando os dados reais do usuário que aparecem abaixo — cite os números.
Prefira respostas curtas: um parágrafo de conclusão e, quando ajudar, uma lista de 3 a 5 ações concretas com valores em reais. Use markdown simples (negrito e listas); não use tabelas.
Se faltar um dado para responder, diga qual é e onde cadastrá-lo no aplicativo (Lançamentos, Cartões, Consórcios, Investimentos) em vez de supor.
Você ajuda com orçamento, dívidas, cartão, consórcio e educação financeira. Ao falar de investimentos, explique conceitos, riscos e simulações, mas deixe claro que não é uma recomendação profissional individualizada e que rendimentos passados não garantem resultados.

# Dados financeiros do usuário
`;

export async function conversarClaude({ key, model, system, messages, onText, signal }) {
  const headers = {
    'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2026-10-21',
    'anthropic-dangerous-direct-browser-access': 'true', // chamada direta do navegador, com a chave do próprio usuário
  };
  const body = { model, max_tokens: 16000, stream: true, system, messages, output_config: { effort: 'medium' } };
  if (model !== 'claude-haiku-5-5') { headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'; body.fallbacks = 'default'; }
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!r.ok) {
    let msg = ''; try { msg = (await r.json()).error?.message || ''; } catch {}
    const amigavel = { 401: 'Chave de API inválida. Confira em Configurações.', 403: 'Esta chave não tem permissão para usar o modelo escolhido.', 429: 'Limite de uso atingido. Tente de novo em instantes.', 529: 'O serviço está sobrecarregado. Tente de novo em instantes.' }[r.status];
    throw new Error(amigavel || msg || `Erro ${r.status} ao falar com o Claude.`);
  }
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = '', parada = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const linha = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!linha.startsWith('data:')) continue;
      let ev; try { ev = JSON.parse(linha.slice(5)); } catch { continue; }
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') onText(ev.delta.text);
      else if (ev.type === 'message_delta' && ev.delta?.stop_reason) parada = ev.delta.stop_reason;
      else if (ev.type === 'error') throw new Error(ev.error?.message || 'Erro durante a resposta.');
    }
  }
  return parada;
}

// Resposta local por intenção (palavras-chave), sempre a partir dos dados cadastrados.
export function responderLocal(pergunta, s, hoje) {
  const q = pergunta.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ym = F.ymOf(hoje), { itens, r } = diagnostico(s, hoje);
  const tem = s.lancamentos.length + s.cartoes.length + s.consorcios.length + s.investimentos.length > 0;
  if (!tem) return 'Ainda não há dados para analisar. Cadastre seu **salário**, suas **despesas** e seus **cartões** — ou carregue os dados de exemplo no Painel — e eu passo a analisar tudo para você.';
  const lista = arr => arr.map(x => `- ${x}`).join('\n');
  if (/dolar|cambio|euro|moeda/.test(q)) return cambio ? `O dólar está em **R$ ${cambio.usd.valor.toFixed(4).replace('.', ',')}**${cambio.usd.pct != null ? ` (${cambio.usd.pct >= 0 ? '+' : ''}${cambio.usd.pct.toFixed(2).replace('.', ',')}% no dia)` : ''}, consulta de ${new Date(cambio.ts).toLocaleString('pt-BR')}. Veja o gráfico de 30 dias e o conversor na tela **Câmbio**.` : 'Não consegui obter a cotação agora. Abra a tela **Câmbio** para tentar de novo.';
  if (/consorc/.test(q)) return s.consorcios.length ? '### Seus consórcios\n' + lista(s.consorcios.map(c => { const i = F.consorcioInfo(c, hoje); return `**${c.nome}** — parcela de ${brl(c.parcela)}; ${c.pagas} de ${c.total} pagas, **faltam ${i.faltam}** (${brl(i.restante)}). Término previsto: ${i.termino ? mesLongo(i.termino) : 'quitado'}.`; })) : 'Você ainda não cadastrou nenhum consórcio. Use a tela **Consórcios** para informar a parcela e quantas faltam.';
  if (/cart|fatura|limite/.test(q)) {
    if (!s.cartoes.length) return 'Nenhum cartão cadastrado ainda. Na tela **Cartões** você informa limite, fechamento e vencimento, e eu acompanho as faturas.';
    const cr = cartoesResumo(s);
    return `### Cartões\nLimite total de ${brl(cr.limite)}: **${brl(cr.usado)} usado (${cr.uso}%)** e **${brl(cr.disponivel)} disponível**.\n` + lista(s.cartoes.map(c => { const f = F.faturaDoMes(s, c, F.faturaAtualYm(s, c, hoje), hoje); return `**${c.nome}** — disponível ${brl(c.limite - F.limiteUsado(s, c))}; próxima fatura ${brl(f.total)}, vence em ${dataBR(f.vencimento)} (${f.status}).`; })) + (cr.uso > 50 ? '\n\nSeu uso está alto. Segure novas compras parceladas até as faturas baixarem.' : '');
  }
  if (/invest|aplic|rend|guardar|reserva|poupar/.test(q)) {
    const inv = somaInv(s), meses = r.despesas ? inv.atual / r.despesas : 0;
    return `### Investimentos\n${s.investimentos.length ? `Você tem **${brl(inv.atual)}** investidos (aplicou ${brl(inv.aplicado)}, ganho de ${brl(inv.atual - inv.aplicado)}).` : 'Nenhum investimento cadastrado ainda.'}\n` + lista([
      r.despesas ? `Sua reserva cobre **${meses.toFixed(1).replace('.', ',')} meses** de despesas — a referência é de 3 a 6 meses (${brl(r.despesas * 3)} a ${brl(r.despesas * 6)}).` : 'Cadastre suas despesas para eu calcular a reserva de emergência ideal.',
      r.sobra > 0 ? `Com a sobra deste mês (${brl(r.sobra)}), dá para aportar todo mês. Teste no **Simulador** quanto isso vira em 5 ou 10 anos.` : 'Antes de investir, o primeiro passo é fazer o mês fechar no azul.',
      'Primeiro a reserva (liquidez diária e baixo risco); depois, diversificação conforme seus objetivos.',
    ]) + '\n\nIsto é educação financeira, não uma recomendação individual de investimento.';
  }
  if (/vencim|pagar|boleto|atras|proxim/.test(q)) { const v = F.proximosVencimentos(s, hoje); return v.length ? '### Próximos vencimentos\n' + lista(v.map(x => `${dataBR(x.data)} — **${x.nome}**: ${brl(x.valor)}${x.atrasado ? ' (**em atraso**)' : ''}`)) + `\n\nTotal: **${brl(v.reduce((t, x) => t + x.valor, 0))}**.` : 'Nenhum vencimento nos próximos 35 dias.'; }
  if (/salari|receita|ganh|renda|recebi/.test(q)) return `### Receitas de ${mesLongo(ym)}\n` + lista([`Salário e receitas fixas: **${brl(r.receitaFixa)}**`, `Receitas variáveis: **${brl(r.receitaVariavel)}**`, `Total: **${brl(r.receitas)}**`]) + (r.receitas && r.receitaVariavel > r.receitas * .3 ? '\n\nBoa parte da sua renda é variável — planeje o orçamento só com a parte fixa e trate o restante como bônus.' : '');
  if (/econom|cortar|reduz|dica|melhor|ajud|sugest|conselho/.test(q)) return itens.length ? '### O que eu faria agora\n' + lista(itens.filter(i => i.tipo !== 'ok').concat(itens.filter(i => i.tipo === 'ok')).slice(0, 5).map(i => `**${i.titulo}.** ${i.texto}`)) : 'Lance as receitas e despesas deste mês para eu gerar dicas com base nos seus números.';
  if (/gast|despes|categoria|onde|para onde/.test(q)) return r.despesas ? `### Despesas de ${mesLongo(ym)}: ${brl(r.despesas)}\n` + lista(r.categorias.slice(0, 6).map(c => `**${c.nome}**: ${brl(c.valor)} (${pc(c.valor, r.despesas)}%)`)) + `\n\nDesse total, ${brl(r.faturas)} são faturas de cartão e ${brl(r.despesasFixas)} são despesas fixas.` : `Nenhuma despesa lançada em ${mesLongo(ym)}.`;
  const cr = cartoesResumo(s);
  return `### Resumo de ${mesLongo(ym)}\n` + lista([
    `Receitas: **${brl(r.receitas)}** · Despesas: **${brl(r.despesas)}**`,
    `Sobra do mês: **${brl(r.sobra)}**${r.receitas ? ` (${pc(r.sobra, r.receitas)}% da renda)` : ''}`,
    s.cartoes.length ? `Cartões: ${brl(cr.disponivel)} de limite disponível (${cr.uso}% usado)` : 'Nenhum cartão cadastrado',
    ...(itens[0] ? [`Ponto de atenção: **${itens[0].titulo}**`] : []),
  ]) + '\n\nPosso detalhar **gastos**, **cartões**, **consórcio**, **investimentos**, **vencimentos** ou dar **dicas para economizar**.';
}
