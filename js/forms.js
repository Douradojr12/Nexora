// Gaveta lateral, construtor de formulários e diálogo de confirmação.
import { $, $$, esc, icon, toast, uid, hojeISO } from './util.js';
import { state, commit, CAT_DESPESA, CAT_RECEITA } from './store.js';
import { ymOf } from './finance.js';

export const dinheiro = c => (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const lerDinheiro = txt => parseInt(String(txt).replace(/\D/g, '') || '0', 10);
// Máscara estilo banco: os dígitos digitados entram como centavos.
export function mascaraDinheiro(root) {
  $$('input[data-money]', root).forEach(inp => inp.addEventListener('input', () => { inp.value = dinheiro(lerDinheiro(inp.value)); }));
}

const drawer = $('#drawer'), scrim = $('#scrim');
let focoAnterior = null;
export function abrirGaveta(titulo, sub, html) {
  focoAnterior = document.activeElement;
  $('#drawerTitle').textContent = titulo; $('#drawerSub').textContent = sub || '';
  $('#drawerBody').innerHTML = html;
  drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); scrim.classList.add('open');
  setTimeout(() => ($('input:not([type=hidden]),select,button', $('#drawerBody')) || $('#drawerClose')).focus(), 60);
}
export function fecharGaveta() {
  if (!drawer.classList.contains('open')) return;
  drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
  if (!$('#sidebar').classList.contains('open')) scrim.classList.remove('open');
  focoAnterior?.focus?.();
}

export function confirmar(titulo, texto, rotulo = 'Confirmar') {
  const dlg = $('#confirm');
  $('#confirmTitle').textContent = titulo; $('#confirmText').textContent = texto; $('#confirmOk').textContent = rotulo;
  dlg.showModal();
  return new Promise(res => { dlg.onclose = () => res(dlg.returnValue === 'ok'); });
}

const CORES = { esmeralda: '#1fa367', onix: '#3a403c', ouro: '#d9b871', safira: '#3a7bdc', ametista: '#8a55d9', rubi: '#d2475a' };
function campo(f, v) {
  const id = 'f_' + f.name, val = v ?? f.def ?? '';
  const dica = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
  const erro = `<span class="err" data-err="${f.name}" role="alert"></span>`;
  let ctl;
  if (f.type === 'money') ctl = `<input class="input money" id="${id}" name="${f.name}" data-money inputmode="numeric" autocomplete="off" value="${dinheiro(val || 0)}">`;
  else if (f.type === 'select') ctl = `<select class="input" id="${id}" name="${f.name}">${f.options.map(o => { const [a, b] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(a)}"${String(a) === String(val) ? ' selected' : ''}>${esc(b)}</option>`; }).join('')}</select>`;
  else if (f.type === 'check') return `<div class="field"><label class="switch"><input type="checkbox" name="${f.name}"${val ? ' checked' : ''}><span>${esc(f.label)}</span></label>${dica}</div>`;
  else if (f.type === 'cor') return `<div class="field"><span class="lbl">${esc(f.label)}</span><div class="swatches">${Object.entries(CORES).map(([k, c]) => `<label title="${k}"><input type="radio" name="${f.name}" value="${k}"${k === (val || 'esmeralda') ? ' checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div></div>`;
  else ctl = `<input class="input" id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(val)}"${f.min != null ? ` min="${f.min}"` : ''}${f.max != null ? ` max="${f.max}"` : ''}${f.maxlength ? ` maxlength="${f.maxlength}"` : ''}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}${f.type === 'number' ? ' inputmode="numeric"' : ''} autocomplete="off">`;
  return `<div class="field"><label for="${id}">${esc(f.label)}</label>${ctl}${dica}${erro}</div>`;
}

// fields: [{name,label,type,required,min,max,options,hint,def}] ou [[f1,f2]] para duas colunas.
export function abrirForm({ titulo, sub, fields, values = {}, salvar = 'Salvar', onSubmit, onDelete, extra = '' }) {
  const flat = fields.flat();
  const html = fields.map(f => Array.isArray(f) ? `<div class="two">${f.map(x => campo(x, values[x.name])).join('')}</div>` : campo(f, values[f.name])).join('');
  abrirGaveta(titulo, sub, `<form id="frm" novalidate>${html}${extra}<div class="form-actions"><button class="btn btn-primary" type="submit">${icon('ok')}${esc(salvar)}</button>${onDelete ? `<button class="btn btn-danger" type="button" id="frmDel">${icon('lixo')}Excluir</button>` : ''}</div></form>`);
  const frm = $('#frm'); mascaraDinheiro(frm);
  frm.addEventListener('submit', e => {
    e.preventDefault();
    const out = {}; let ok = true;
    for (const f of flat) {
      const el = frm.elements[f.name]; let v, err = '';
      if (f.type === 'money') { v = lerDinheiro(el.value); if (f.required && v <= 0) err = 'Informe um valor maior que zero.'; }
      else if (f.type === 'check') v = el.checked;
      else if (f.type === 'number') { v = el.value === '' ? NaN : Number(el.value); if (Number.isNaN(v) || !Number.isInteger(v)) err = 'Informe um número inteiro.'; else if (f.min != null && v < f.min) err = `Mínimo: ${f.min}.`; else if (f.max != null && v > f.max) err = `Máximo: ${f.max}.`; }
      else { v = String(el.value).trim(); if (f.required && !v) err = 'Campo obrigatório.'; }
      out[f.name] = v;
      const sp = $(`[data-err="${f.name}"]`, frm); if (sp) sp.textContent = err;
      if (el.classList) el.classList.toggle('bad', !!err);
      if (err) ok = false;
    }
    if (!ok) return;
    const msg = onSubmit(out);
    if (typeof msg === 'string') { toast(msg, true); return; }
    fecharGaveta();
  });
  if (onDelete) $('#frmDel').onclick = async () => { if (await onDelete()) fecharGaveta(); };
}

const achar = (lista, id) => lista.find(x => x.id === id);

// tipo: 'salario' | 'variavel' | 'despesa' (novo) ou id (edição)
export function formLancamento(tipo, id) {
  const l = id ? achar(state.lancamentos, id) : null;
  const ehRec = l ? l.tipo === 'receita' : tipo !== 'despesa', fixa = l ? l.recorrente : tipo === 'salario';
  const titulo = l ? 'Editar lançamento' : tipo === 'salario' ? 'Salário ou receita fixa' : tipo === 'variavel' ? 'Receita variável' : 'Nova despesa';
  const sub = ehRec ? (fixa ? 'Entra automaticamente todo mês.' : 'Freelas, vendas, bônus, rendimentos…') : 'Aluguel, mercado, contas e tudo que sai da conta.';
  abrirForm({
    titulo, sub,
    values: l || { descricao: tipo === 'salario' ? 'Salário' : '', data: hojeISO(), categoria: ehRec ? (tipo === 'salario' ? 'Salário' : 'Freelance') : 'Alimentação', recorrente: fixa },
    fields: [
      { name: 'valor', label: 'Valor (R$)', type: 'money', required: true },
      { name: 'descricao', label: 'Descrição', required: true, maxlength: 60, placeholder: ehRec ? 'Ex.: Salário' : 'Ex.: Supermercado' },
      [{ name: 'data', label: fixa ? 'Primeiro recebimento/pagamento' : 'Data', type: 'date', required: true }, { name: 'categoria', label: 'Categoria', type: 'select', options: ehRec ? CAT_RECEITA : CAT_DESPESA }],
      { name: 'recorrente', label: ehRec ? 'Receita fixa — repete todo mês' : 'Despesa fixa — repete todo mês', type: 'check', hint: 'Repete no mesmo dia a partir da data acima.' },
      ...(l?.recorrente ? [{ name: 'fim', label: 'Encerrar em (opcional)', type: 'month', hint: 'Último mês em que este lançamento aparece.' }] : []),
    ],
    onSubmit(v) {
      if (v.fim && v.fim < ymOf(v.data)) return 'O mês de encerramento é anterior ao início.';
      commit(s => {
        if (l) Object.assign(achar(s.lancamentos, id), v, { fim: v.recorrente ? v.fim || null : null });
        else s.lancamentos.push({ id: uid(), tipo: ehRec ? 'receita' : 'despesa', ...v });
      });
      toast(l ? 'Lançamento atualizado' : 'Lançamento adicionado');
    },
    onDelete: l && (async () => {
      if (!await confirmar('Excluir lançamento?', l.recorrente ? 'Ele é fixo: será removido de todos os meses.' : `"${l.descricao}" será removido.`, 'Excluir')) return false;
      commit(s => {
        s.lancamentos = s.lancamentos.filter(x => x.id !== id);
        if (l.consorcioId) { const c = achar(s.consorcios, l.consorcioId); if (c) c.pagas = Math.max(0, c.pagas - 1); }
      });
      toast('Lançamento excluído'); return true;
    }),
  });
}

export function formCartao(id) {
  const c = id ? achar(state.cartoes, id) : null;
  abrirForm({
    titulo: c ? 'Editar cartão' : 'Novo cartão de crédito', sub: 'O limite disponível é calculado pelas compras lançadas.',
    values: c || { bandeira: 'Mastercard', fechamento: 25, vencimento: 5, cor: 'esmeralda' },
    fields: [
      { name: 'nome', label: 'Nome do cartão', required: true, maxlength: 24, placeholder: 'Ex.: Nubank, Itaú Black…' },
      [{ name: 'bandeira', label: 'Bandeira', type: 'select', options: ['Mastercard', 'Visa', 'Elo', 'Amex', 'Hipercard', 'Outra'] }, { name: 'final', label: 'Final (4 dígitos)', maxlength: 4, placeholder: '0000' }],
      { name: 'limite', label: 'Limite total (R$)', type: 'money', required: true },
      [{ name: 'fechamento', label: 'Dia do fechamento', type: 'number', min: 1, max: 31 }, { name: 'vencimento', label: 'Dia do vencimento', type: 'number', min: 1, max: 31 }],
      { name: 'cor', label: 'Cor do cartão', type: 'cor' },
    ],
    onSubmit(v) {
      if (v.final && !/^\d{4}$/.test(v.final)) return 'O final do cartão deve ter 4 dígitos.';
      if (v.fechamento === v.vencimento) return 'Fechamento e vencimento não podem ser no mesmo dia.';
      commit(s => { if (c) Object.assign(achar(s.cartoes, id), v); else s.cartoes.push({ id: uid(), ...v }); });
      toast(c ? 'Cartão atualizado' : 'Cartão cadastrado');
    },
    onDelete: c && (async () => {
      if (!await confirmar('Excluir cartão?', `"${c.nome}" e todas as compras e faturas dele serão removidos.`, 'Excluir')) return false;
      commit(s => {
        s.cartoes = s.cartoes.filter(x => x.id !== id); s.compras = s.compras.filter(x => x.cartaoId !== id);
        for (const k of Object.keys(s.faturasPagas)) if (k.startsWith(id + '|')) delete s.faturasPagas[k];
      });
      toast('Cartão excluído'); return true;
    }),
  });
}

export function formCompra(cartaoId, id) {
  const c = id ? achar(state.compras, id) : null;
  abrirForm({
    titulo: c ? 'Editar compra' : 'Nova compra no cartão', sub: 'Compras parceladas entram nas próximas faturas automaticamente.',
    values: c || { cartaoId, data: hojeISO(), parcelas: 1, categoria: 'Compras' },
    fields: [
      { name: 'valor', label: 'Valor total (R$)', type: 'money', required: true },
      { name: 'descricao', label: 'Descrição', required: true, maxlength: 60, placeholder: 'Ex.: Restaurante' },
      [{ name: 'parcelas', label: 'Parcelas', type: 'number', min: 1, max: 48 }, { name: 'data', label: 'Data da compra', type: 'date', required: true }],
      [{ name: 'categoria', label: 'Categoria', type: 'select', options: CAT_DESPESA }, { name: 'cartaoId', label: 'Cartão', type: 'select', options: state.cartoes.map(x => [x.id, x.nome]) }],
    ],
    onSubmit(v) {
      commit(s => { if (c) Object.assign(achar(s.compras, id), v); else s.compras.push({ id: uid(), ...v }); });
      toast(c ? 'Compra atualizada' : 'Compra lançada na fatura');
    },
    onDelete: c && (async () => {
      if (!await confirmar('Excluir compra?', `"${c.descricao}" sairá de todas as faturas.`, 'Excluir')) return false;
      commit(s => { s.compras = s.compras.filter(x => x.id !== id); }); toast('Compra excluída'); return true;
    }),
  });
}

export function formConsorcio(id) {
  const c = id ? achar(state.consorcios, id) : null;
  abrirForm({
    titulo: c ? 'Editar consórcio' : 'Novo consórcio', sub: 'Informe a parcela e quantas já foram pagas — o resto eu calculo.',
    values: c || { total: 60, pagas: 0, vencimento: 10 },
    fields: [
      { name: 'nome', label: 'Nome', required: true, maxlength: 40, placeholder: 'Ex.: Consórcio do carro' },
      { name: 'administradora', label: 'Administradora (opcional)', maxlength: 40 },
      [{ name: 'parcela', label: 'Valor da parcela (R$)', type: 'money', required: true }, { name: 'carta', label: 'Carta de crédito (R$)', type: 'money' }],
      [{ name: 'total', label: 'Total de parcelas', type: 'number', min: 1, max: 480 }, { name: 'pagas', label: 'Parcelas já pagas', type: 'number', min: 0, max: 480 }],
      { name: 'vencimento', label: 'Dia do vencimento', type: 'number', min: 1, max: 31 },
      { name: 'contemplado', label: 'Já fui contemplado', type: 'check' },
    ],
    onSubmit(v) {
      if (v.pagas > v.total) return 'As parcelas pagas não podem passar do total.';
      commit(s => { if (c) Object.assign(achar(s.consorcios, id), v); else s.consorcios.push({ id: uid(), ...v }); });
      toast(c ? 'Consórcio atualizado' : 'Consórcio cadastrado');
    },
    onDelete: c && (async () => {
      if (!await confirmar('Excluir consórcio?', `"${c.nome}" será removido. Os pagamentos já lançados continuam em Lançamentos.`, 'Excluir')) return false;
      commit(s => { s.consorcios = s.consorcios.filter(x => x.id !== id); s.lancamentos.forEach(l => { if (l.consorcioId === id) delete l.consorcioId; }); });
      toast('Consórcio excluído'); return true;
    }),
  });
}

export function formInvestimento(id) {
  const i = id ? achar(state.investimentos, id) : null;
  abrirForm({
    titulo: i ? 'Editar investimento' : 'Novo investimento', sub: 'Atualize o valor atual sempre que quiser acompanhar o rendimento.',
    values: i || { tipo: 'Renda fixa' },
    fields: [
      { name: 'nome', label: 'Nome', required: true, maxlength: 40, placeholder: 'Ex.: Tesouro Selic 2031' },
      { name: 'tipo', label: 'Tipo', type: 'select', options: ['Renda fixa', 'Tesouro Direto', 'Poupança', 'Ações', 'Fundos imobiliários', 'Fundos', 'Previdência', 'Cripto', 'Outro'] },
      [{ name: 'aplicado', label: 'Total aplicado (R$)', type: 'money', required: true }, { name: 'atual', label: 'Valor atual (R$)', type: 'money', required: true }],
    ],
    onSubmit(v) { commit(s => { if (i) Object.assign(achar(s.investimentos, id), v); else s.investimentos.push({ id: uid(), ...v }); }); toast(i ? 'Investimento atualizado' : 'Investimento adicionado'); },
    onDelete: i && (async () => {
      if (!await confirmar('Excluir investimento?', `"${i.nome}" será removido.`, 'Excluir')) return false;
      commit(s => { s.investimentos = s.investimentos.filter(x => x.id !== id); }); toast('Investimento excluído'); return true;
    }),
  });
}
