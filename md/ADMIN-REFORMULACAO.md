# Reformulação do painel administrativo

## Estrutura e navegação

O projeto continua usando Next.js, React, Tailwind, Framer Motion e React Icons já instalados. Não foram adicionadas dependências. O grupo de rotas `(protected)` foi mantido.

O tema administrativo está em `src/app/admin/admin.css`. Cabeçalhos, indicadores, estados vazios e comportamento de foco dos modais são compartilhados em `src/components/admin/AdminUI.tsx`. O tema fica restrito ao painel e ao login.

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
