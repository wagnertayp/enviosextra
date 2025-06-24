import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import compression from 'compression';
import cors from 'cors';

// Obter o diretório atual em contexto de ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const PORT = process.env.PORT || 5000; // Usar porta 5000 como padrão para compatibilidade com o Replit
const STATIC_DIR = path.join(__dirname, 'dist', 'public');

// Verificar se estamos no Heroku
const isHeroku = process.env.DYNO ? true : false;
if (isHeroku) {
  console.log('Detectado ambiente Heroku - usando variável PORT do Heroku:', process.env.PORT);
} else {
  console.log('Ambiente de desenvolvimento - usando porta 5000');
}

// Inicializar o Express
const app = express();

// Middlewares essenciais
app.use(cors());
app.use(compression());
app.use(express.json());

// Verificar se o diretório de arquivos estáticos existe
if (!fs.existsSync(STATIC_DIR)) {
  console.log(`Static directory does not exist at ${STATIC_DIR}, creating it...`);
  try {
    fs.mkdirSync(STATIC_DIR, { recursive: true });
    console.log(`Created static directory at ${STATIC_DIR}`);
    
    // Também criar o diretório de assets para evitar erros
    const assetsDir = path.join(STATIC_DIR, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log(`Created assets directory at ${assetsDir}`);
    
    // Criar um arquivo index.html básico de fallback
    const fallbackHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shopee Delivery Partners</title>
  <style>
    body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
    h1 { color: #ee4d2d; }
    p { margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Shopee Delivery Partners</h1>
  <p>Este é um arquivo de fallback. Se você está vendo esta mensagem, o build não foi gerado corretamente.</p>
  <p>Por favor, execute "npm run build" antes de fazer o deploy.</p>
</body>
</html>`;
    fs.writeFileSync(path.join(STATIC_DIR, 'index.html'), fallbackHtml);
    console.log('Created fallback index.html');
  } catch (err) {
    console.error(`Error creating static directory: ${err.message}`);
  }
}

// Verificar o conteúdo do diretório estático
console.log('Checking static directory content...');
if (fs.existsSync(STATIC_DIR)) {
  console.log('Static directory exists!');
  
  // Listar arquivos no diretório estático
  const files = fs.readdirSync(STATIC_DIR);
  console.log(`Files in static directory: ${files.join(', ')}`);
  
  // Verificar subdiretório de assets
  const assetsDir = path.join(STATIC_DIR, 'assets');
  if (fs.existsSync(assetsDir)) {
    console.log('Assets directory exists!');
    const assetFiles = fs.readdirSync(assetsDir);
    console.log(`Files in assets directory: ${assetFiles.join(', ')}`);
  } else {
    console.log('Assets directory does not exist!');
    // Criar o diretório de assets
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log(`Created assets directory at ${assetsDir}`);
  }
} else {
  console.log(`Error: Static directory still does not exist at ${STATIC_DIR} after creation attempt`);
}

// Middleware para log de requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Servir arquivos estáticos para múltiplas variações de caminhos de assets
// Esta abordagem cobre todos os possíveis caminhos que o navegador pode tentar
['/assets', '/assets/', 'assets', 'assets/', './assets', './assets/'].forEach(assetPath => {
  app.use(assetPath, express.static(path.join(STATIC_DIR, 'assets'), {
    maxAge: '1d',
    setHeaders: function(res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }));
  console.log(`Serving assets on path: ${assetPath}`);
});

// Para requisições diretas a arquivos CSS ou JS que não encontraram no caminho absoluto
app.use((req, res, next) => {
  // Primeiro, registrar todas as requisições para ajudar no debug
  console.log(`Request for: ${req.method} ${req.path} (${req.headers['user-agent'] || 'Unknown Agent'})`);
  
  // Se for uma requisição para um arquivo específico (não apenas uma rota)
  if (req.path.includes('.')) {
    const fileName = path.basename(req.path);
    const fileExt = path.extname(req.path).toLowerCase();
    
    // Lista de possíveis localizações para o arquivo
    const possiblePaths = [
      path.join(STATIC_DIR, req.path.startsWith('/') ? req.path.substring(1) : req.path),
      path.join(STATIC_DIR, 'assets', fileName),
      path.join(STATIC_DIR, fileName)
    ];
    
    // Tentar encontrar o arquivo em qualquer uma das localizações
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log(`Found file at: ${filePath}, serving directly`);
        
        // Adicionar cabeçalhos de cache apropriados com base no tipo de arquivo
        if (['.js', '.css'].includes(fileExt)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(fileExt)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
        
        return res.sendFile(filePath);
      }
    }
    
    // Apenas para arquivos js/css, fazemos uma pesquisa mais ampla se não encontrar o arquivo exato
    if (['.js', '.css'].includes(fileExt)) {
      const assetsDir = path.join(STATIC_DIR, 'assets');
      
      if (fs.existsSync(assetsDir)) {
        const assetFiles = fs.readdirSync(assetsDir);
        
        // Procurar por qualquer arquivo com o mesmo nome base
        const baseName = path.basename(fileName, fileExt);
        const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*\\${fileExt}$`);
        
        const matchingFiles = assetFiles.filter(file => pattern.test(file));
        
        if (matchingFiles.length > 0) {
          console.log(`Found similar file: ${matchingFiles[0]}, using as fallback`);
          return res.sendFile(path.join(assetsDir, matchingFiles[0]));
        }
      }
    }
    
    // Se chegou aqui e não encontrou o arquivo, registrar isso
    console.log(`File not found in any location: ${req.path}`);
  }
  
  next();
});

// Servir arquivos estáticos do diretório principal
app.use(express.static(STATIC_DIR, {
  index: false // Desabilitar o comportamento padrão de index.html
}));

// Rota específica para index.html
app.get('/', (req, res) => {
  const indexPath = path.join(STATIC_DIR, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error(`index.html not found at path: ${indexPath}`);
    return res.status(404).send('index.html not found');
  }
  
  // Ler e modificar o index.html para usar caminhos relativos
  try {
    console.log(`Reading index.html from ${indexPath}`);
    let html = fs.readFileSync(indexPath, 'utf8');
    console.log(`Successfully read index.html, length: ${html.length} bytes`);
    
    // Fazer um backup do HTML original para debug
    const debugDirPath = path.join(__dirname, 'debug');
    if (!fs.existsSync(debugDirPath)) {
      fs.mkdirSync(debugDirPath, { recursive: true });
    }
    fs.writeFileSync(path.join(debugDirPath, 'original.html'), html);
    
    // Extrair e logar referências de assets no HTML original
    const scriptMatches = html.match(/<script[^>]*src="([^"]+)"[^>]*>/g) || [];
    const cssMatches = html.match(/<link[^>]*href="([^"]+)"[^>]*>/g) || [];
    
    console.log('Scripts found in HTML:');
    scriptMatches.forEach(match => {
      const src = match.match(/src="([^"]+)"/);
      if (src && src[1]) console.log(`- ${src[1]}`);
    });
    
    console.log('CSS links found in HTML:');
    cssMatches.forEach(match => {
      const href = match.match(/href="([^"]+)"/);
      if (href && href[1]) console.log(`- ${href[1]}`);
    });
    
    // Substituir caminhos absolutos por relativos e fazer outras modificações importantes no HTML
    const originalHtml = html;
    
    // Converter paths absolutos para relativos (múltiplas variações para garantir compatibilidade)
    html = html.replace(/src="\/assets\//g, 'src="assets/');
    html = html.replace(/href="\/assets\//g, 'href="assets/');
    
    // Extrair e modificar todas as tags de script e link diretamente
    const scriptTags = [];
    html = html.replace(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/g, function(match, src) {
      // Identificar se é um asset que precisamos modificar
      if (src.includes('/assets/')) {
        const newSrc = src.replace('/assets/', 'assets/');
        scriptTags.push({original: src, modified: newSrc});
        return `<script src="${newSrc}" type="module" crossorigin></script>`;
      }
      return match;
    });
    
    const cssLinks = [];
    html = html.replace(/<link[^>]*href=["']([^"']+)["'][^>]*>/g, function(match, href) {
      // Somente modificar links para assets CSS, não externos
      if (href.includes('/assets/') && match.includes('stylesheet')) {
        const newHref = href.replace('/assets/', 'assets/');
        cssLinks.push({original: href, modified: newHref});
        return match.replace(href, newHref);
      }
      return match;
    });
    
    // Logar mudanças
    if (scriptTags.length > 0) {
      console.log('Script tags modified:');
      scriptTags.forEach(tag => console.log(`  ${tag.original} -> ${tag.modified}`));
    }
    
    if (cssLinks.length > 0) {
      console.log('CSS links modified:');
      cssLinks.forEach(link => console.log(`  ${link.original} -> ${link.modified}`));
    }
    
    if (html !== originalHtml) {
      console.log('HTML was modified successfully');
    } else {
      console.log('Warning: No paths were modified in the HTML');
    }
    
    // Adicionar meta tag de debug, informações sobre porta e remover base tag
    html = html.replace('</head>', 
      '<!-- Heroku optimized version -->\n' +
      '<meta name="heroku-version" content="1.1">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">\n' +
      `<meta name="server-port" content="${PORT}">\n` +
      `<meta name="is-heroku" content="${isHeroku}">\n` +
      '</head>'
    );
    
    // Remover a tag base se existir
    const originalWithBase = html;
    html = html.replace(/<base[^>]*>/, '');
    
    if (html !== originalWithBase) {
      console.log('Base tag was removed');
    }
    
    // Criar versão inline de CSS para garantir estilo básico mesmo sem assets carregados
    const inlineCSS = `
      <style>
        /* Estilos básicos de fallback */
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .notice { background: #f8f9fa; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .loading { font-size: 20px; text-align: center; margin-top: 50px; }
      </style>
    `;
    
    html = html.replace('</head>', inlineCSS + '</head>');
    
    // Adicionar script para detectar e corrigir falhas de carregamento + diagnóstico
    const bodyScript = `
      <div id="loading-status" class="loading">Carregando conteúdo...</div>
      
      <script>
        // Status element para feedback visual
        const statusEl = document.getElementById('loading-status');
        const rootEl = document.getElementById('root');
        
        // Ocultar o root inicialmente
        if (rootEl) rootEl.style.display = 'none';
        
        // Log para diagnóstico
        console.log('Heroku optimized loader running');
        
        // Contador de recursos
        let totalResources = 0;
        let loadedResources = 0;
        let failedResources = 0;
        
        // Monitorar todos os scripts e CSS na página
        document.querySelectorAll('script[src], link[rel="stylesheet"]').forEach(el => {
          const src = el.src || el.href;
          if (src) {
            totalResources++;
            console.log('Resource to monitor:', src);
          }
        });
        
        statusEl.textContent = 'Carregando recursos (' + loadedResources + '/' + totalResources + ')';
        
        // Injetar assets diretamente para contornar problemas de carregamento
        function injectScript(url) {
          return new Promise((resolve, reject) => {
            // Primeiro tenta carregar o script normalmente
            const script = document.createElement('script');
            script.type = 'module';
            script.crossOrigin = true;
            script.src = url;
            script.onload = () => {
              console.log('Successfully loaded script: ' + url);
              loadedResources++;
              resolve();
            };
            script.onerror = () => {
              console.error('Failed to load script: ' + url);
              // Se falhar, tenta alternativas
              fetch(url)
                .then(response => {
                  if (!response.ok) {
                    // Tentar variações de caminhos
                    const variations = [
                      url.replace('/assets/', 'assets/'),
                      url.replace('/assets/', './assets/'),
                      'assets/' + url.split('/').pop(),
                      './assets/' + url.split('/').pop()
                    ];
                    
                    return Promise.all(variations.map(v => 
                      fetch(v).then(r => r.ok ? {url: v, ok: true} : {url: v, ok: false})
                    )).then(results => {
                      const success = results.find(r => r.ok);
                      if (success) {
                        console.log('Found working alternative: ' + success.url);
                        return fetch(success.url);
                      } else {
                        throw new Error('All variations failed');
                      }
                    });
                  }
                  return response;
                })
                .then(response => response.text())
                .then(code => {
                  console.log('Injecting script content directly');
                  const inlineScript = document.createElement('script');
                  inlineScript.type = 'module';
                  inlineScript.textContent = code;
                  document.head.appendChild(inlineScript);
                  loadedResources++;
                  resolve();
                })
                .catch(err => {
                  console.error('Could not fetch script: ' + err.message);
                  failedResources++;
                  resolve(); // resolve anyway to continue
                });
            };
            document.head.appendChild(script);
          });
        }
        
        // Monitorar falhas de carregamento
        window.addEventListener('error', function(e) {
          if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
            failedResources++;
            const src = e.target.src || e.target.href;
            console.error('Resource failed to load:', src);
            
            statusEl.textContent = 'Erro ao carregar recurso. Tentando alternativa...';
            
            // Tentar caminhos alternativos
            if (src) {
              // Se for um script JS, usar nossa função especial de injeção
              if (src.endsWith('.js') && e.target.tagName === 'SCRIPT') {
                // Remover o script que falhou
                e.target.remove();
                // Injetar com nosso método mais robusto
                injectScript(src).then(function() {
                  console.log('Script recovery attempt complete for ' + src);
                });
                return;
              }
              
              // Para outros recursos, tentar as alternativas comuns
              let newSrc = src;
              
              if (src.startsWith('/assets/')) {
                newSrc = src.replace('/assets/', './assets/');
              } else if (src.includes('/assets/')) {
                newSrc = src.replace('/assets/', 'assets/');
              } else if (src.startsWith('/')) {
                newSrc = '.' + src;
              }
              
              if (newSrc !== src) {
                console.log('Trying alternative path:', newSrc);
                if (e.target.tagName === 'SCRIPT') {
                  e.target.src = newSrc;
                } else {
                  e.target.href = newSrc;
                }
              }
            }
          }
        }, true);
        
        // Detectar quando recursos carregam
        function resourceLoaded() {
          loadedResources++;
          statusEl.textContent = 'Carregando recursos (' + loadedResources + '/' + totalResources + ')';
          
          if (loadedResources >= totalResources - failedResources) {
            console.log('All resources loaded or handled');
            
            // Remover o status e mostrar o conteúdo
            setTimeout(function() {
              if (rootEl) rootEl.style.display = '';
              statusEl.style.display = 'none';
            }, 500);
          }
        }
        
        // Monitorar carregamento de recursos
        document.querySelectorAll('script[src]').forEach(function(script) {
          script.onload = resourceLoaded;
          script.onerror = function() {
            console.error('Script failed to load:', script.src);
          };
        });
        
        document.querySelectorAll('link[rel="stylesheet"]').forEach(function(link) {
          link.onload = resourceLoaded;
          link.onerror = function() {
            console.error('Stylesheet failed to load:', link.href);
          };
        });
        
        // Fallback para casos onde não conseguimos detectar o carregamento
        setTimeout(function() {
          console.log('Timeout fallback triggered');
          if (rootEl) rootEl.style.display = '';
          statusEl.style.display = 'none';
        }, 5000);
      </script>
    </body>`;
    
    html = html.replace('</body>', bodyScript);
    
    // Salvar versão modificada para debug
    fs.writeFileSync(path.join(debugDirPath, 'modified.html'), html);
    
    // Enviar HTML modificado
    console.log('Sending modified HTML to client');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error(`Error processing index.html: ${err.message}`);
    console.error(err.stack);
    // Fallback para o arquivo original em caso de erro
    res.sendFile(indexPath);
  }
});

// SPA fallback - serve index.html para todas as rotas não-arquivo
app.get('*', (req, res) => {
  // Se a URL não parece ser um arquivo
  if (!req.path.includes('.')) {
    res.redirect('/');
  } else {
    res.status(404).send('Not found');
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});