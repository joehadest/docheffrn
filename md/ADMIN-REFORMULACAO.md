# Reformulação do painel administrativo

## Estrutura e navegação

O projeto continua usando Next.js, React, Tailwind, Framer Motion e React Icons já instalados. Não foram adicionadas dependências. O grupo de rotas `(protected)` foi mantido.

O tema administrativo tem sua entrada em `src/app/admin/admin.css`, que importa os sete parciais de `src/app/admin/styles/`. Cabeçalhos, indicadores, estados vazios e comportamento de foco dos modais são compartilhados em `src/components/admin/AdminUI.tsx`. O tema fica restrito ao painel e ao login.

## Sistema visual

- `styles/tokens.css`: variáveis `--ad-*` de cores, superfícies, tipografia, espaçamento, elevação e movimento, com adaptação da paleta Tailwind dentro de `.admin-theme`.
- `styles/base.css`: fundo, tipografia, foco visível, formulários, botões e redução de movimento.
- `styles/shell.css`: sidebar, navegação compacta, barra inferior, cabeçalho e limites do conteúdo.
- `styles/components.css`: cards, indicadores, chips, tabelas, gráficos e componentes dos módulos de gestão. Tabelas largas rolam dentro do próprio contêiner, incluindo os rótulos destinados a leitores de tela.
- `styles/dialogs.css`: modais centralizados no desktop, painéis junto à base no celular e adaptação a telas baixas.
- `styles/pages.css`: apresentação de Cardápio, Categorias, Mesas, Configurações e Financeiro; `styles/login.css`: tela de acesso.
- `src/components/admin/admin-operations.css` e `admin-deliveries.css`: apresentação de Pedidos/Cozinha e Entregas, usando os mesmos tokens.

Breakpoints principais: até **1023 px**, a lateral vira uma barra compacta de ícones; até **767 px**, a navegação passa à base da tela; até **640 px**, os modais usam apresentação junto à base; até **420 px**, campos e ações recebem ajustes adicionais. Até **520 px de altura**, navegação e diálogos ficam mais compactos para uso em paisagem. Áreas seguras do dispositivo são consideradas.

Para personalizar a marca, altere o grupo **Brand** em `tokens.css`: `--ad-accent` e `--ad-accent-hi` definem destaques, `--ad-btn-1`/`--ad-btn-2` os botões, e `--ad-accent-bg`, `--ad-accent-bg-2`, `--ad-accent-line` e `--ad-focus` seus fundos, bordas e foco. Mantenha os tons coordenados e confira novamente o contraste nos estados normal, hover e foco.

As telas Visão geral, Cozinha, Entregas, Clientes, Relatórios e AdminDataStatus têm estilos preparados, mas permanecem fora do menu de `src/app/admin/(protected)/page.tsx`. A rota `/admin/lab` existe somente na cópia temporária de validação e não integra o projeto real.

- Navegação lateral no computador e cinco abas identificadas no celular; “Configurações” aparece como “Ajustes” na navegação compacta.
- Cards com menos efeitos, tipografia e espaçamento consistentes, campos e ações com foco visível, respeito à preferência por movimento reduzido e link para pular a navegação.
- Modais com Escape, ciclo de Tab/Shift+Tab, bloqueio de rolagem e restauração de foco. O editor de categorias pode rolar em telas baixas, incluindo o seletor de emoji.
- Login redesenhado e correção do caminho do cookie removido no logout, compatível com o caminho `/admin` usado no login.
- Prévia de recibo centralizada e adaptável à tela; regras de impressão térmica preservadas.

## Páginas

- **Cardápio e Categorias:** filtros e ações reorganizados; nomes de produtos podem quebrar linha; disponibilidade identificada em português; categorias usam cards em telas menores e colunas no desktop; campos dos editores identificados para leitores de tela; validação, erro e carregamento do salvamento dentro do editor de itens.
- **Pedidos:** cabeçalho e filtros padronizados; carregamento, erro de atualização, tentativa novamente e estado vazio identificados; compartilhamento com nome acessível; detalhes do pedido com navegação por teclado. SSE, áudio, impressão e ações existentes mantidos.
- **Mesas:** abertura de mesa identificada, estado vazio orientativo, mesas acionáveis por teclado e foco controlado nos modais de lançamento de itens. Fluxos de atendimento e fechamento mantidos.
- **Configurações:** indicadores compartilhados, horários adaptáveis, campos identificados, remoção de taxas visível ao toque, confirmação de salvamento anunciada e bloqueio de salvamento quando o carregamento inicial falha.
- **Financeiro:** novo filtro descrito abaixo; indicadores e lista produzidos a partir do mesmo relatório filtrado; finalização em lote continua restrita aos pedidos pendentes exibidos.

## Período financeiro

- Atalhos: Hoje, Esta semana (mantido), Este mês, Últimos 30 dias e Este ano. Atalhos usam a data atual como limite final.
- Dia específico e intervalo inclusivo entre quaisquer meses/anos.
- Um ou vários meses, consecutivos ou não, de qualquer ano. Adicione meses e aplique; o mês ainda preenchido também entra na seleção.
- Intervalos personalizados são aplicados explicitamente. Uma seleção inválida mostra a mensagem correspondente e mantém o relatório anterior.
- O resumo “Exibindo” sempre descreve o filtro efetivamente aplicado. “Limpar filtros” remove as datas e mostra todo o histórico.
- Comparação de datas no fuso `America/Sao_Paulo`, inclusive nos limites de meia-noite. Datas inválidas são excluídas do relatório.
- Faturamento considera apenas pedidos entregues; cancelados não entram no faturamento nem nos pendentes. O total gravado é preservado quando válido, com reconstrução por itens e entrega conforme a regra existente. A soma é feita em centavos.
- O indicador antes chamado “Lucro Total” agora se chama “Faturamento concluído”: o sistema não registra custos para calcular lucro.
- Não existiam gráficos nem exportações agregadas na aba Financeiro. A impressão individual existente foi mantida, acessível pelos pedidos do período.

## Validação

```sh
node scripts/validate-finance.cjs
npx tsc --noEmit
npm run lint
npm run build
```

O script financeiro executa 34 verificações: virada de ano, meses não consecutivos, ano bissexto, intervalos inclusivos, fuso, datas inválidas, atalhos, status, total armazenado, fallback com taxa de entrega e soma em centavos.

As cinco abas foram conferidas no navegador local em 320, 768 e 1440 pixels, sem rolagem horizontal da página. Também foram conferidos login/logout, editores de item/categoria, seletor de emoji, erros de formulário, foco e Escape nos detalhes dos pedidos e filtros financeiros com dados reais. A soma dos pedidos concluídos exibidos foi comparada com o indicador financeiro.

A compilação de produção foi executada numa cópia temporária para preservar o servidor de desenvolvimento. Não foram criados/excluídos produtos nem alterados pedidos e configurações reais durante a validação. Fluxos de gravação e impressão física devem receber a homologação operacional habitual.

## Refinamento dos modais

- Componente compartilhado `AdminDialog`: cabeçalho, título e descrição, fechamento acessível, área de conteúdo com rolagem independente e ações sempre visíveis.
- Editores de itens e categorias e detalhes de Pedidos/Financeiro padronizados; informações do pedido divididas em resumo, cliente, entrega, itens e pagamento. Abas e seções do editor de produtos reorganizadas.
- Em celulares, apresentação junto à base da tela, campos empilhados e respeito à área segura do dispositivo. Seletor de emoji com tema escuro e busca em português.
- Confirmações de exclusão, remoção, cancelamento de mesa e finalização em lote usam o mesmo padrão, com semântica `alertdialog`. Falhas na exclusão de itens aparecem na página.
- Estilos dos seletores de produto de Mesas alinhados ao painel; ajustes limitados ao tema administrativo, preservando o cardápio público.
- TypeScript (sem cache incremental) e ESLint passaram. Validação no navegador em 320, 768 e 1440 pixels: formulários, opções existentes, emoji, mensagens de erro, ações visíveis, Escape, ciclo de foco e retorno ao acionador. Confirmações de exclusão e finalização foram abertas e canceladas, sem executar alterações nos dados.
- Não havia mesas abertas na validação; o fluxo de lançamento e cancelamento de mesas não foi exercitado com dados reais.

## Conclusão da validação visual — 24/10/2026

- Retomada limitada a CSS e documentação, preservando a lógica, as APIs, as dependências e o menu real. Corrigido o overflow horizontal de Clientes: o contêiner rolável agora também contém o posicionamento dos rótulos acessíveis da tabela.
- Conferidos Configurações e Financeiro em 1440×900 e 390×844. A ação sticky de salvamento permanece visível, acima da navegação no celular; os botões das linhas financeiras mantêm pelo menos 44 px de altura.
- Visão geral, Cozinha, Entregas, Clientes, Relatórios e a navegação do laboratório foram conferidos em 390×844, 768×1024, 320×568, 1024×768 e 1920×1080, mais 844×390 e 667×375 em paisagem. A rodada final não apresentou overflow da página nem erros de execução. Tabelas largas preservam sua rolagem interna.
- Axe-core: nenhuma violação nas regras executadas em 13 cenários por tamanho, em 1440×900 e 390×844 (contraste, nomes, labels, atributos ARIA, interações aninhadas e tamanho dos alvos). Os gradientes foram neutralizados apenas durante essa análise; a aparência completa foi conferida nas capturas.
- TypeScript sem cache incremental e ESLint nos cinco TSX de apresentação passaram após a última edição do Financeiro. A compilação de produção aprovada no ponto de retomada não precisou ser refeita nesta conclusão.
- Testes feitos exclusivamente em Chrome headless, com 173 pedidos fictícios e MongoDB temporário na porta 27555. Não houve uso do banco real, leitura de `.env`, uso da sessão do usuário ou teste em aparelhos físicos.
- O laboratório temporário recebeu um ajuste na posição de `Suspense` para evitar avisos de hidratação criados pela própria montagem de teste. Os overlays de desenvolvimento do Next foram ocultados somente no harness para não interceptarem os cliques; nenhum desses ajustes foi aplicado às rotas do projeto.
- Os originais não versionados e os backups de retomada estão preservados em `C:\Users\Joel\.copilot\session-state\4f8435e0-10be-40d4-92fb-981e47bd3072\files\backup-original-css\`.
- As alterações permanecem sem commit. Os novos módulos continuam sem ligação ao menu real. O preview registrou aviso de vulnerabilidade conhecida na versão instalada do Next.js; sua atualização permanece fora desta etapa visual.
- Processos temporários do Next (3100) e do MongoDB (27555) encerrados. A revisão automática bloqueou a exclusão por política de execução; permanecem no disco `C:\Users\Joel\AppData\Local\docheffrn-preview`, `C:\Users\Joel\AppData\Local\Temp\docheffrn-harness` e os logs `next-dev-out.log`/`next-dev-err.log` em `%TEMP%`.
- Capturas finais e logs de validação preservados em `C:\Users\Joel\.codex\visualizations\2026\10\08\01a11de8-d9c5-7f43-b1ea-caaa2ebfa11a\admin-visual-final-20261024\`. Os scripts do harness também têm backup junto aos originais.

## QA de integração e entrega — 24/10/2026

- Editores de produto e categoria substituídos por `MenuEditorDialog`, com diálogo nativo, animações independentes do fundo e painel e saída concluída antes do desbloqueio da página. O editor de produto tem as abas Básico, Imagem, Opções e Ingredientes. A prévia mostra a imagem inteira e possui estados de carregamento, ausência e erro.
- Pedidos recebeu filtros agrupados, lista paginada e colunas com rolagem própria. O QA identificou que a API exige entregador antes da saída para entrega, mas o módulo de atribuição não tinha acesso na navegação real. Pedidos agora oferece o acesso a Entregas e o atalho “Atribuir entregador” abre o pedido correspondente. O cadastro de entregadores fica disponível nessa área; as outras telas experimentais continuam fora do menu principal.
- Corrigido o cabeçalho público que perdia a posição sticky por uma regra global de CSS. Categorias usa a altura medida do cabeçalho e da barra, inclusive no carregamento inicial e após redimensionar. Os links deixam os títulos visíveis abaixo da navegação.
- Build de produção com Next.js 16.4.3 e TypeScript aprovado. ESLint: zero erros e quatro avisos anteriores nos módulos de visão geral, relatórios e navegação do contexto administrativo.
- Regressões reproduzíveis: `node scripts/validate-finance.cjs` (34 verificações), `node scripts/validate-order-operations.cjs` (40 verificações) e `node scripts/qa-http.cjs http://127.0.0.1:3187` (24 verificações, com `next start` nessa porta).
- No Chrome, usando o build de produção: conferidos os cinco módulos do admin, filtros financeiros, busca e paginação de pedidos, acesso à atribuição e cadastro de entregadores, formulários de item/categoria, imagem completa, seletor de emoji, validação de campos, foco, Escape e saída dos diálogos. As cinco abas e Entregas não apresentaram overflow da página em 390×844. A barra pública foi conferida em celular, tablet 1024×768 e monitor.
- Os cenários de API verificam leitura pública, bloqueio de consultas administrativas sem sessão, rejeição de cookie legado forjado, rejeição de origem externa e dados inválidos. Nenhum produto, pedido, entregador ou configuração real foi criado, alterado ou excluído. Gravações válidas no banco real, notificações de entrega e impressão física não integram esta rodada.
