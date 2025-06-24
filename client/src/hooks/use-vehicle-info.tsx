import { useState, useCallback, useRef } from 'react';

// Cache global para armazenar consultas de veículos
// Isso evita múltiplas chamadas para a mesma placa
const vehicleCache: Record<string, any> = {};

interface VehicleInfo {
  // Suporte para nomes maiúsculos (direto da API externa)
  MARCA?: string;
  MODELO?: string;
  
  // Suporte para nomes minúsculos (normalizado pelo servidor)
  marca?: string;
  modelo?: string;
  
  // Outros dados
  ano?: string;
  anoModelo?: string;
  chassi?: string;
  cor?: string;
  placa?: string;
  error?: string;
}

interface UseVehicleInfoReturn {
  vehicleInfo: VehicleInfo | null;
  isLoading: boolean;
  error: string | null;
  fetchVehicleInfo: (placa: string) => Promise<void>;
  resetVehicleInfo: () => void;
}

/**
 * Hook para consultar informações de veículos
 * Tenta consultar a API diretamente ou através de proxy, com múltiplas fallbacks
 */
export function useVehicleInfo(): UseVehicleInfoReturn {
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para resetar as informações do veículo
  const resetVehicleInfo = useCallback(() => {
    setVehicleInfo(null);
    setError(null);
  }, []);

  // Referência para controlar a última placa buscada
  const lastFetchedPlateRef = useRef<string | null>(null);
  
  // Função para consultar informações do veículo
  const fetchVehicleInfo = useCallback(async (placa: string) => {
    // Clean the plate and check if it's valid
    const cleanedPlaca = placa.trim().toUpperCase();
    
    if (!cleanedPlaca || cleanedPlaca.length < 3) {
      setError('Ingresa una placa válida con al menos 3 caracteres.');
      return;
    }
    
    // IMPORTANTE: Verificar se é a mesma placa da última consulta
    // Isso evita múltiplas requisições para a mesma placa
    if (lastFetchedPlateRef.current === cleanedPlaca && vehicleInfo) {
      console.log(`[CACHE] Usando informações em cache para placa ${cleanedPlaca}`);
      return;
    }
    
    // Verificar se já temos no cache global
    if (vehicleCache[cleanedPlaca]) {
      console.log(`[CACHE] Usando informações do cache global para placa ${cleanedPlaca}`);
      setVehicleInfo(vehicleCache[cleanedPlaca]);
      lastFetchedPlateRef.current = cleanedPlaca;
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Registrar a placa atual como a última consultada
      lastFetchedPlateRef.current = cleanedPlaca;
      
      // Estratégia 1: Consulta segura via nosso próprio backend
      console.log('[DEBUG] Tentando consulta via API segura do backend');
      try {
        // Determinar URL base dependendo do ambiente
        const baseUrl = window.location.hostname.includes('replit.dev') || 
                      window.location.hostname === 'localhost' 
                      ? '' : 'https://disparador-f065362693d3.herokuapp.com';
        
        const apiUrl = `${baseUrl}/api/vehicle-info/${cleanedPlaca}`;
        console.log(`[DEBUG] Fazendo consulta API: ${apiUrl}`);
        
        const backendResponse = await fetch(apiUrl);
        
        if (backendResponse.ok) {
          const data = await backendResponse.json();
          setVehicleInfo(data);
          // Guardar no cache global
          vehicleCache[cleanedPlaca] = data;
          setIsLoading(false);
          return;
        } else {
          console.log('[AVISO] API backend retornou status:', backendResponse.status);
        }
      } catch (backendError) {
        console.error('[ERRO] Falha ao consultar API backend:', backendError);
      }
      
      // Estratégia 2: Tentar via função serverless do Netlify (fallback)
      console.log('[DEBUG] Tentando consulta via Netlify Function');
      try {
        const netlifyResponse = await fetch(`/vehicle-api/${cleanedPlaca}`);
        
        if (netlifyResponse.ok) {
          const data = await netlifyResponse.json();
          setVehicleInfo(data);
          // Guardar no cache global
          vehicleCache[cleanedPlaca] = data; 
          setIsLoading(false);
          return;
        } else {
          console.log('[AVISO] Netlify Function retornou status:', netlifyResponse.status);
        }
      } catch (netlifyError) {
        console.error('[ERRO] Falha ao consultar Netlify Function:', netlifyError);
      }
      
      // Se chegou aqui, todas as tentativas falharam
      console.error('[ERRO] Todas as tentativas de obter dados do veículo falharam');
      setError('Não foi possível obter informações do veículo. Tente novamente mais tarde.');
      
      // Fornecer dados fake em desenvolvimento para não travar a UI
      if (import.meta.env.DEV) {
        console.log('[DEBUG] Fornecendo dados de teste para desenvolvimento');
        const testData = {
          MARCA: "TESTE - Local Dev",
          MODELO: "VEÍCULO DE TESTE",
          ano: "2023",
          anoModelo: "2023/2024",
          chassi: "TESTE123456789",
          cor: "PRATA",
          placa: cleanedPlaca
        };
        setVehicleInfo(testData);
        vehicleCache[cleanedPlaca] = testData;
      }
      
    } catch (error) {
      console.error('Erro ao consultar informações do veículo:', error);
      setError('Erro ao consultar informações do veículo. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    vehicleInfo,
    isLoading,
    error,
    fetchVehicleInfo,
    resetVehicleInfo
  };
}