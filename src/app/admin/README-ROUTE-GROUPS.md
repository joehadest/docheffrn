# Estrutura de Rotas Admin

Este diretório `src/app/admin` contém:

- `(protected)/` => Layout e páginas autenticadas (usa hooks de navegação e `useSearchParams`).
- `login/` => Página de login isolada, NÃO deve herdar o layout autenticado.
- `print/` => Página de impressão isolada para pedidos.
- `page.tsx` => Placeholder simples que pode redirecionar ou permanecer vazio (painel real está em `(protected)`)

IMPORTANTE: NÃO recriar `admin/layout.tsx` na raiz. Ele faria o `login` herdar hooks client-side e dispararia erro de build (`useSearchParams() should be wrapped...`).

Se for necessário um layout público separado para `login`, crie algo como `(public)/layout.tsx`.
