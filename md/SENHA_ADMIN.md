# Sistema de Senha Administrativa

## Visão Geral

O sistema agora permite que o cliente altere sua senha administrativa através do painel, com a senha sendo armazenada de forma segura no banco de dados MongoDB.

## Funcionalidades

### 1. Login com Senha do Banco
- A senha não é mais hardcoded no código
- A verificação é feita através da API `/api/admin/password`
- Suporte a loading states e mensagens de erro
- **Botão para mostrar/ocultar senha** durante o login

### 2. Alteração de Senha
- Interface no painel administrativo para alterar a senha
- Validação de senha atual
- Confirmação de nova senha
- Validação de mínimo 6 caracteres
- Feedback visual de sucesso/erro
- **Botões para mostrar/ocultar cada campo de senha** individualmente

### 3. Logout Seguro
- Botão de logout no painel
- Limpeza automática do cookie de autenticação
- Redirecionamento para página de login

### 4. Visualização de Senha
- **Ícone de olho** para mostrar/ocultar senha
- Funciona em todos os campos de senha:
  - Campo de login
  - Campo de senha atual
  - Campo de nova senha
  - Campo de confirmação de senha
- Interface intuitiva com ícones SVG
- Posicionamento consistente em todos os campos

## Configuração Inicial

### 1. Inicializar Senha Padrão
Para configurar a senha padrão no banco de dados, acesse:
```
POST /api/admin/password/seed
```

Isso criará um documento de configurações com a senha padrão `admin123`.

### 2. Primeiro Acesso
1. Acesse `/admin/login`
2. Use a senha padrão: `admin123`
3. Acesse o painel administrativo
4. Vá em "Configurações" > "Alterar Senha Administrativa"
5. Defina sua nova senha

## Estrutura do Banco de Dados

O documento `Settings` no MongoDB agora inclui:

```javascript
{
  // ... outras configurações
  adminPassword: String, // Senha administrativa
  lastUpdated: Date      // Data da última atualização
}
```

## APIs Criadas

### `/api/admin/password`
- **POST**: Verificar senha para login
- **PUT**: Alterar senha (requer senha atual)

### `/api/admin/password/seed`
- **POST**: Inicializar configurações com senha padrão

### `/admin/logout`
- Limpa cookie de autenticação e redireciona para login

## Segurança

- Senha mínima de 6 caracteres
- Validação de senha atual antes de alterar
- Confirmação de nova senha
- Cookie de autenticação com expiração de 1 dia
- Middleware protege todas as rotas administrativas

## Como Usar

1. **Primeira vez**: Execute o seed para criar a senha padrão
2. **Login**: Use a senha padrão ou a senha que você definiu
3. **Alterar senha**: Acesse o painel > Configurações > Alterar Senha
4. **Logout**: Use o botão "Sair" no painel

## Visualizar Senha

### Durante o Login
- Clique no **ícone de olho** no campo de senha
- A senha será exibida como texto
- Clique novamente para ocultar

### Durante a Alteração de Senha
- Cada campo de senha tem seu próprio botão de visualização
- **Senha Atual**: Clique no ícone para ver a senha atual
- **Nova Senha**: Clique no ícone para ver a nova senha sendo digitada
- **Confirmar Senha**: Clique no ícone para ver a confirmação
- Todos os campos funcionam independentemente

### Ícones Utilizados
- 👁️ **Olho aberto**: Senha visível (clique para ocultar)
- 🚫 **Olho riscado**: Senha oculta (clique para mostrar)

## Notas Importantes

- A senha padrão é `admin123` - **ALTERE-A IMEDIATAMENTE** após o primeiro acesso
- A senha é armazenada em texto plano no banco (para produção, considere usar hash)
- O sistema mantém compatibilidade com as configurações existentes
- Todas as validações são feitas tanto no frontend quanto no backend 