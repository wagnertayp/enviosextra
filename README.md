# Mercado Libre Delivery Partners Platform

Plataforma de recrutamento para parceiros entregadores do Mercado Libre no mercado brasileiro.

## Funcionalidades

- Sistema de registro de parceiros entregadores
- Validação de documentos e veículos
- Processamento de pagamentos PIX
- Sistema de treinamento e certificação
- Pedidos de equipamentos de segurança
- Dashboard administrativo

## Tecnologias

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Banco de dados**: PostgreSQL + Drizzle ORM
- **Pagamentos**: For4Payments (PIX)
- **Deploy**: Heroku

## Deploy no Heroku

### Pré-requisitos

1. Conta no Heroku
2. Heroku CLI instalado
3. Git configurado

### Passos para deploy

1. **Clone o repositório**
```bash
git clone <repository-url>
cd mercado-libre-delivery-partners
```

2. **Configure o Heroku**
```bash
heroku create seu-app-name
heroku addons:create heroku-postgresql:essential-0
```

3. **Configure as variáveis de ambiente**
```bash
heroku config:set NODE_ENV=production
heroku config:set FOR4PAYMENTS_SECRET_KEY=sua_chave_aqui
heroku config:set VEHICLE_API_KEY=sua_chave_aqui
heroku config:set SENDGRID_API_KEY=sua_chave_aqui
```

4. **Deploy da aplicação**
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

5. **Execute as migrações do banco**
```bash
heroku run npm run db:push
```

### Variáveis de ambiente necessárias

- `DATABASE_URL` - Configurada automaticamente pelo Heroku Postgres
- `NODE_ENV` - Ambiente de execução (production)
- `FOR4PAYMENTS_SECRET_KEY` - Chave da API For4Payments (opcional)
- `VEHICLE_API_KEY` - Chave da API WDAPI2 (opcional)
- `SENDGRID_API_KEY` - Chave da API SendGrid (opcional)

### Monitoramento

- Logs: `heroku logs --tail`
- Status: `heroku ps`
- Config: `heroku config`

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Configurar banco de dados
npm run db:push

# Executar em modo desenvolvimento
npm run dev
```

## Estrutura do projeto

```
├── client/          # Frontend React
├── server/          # Backend Express
├── shared/          # Esquemas compartilhados
├── dist/           # Build de produção
└── public/         # Assets estáticos
```