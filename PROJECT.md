# Nexora — PROJECT.md

Plataforma de controle financeiro pessoal (HTML/CSS/JS modular, sem frameworks, sem backend). Interface em pt-BR.
**Regra de trabalho:** uma etapa por vez; só avançar com autorização explícita.

## Como executar
Módulos ES não funcionam via `file://`. Na pasta do projeto: `python3 -m http.server 8000` e abra http://localhost:8000.
Alternativa: `npx serve .`

## Plano
1. Fundação e identidade visual — **concluída (aguardando validação)**
2. Armazenamento (IndexedDB, migrações) e motor financeiro, com testes de valores conhecidos
3. Transações, contas, cartões/faturas, parcelas, orçamentos, metas
4. Relatórios, gráficos reais, CSV, investimentos, simuladores, cotações externas
5. Nexora AI (análise local determinística; adaptador opcional para IA generativa via backend seguro)
6. Qualidade, acessibilidade, backup/restauração, segurança, publicação estática

## Regras financeiras obrigatórias (a implementar nas Etapas 2–3)
Saldo atual ≠ saldo projetado · pago/recebido ≠ pendente/previsto · transferência não é receita nem despesa · compra no cartão e pagamento da fatura não contam duas vezes · parcelas: total, pagas, restantes, vencimentos · patrimônio líquido = ativos − passivos sem duplicidade · aportes/retiradas ≠ ganhos/perdas · editar/excluir atualiza todos os indicadores · estornos, reembolsos, pagamentos parciais e datas/fusos devem ter interpretação documentada antes de implementar · demo nunca misturada com dados reais · sem dados, informar em vez de inventar. Valores sempre em centavos inteiros.

## Estrutura atual
- `index.html` — casca (menu lateral, cabeçalho, painel deslizante)
- `css/style.css` (tokens, layout, animações) · `css/components.css` · `css/responsive.css`
- `js/app.js` (componentes, painel, navegação) · `js/router.js` (rotas por hash) · `js/demo-data.js` (dados fictícios, a remover na Etapa 2)
- `assets/` (vazia, reservada)

## Concluído na Etapa 1
Identidade visual (paleta #101511 / #252D27 / #38B76B / #E5F0E8), menu lateral, cabeçalho, 8 rotas, painel inicial com cards, gráfico SVG, categorias, contas, vencimentos, resumo e atalhos; painel deslizante; animações de entrada com `prefers-reduced-motion`; layout responsivo; estados vazios; banner e selos "demonstração".

## Decisões técnicas
- Rotas por hash (`#/painel`) para funcionar em hospedagem estática.
- Gráfico em SVG próprio (sem biblioteca).
- Datas ISO tratadas como texto na exibição, evitando deslocamento de fuso.
- Fonte: pilha do sistema (Inter se instalada), sem dependência externa.
- Módulos de lógica (calculations, storage etc.) só serão criados quando necessários.
- Atalhos e "Nova transação" abrem apenas um painel provisório; os formulários vêm na Etapa 3.

## Testes executados (reais, Etapa 1)
- `node --check` nos 3 arquivos JS: sem erros de sintaxe.
- Navegador headless (Playwright/Chromium) via servidor local, desktop 1366px e celular 390px: painel carrega; navegação por rotas funciona; painel deslizante abre e fecha com Esc; menu móvel abre e fecha ao navegar; sem rolagem horizontal no celular; **nenhum erro de console**.
- Inspeção visual de captura do painel desktop. A versão móvel **não** foi inspecionada visualmente.

## Problemas conhecidos / a verificar manualmente
- Revisão visual no celular real e em Firefox/Safari.
- Navegação por teclado e leitor de tela só verificadas superficialmente (aprofundar na Etapa 6).
- Sem preferência de tema claro (fora do escopo).
- Nome "Nexora": disponibilidade comercial não verificada.

## Próximas tarefas (Etapa 2, após autorização)
Modelo de dados, IndexedDB com versionamento, `calculations.js` em centavos, validações, testes com cenários conhecidos, tratamento de erros.
