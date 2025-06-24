import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupStaticMiddleware } from "./static-middleware";
import { setupCors } from "./cors-config";
import path from "path";
import fs from "fs";
import { storage } from "./storage";

const app = express();

// Configuração de CORS para permitir requisições cross-origin
setupCors(app);

// Configuração para utilizar UTF-8 na aplicação
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Lista de IPs que nunca devem ser banidos
const neverBanIPs = ['201.87.251.220']; // IP específico do cliente

// Middleware para verificação e bloqueio de IPs banidos (nível servidor)
// Este middleware intercepta TODAS as requisições e verifica se o IP está banido
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Ignorar requisições para endpoints de verificação de bannimento e report
    // para evitar loop infinito ou bloquear a própria verificação
    if (req.path.startsWith('/api/admin/report-desktop-access') || 
        req.path.startsWith('/api/admin/register-device') ||
        req.path.startsWith('/api/admin/check-ip-banned')) {
      return next();
    }
    
    // Pegar o IP real, mesmo atrás de proxy
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    
    // Em desenvolvimento, não bloquear
    const hostname = req.hostname || '';
    if (hostname.includes('localhost') || 
        hostname.includes('127.0.0.1') || 
        hostname.includes('replit') ||
        process.env.NODE_ENV === 'development') {
      return next();
    }
    
    // Verificar se é um IP que nunca deve ser banido
    const ipBaseWithoutProxy = ip.split(',')[0].trim();
    if (neverBanIPs.some(whitelistedIP => ipBaseWithoutProxy.includes(whitelistedIP))) {
      return next();
    }
    
    // Verificar se o IP está banido
    const bannedIp = await storage.getBannedIp(ip);
    
    // Se estiver banido, bloquear o acesso imediatamente
    if (bannedIp?.isBanned) {
      console.log(`[BLOQUEIO-IP] Servidor bloqueando acesso do IP banido: ${ip}`);
      
      // Para solicitações de API, retornar erro 403
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({
          error: 'IP_BLOCKED',
          message: 'Acesso bloqueado permanentemente'
        });
      }
      
      // Para solicitações de página web, forçar redirecionamento about:blank
      res.set('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <script>window.location.replace("about:blank");</script>
        </head>
        <body></body>
        </html>
      `);
      return;
    }
    
    // Se não estiver banido, continuar
    next();
  } catch (error) {
    console.error('[MIDDLEWARE] Erro ao verificar IP banido:', error);
    // Em caso de erro, permitir acesso
    next();
  }
});

// Se estiver em produção, adiciona middleware para corrigir caminhos de assets no Heroku
if (process.env.NODE_ENV === 'production') {
  console.log('[express] Running in production mode');
  
  setupStaticMiddleware(app);
  
  // Serve arquivos estáticos da pasta dist com configurações otimizadas
  const distPublicPath = path.join(process.cwd(), 'dist', 'public');
  console.log(`[express] Serving static files from: ${distPublicPath}`);
  
  // Serve arquivos estáticos da pasta assets diretamente, com prioridade
  const assetsPath = path.join(distPublicPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    console.log(`[express] Assets directory exists: ${assetsPath}`);
    app.use('/assets', express.static(assetsPath, {
      maxAge: '1y',
      etag: true
    }));
  }
  
  // Serve outros arquivos estáticos
  app.use(express.static(distPublicPath, {
    maxAge: '1d',
    etag: true
  }));
  
  // Adiciona rota específica para index.html
  app.get('/', (req, res) => {
    console.log('[express] Serving index.html');
    res.sendFile(path.join(distPublicPath, 'index.html'));
  });
}

// Configurar cabeçalhos para UTF-8
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Test database connection before starting server
    const { testConnection } = await import("./db");
    
    let connectionAttempts = 0;
    const maxAttempts = 3;
    let connected = false;
    
    while (!connected && connectionAttempts < maxAttempts) {
      connectionAttempts++;
      console.log(`[DB] Testing database connection (attempt ${connectionAttempts}/${maxAttempts})...`);
      
      connected = await testConnection();
      
      if (!connected && connectionAttempts < maxAttempts) {
        console.log(`[DB] Connection failed, retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!connected) {
      console.warn('[DB] Warning: Database connection failed after multiple attempts. Server will start but database operations may fail.');
    }

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Usa a porta fornecida pelo ambiente ou 5000 como fallback
    const port = Number(process.env.PORT) || 5000;
    const host = process.env.HOST || '0.0.0.0';
    
    server.listen({
      port,
      host,
      reusePort: true,
    }, () => {
      log(`serving on ${host}:${port}`);
    });
  } catch (error) {
    console.error('[SERVER] Failed to start server:', error);
    process.exit(1);
  }
})();
