// Conta e sincronização entre aparelhos, usando o Supabase (Auth + uma tabela com uma linha por usuário).
// Chamadas diretas por fetch (o projeto não tem build nem dependências). As senhas nunca passam pelo nosso código
// além do envio ao Supabase, que as guarda com hash; aqui só ficam os tokens de sessão.
import { NUVEM } from './config.js';
import { state, temDados, aoMudar, paraNuvem, adotar, vincular, esvaziarLocal, exportar } from './store.js';

export const ativa = !!(NUVEM.url && NUVEM.chave);
const BASE = NUVEM.url.replace(/\/+$/, ''), K_SES = 'nexora:sessao', K_SYNC = 'nexora:sync', K_SEM = 'nexora:semconta';
const ler = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const gravar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let sessao = ativa ? ler(K_SES) : null;
let enviado = ler(K_SYNC)?.mod ?? null; // mod da última versão igual à do servidor
export const usuario = () => sessao?.user || null;
export const semConta = () => !!ler(K_SEM);
export const usarSemConta = v => gravar(K_SEM, v ? 1 : null);
export const situacao = { estado: ativa ? 'parado' : 'off', hora: null, erro: '' }; // parado | sincronizando | ok | erro
const avisar = (estado, erro = '') => { situacao.estado = estado; situacao.erro = erro; if (estado === 'ok') situacao.hora = Date.now(); dispatchEvent(new Event('nexora:nuvem')); };

const MSG = {
  invalid_credentials: 'E-mail ou senha incorretos.', email_not_confirmed: 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  user_already_exists: 'Já existe uma conta com este e-mail. Use "Entrar".', email_exists: 'Já existe uma conta com este e-mail. Use "Entrar".',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres.', over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco.', same_password: 'A nova senha precisa ser diferente da anterior.',
  signup_disabled: 'O cadastro de novas contas está desativado.', email_address_invalid: 'Este endereço de e-mail não foi aceito.', validation_failed: 'Confira o e-mail e a senha.',
};
class ErroNuvem extends Error { constructor(msg, status, codigo) { super(msg); this.status = status; this.codigo = codigo; } }
async function chamar(caminho, { method = 'GET', body, token, headers = {} } = {}) {
  let r;
  try {
    r = await fetch(BASE + caminho, { method, headers: { apikey: NUVEM.chave, ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new ErroNuvem('Sem conexão com o servidor. Verifique a internet.', 0, 'rede'); }
  const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch {}
  if (!r.ok) {
    const cod = j?.error_code || j?.code || j?.error || '';
    const bruto = j?.msg || j?.error_description || j?.message || '';
    const msg = MSG[cod] || (/already registered/i.test(bruto) ? MSG.user_already_exists : /invalid login/i.test(bruto) ? MSG.invalid_credentials : /not confirmed/i.test(bruto) ? MSG.email_not_confirmed : r.status === 429 ? MSG.over_request_rate_limit : bruto || `Erro ${r.status} no servidor.`);
    throw new ErroNuvem(msg, r.status, cod);
  }
  return j;
}
function guardarSessao(j) {
  sessao = { access_token: j.access_token, refresh_token: j.refresh_token, expira: Date.now() + (j.expires_in || 3600) * 1000, user: { id: j.user.id, email: j.user.email } };
  gravar(K_SES, sessao); usarSemConta(false);
}
let renovando = null;
async function token() {
  if (!sessao) throw new ErroNuvem('Sessão encerrada. Entre de novo.', 401, 'sem_sessao');
  if (sessao.expira - Date.now() > 60e3) return sessao.access_token;
  renovando ||= chamar('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: sessao.refresh_token } })
    .then(guardarSessao).catch(e => { if (e.status === 400 || e.status === 401 || e.status === 403) encerrarLocal(); throw e; }).finally(() => { renovando = null; });
  await renovando;
  return sessao.access_token;
}
function encerrarLocal() { sessao = null; enviado = null; gravar(K_SES, null); gravar(K_SYNC, null); avisar('parado'); }

// ---------- Conta ----------
export async function entrar(email, senha) {
  guardarSessao(await chamar('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password: senha } }));
  await sincronizar();
}
// Devolve 'entrou' ou 'confirmar' (quando o servidor exige confirmação por e-mail).
export async function criarConta(email, senha) {
  const j = await chamar(`/auth/v1/signup?redirect_to=${encodeURIComponent(location.origin + location.pathname)}`, { method: 'POST', body: { email, password: senha } });
  if (j?.access_token) { guardarSessao(j); await sincronizar(); return 'entrou'; }
  const u = j?.user || j;
  if (u && Array.isArray(u.identities) && u.identities.length === 0) throw new ErroNuvem(MSG.user_already_exists, 422, 'user_already_exists');
  return 'confirmar';
}
export const recuperar = email => chamar(`/auth/v1/recover?redirect_to=${encodeURIComponent(location.origin + location.pathname)}`, { method: 'POST', body: { email } });
export async function trocarSenha(senha) { await chamar('/auth/v1/user', { method: 'PUT', token: await token(), body: { password: senha } }); }
export async function sair() {
  if (!sessao) return;
  if (sujo()) { try { await enviar(); } catch {} }
  const pendente = sujo() && temDados(state) && !state.demo ? exportar() : null; // não conseguiu enviar: devolve um backup para não perder nada
  try { await chamar('/auth/v1/logout', { method: 'POST', token: sessao.access_token }); } catch {}
  encerrarLocal(); esvaziarLocal();
  return pendente;
}
// Links de e-mail (confirmação de conta e redefinição de senha) voltam com os tokens no "#". Devolve 'recuperar', 'entrou', 'erro' ou null.
export async function processarLink() {
  if (!ativa || !/(?:access_token|error_description)=/.test(location.hash)) return null;
  const p = new URLSearchParams(location.hash.replace(/^#\/?/, ''));
  history.replaceState(null, '', location.pathname + location.search + '#/painel');
  if (p.get('error_description')) return 'erro';
  try {
    const user = await chamar('/auth/v1/user', { token: p.get('access_token') });
    guardarSessao({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: +p.get('expires_in') || 3600, user });
    return p.get('type') === 'recovery' ? 'recuperar' : 'entrou';
  } catch { return 'erro'; }
}

// ---------- Sincronização (documento inteiro; vale a alteração mais recente) ----------
const sujo = () => !!sessao && state.mod !== enviado;
const marcar = mod => { enviado = mod; gravar(K_SYNC, { mod }); };
async function baixar() {
  const linhas = await chamar(`/rest/v1/nexora_dados?select=dados,mod&user_id=eq.${sessao.user.id}`, { token: await token() });
  return linhas?.[0] || null;
}
async function enviar() {
  const mod = state.mod || Date.now();
  await chamar('/rest/v1/nexora_dados?on_conflict=user_id', { method: 'POST', token: await token(), headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { user_id: sessao.user.id, dados: paraNuvem(), mod, atualizado_em: new Date().toISOString() } });
  marcar(mod);
}
let decidir = async () => 'ok'; // a interface define como perguntar ao usuário (ver conta.js)
export const definirDecisao = f => { decidir = f; };
let emCurso = null;
export function sincronizar() {
  if (!sessao) return Promise.resolve();
  return emCurso ||= (async () => {
    avisar('sincronizando');
    try {
      const remoto = await baixar(), id = sessao.user.id;
      if (!remoto) { vincular(id); await enviar(); }
      else if (state.conta !== id) {
        // primeira vez desta conta neste aparelho
        let usarConta = true;
        if (temDados(state) && !state.demo) {
          const r = await decidir();
          if (r === null) { encerrarLocal(); return; }
          usarConta = r === 'ok';
        }
        if (usarConta) { adotar(remoto.dados, +remoto.mod, id); marcar(+remoto.mod); } else { vincular(id); await enviar(); }
      }
      else if (+remoto.mod > state.mod) { adotar(remoto.dados, +remoto.mod, id); marcar(+remoto.mod); }
      else if (+remoto.mod < state.mod) await enviar();
      else marcar(state.mod);
      avisar('ok');
    } catch (e) { if (sessao) avisar('erro', e.message); else avisar('parado'); throw e; }
  })().finally(() => { emCurso = null; });
}

if (ativa) {
  let espera = 0;
  aoMudar(() => { if (!sujo()) return; clearTimeout(espera); espera = setTimeout(() => sincronizar().catch(() => {}), 1500); });
  const verificar = () => { if (sessao && !document.hidden && navigator.onLine !== false) sincronizar().catch(() => {}); };
  document.addEventListener('visibilitychange', verificar); addEventListener('online', verificar); addEventListener('focus', verificar);
  setInterval(verificar, 45e3);
}
