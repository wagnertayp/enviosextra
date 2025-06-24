// Servidor estático exclusivo para servir o frontend
import express from 'express';
import path from 'path';
import compression from 'compression';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Compatibilidade para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Compressão para melhorar performance
app.use(compression());

// Logs para depuração
console.log(`Static server starting...`);
console.log(`Current directory: ${process.cwd()}`);

const staticPath = path.join(process.cwd(), 'dist', 'public');
console.log(`Using static path: ${staticPath}`);

// Verificar se o diretório existe
if (fs.existsSync(staticPath)) {
  console.log(`Static directory exists!`);
  const files = fs.readdirSync(staticPath);
  console.log(`Files in static directory: ${files.join(', ')}`);
  
  const assetsPath = path.join(staticPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    console.log(`Assets directory exists!`);
    const assetFiles = fs.readdirSync(assetsPath);
    console.log(`Files in assets directory: ${assetFiles.join(', ')}`);
  } else {
    console.log(`Assets directory does NOT exist!`);
  }
} else {
  console.error(`Static directory does NOT exist!`);
}

// Middleware para CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Monitoramento de requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Configurações para arquivos estáticos
const staticOptions = {
  maxAge: '30d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (path.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
};

// Middleware para interceptar requisições absolutas para /assets e redirecionar para caminho relativo
app.use('/assets', (req, res, next) => {
  console.log(`Asset request with absolute path: ${req.method} ${req.path}`);
  res.redirect(`assets${req.path}`);
});

// Servir arquivos estáticos para assets com caminho relativo (alta prioridade)
app.use('/assets', express.static(path.join(staticPath, 'assets'), {
  maxAge: '1y',
  etag: true
}));

app.use('assets', express.static(path.join(staticPath, 'assets'), {
  maxAge: '1y',
  etag: true
}));

// Servir outros arquivos estáticos
app.use(express.static(staticPath, staticOptions));

// Adicionar um middleware para monitorar todas as requisições de assets
app.use((req, res, next) => {
  if (req.path.includes('/assets/') || req.path.includes('assets/')) {
    console.log(`Asset request: ${req.method} ${req.path}`);
    
    // Se for uma requisição com caminho absoluto, tentar redirecionar para caminho relativo
    if (req.path.startsWith('/assets/')) {
      console.log(`Redirecting ${req.path} to relative path: assets/${req.path.substring(8)}`);
      return res.redirect(`assets/${req.path.substring(8)}`);
    }
  }
  next();
});

// Rota específica para index.html
app.get('/', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`Serving index.html from ${indexPath}`);
    
    // Ler o arquivo e injetar CSS inline (apenas como fallback)
    try {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      console.log('Successfully read index.html content');
      
      // Injetar meta tag para debug
      const modifiedContent = indexContent.replace('</head>', 
        '<!-- Modified for Heroku by static-server.js -->\n' +
        '<meta name="heroku-deploy" content="true">\n' +
        '</head>'
      );
      
      res.setHeader('Content-Type', 'text/html');
      res.send(modifiedContent);
    } catch (err) {
      console.error(`Error reading index.html: ${err.message}`);
      res.sendFile(indexPath);
    }
  } else {
    console.error(`index.html not found at ${indexPath}`);
    res.status(404).send('index.html not found');
  }
});

// Para qualquer outra rota, serve o index.html (SPA)
app.get('*', (req, res) => {
  if (!req.url.includes('.')) {  // apenas para rotas que não são arquivos
    res.sendFile(path.join(staticPath, 'index.html'));
  } else {
    res.status(404).send('File not found');
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Static server running on port ${PORT}`);
});