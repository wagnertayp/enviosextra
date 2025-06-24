import { apiRequest } from "@/lib/queryClient";

// Chave de storage para verificar mais tarde se o usuário já foi bloqueado
const BANNED_KEY = 'sp_access_blocked';
const BANNED_DEVICE_KEY = 'sp_device_id';

/**
 * Serviço para gerenciar bloqueio de IPs no lado do cliente.
 * Este serviço faz parte do sistema de proteção contra acessos desktop.
 */
export const ipService = {
  /**
   * Reporta um acesso desktop ao backend para banir o IP.
   * Também armazena localmente o bloqueio para evitar contornar com about:blank.
   */
  async reportDesktopAccess(): Promise<void> {
    try {
      // Gravar um identificador único para este dispositivo
      const deviceId = this.generateDeviceId();
      localStorage.setItem(BANNED_DEVICE_KEY, deviceId);
      
      // Marcar o bloqueio permanente no localStorage e sessionStorage
      localStorage.setItem(BANNED_KEY, 'true');
      sessionStorage.setItem(BANNED_KEY, 'true');
      
      // Definir um cookie de bloqueio de longa duração
      document.cookie = `${BANNED_KEY}=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
      
      // Enviar para API para banir o IP permanentemente
      await apiRequest("POST", "/api/admin/report-desktop-access", {
        deviceId: deviceId,
        userAgent: navigator.userAgent,
        isAboutBlank: window.location.href.includes('about:blank'),
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      });
      
      console.log("Acesso desktop reportado com sucesso");
    } catch (error) {
      console.error("Erro ao reportar acesso desktop:", error);
      
      // Mesmo se falhar a API, ainda mantém o bloqueio local
      localStorage.setItem(BANNED_KEY, 'true');
      sessionStorage.setItem(BANNED_KEY, 'true');
    }
  },

  /**
   * Verifica se o dispositivo/IP atual está banido.
   * Combina verificação local (localStorage/cookie) e remota (API)
   */
  async checkIfBanned(): Promise<{isBanned: boolean, ip?: string}> {
    try {
      // 1. Primeiro verifica localmente (mais rápido)
      const isLocallyBanned = this.isLocallyBanned();
      if (isLocallyBanned) {
        console.log("Dispositivo bloqueado localmente.");
        return { isBanned: true };
      }
      
      // 2. Verificar o deviceId armazenado
      const deviceId = localStorage.getItem(BANNED_DEVICE_KEY);
      if (deviceId) {
        try {
          // Verificar se o device ID está banido
          const deviceResponse = await fetch(`/api/check-device/${deviceId}`, {
            method: "GET",
            headers: { "Accept": "application/json" }
          });
          
          if (deviceResponse.ok) {
            const deviceData = await deviceResponse.json();
            if (deviceData.status === 'banned') {
              console.log("Dispositivo banido confirmado pelo servidor");
              // Marcar bloqueio localmente 
              this.markLocalBan();
              return { isBanned: true };
            }
          }
        } catch (deviceError) {
          console.error("Erro ao verificar device ID:", deviceError);
        }
      }
      
      // 3. Verificar se o IP atual está banido
      try {
        const ipResponse = await fetch("/api/check-ip-status", {
          method: "GET",
          headers: { "Accept": "application/json" }
        });
        
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          
          // Se o IP estiver banido, atualizar o estado local
          if (ipData.status === 'banned') {
            console.log("IP banido confirmado pelo servidor");
            
            // Marcar bloqueio localmente
            this.markLocalBan();
            
            // Se tiver um device ID salvo, enviar para o servidor para consolidar bloqueio
            if (deviceId) {
              this.registerDeviceId(deviceId).catch(console.error);
            }
            
            return {
              isBanned: true,
              ip: ipData.ip
            };
          }
          
          return {
            isBanned: false,
            ip: ipData.ip
          };
        }
      } catch (ipError) {
        console.error("Erro ao verificar status do IP:", ipError);
      }
      
      // 4. Verificar o endpoint antigo como backup
      try {
        const legacyResponse = await fetch("/api/admin/check-ip-banned", {
          method: "GET",
          headers: { "Accept": "application/json" }
        });
        
        if (legacyResponse.ok) {
          const data = await legacyResponse.json();
          
          if (data.isBanned) {
            console.log("IP banido confirmado pelo servidor (endpoint legado)");
            this.markLocalBan();
            return {
              isBanned: true,
              ip: data.ip
            };
          }
          
          return {
            isBanned: false,
            ip: data.ip
          };
        }
      } catch (legacyError) {
        console.error("Erro ao verificar IP no endpoint legado:", legacyError);
      }
      
      // Se chegou aqui, verificou-se todas as opções e não encontrou banimento
      return { isBanned: false };
    } catch (error) {
      console.error("Erro ao verificar se IP está banido:", error);
      
      // Em caso de erro de conexão, verificamos localmente como última tentativa
      const isLocallyBanned = this.isLocallyBanned();
      if (isLocallyBanned) {
        return { isBanned: true };
      }
      
      // Só aqui assumimos que não está banido (último caso)
      return { isBanned: false };
    }
  },
  
  /**
   * Marca o dispositivo como banido em todos os armazenamentos locais
   */
  markLocalBan(): void {
    localStorage.setItem(BANNED_KEY, 'true');
    sessionStorage.setItem(BANNED_KEY, 'true');
    document.cookie = `${BANNED_KEY}=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
  },

  /**
   * Verifica se o dispositivo atual está marcado como banido localmente
   */
  isLocallyBanned(): boolean {
    // Verificar localStorage
    const localBan = localStorage.getItem(BANNED_KEY);
    if (localBan === 'true') return true;
    
    // Verificar sessionStorage
    const sessionBan = sessionStorage.getItem(BANNED_KEY);
    if (sessionBan === 'true') return true;
    
    // Verificar cookies
    return document.cookie.split(';').some(cookie => 
      cookie.trim().startsWith(`${BANNED_KEY}=true`)
    );
  },

  /**
   * Envia o deviceId para o servidor para consolidar o bloqueio
   */
  async registerDeviceId(deviceId: string): Promise<void> {
    try {
      await apiRequest("POST", "/api/admin/register-device", { deviceId });
    } catch (error) {
      console.error("Erro ao registrar deviceId:", error);
    }
  },

  /**
   * Gera um identificador único para este dispositivo baseado em características do navegador
   */
  generateDeviceId(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      navigator.hardwareConcurrency || ''
    ];
    
    // Criar um hash simples
    let hash = 0;
    const str = components.join('|||');
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Converter para 32bit integer
    }
    
    return 'dev_' + Math.abs(hash).toString(16) + '_' + Date.now().toString(36);
  },

  /**
   * Redireciona diretamente para about:blank sem mostrar nenhum aviso.
   * Mantém o banimento registrado localmente para persistência.
   */
  redirectToBlankPage(): void {
    // 1. Marcar como banido em múltiplos armazenamentos locais
    // para garantir que o bloqueio persista entre sessões
    localStorage.setItem(BANNED_KEY, 'true');
    sessionStorage.setItem(BANNED_KEY, 'true');
    document.cookie = `${BANNED_KEY}=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
    
    // 2. Redirecionar imediatamente para about:blank sem mostrar nenhum aviso
    try {
      window.location.href = "about:blank";
    } catch (e) {
      console.error("Falha ao redirecionar para about:blank", e);
      
      // Se por algum motivo o redirecionamento falhar, esconder todo o conteúdo
      // mas sem mostrar uma mensagem de erro
      document.body.innerHTML = '';
      document.body.style.backgroundColor = '#000';
      
      // Tentar novamente após um pequeno delay
      setTimeout(() => {
        try {
          window.location.href = "about:blank";
        } catch (innerError) {
          // Se falhar novamente, garantir que a página fique inacessível
          console.error("Falha ao redirecionar na segunda tentativa:", innerError);
        }
      }, 500);
    }
  }
};