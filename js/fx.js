// Camada de animação do Nexora: gradiente vivo em WebGL, revelação ao rolar, transições de página,
// ondas de toque, indicador do menu, brilho do cursor e comemoração. Tudo respeita "reduzir movimento".
import { $, $$, contar, reduz } from './util.js';

// ---------- Gradiente vivo (WebGL) atrás do destaque do painel ----------
const FRAG = `precision mediump float;uniform vec2 r;uniform float t;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.+vec2(3.1,1.7);a*=.5;}return v;}
void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=uv*vec2(r.x/r.y,1.)*1.5;float tt=t*.055;
vec2 q=vec2(fbm(p+tt),fbm(p+vec2(5.2,1.3)-tt));float f=fbm(p+2.4*q+vec2(tt*.7,-tt*.4));
vec3 c=mix(vec3(.02,.045,.035),vec3(.04,.30,.19),smoothstep(.28,.72,f));
c=mix(c,vec3(.20,.74,.46),smoothstep(.60,.95,f)*.6);
c=mix(c,vec3(.84,.70,.42),smoothstep(.50,.95,q.x*f*2.)*.55);
gl_FragColor=vec4(c*.8,1.);}`;
let gl = null, tela = null, prog = null, uR, uT, laco = 0, visivel = true, falhou = false;
function criarGl() {
  if (tela || falhou) return;
  try {
    tela = document.createElement('canvas'); tela.className = 'gl-bg'; tela.setAttribute('aria-hidden', 'true');
    gl = tela.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) throw 0;
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw 0; return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw 0;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    uR = gl.getUniformLocation(prog, 'r'); uT = gl.getUniformLocation(prog, 't');
    tela.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(laco); laco = 0; });
    new IntersectionObserver(es => { visivel = es[0].isIntersecting; if (visivel) rodar(); }).observe(tela);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) rodar(); });
  } catch { falhou = true; tela = gl = null; }
}
let ultimo = 0;
function quadro(agora) {
  laco = 0;
  if (!tela?.isConnected || document.hidden || !visivel || gl.isContextLost()) return;
  if (agora - ultimo > 32) { // ~30 quadros por segundo, em meia resolução: leve no celular
    ultimo = agora;
    const w = Math.max(2, Math.min(720, Math.round(tela.clientWidth * .5))), hh = Math.max(2, Math.round(tela.clientHeight * .5 * (w / Math.max(1, tela.clientWidth * .5))));
    if (tela.width !== w || tela.height !== hh) { tela.width = w; tela.height = hh; gl.viewport(0, 0, w, hh); }
    gl.uniform2f(uR, w, hh); gl.uniform1f(uT, agora / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  if (!reduz()) laco = requestAnimationFrame(quadro);
}
function rodar() { if (tela && !laco) laco = requestAnimationFrame(quadro); }
export function montarGradiente(root) {
  const alvo = $('[data-gl]', root); if (!alvo) return;
  criarGl(); if (!tela) return;
  alvo.prepend(tela); ultimo = 0; rodar();
}

// ---------- Revelação ao rolar: cada bloco entra quando aparece na tela ----------
let observador = null;
function revelar(root) {
  observador?.disconnect();
  const alvos = $$('.page > *', root).flatMap(el => el.classList.contains('grid') ? [...el.children] : [el]);
  if (reduz() || !('IntersectionObserver' in window)) { contar(root); return; }
  $$('.list', root).forEach(l => [...l.children].forEach((it, j) => it.style.setProperty('--j', Math.min(j, 10))));
  alvos.forEach(el => el.classList.add('rv'));
  observador = new IntersectionObserver(es => {
    let k = 0;
    for (const e of es) if (e.isIntersecting) {
      const el = e.target, atraso = k++ * 80;
      observador.unobserve(el);
      el.style.transitionDelay = atraso + 'ms'; el.classList.add('in');
      setTimeout(() => contar(el), atraso);
      setTimeout(() => { el.classList.remove('rv', 'in'); el.style.transitionDelay = ''; }, atraso + 900);
    }
  }, { threshold: .06, rootMargin: '0px 0px -4% 0px' });
  alvos.forEach(el => observador.observe(el));
}

// ---------- Números que rolam do valor antigo para o novo quando um dado muda ----------
const FMTS = { brl: c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), int: v => Math.round(v).toLocaleString('pt-BR'), pct: v => `${Math.round(v)}%` };
export const valoresAtuais = root => $$('[data-count]', root).map(e => +e.dataset.count);
export function animarMudancas(root, antes) {
  if (reduz()) return;
  const els = $$('[data-count]', root); if (els.length !== antes.length) return;
  els.forEach((el, i) => {
    const de = antes[i], para = +el.dataset.count; if (de === para) return;
    const f = FMTS[el.dataset.fmt || 'brl'], t0 = performance.now();
    el.classList.add('mudou'); setTimeout(() => el.classList.remove('mudou'), 900);
    const tick = t => { const p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3); el.textContent = f(p >= 1 ? para : de + (para - de) * e); if (p < 1 && el.isConnected) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}

// ---------- Transição entre páginas (View Transitions, quando o navegador tem) ----------
export function transicao(fn) {
  if (reduz() || !document.startViewTransition) return fn();
  try { document.startViewTransition(fn); } catch { fn(); }
}

// ---------- Comemoração: faíscas verdes e douradas ----------
export function festa(forte = false) {
  if (reduz()) return;
  const n = forte ? 44 : 20, x = innerWidth / 2, y = innerHeight - 70, cores = ['#3CCB7F', '#D9B871', '#6fe6a6', '#ecd08f', '#fff'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'), ang = -Math.PI / 2 + (Math.random() - .5) * (forte ? 2.6 : 1.9), d = (forte ? 190 : 120) + Math.random() * 190;
    p.className = 'faisca';
    p.style.cssText = `left:${x}px;top:${y}px;background:${cores[i % cores.length]};--dx:${Math.cos(ang) * d}px;--dy:${Math.sin(ang) * d}px;--rot:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 90}ms;width:${5 + Math.random() * 6}px;height:${5 + Math.random() * 9}px`;
    document.body.append(p); setTimeout(() => p.remove(), 1500);
  }
}

// ---------- Indicador deslizante do menu ----------
export function moverIndicador() {
  const nav = $('#nav'), at = $('a[aria-current=page]', nav); let ind = $('.nav-ind', nav);
  if (!ind) { ind = document.createElement('span'); ind.className = 'nav-ind'; nav.prepend(ind); }
  if (at) { ind.style.transform = `translateY(${at.offsetTop}px)`; ind.style.height = at.offsetHeight + 'px'; ind.style.opacity = 1; }
}

// ---------- Efeitos globais (uma vez) ----------
export function iniciarFx() {
  $$('#nav a').forEach((a, i) => a.style.setProperty('--i', i));
  // onda de toque
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest?.('.btn,.chip,.item,.menu-opt,#nav a,.icon-btn,.seg button,.quick-mic'); if (!el || reduz()) return;
    const r = el.getBoundingClientRect(), o = document.createElement('span'), d = Math.max(r.width, r.height) * 2.2;
    o.className = 'onda'; o.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    el.append(o); setTimeout(() => o.remove(), 650);
  }, { passive: true });
  // barra de progresso de rolagem + sombra do cabeçalho
  const topo = $('.topbar');
  const rolar = () => { const max = document.documentElement.scrollHeight - innerHeight; topo.style.setProperty('--sp', max > 0 ? scrollY / max : 0); topo.classList.toggle('rolou', scrollY > 8); };
  addEventListener('scroll', rolar, { passive: true }); rolar();
  // brilho que acompanha o cursor (só com mouse)
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !reduz()) {
    const g = document.createElement('div'); g.className = 'cursor-glow'; g.setAttribute('aria-hidden', 'true'); document.body.prepend(g);
    let tx = innerWidth / 2, ty = innerHeight / 3, x = tx, y = ty, anim = 0;
    const passo = () => { x += (tx - x) * .12; y += (ty - y) * .12; g.style.transform = `translate(${x}px,${y}px)`; anim = Math.abs(tx - x) + Math.abs(ty - y) > .5 ? requestAnimationFrame(passo) : 0; };
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; if (!anim) anim = requestAnimationFrame(passo); }, { passive: true });
  }
  addEventListener('resize', moverIndicador);
}

// Chamar depois de cada renderização de página.
export function depoisDeRenderizar(root, entrada) {
  montarGradiente(root);
  if (entrada) revelar(root);
}
