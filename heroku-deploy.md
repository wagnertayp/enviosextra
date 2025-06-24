# Deploy no Heroku - Mercado Libre Delivery Partners

## Configuração Completa para Deploy

### 1. Arquivos de Configuração

Todos os arquivos necessários já estão configurados:

- `Procfile`: Define o comando de inicialização (`web: npm start`)
- `app.json`: Configuração completa do app com PostgreSQL
- `.nvmrc`: Especifica Node.js 20 para detecção correta
- `.gitignore`: Exclusão de arquivos Python e desnecessários
- `package.json`: Scripts otimizados para produção Node.js

### 2. Processo de Deploy

#### Via Heroku CLI:
```bash
# 1. Login no Heroku
heroku login

# 2. Criar app (substitua por nome único)
heroku create mercado-libre-delivery-partners

# 3. Adicionar PostgreSQL
heroku addons:create heroku-postgresql:essential-0

# 4. Configurar variáveis de ambiente (opcionais)
heroku config:set NODE_ENV=production
heroku config:set FOR4PAYMENTS_SECRET_KEY=sua_chave_aqui
heroku config:set VEHICLE_API_KEY=sua_chave_aqui
heroku config:set SENDGRID_API_KEY=sua_chave_aqui

# 5. Deploy
git add .
git commit -m "Deploy inicial"
git push heroku main
```

#### Via Heroku Button:
Use o botão "Deploy to Heroku" com o arquivo `app.json` configurado.

### 3. Recursos Configurados

- **PostgreSQL**: Banco de dados Neon integrado
- **Node.js 20**: Runtime especificado via .nvmrc
- **Build automático**: Vite + ESBuild configurados
- **Migração automática**: `npm run db:push` no post-deploy
- **Variáveis opcionais**: APIs funcionam com dados demo se não configuradas
- **Arquivos Python removidos**: Evita conflito de detecção de linguagem

### 4. URLs do App

Após o deploy, o app estará disponível em:
- `https://[nome-do-app].herokuapp.com`

### 5. Verificação

Para verificar se está funcionando:
```bash
heroku logs --tail
heroku ps:scale web=1
```

### 6. Domínios e SSL

O Heroku fornece automaticamente:
- SSL/TLS certificado
- Domínio `.herokuapp.com`
- Possibilidade de domínio customizado

## Características do Deploy

✅ **Servidor unificado**: Frontend e backend em um único dyno
✅ **Build otimizado**: Vite para frontend, ESBuild para backend  
✅ **PostgreSQL configurado**: Banco Neon integrado
✅ **Variáveis opcionais**: App funciona mesmo sem APIs externas
✅ **CORS configurado**: Permite acesso de múltiplas origens
✅ **Compressão ativada**: Gzip para melhor performance
✅ **Logs estruturados**: Sistema de logging completo
✅ **Node.js detectado**: Arquivos Python removidos, .nvmrc configurado
✅ **Heroku-22 stack**: Stack atualizada para melhor compatibilidade

## Problemas Resolvidos

❌ **runtime.txt removido**: Causava conflito de detecção Python/Node.js
❌ **Arquivos .py movidos**: Evita detecção incorreta como app Python
✅ **.nvmrc adicionado**: Garante detecção correta do Node.js 20
✅ **Stack atualizada**: heroku-22 para melhor suporte

O projeto está 100% pronto para deploy no Heroku com detecção correta do Node.js.