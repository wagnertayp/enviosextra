// Servidor Vite com configuração personalizada para o Heroku
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import compression from 'compression';
import cors from 'cors';

// Configuração
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;

// Inicializar Express
const app = express();
app.use(cors({ origin: '*' }));  // Permitir qualquer origem
app.use(compression());
app.use(express.json());

// Verificar se estamos em produção
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Ambiente: ${isProduction ? 'produção' : 'desenvolvimento'}`);

// Mock data para exemplo
const mockRegions = [
  { name: "São Paulo", abbr: "SP", vacancies: 26 },
  { name: "Rio de Janeiro", abbr: "RJ", vacancies: 18 },
  { name: "Minas Gerais", abbr: "MG", vacancies: 14 },
  { name: "Bahia", abbr: "BA", vacancies: 10 },
  { name: "Paraná", abbr: "PR", vacancies: 8 }
];

// Adicionar cabeçalhos CORS em todas as respostas
app.use((req, res, next) => {
  // Permitir qualquer origem
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Registrar a requisição para debug
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Host: ${req.headers.host || 'desconhecido'}`);
  
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    return res.status(200).json({});
  }
  
  next();
});

async function startServer() {
  try {
    // Configuração de Vite
    console.log("Carregando configuração personalizada do Vite...");
    const configFile = path.resolve(__dirname, 'vite.heroku.config.js');
    
    if (!fs.existsSync(configFile)) {
      console.error(`Arquivo de configuração não encontrado: ${configFile}`);
      process.exit(1);
    }
    
    console.log("Iniciando servidor Vite com configuração personalizada...");
    const vite = await createViteServer({
      configFile,
      mode: 'development',
      server: {
        middlewareMode: true,
        cors: true,
        hmr: {
          clientPort: PORT
        },
        watch: {
          usePolling: true,
          interval: 1000
        }
      }
    });
    
    // Usar middleware Vite
    app.use(vite.middlewares);
    
    // Rotas da API
    console.log("Configurando rotas da API...");
    
    // Rota de diagnóstico
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        hostname: req.headers.host || 'unknown'
      });
    });
    
    // Checar requisição
    app.get('/check-request', (req, res) => {
      res.json({
        headers: req.headers,
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        path: req.path,
        hostname: req.hostname,
        ip: req.ip,
        protocol: req.protocol
      });
    });
    
    // Rota para regiões
    app.get('/api/regions', (req, res) => {
      res.json(mockRegions);
    });
    
    // Adicionar logger para todas as requisições
    app.use((req, res, next) => {
      console.log(`Requisição recebida: ${req.method} ${req.url} | Host: ${req.headers.host}`);
      next();
    });
    
    // Fallback para o SPA - serve todos os requests não-api para o frontend
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      
      // Registrar todas as requisições
      console.log(`Servindo SPA para: ${url} | Host: ${req.headers.host}`);
      
      // Servir index.html
      try {
        const indexPath = path.resolve(__dirname, 'client/index.html');
        
        if (!fs.existsSync(indexPath)) {
          console.error(`Index.html não encontrado em: ${indexPath}`);
          return res.status(500).send("Arquivo index.html não encontrado");
        }
        
        let indexHtml = fs.readFileSync(indexPath, 'utf-8');
        
        // Adicionar tag para solucionar problema de host
        indexHtml = indexHtml.replace('</head>', `
          <script>
            window.addEventListener('error', function(e) {
              console.error('Erro capturado:', e.message);
              if (e.message && e.message.includes('Blocked request')) {
                console.log('Tentando recarregar sem restrições de host...');
                // Esperar um pouco e recarregar
                setTimeout(function() {
                  window.location.reload();
                }, 1000);
              }
            });
          </script>
        </head>`);
        
        // Aplicar transformações do Vite
        const template = await vite.transformIndexHtml(url, indexHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        console.error(`Erro ao processar a requisição ${url}:`, e);
        
        // Isso ajuda com debug no desenvolvimento
        if (!isProduction) {
          vite.ssrFixStacktrace(e);
        }
        
        // Responder com uma página de erro básica
        res.status(500).send(`
          <html>
            <body>
              <h1>Erro ao carregar a aplicação</h1>
              <p>Houve um problema ao processar sua requisição. Detalhes:</p>
              <pre>${e.message}</pre>
              <button onclick="window.location.reload()">Tentar novamente</button>
            </body>
          </html>
        `);
      }
    });
    
    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Configuração do Vite: ${configFile}`);
      console.log(`URL de acesso: http://0.0.0.0:${PORT}`);
      console.log(`Diretório base: ${__dirname}`);
      
      // Listar hosts permitidos
      console.log(`Hosts permitidos pelo Vite: all (qualquer host)`);
    });
  } catch (e) {
    console.error("Erro fatal ao iniciar o servidor:", e);
    process.exit(1);
  }
}

// Iniciar o servidor
startServer();