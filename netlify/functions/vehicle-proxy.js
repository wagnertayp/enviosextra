// Função serverless para consulta de veículos
// Esta função atua como um proxy entre o frontend e a API WDAPI2,
// evitando problemas de CORS e mantendo a chave de API em segurança

// URL base da API
const API_BASE_URL = 'https://wdapi2.com.br/consulta/';

exports.handler = async function(event, context) {
  // Configurar headers CORS para permitir acesso de qualquer origem
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Responder imediatamente a requisições OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Verificar o método da requisição
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    // Obter a placa da URL da requisição
    const placa = event.path.split('/').pop();
    
    if (!placa) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Placa não especificada' })
      };
    }
    
    // Limpar a placa e formatá-la
    const cleanedPlaca = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Importamos o node-fetch dinamicamente (para compatibilidade com ES modules)
    const fetchModule = await import('node-fetch');
    const fetch = fetchModule.default;
    
    // Usando a chave API via variável de ambiente
    // URL Format: https://wdapi2.com.br/consulta/{placa}/API_KEY
    // A chave de API deve estar configurada na variável de ambiente VEHICLE_API_KEY
    if (!process.env.VEHICLE_API_KEY) {
      console.error('VEHICLE_API_KEY não configurada nas variáveis de ambiente');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Configuração incorreta',
          details: 'A chave de API de veículos não está configurada no servidor',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    const apiKey = process.env.VEHICLE_API_KEY;
    
    // Construir a URL correta da API
    const apiUrl = `${API_BASE_URL}${cleanedPlaca}/${apiKey}`;
    
    // Log de depuração
    console.log(`Consultando informações para a placa: ${cleanedPlaca} via URL: ${apiUrl}`);
    
    let vehicleData = null;
    let errorLogs = [];
    
    // Fazer a consulta usando o formato correto de URL com a chave na própria URL
    try {
      console.log('Iniciando consulta à API de veículos');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        vehicleData = await response.json();
        console.log('Consulta à API de veículos bem-sucedida');
      } else {
        const status = response.status;
        console.log(`Consulta à API de veículos falhou: ${status}`);
        errorLogs.push(`Consulta falhou: Status ${status}`);
      }
    } catch (error) {
      const errorMsg = error.message || String(error);
      console.error('Falha na consulta de veículo:', errorMsg);
      errorLogs.push(`Erro na consulta: ${errorMsg}`);
    }
    
    // Verificar se a consulta falhou completamente
    if (!vehicleData) {
      console.error('Todas as tentativas falharam');
      
      // Em ambiente de desenvolvimento ou testing, fornecemos dados de teste
      if (process.env.NODE_ENV === 'development' || process.env.CONTEXT === 'dev' || process.env.CONTEXT === 'branch-deploy') {
        console.log('Fornecendo dados de veículo de teste para desenvolvimento');
        
        // Dados de teste formatados como se fossem da API real
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            MARCA: "Toyota (Teste)",
            MODELO: "Corolla (Teste)",
            ano: "2023",
            anoModelo: "2023",
            chassi: "TESTE123456789",
            cor: "Prata",
            placa: cleanedPlaca
          })
        };
      }
      
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ 
          error: 'Falha ao consultar dados do veículo',
          details: 'Todas as tentativas de consulta falharam. Verifique a conexão ou a chave de API.',
          errorLogs,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Se a API retornou, mas com erro explícito
    if (vehicleData.error) {
      console.log(`Erro na consulta da placa ${cleanedPlaca}: ${vehicleData.error}`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: vehicleData.error,
          placa: cleanedPlaca,
          message: 'A API de veículos retornou um erro para esta placa.',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Sucesso - Retornar os dados do veículo (sem transformação)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(vehicleData)
    };
    
  } catch (error) {
    console.error('Erro na função vehicle-proxy:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro ao processar consulta de veículo',
        details: error.message || 'Erro interno',
        timestamp: new Date().toISOString()
      })
    };
  }
};