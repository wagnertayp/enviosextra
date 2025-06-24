// Servidor Vite em modo desenvolvimento para o Heroku
// Versão standalone que não depende de importações TypeScript
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
app.use(cors());
app.use(compression());
app.use(express.json());

// Verificar se estamos em produção
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Ambiente: ${isProduction ? 'produção' : 'desenvolvimento'}`);

// Mock data para exemplo (para não depender do schema.ts)
const mockRegions = [
  { name: "São Paulo", abbr: "SP", vacancies: 26 },
  { name: "Rio de Janeiro", abbr: "RJ", vacancies: 18 },
  { name: "Minas Gerais", abbr: "MG", vacancies: 14 },
  { name: "Bahia", abbr: "BA", vacancies: 10 },
  { name: "Paraná", abbr: "PR", vacancies: 8 }
];

async function startServer() {
  try {
    // Adicionar configurações específicas para o Heroku
    console.log("Configurando servidor para ambiente Heroku...");
    
    // Criar servidor Vite
    console.log("Iniciando servidor Vite...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: {
          // Desabilitar HMR em produção
          disable: isProduction
        },
        // Permitir TODOS os hosts - crucial para domínios personalizados
        host: '0.0.0.0',
        cors: true
      },
      appType: 'spa',
      logLevel: 'info',
      optimizeDeps: {
        include: ['react', 'react-dom', 'wouter']
      },
      // Esta é a parte crucial - permitir qualquer host em produção
      allowedHosts: 'all'
    });
    
    // Usar middleware Vite
    app.use(vite.middlewares);
    
    // Configuração de rotas básicas da API
    console.log("Configurando rotas da API...");
    
    // Rota de saúde para verificar status do servidor
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: PORT
      });
    });
    
    // Rota de exemplo para regiões
    app.get('/api/regions', (req, res) => {
      // Usar dados mock diretamente
      res.json(mockRegions);
    });
    
    // Rotas específicas para payments (simulando existentes)
    app.post('/api/payments/create-pix', (req, res) => {
      const { name, cpf, email, amount } = req.body;
      
      if (!name || !cpf || !amount) {
        return res.status(400).json({ error: 'Dados incompletos' });
      }
      
      // Gerar QR code fictício para propósitos de teste
      const pixData = {
        id: `pix_${Date.now()}`,
        pixCode: `00020126580014BR.GOV.BCB.PIX0136${cpf}5204000053039865802BR5913Shopee${name}6009SAO PAULO62070503***6304${Math.floor(Math.random() * 10000)}`,
        pixQrCode: `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(`pixcode-for-${cpf}`)}`,
        status: 'pending'
      };
      
      res.json(pixData);
    });
    
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
      console.log(`Servidor Vite standalone rodando na porta ${PORT}`);
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