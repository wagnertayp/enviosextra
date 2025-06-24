import cors from 'cors';
import { Express } from 'express';

/**
 * Configura o CORS para permitir requisições de todas as origens,
 * especialmente para o ambiente de produção no Heroku e Netlify
 */
export function setupCors(app: Express) {
  // Em produção, permitir qualquer origem para máxima compatibilidade
  if (process.env.NODE_ENV === 'production') {
    console.log('[express] Configurando CORS para produção - permitindo todas as origens');
    
    // Configuração para permitir QUALQUER origem para resolver problemas
    app.use(cors({
      origin: '*', // Permitir todas as origens
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: false, // Importante: não enviar credenciais
      preflightContinue: false,
      optionsSuccessStatus: 204,
      maxAge: 86400 // Tempo de cache para preflight: 24 horas
    }));
    
    // Middleware adicional para garantir que os headers CORS estejam presentes
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      // Lidar com preflight OPTIONS
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
      
      next();
    });
  } else {
    // Em desenvolvimento, permitir todas as origens
    console.log('[express] Configurando CORS para desenvolvimento');
    app.use(cors());
  }
}