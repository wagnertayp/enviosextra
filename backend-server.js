// Servidor Express.js para API apenas (sem frontend)
import express from 'express';
import cors from 'cors';
import { registerRoutes } from './server/routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware essenciais
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Configurar CORS para permitir acesso do frontend hospedado em outro domínio
app.use(cors({
  origin: ['https://sua-app-netlify.netlify.app', 'https://sua-app-vercel.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Cabeçalho Content-Type para respostas JSON
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
  });

  next();
});

// Registrar as rotas da API
(async () => {
  const server = await registerRoutes(app);

  // Middleware para tratamento de erros
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });

  // Iniciar servidor
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`API server running on port ${PORT}`);
  });
})();