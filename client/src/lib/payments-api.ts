import { API_BASE_URL } from './api-config';
import { createPixPaymentDirect } from './for4payments-direct';

// Interface para os dados da solicitação de pagamento
interface PaymentRequest {
  name: string;
  cpf: string;
  email?: string;
  phone?: string;
  amount?: number;
}

// Interface para a resposta do pagamento
interface PaymentResponse {
  id: string;
  pixCode: string;
  pixQrCode: string;
  status?: string;
  error?: string;
}

/**
 * Cria uma solicitação de pagamento PIX através da API For4Payments
 * Esta função escolhe automaticamente a melhor estratégia:
 * 1. Se FOR4PAYMENTS_SECRET_KEY estiver disponível na Netlify - Chama direto a API
 * 2. Caso contrário - Usa o backend no Heroku como intermediário
 */
export async function createPixPayment(data: PaymentRequest): Promise<PaymentResponse> {
  console.log(`Ambiente de execução: ${import.meta.env.PROD ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
  
  // Verificar se a chave da For4Payments está disponível no frontend
  // (Isso acontecerá se a variável estiver configurada no Netlify)
  const hasFor4PaymentKey = !!import.meta.env.VITE_FOR4PAYMENTS_SECRET_KEY;
  
  // Em produção, se tiver a chave, chama diretamente a API For4Payments
  if (import.meta.env.PROD && hasFor4PaymentKey) {
    console.log('Usando chamada direta para For4Payments API');
    
    try {
      // Usar a implementação direta
      return await createPixPaymentDirect(data);
    } catch (error: any) {
      console.error('Falha na chamada direta, tentando via Heroku:', error.message);
      // Em caso de erro, tenta via backend Heroku
    }
  }
  
  // Chamar via backend Heroku com o novo proxy específico para For4Payments
  const apiUrl = import.meta.env.PROD
    ? 'https://disparador-f065362693d3.herokuapp.com/api/proxy/for4payments/pix'
    : '/api/proxy/for4payments/pix';
    
  console.log(`URL da API de pagamentos (via Heroku): ${apiUrl}`);
  console.log('Dados de pagamento:', {
    name: data.name,
    cpf: data.cpf.substring(0, 3) + '***' + data.cpf.substring(data.cpf.length - 2),
    email: data.email || 'não informado'
  });
  
  try {
    // Configurar opções de requisição para evitar problemas de CORS
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors' as RequestMode,
      credentials: 'omit' as RequestCredentials,
      body: JSON.stringify({
        name: data.name,
        cpf: data.cpf,
        email: data.email || '',
        phone: data.phone || '',
        amount: data.amount || 79.90 // Valor padrão para o kit de segurança
      })
    };
    
    // Fazer a requisição
    const response = await fetch(apiUrl, requestOptions);
    
    // Verificar se a resposta foi bem sucedida
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro HTTP ${response.status}: ${errorText}`);
      throw new Error(`Falha na comunicação com o servidor: ${response.statusText}`);
    }
    
    // Processar a resposta
    const result = await response.json();
    
    console.log('Resposta do servidor recebida com sucesso');
    
    // Validar a resposta
    if (!result.pixCode || !result.pixQrCode) {
      throw new Error('A resposta do servidor não contém os dados de pagamento PIX necessários');
    }
    
    return result;
  } catch (error: any) {
    console.error('Erro ao processar pagamento:', error);
    throw new Error(error.message || 'Não foi possível processar o pagamento no momento');
  }
}