# Nexora — PROJECT.md

Plataforma de controle financeiro pessoal (HTML/CSS/JS modular, sem frameworks, sem build, sem backend). Interface em pt-BR.

## Como executar
Módulos ES não funcionam via `file://`. Na pasta do projeto: `python3 -m http.server 8000` e abra http://localhost:8000 (ou `npx serve .`).
Pode ser publicado como site estático (GitHub Pages, Netlify, Vercel…).
Testes: `node --test tests/*.mjs`.

## Telas
- **Painel** — sobra do mês, receitas × despesas (6 meses), gastos por categoria, próximos vencimentos, dicas da IA, dólar.
- **Receitas e despesas** — salário/receita fixa (repete todo mês), receita variável, despesas fixas e avulsas; navegação por mês e filtros.
- **Cartões e faturas** — cadastro com limite, fechamento e vencimento; limite usado/disponível; compras parceladas; faturas por mês; marcar como paga.
- **Consórcios** — parcela, pagas/total, quantas faltam, já pago, falta pagar, término previsto; registrar parcela paga.
- **Investimentos** — simulador de juros compostos com gráfico; carteira com aplicado × atual.
- **Câmbio** — dólar em tempo real (atualiza a cada 60 s), gráfico de 30 dias, euro, bitcoin e conversor.
- **Nexora AI** — diagnóstico e dicas locais + chat; opcionalmente conectado ao Claude com a chave de API do usuário.
- **Lançamento rápido** — campo no Painel e no botão Novo: escreva ou fale uma frase ("comprei 40 reais de comida no mercado no pix") e o formulário já abre preenchido para confirmar.
- **Configurações** — nome, chave/modelo da IA, backup (exportar/restaurar JSON), dados de exemplo, apagar tudo.

## Estrutura
- `index.html` — casca (menu, cabeçalho, gaveta de formulários, diálogo, avisos)
- `css/style.css` (tokens, layout, animações) · `css/components.css` · `css/responsive.css`
- `js/finance.js` — motor financeiro puro (centavos inteiros, datas ISO como texto)
- `js/store.js` — estado + localStorage (`nexora:v1`), backup, dados de exemplo
- `js/pages.js` — telas (HTML a partir do estado) · `js/app.js` — rotas, ações, chat, efeitos
- `js/forms.js` — gaveta, formulários, validação · `js/charts.js` — gráficos SVG próprios
- `js/cambio.js` — cotações · `js/ai.js` — análise local e integração com o Claude · `js/util.js`
- `js/parser.js` — interpreta a frase do lançamento rápido (função pura, sem IA)
- `manifest.webmanifest`, `sw.js`, `icons/` — instalação na tela inicial (PWA); o service worker usa rede primeiro
- `tests/finance.test.mjs`, `tests/parser.test.mjs` — cenários com valores conhecidos

## Regras financeiras implementadas
- Valores em centavos inteiros; parcelas com divisão inteira e os centavos restantes na 1ª parcela.
- Compra no cartão só conta como despesa no mês em que a fatura vence — nunca duas vezes.
- Compra feita no dia do fechamento (ou depois) entra na fatura seguinte. A fatura é identificada pelo mês do vencimento.
- Limite usado = todas as parcelas em faturas não pagas (inclusive futuras). Pagar a fatura libera o limite.
- Lançamento fixo repete no mesmo dia (ajustado ao fim do mês) a partir do início, até o mês de encerramento opcional.
- "Registrar parcela paga" do consórcio cria uma despesa na categoria Consórcio; excluir essa despesa devolve a parcela.
- Dados de exemplo ficam marcados (`demo`) e exibem aviso; sem dados, as telas informam em vez de inventar.

## Decisões técnicas
- Armazenamento em `localStorage` (volume pequeno; IndexedDB não se justificou). O backup JSON nunca inclui a chave da IA.
- Cotações: AwesomeAPI, com Frankfurter (BCE) como reserva; última cotação fica em cache local.
- IA: sem backend, a chamada ao Claude é feita por `fetch` direto do navegador com a chave do próprio usuário
  (`anthropic-dangerous-direct-browser-access`). Adequado para uso pessoal; para um produto público, mover a chamada para um backend.
- Gráficos: verde (receitas) × âmbar (despesas) e âmbar × azul no simulador — pares validados para daltonismo.
- Sem dependências externas (fontes do sistema); todas as entradas do usuário são escapadas antes de ir ao HTML.

## Testes executados
- `node --test`: 9 cenários do motor financeiro (datas, recorrência, faturas, parcelas, limite, consórcio, vencimentos, simulador).
- Chromium headless (1440 px e 390 px): todas as telas, criar despesa, validação de formulário, pagar fatura, registrar parcela,
  simulador, chat local, menu móvel; sem rolagem horizontal; nenhum erro de console.

## Não verificado / pendente
- Cotações reais: no ambiente de desenvolvimento a rede bloqueia as APIs; a tela foi testada com respostas simuladas.
- Chat com o Claude: não testado com chave real.
- Ditado por voz: testado com reconhecimento simulado; depende do navegador (Chrome/Android funciona; iPhone é limitado — usar o microfone do teclado).
- Instalação como app: manifesto e service worker verificados em Chromium; não testada em aparelho real.
- Firefox/Safari e leitor de tela; tema claro; orçamentos e metas; relatórios/CSV.
