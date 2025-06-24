// Um servidor simplificado para Heroku que não usa template literals complexos
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import compression from 'compression';
import cors from 'cors';

// Configuração
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;
const STATIC_DIR = path.join(__dirname, 'dist', 'public');

// Inicializar Express
const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());

// Verificar diretórios
if (!fs.existsSync(STATIC_DIR)) {
  fs.mkdirSync(STATIC_DIR, { recursive: true });
  console.log(`Created ${STATIC_DIR}`);
  
  const assetsDir = path.join(STATIC_DIR, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log(`Created ${assetsDir}`);
  
  // Criar index.html de fallback
  const fallbackHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shopee Delivery Partners - Fallback</title>
  <style>
    body { font-family: Arial; margin: 0; padding: 20px; text-align: center; }
    .error { color: #ff4d4f; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Shopee Delivery Partners</h1>
  <p class="error">Este é um arquivo de fallback. Por favor, execute "npm run build" antes do deploy.</p>
</body>
</html>`;
  fs.writeFileSync(path.join(STATIC_DIR, 'index.html'), fallbackHtml);
}

// Listar arquivos
if (fs.existsSync(STATIC_DIR)) {
  const files = fs.readdirSync(STATIC_DIR);
  console.log(`Files in static dir: ${files.join(', ')}`);
  
  const assetsDir = path.join(STATIC_DIR, 'assets');
  if (fs.existsSync(assetsDir)) {
    const assetFiles = fs.readdirSync(assetsDir);
    console.log(`Files in assets dir: ${assetFiles.join(', ')}`);
  }
}

// Servir arquivos estáticos - abordagem simplificada
app.use('/assets', express.static(path.join(STATIC_DIR, 'assets')));
app.use(express.static(STATIC_DIR));

// Processar index.html
app.get('/', (req, res) => {
  const indexPath = path.join(STATIC_DIR, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('index.html not found');
  }
  
  try {
    // Ler o HTML
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Corrigir caminhos
    html = html.replace(/src="\/assets\//g, 'src="assets/');
    html = html.replace(/href="\/assets\//g, 'href="assets/');
    
    // Remover tag base
    html = html.replace(/<base [^>]*>/g, '');
    
    // Adicionar tag debug
    html = html.replace('</head>', 
      '<!-- Heroku version -->\n' +
      '<meta name="is-heroku" content="true">\n' +
      '<style>' +
      '  .loading-status { text-align: center; margin: 20px; font-size: 18px; }' +
      '  #root { opacity: 0; transition: opacity 0.5s; }' +
      '</style>\n' +
      '</head>');
    
    // Adicionar script de recuperação simples 
    html = html.replace('<div id="root"></div>', 
      '<div id="root"></div>\n' +
      '<div class="loading-status" id="loading-status">Carregando recursos...</div>\n' +
      '<script>\n' +
      '  document.addEventListener("DOMContentLoaded", function() {\n' +
      '    var root = document.getElementById("root");\n' +
      '    var status = document.getElementById("loading-status");\n' +
      '    \n' +
      '    // Verificar se os recursos carregaram\n' +
      '    setTimeout(function() {\n' +
      '      root.style.opacity = 1;\n' +
      '      status.style.display = "none";\n' +
      '    }, 2000);\n' +
      '    \n' +
      '    // Tentar corrigir scripts que falham\n' +
      '    window.addEventListener("error", function(e) {\n' +
      '      if (e.target && (e.target.tagName === "SCRIPT" || e.target.tagName === "LINK")) {\n' +
      '        var src = e.target.src || e.target.href;\n' +
      '        if (src) {\n' +
      '          if (src.startsWith("/assets/")) {\n' +
      '            var newSrc = src.replace("/assets/", "assets/");\n' +
      '            console.log("Trying path:", newSrc);\n' +
      '            if (e.target.tagName === "SCRIPT") {\n' +
      '              e.target.src = newSrc;\n' +
      '            } else {\n' +
      '              e.target.href = newSrc;\n' +
      '            }\n' +
      '          }\n' +
      '        }\n' +
      '      }\n' +
      '    }, true);\n' +
      '  });\n' +
      '</script>');
    
    // Enviar HTML modificado
    res.send(html);
  } catch (err) {
    console.error(err);
    res.sendFile(indexPath);
  }
});

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.includes('.')) {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
  } else {
    res.status(404).send('Not found');
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
});