// Servidor especializado para ambiente Heroku que executa um build completo antes de servir
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import compression from 'compression';
import cors from 'cors';

// Configuração
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;
const STATIC_DIR = path.join(__dirname, 'dist', 'public');
const BUILD_COMPLETE_MARKER = path.join(__dirname, '.build-complete');

// Inicializar Express
const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());

// Verificar se já buildou nesta sessão
const needsBuild = !fs.existsSync(BUILD_COMPLETE_MARKER);

// Função para executar build
function runBuild() {
  return new Promise((resolve, reject) => {
    console.log('Iniciando build do projeto...');
    
    // Criar o marker file para evitar builds repetidos
    fs.writeFileSync(BUILD_COMPLETE_MARKER, new Date().toISOString());
    
    // Executar o comando de build
    exec('npm run build', (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro no build: ${error.message}`);
        console.error(stderr);
        reject(error);
        return;
      }
      
      console.log(`Saída do build: ${stdout}`);
      console.log('Build concluído com sucesso');
      resolve();
    });
  });
}

// Servir arquivos estáticos
function setupServer() {
  // Middleware para diagnosticar URLs que chegam
  app.use((req, res, next) => {
    console.log(`URL requisitada: ${req.url}`);
    next();
  });
  
  // Servir arquivos estáticos - abordagem confiável com prefixo explícito
  app.use('/assets', express.static(path.join(STATIC_DIR, 'assets')));
  
  // Servir outros arquivos estáticos (como favicon, robots.txt)
  app.use(express.static(STATIC_DIR));
  
  // Processar index.html
  app.get('/', (req, res) => {
    const indexPath = path.join(STATIC_DIR, 'index.html');
    
    if (!fs.existsSync(indexPath)) {
      return res.status(404).send('index.html não encontrado. O build foi executado?');
    }
    
    try {
      // Ler o HTML
      let html = fs.readFileSync(indexPath, 'utf8');
      
      // Corrigir caminhos de assets
      html = html.replace(/src="\/assets\//g, 'src="assets/');
      html = html.replace(/href="\/assets\//g, 'href="assets/');
      
      // Remover tag base que pode interferir
      html = html.replace(/<base [^>]*>/g, '');
      
      // Adicionar script para monitorar recursos
      html = html.replace('</body>', `
        <div id="loading-indicator" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
             background: rgba(255,255,255,0.9); padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
             display: flex; flex-direction: column; align-items: center; z-index: 9999;">
          <div style="margin-bottom: 10px;">Carregando recursos...</div>
          <div style="width: 50px; height: 50px; border: 5px solid #eee; border-top: 5px solid #f60; border-radius: 50%; 
               animation: spin 1s linear infinite;"></div>
        </div>
        
        <style>
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          #root { opacity: 0; transition: opacity 0.5s; }
        </style>
        
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            var root = document.getElementById("root");
            var indicator = document.getElementById("loading-indicator");
            
            // Mostrar o conteúdo após um tempo
            setTimeout(function() {
              if (root) root.style.opacity = 1;
              if (indicator) indicator.style.display = "none";
            }, 2000);
            
            // Corrigir caminhos de recursos que falham
            window.addEventListener("error", function(e) {
              if (e.target && (e.target.tagName === "SCRIPT" || e.target.tagName === "LINK")) {
                var src = e.target.src || e.target.href;
                console.error("Recurso falhou ao carregar:", src);
                
                if (src && src.startsWith("/assets/")) {
                  var newSrc = src.replace("/assets/", "assets/");
                  console.log("Tentando caminho alternativo:", newSrc);
                  
                  if (e.target.tagName === "SCRIPT") {
                    e.target.src = newSrc;
                  } else {
                    e.target.href = newSrc;
                  }
                }
              }
            }, true);
          });
        </script>
      </body>`);
      
      // Enviar HTML modificado
      res.send(html);
    } catch (err) {
      console.error(`Erro ao processar index.html: ${err.message}`);
      res.sendFile(indexPath);
    }
  });
  
  // SPA fallback - para todas as rotas não-arquivo
  app.get('*', (req, res) => {
    // Verificar se a URL parece ser um arquivo (contém ponto)
    if (!req.path.includes('.')) {
      res.redirect('/');
    } else {
      res.status(404).send('Arquivo não encontrado');
    }
  });
  
  // Iniciar o servidor
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Diretório estático: ${STATIC_DIR}`);
    
    // Listar arquivos para diagnóstico
    if (fs.existsSync(STATIC_DIR)) {
      const files = fs.readdirSync(STATIC_DIR);
      console.log(`Arquivos no diretório: ${files.join(', ')}`);
      
      const assetsDir = path.join(STATIC_DIR, 'assets');
      if (fs.existsSync(assetsDir)) {
        const assetFiles = fs.readdirSync(assetsDir);
        console.log(`Arquivos de assets: ${assetFiles.join(', ')}`);
      }
    }
  });
}

// Processo principal - build condicional e iniciar servidor
if (needsBuild) {
  console.log('Build ainda não foi executado nesta sessão');
  runBuild()
    .then(() => {
      console.log('Build completado, iniciando servidor');
      setupServer();
    })
    .catch(err => {
      console.error('Falha no build, tentando iniciar servidor mesmo assim');
      setupServer();
    });
} else {
  console.log('Build já foi executado nesta sessão, iniciando servidor diretamente');
  setupServer();
}