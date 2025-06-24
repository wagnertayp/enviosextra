import express, { type Express } from "express";
import path from "path";
import fs from "fs";

/**
 * Configura middleware para melhorar a entrega de arquivos estáticos no Heroku
 */
export function setupStaticMiddleware(app: Express) {
  const distPublicPath = path.join(process.cwd(), 'dist', 'public');
  const assetsPath = path.join(distPublicPath, 'assets');

  // Log para depuração
  console.log(`[static-middleware] Serving static files from: ${distPublicPath}`);
  console.log(`[static-middleware] Assets path: ${assetsPath}`);
  
  if (fs.existsSync(distPublicPath)) {
    console.log('[static-middleware] dist/public directory exists');
    if (fs.existsSync(assetsPath)) {
      console.log('[static-middleware] assets directory exists');
      const files = fs.readdirSync(assetsPath);
      console.log(`[static-middleware] Files in assets directory: ${JSON.stringify(files)}`);
    }
  }

  // Adiciona cabeçalhos CORS para permitir acesso aos assets
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // Redireciona caminhos absolutos para relativos para assets
    if (req.url.startsWith('/assets/')) {
      // Registrar todas as tentativas de acesso a assets
      console.log(`[static-middleware] Asset request: ${req.url}`);
      
      const assetPath = path.join(assetsPath, req.url.substring(8));
      if (fs.existsSync(assetPath)) {
        console.log(`[static-middleware] Asset exists: ${assetPath}`);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
    }
    
    next();
  });
  
  // Serve arquivos estáticos da pasta assets diretamente
  app.use('/assets', express.static(assetsPath, {
    maxAge: '1y',
    etag: true
  }));
}