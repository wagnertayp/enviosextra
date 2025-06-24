// Script para executar o Express.js no ambiente Heroku
const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Compressão para melhorar a performance
app.use(compression());

// Middleware para CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  next();
});

// Configurações para servir arquivos estáticos
const staticOptions = {
  maxAge: '30d',
  setHeaders: (res, path) => {
    // Configura cabeçalhos para diferentes tipos de arquivos
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (path.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
};

// Caminho para arquivos estáticos
const staticPath = path.join(__dirname, 'dist', 'public');

// Servir arquivos estáticos
app.use(express.static(staticPath, staticOptions));

// Para rotas de API, redireciona para o servidor Node
app.use('/api', (req, res) => {
  // Implementar lógica de API se necessário
  res.json({ message: 'API endpoint' });
});

// Para qualquer outra rota, serve o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});