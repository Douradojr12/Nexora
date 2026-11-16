// Tela de login e criação de conta (só aparece quando o servidor está configurado em js/config.js).
import { $, esc, icon, toast } from './util.js';
import * as N from './nuvem.js';
import { escolher } from './forms.js';
import { exportar } from './store.js';
import { montarGradiente } from './fx.js';

const tela = $('#login'), caixa = $('#loginBox');
let aoFechar = () => {}, modoAtual = 'entrar';
const baixar = (nome, txt) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };

// Primeira vez da conta em um aparelho que já tem dados: o usuário escolhe, e nada se perde sem backup.
N.definirDecisao(async () => {
  const r = await escolher('Este aparelho já tem dados', 'Sua conta também tem dados salvos. Quais você quer usar? Os deste aparelho serão baixados como backup antes de qualquer troca.', 'Usar os da conta', 'Manter os deste aparelho');
  if (r === 'ok') baixar('nexora-backup-deste-aparelho.json', exportar());
  return r;
});

const TEXTOS = {
  entrar: ['Bem-vindo de volta', 'Entre para ver suas finanças em qualquer aparelho.', 'Entrar'],
  criar: ['Crie sua conta', 'Seus dados ficam salvos e sincronizados entre celular e computador.', 'Criar conta'],
  esqueci: ['Recuperar senha', 'Enviaremos um link para você criar uma nova senha.', 'Enviar link'],
  nova: ['Nova senha', 'Escolha uma nova senha para a sua conta.', 'Salvar senha'],
  aviso: ['Confira seu e-mail', '', 'Voltar para entrar'],
};
function pintar(modo, extra = '') {
  const [t, sub, botao] = TEXTOS[modo];
  const campoEmail = `<div class="field"><label for="lgEmail">E-mail</label><input class="input" id="lgEmail" name="email" type="email" autocomplete="email" inputmode="email" required placeholder="voce@email.com"></div>`;
  const campoSenha = (rot, ac) => `<div class="field"><label for="lgSenha">${rot}</label><div class="senha"><input class="input" id="lgSenha" name="senha" type="password" autocomplete="${ac}" required minlength="8" placeholder="Mínimo de 8 caracteres"><button type="button" class="olho" data-olho aria-label="Mostrar senha">${icon('olho')}</button></div></div>`;
  caixa.innerHTML = `
    <div class="login-marca"><span class="logo"><svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true"><path d="M8 24V8l16 16V8" stroke="#04120a" stroke-width="3.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg></span><span>Nexora<small>Private Finance</small></span></div>
    <h2 class="serif">${t}</h2><p class="muted">${modo === 'aviso' ? esc(extra) : sub}</p>
    ${modo === 'entrar' || modo === 'criar' ? `<div class="seg login-abas" role="tablist"><button type="button" data-modo="entrar" aria-pressed="${modo === 'entrar'}">Entrar</button><button type="button" data-modo="criar" aria-pressed="${modo === 'criar'}">Criar conta</button></div>` : ''}
    <form id="lgForm" novalidate>
      ${modo === 'entrar' ? campoEmail + campoSenha('Senha', 'current-password') : ''}
      ${modo === 'criar' ? campoEmail + campoSenha('Crie uma senha', 'new-password') : ''}
      ${modo === 'esqueci' ? campoEmail : ''}${modo === 'nova' ? campoSenha('Nova senha', 'new-password') : ''}
      <p class="login-erro" id="lgErro" role="alert"></p>
      <button class="btn btn-primary login-go" id="lgGo">${esc(botao)}</button>
    </form>
    <div class="login-links">
      ${modo === 'entrar' ? '<button type="button" class="link" data-modo="esqueci">Esqueci minha senha</button>' : ''}
      ${modo === 'esqueci' ? '<button type="button" class="link" data-modo="entrar">Voltar para entrar</button>' : ''}
      ${modo !== 'nova' && modo !== 'aviso' ? '<button type="button" class="link dim" data-semconta>Continuar sem conta (só neste aparelho)</button>' : ''}
    </div>
    <p class="login-nota">${icon('cadeado')}<span>Sua senha é guardada com criptografia pelo servidor de contas e nunca fica salva neste aparelho.</span></p>`;
  modoAtual = modo;
  setTimeout(() => $('input', caixa)?.focus(), 50);
}
caixa.addEventListener('click', e => {
  const m = e.target.closest('[data-modo]'); if (m) return pintar(m.dataset.modo);
  if (e.target.closest('[data-semconta]')) { N.usarSemConta(true); fechar(); return; }
  const o = e.target.closest('[data-olho]'); if (o) { const i = $('#lgSenha'); i.type = i.type === 'password' ? 'text' : 'password'; }
});
caixa.addEventListener('submit', async e => {
  e.preventDefault();
  const modo = modoAtual, f = e.target, erro = $('#lgErro'), go = $('#lgGo');
  if (modo === 'aviso') return pintar('entrar');
  const email = f.elements.email?.value.trim() || '', senha = f.elements.senha?.value || '';
  erro.textContent = '';
  if (f.elements.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return (erro.textContent = 'Digite um e-mail válido.');
  if (f.elements.senha && senha.length < 8) return (erro.textContent = 'A senha precisa ter pelo menos 8 caracteres.');
  go.disabled = true; go.classList.add('carregando');
  try {
    if (modo === 'entrar') { await N.entrar(email, senha); if (N.usuario()) { fechar(); toast('Você entrou. Dados sincronizados.'); } }
    else if (modo === 'criar') {
      const r = await N.criarConta(email, senha);
      if (r === 'entrou') { fechar(); toast('Conta criada. Seus dados já estão na nuvem.'); }
      else pintar('aviso', `Enviamos um link de confirmação para ${email}. Abra o e-mail, toque no link e depois entre com sua senha.`);
    }
    else if (modo === 'esqueci') { await N.recuperar(email); pintar('aviso', `Se existir uma conta com ${email}, você receberá um link para criar uma nova senha.`); }
    else if (modo === 'nova') { await N.trocarSenha(senha); await N.sincronizar(); fechar(); toast('Senha alterada'); }
  } catch (err) { if ($('#lgErro')) $('#lgErro').textContent = err.message || 'Não foi possível concluir. Tente de novo.'; }
  finally { if (go.isConnected) { go.disabled = false; go.classList.remove('carregando'); } }
});

export function mostrarLogin(modo = 'entrar') { pintar(modo); tela.hidden = false; document.body.classList.add('em-login'); montarGradiente(tela); }
function fechar() { tela.hidden = true; document.body.classList.remove('em-login'); aoFechar(); }

// Chamar uma vez ao abrir o app. `repintar` redesenha a página atual (devolve o gradiente ao painel).
export async function iniciarConta(repintar) {
  aoFechar = repintar;
  if (!N.ativa) return;
  const link = await N.processarLink();
  if (link === 'recuperar') return mostrarLogin('nova');
  if (link === 'erro') toast('O link expirou ou já foi usado. Peça um novo.', true);
  if (N.usuario()) { N.sincronizar().catch(() => {}); if (link === 'entrou') toast('E-mail confirmado. Você entrou.'); }
  else if (!N.semConta()) mostrarLogin('entrar');
}
export async function sairDaConta() {
  const pendente = await N.sair();
  if (pendente) { baixar('nexora-backup-nao-enviado.json', pendente); toast('Sem conexão: baixei um backup do que não foi enviado', true); }
  mostrarLogin('entrar');
}
