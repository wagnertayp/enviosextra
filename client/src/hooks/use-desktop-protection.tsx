import * as React from "react";
import MobileDetect from "mobile-detect";
import { ipService } from "@/lib/ip-service";

/**
 * Hook para proteção contra acesso desktop com bloqueio permanente por IP.
 * 
 * Características importantes:
 * 1. Verifica banimento local e no servidor
 * 2. Bloqueia permanentemente IPs de acesso desktop mesmo em mobile
 * 3. Previne bypass via about:blank ou outros métodos
 * 4. Suporta lista de exceções para IPs específicos
 * 5. Persiste o bloqueio entre sessões e em múltiplos armazenamentos
 */
export function useDesktopProtection() {
  React.useEffect(() => {
    // Verificação imediata no cliente através de localStorage/cookies
    // Isso ajuda a bloquear instantaneamente mesmo antes da resposta da API
    if (ipService.isLocallyBanned()) {
      console.log("Bloqueio local detectado. Aplicando bloqueio imediatamente.");
      ipService.redirectToBlankPage();
      return; // Interrompe toda a execução
    }
    
    const checkAccess = async () => {
      try {
        // Lista de domínios permitidos (podem ser carregados do ambiente ou da API)
        const allowedDomains = [
          'replit.dev', 
          'replit.com', 
          'localhost', 
          '127.0.0.1'
        ];
        
        // Lista de IPs que nunca devem ser banidos
        const neverBanIPs = ['201.87.251.220']; // IP específico do cliente (sempre permitido)
        
        // Verificar se estamos em ambiente de desenvolvimento
        const isDevelopment = 
          process.env.NODE_ENV === 'development' || 
          allowedDomains.some(domain => window.location.hostname.includes(domain));
          
        // Se for ambiente de desenvolvimento, não verifica banimento
        if (isDevelopment) {
          console.log("Ambiente de desenvolvimento detectado. Proteção desktop desativada.");
          return;
        }
        
        // Verificar se o site está sendo carregado em um iframe
        // Isso pode ser uma tentativa de bypass
        if (window.top !== window.self) {
          console.log("Tentativa de carregamento em iframe detectada. Bloqueando...");
          // Força a página a ser aberta fora do iframe
          if (window.top) {
            window.top.location.href = window.location.href;
          }
          return;
        }
        
        // Verificar se o IP atual já está banido (checagem no servidor)
        // Isso usa nosso novo endpoint aprimorado com banco de dados PostgreSQL
        const response = await ipService.checkIfBanned();
        
        // Se já estiver banido (pelo servidor), ativa o bloqueio
        // independentemente de ser desktop ou mobile
        if (response.isBanned) {
          console.log("IP está banido pelo servidor, bloqueando acesso mesmo em dispositivos móveis...");
          ipService.redirectToBlankPage();
          return;
        }
        
        // Verificar se o IP está na lista de exceções
        const clientIp = response.ip || '';
        const isIpExempted = neverBanIPs.some(allowedIp => clientIp.includes(allowedIp));
        
        if (isIpExempted) {
          console.log("IP na lista de exceções. Acesso permitido em qualquer dispositivo.");
          return;
        }
        
        // Se não estiver banido, verifica se é desktop
        const md = new MobileDetect(window.navigator.userAgent);
        const isDesktop = !md.mobile() && !md.tablet() && !md.phone();
        
        // Verificações secundárias para desktop (mais precisas, mas com possibilidade de falsos positivos)
        const hasPointer = window.matchMedia('(pointer: fine)').matches;
        const isLargeScreen = window.innerWidth > 1024 || window.screen.width > 1024;
        const hasHover = window.matchMedia('(hover: hover)').matches;
        
        // Usar a detecção principal com confirmação secundária
        // para reduzir chance de falsos positivos
        const isConfirmedDesktop = isDesktop && (hasPointer || (isLargeScreen && hasHover));
        
        // Se for desktop e não for um IP da lista de exceções, banir
        if (isConfirmedDesktop) {
          console.log("Acesso desktop confirmado, reportando para banimento permanente...");
          
          // Reporta o acesso desktop para o backend para banir o IP
          await ipService.reportDesktopAccess();
          
          // Redireciona para a página de bloqueio permanente
          ipService.redirectToBlankPage();
        }
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
        
        // Em caso de erro de conexão com o servidor, ainda tenta verificar localmente
        if (ipService.isLocallyBanned()) {
          ipService.redirectToBlankPage();
        }
      }
    };
    
    // Executar verificação inicial
    checkAccess();
    
    // Configurar verificação periódica para prevenir bypass
    // Isso garante que mesmo que a verificação inicial falhe,
    // o bloqueio ainda será aplicado em uma tentativa posterior
    const intervalCheck = setInterval(async () => {
      try {
        // Verificar se está banido localmente
        if (ipService.isLocallyBanned()) {
          console.log("Bloqueio local detectado em verificação periódica. Aplicando restrições.");
          ipService.redirectToBlankPage();
          clearInterval(intervalCheck);
          return;
        }

        // A cada minuto, verificar com o servidor se o IP ou deviceId está banido
        // Isso ajuda a detectar banimentos que ocorreram em outros dispositivos/sessões
        const deviceId = localStorage.getItem('sp_device_id');
        if (deviceId) {
          try {
            // Verificar status do dispositivo
            const response = await fetch(`/api/check-device/${deviceId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.status === 'banned') {
                console.log("Dispositivo banido detectado em verificação periódica. Aplicando bloqueio.");
                ipService.markLocalBan();
                ipService.redirectToBlankPage();
                clearInterval(intervalCheck);
                return;
              }
            }
          } catch (err) {
            console.log("Erro ao verificar status do dispositivo:", err);
          }
        }
        
        // Verificar IP a cada 5 verificações (menos frequente)
        const currentTimestamp = Date.now();
        const lastIpCheck = parseInt(sessionStorage.getItem('last_ip_check') || '0');
        if (currentTimestamp - lastIpCheck > 60000) { // 1 minuto
          // Atualizar timestamp
          sessionStorage.setItem('last_ip_check', currentTimestamp.toString());
          
          // Verificar IP
          const ipResponse = await fetch("/api/check-ip-status");
          if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            if (ipData.status === 'banned') {
              console.log("IP banido detectado em verificação periódica. Aplicando bloqueio.");
              ipService.markLocalBan();
              ipService.redirectToBlankPage();
              clearInterval(intervalCheck);
              return;
            }
          }
        }
      } catch (error) {
        console.error("Erro em verificação periódica:", error);
      }
    }, 12000); // verificar a cada 12 segundos
    
    // Limpar o intervalo ao desmontar o componente
    return () => clearInterval(intervalCheck);
  }, []);
}