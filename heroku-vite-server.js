// Servidor Vite em modo desenvolvimento para o Heroku
// Este servidor funciona da mesma forma que o preview da Replit
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import compression from 'compression';
import cors from 'cors';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/pg-core';
import * as schema from './shared/schema.js';

// Configuração
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;

// Inicializar Express
const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());

// Configurar banco de dados (se tiver DATABASE_URL)
let pool;
let db;

if (process.env.DATABASE_URL) {
  console.log("Conectando ao banco de dados PostgreSQL...");
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log("Conexão ao banco de dados estabelecida");
  } catch (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
  }
}

async function startServer() {
  try {
    // Adicionar configurações específicas para o Heroku
    console.log("Configurando para ambiente Heroku...");
    
    // Criar servidor Vite
    console.log("Iniciando servidor Vite...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: {
          // Desabilitar HMR em produção
          disable: process.env.NODE_ENV === 'production'
        }
      },
      appType: 'spa',
      logLevel: 'info',
      // Configurações adicionais para o funcionamento no Heroku
      optimizeDeps: {
        // Forçar inclusão de dependências
        include: ['react', 'react-dom', 'wouter']
      }
    });
    
    // Usar middleware Vite
    app.use(vite.middlewares);
    
    // Carregar rotas do servidor
    console.log("Carregando rotas da API...");
    
    // Rota de healthcheck
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', env: process.env.NODE_ENV, 
                 database: !!pool ? 'connected' : 'not connected' });
    });
    
    // Exemplo de rota da API
    app.get('/api/regions', (req, res) => {
      const regions = [
        { name: "São Paulo", abbr: "SP", vacancies: 26 },
        { name: "Rio de Janeiro", abbr: "RJ", vacancies: 18 },
        { name: "Minas Gerais", abbr: "MG", vacancies: 14 },
        { name: "Bahia", abbr: "BA", vacancies: 10 },
        { name: "Paraná", abbr: "PR", vacancies: 8 }
      ];
      res.json(regions);
    });
    
    // Carregar rotas da API completa se possível
    try {
      import('./server/routes.js').then(routes => {
        if (typeof routes.registerRoutes === 'function') {
          console.log("Carregando rotas da API do arquivo routes.js");
          routes.registerRoutes(app);
        }
      }).catch(err => {
        console.error("Erro ao carregar rotas da API:", err);
      });
    } catch (err) {
      console.error("Não foi possível importar as rotas da API:", err);
    }
    
    // Fallback para o SPA - serve todos os requests não-api para o frontend
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      
      // Pular arquivos estáticos e rotas da API
      if (url.includes('.') || url.startsWith('/api/')) {
        return next();
      }
      
      try {
        // Servir index.html
        console.log(`Servindo SPA para URL: ${url}`);
        let indexHtml;
        
        try {
          indexHtml = fs.readFileSync(path.resolve(__dirname, 'client/index.html'), 'utf-8');
        } catch (e) {
          console.error("Erro ao ler index.html:", e);
          return res.status(500).send("Erro ao carregar o aplicativo");
        }
        
        // Transformar com Vite
        const template = await vite.transformIndexHtml(url, indexHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        console.error(`Erro ao processar a requisição ${url}:`, e);
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
    
    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor Vite rodando na porta ${PORT} (modo desenvolvimento)`);
      console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`URL de acesso: http://0.0.0.0:${PORT}`);
      console.log(`Diretório base: ${__dirname}`);
    });
  } catch (e) {
    console.error("Erro fatal ao iniciar o servidor Vite:", e);
    process.exit(1);
  }
}

// Iniciar o servidor
startServer();