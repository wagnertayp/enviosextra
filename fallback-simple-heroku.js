// Servidor ultra simplificado que apenas serve o HTML diretamente sem o Vite
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

// Inicializar Express
const app = express();
app.use(cors({ origin: '*' }));
app.use(compression());
app.use(express.json());

// Mock data para exemplo
const mockRegions = [
  { name: "São Paulo", abbr: "SP", vacancies: 26 },
  { name: "Rio de Janeiro", abbr: "RJ", vacancies: 18 },
  { name: "Minas Gerais", abbr: "MG", vacancies: 14 },
  { name: "Bahia", abbr: "BA", vacancies: 10 },
  { name: "Paraná", abbr: "PR", vacancies: 8 }
];

// Cabeçalhos CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Rotas da API
console.log("Configurando rotas da API...");

// Rota de diagnóstico
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Rota para regiões
app.get('/api/regions', (req, res) => {
  res.json(mockRegions);
});

// Rotas específicas para payments (simulando existentes)
app.post('/api/payments/create-pix', (req, res) => {
  const { name, cpf, email, amount } = req.body;
  
  if (!name || !cpf || !amount) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  
  // Resposta simulada
  const pixData = {
    id: `pix_${Date.now()}`,
    pixCode: `00020126580014BR.GOV.BCB.PIX0136${cpf}5204000053039865802BR5913Shopee${name}6009SAO PAULO62070503***6304${Math.floor(Math.random() * 10000)}`,
    pixQrCode: `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(`pixcode-for-${cpf}`)}`,
    status: 'pending'
  };
  
  res.json(pixData);
});

// HTML DIRETO para o frontend
const frontendHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shopee Delivery Partners</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
      color: #333;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      background-color: #FF6000;
      color: white;
      padding: 20px 0;
      text-align: center;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    
    h1 {
      margin: 0;
      font-size: 2.5rem;
    }
    
    .subtitle {
      font-size: 1.2rem;
      margin-top: 10px;
    }
    
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 20px;
      margin: 20px 0;
    }
    
    .center {
      text-align: center;
    }
    
    .button {
      display: inline-block;
      background-color: #FF6000;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: bold;
      margin-top: 20px;
      border: none;
      cursor: pointer;
      font-size: 1rem;
    }
    
    .button:hover {
      background-color: #FF4500;
    }
    
    .regions {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .region-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      padding: 15px;
      text-align: center;
    }
    
    .region-name {
      font-size: 1.3rem;
      margin-bottom: 5px;
      color: #FF6000;
    }
    
    .vacancies {
      font-weight: bold;
      color: #444;
    }
    
    .hero {
      background-color: #FF6000;
      color: white;
      padding: 60px 20px;
      text-align: center;
      margin-bottom: 40px;
    }
    
    .hero h2 {
      font-size: 2.2rem;
      margin-bottom: 20px;
    }
    
    .hero p {
      font-size: 1.2rem;
      max-width: 800px;
      margin: 0 auto 30px;
    }
    
    footer {
      background-color: #333;
      color: white;
      padding: 20px;
      text-align: center;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>Shopee Delivery Partners</h1>
      <p class="subtitle">Seja um parceiro de entregas da Shopee</p>
    </div>
  </header>
  
  <div class="hero">
    <div class="container">
      <h2>Junte-se à nossa equipe de entregadores</h2>
      <p>Trabalhe em horários flexíveis e ganhe uma renda extra fazendo entregas para a maior plataforma de e-commerce do Brasil.</p>
      <a href="#" class="button">Cadastre-se agora</a>
    </div>
  </div>
  
  <div class="container">
    <div class="card">
      <h2 class="center">Regiões com vagas disponíveis</h2>
      <div class="regions" id="regions-container">
        <!-- As regiões serão carregadas via JavaScript -->
        <div class="region-card">
          <div class="region-name">São Paulo</div>
          <div class="vacancies">26 vagas disponíveis</div>
        </div>
        <div class="region-card">
          <div class="region-name">Rio de Janeiro</div>
          <div class="vacancies">18 vagas disponíveis</div>
        </div>
        <div class="region-card">
          <div class="region-name">Minas Gerais</div>
          <div class="vacancies">14 vagas disponíveis</div>
        </div>
        <div class="region-card">
          <div class="region-name">Bahia</div>
          <div class="vacancies">10 vagas disponíveis</div>
        </div>
        <div class="region-card">
          <div class="region-name">Paraná</div>
          <div class="vacancies">8 vagas disponíveis</div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2 class="center">Por que ser um entregador Shopee?</h2>
      <ul>
        <li>Flexibilidade de horários - trabalhe quando quiser</li>
        <li>Pagamentos semanais</li>
        <li>Bônus por desempenho</li>
        <li>Suporte 24/7</li>
        <li>Seguro contra acidentes</li>
        <li>Área de atuação próxima à sua residência</li>
      </ul>
      <div class="center">
        <button class="button">Saiba mais</button>
      </div>
    </div>
  </div>
  
  <footer>
    <div class="container">
      <p>&copy; 2025 Shopee Delivery Partners. Todos os direitos reservados.</p>
    </div>
  </footer>
  
  <script>
    // Exemplo de código para carregar as regiões dinamicamente
    /*
    fetch('/api/regions')
      .then(response => response.json())
      .then(regions => {
        const container = document.getElementById('regions-container');
        container.innerHTML = '';
        
        regions.forEach(region => {
          const card = document.createElement('div');
          card.className = 'region-card';
          
          const name = document.createElement('div');
          name.className = 'region-name';
          name.textContent = region.name;
          
          const vacancies = document.createElement('div');
          vacancies.className = 'vacancies';
          vacancies.textContent = \`\${region.vacancies} vagas disponíveis\`;
          
          card.appendChild(name);
          card.appendChild(vacancies);
          container.appendChild(card);
        });
      })
      .catch(error => console.error('Erro ao carregar regiões:', error));
    */
  </script>
</body>
</html>`;

// Servir o HTML para todas as rotas não-API
app.get('*', (req, res, next) => {
  // Se não é rota de API e não parece ser um arquivo estático
  if (!req.path.startsWith('/api/') && !req.path.includes('.')) {
    console.log(`Servindo HTML estático para: ${req.path}`);
    res.set('Content-Type', 'text/html');
    return res.send(frontendHtml);
  }
  next();
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor FALLBACK ultra simples rodando na porta ${PORT}`);
  console.log(`Este servidor serve um HTML estático em vez de usar o Vite.`);
});