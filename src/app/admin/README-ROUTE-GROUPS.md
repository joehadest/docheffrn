## Estrutura de Rotas Admin

Diretório: `src/app/admin`

Itens atuais:

* `(protected)/` => Layout + página autenticada que responde por `/admin`.
* `login/` => Página de login isolada (sem layout autenticado).
* `print/` => Página de impressão isolada.

Importante: NÃO criar `admin/layout.tsx` nem `admin/page.tsx` na raiz. A rota `/admin` é servida exclusivamente por `(protected)/page.tsx` + `(protected)/layout.tsx`.

### Histórico da Correção
Foram removidos arquivos antigos `admin/page.tsx` (redirect) e `layout-old-REMOVE.tsx` porque causavam conflito de build em produção (Vercel) levando ao erro de manifesto ausente.

### Erro ENOENT em Vercel
Sintoma observado:
```
ENOENT: no such file or directory, lstat '.next/server/app/admin/(protected)/page_client-reference-manifest.js'
```
Cause provável: duplicidade ou corrida de build envolvendo uma `page.tsx` raiz com redirect para um route group.

Checklist de mitigação:
1. Garantir ausência de `src/app/admin/page.tsx` e `src/app/admin/layout.tsx`.
2. Manter somente `(protected)/layout.tsx` e `(protected)/page.tsx` para a rota `/admin`.
3. Limpar o cache de build na Vercel (Redeploy > Clear Build Cache).
4. Fazer novo deploy.

### Como adicionar um layout público opcional
Criar grupo `(public)` se precisar um layout diferente para login:
```
admin/
  (public)/
    layout.tsx   <-- layout público opcional
    login/
  (protected)/
    layout.tsx   <-- layout autenticado
    page.tsx
```

### Boas práticas
* Evitar duplicidade física de páginas que mapeiem a mesma URL final.
* Não reintroduzir layout/page na raiz do escopo `admin`.
* Nomenclatura consistente (case-sensitive) para evitar problemas em sistemas Linux.
* Limpar cache após mudanças estruturais de rotas antes de validar o deploy.

### Verificação Rápida (script mental)
```
ls src/app/admin
-> (protected)/  login/  print/  README-ROUTE-GROUPS.md
```

Se houver qualquer outro `page.tsx` ou `layout.tsx` direto em `admin/`, remover.

