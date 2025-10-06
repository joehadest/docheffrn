# Cardápio Digital

Um sistema de cardápio digital com categorias, preços e descrições, incluindo painel administrativo para atualizações rápidas.

## Funcionalidades

- Exibição do cardápio organizado por categorias
- Painel administrativo para gerenciamento de categorias e itens
- Interface responsiva e moderna
- Atualizações em tempo real

## Requisitos

- Node.js 18.x ou superior
- npm ou yarn

## Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITÓRIO]
cd cardapio-digital
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
```

4. Acesse a aplicação em `http://localhost:3000`

## Estrutura do Projeto

- `/src/app` - Páginas da aplicação
- `/src/components` - Componentes React reutilizáveis
- `/src/types` - Definições de tipos TypeScript
- `/src/app/admin` - Painel administrativo

## Uso

### Visualização do Cardápio

Acesse a página inicial para visualizar o cardápio completo, organizado por categorias.

### Painel Administrativo

1. Acesse `/admin` para gerenciar o cardápio
2. Adicione ou edite categorias
3. Gerencie os itens do cardápio, incluindo:
   - Nome
   - Descrição
   - Preço
   - Disponibilidade
   - Categoria

## Tecnologias Utilizadas

- Next.js
- React
- TypeScript
- Tailwind CSS 