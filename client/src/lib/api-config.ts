// Configuração de APIs

// Determina qual é o ambiente atual
const isProd = import.meta.env.PROD;
const isDev = import.meta.env.DEV;

// API URLs - Define as URLs da API para os ambientes de produção e desenvolvimento
export const API_URLS = {
  // Em desenvolvimento, a API é servida localmente
  development: '',
  
  // Em produção, a API é servida pelo Heroku
  // Importante: Usamos https:// para evitar problemas de conexão segura
  production: 'https://disparador-f065362693d3.herokuapp.com'  // URL atualizada do backend no Heroku
};

// URL base da API dependendo do ambiente
export const API_BASE_URL = isProd ? API_URLS.production : API_URLS.development;

// Flag para debug
const DEBUG = true;

// Utilitário para construir URLs de API
export const apiUrl = (path: string): string => {
  // Se estamos em desenvolvimento, usamos caminhos relativos
  // Se estamos em produção, usamos a URL completa da API
  const basePath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${basePath}`;
  
  if (DEBUG) {
    console.log(`API URL: ${url} (Environment: ${isProd ? 'production' : 'development'})`);
  }
  
  return url;
};

// Função para verificar o status da API
export const checkApiStatus = async (): Promise<{ status: string; env: string }> => {
  try {
    const healthUrl = apiUrl('/health');
    console.log(`Verificando status da API em: ${healthUrl}`);
    
    const response = await fetch(healthUrl, {
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error(`API respondeu com status ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Erro ao verificar status da API:', error);
    return { status: 'error', env: 'unknown' };
  }
};