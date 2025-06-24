import axios from 'axios';

// Definição do Pixel ID do Facebook
const FACEBOOK_PIXEL_ID = '1418766538994503';

// Interface para os dados de transação
interface TransactionStatus {
  id: string;
  customId?: string;
  status: string;
  amount?: number;
  customer?: {
    name?: string;
    email?: string;
    cpf?: string;
  };
  approvedAt?: string;
  rejectedAt?: string;
}

/**
 * Verifica o status de uma transação na For4Payments
 * @param paymentId ID da transação na For4Payments
 * @returns Dados do status da transação
 */
export async function checkTransactionStatus(paymentId: string): Promise<TransactionStatus | null> {
  try {
    if (!process.env.FOR4PAYMENTS_SECRET_KEY) {
      console.error('[MONITOR] Chave de API For4Payments não configurada');
      return null;
    }

    console.log(`[MONITOR] Verificando status da transação: ${paymentId}`);
    
    const response = await axios.get(
      `https://app.for4payments.com.br/api/v1/transaction.getPayment?id=${paymentId}`,
      {
        headers: {
          'Authorization': process.env.FOR4PAYMENTS_SECRET_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.status === 200) {
      console.log(`[MONITOR] Status da transação ${paymentId}: ${response.data.status}`);
      return response.data;
    }
    
    return null;
  } catch (error: any) {
    console.error('[MONITOR] Erro ao verificar status da transação:', error.message);
    if (error.response) {
      console.error('[MONITOR] Detalhes do erro:', error.response.data);
    }
    return null;
  }
}

/**
 * Envia evento de conversão para o Facebook Pixel
 * @param transactionData Dados da transação
 */
export async function reportConversionToFacebook(transactionData: TransactionStatus): Promise<boolean> {
  try {
    console.log(`[FACEBOOK] Reportando conversão para o Facebook Pixel: ${FACEBOOK_PIXEL_ID}`);
    
    // Estrutura do evento para o Facebook
    const eventData = {
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000), // Timestamp em segundos
      event_id: transactionData.id,
      user_data: {
        em: transactionData.customer?.email ? encodeUserData(transactionData.customer.email) : undefined,
        ph: undefined, // Telefone não disponível nos dados da transação
        external_id: transactionData.customId
      },
      custom_data: {
        currency: 'USD',
        value: transactionData.amount,
        status: transactionData.status
      },
      action_source: 'website'
    };
    
    // Enviar o evento para o Facebook Conversions API
    // Nota: Em produção isso deve ser feito usando o servidor do Facebook
    const response = await axios.post(
      `https://graph.facebook.com/v14.0/${FACEBOOK_PIXEL_ID}/events`,
      {
        data: [eventData],
        access_token: process.env.FACEBOOK_ACCESS_TOKEN || '' // Idealmente, adicionar esse token
      }
    );
    
    if (response.status === 200) {
      console.log(`[FACEBOOK] Evento reportado com sucesso`);
      return true;
    }
    
    console.error(`[FACEBOOK] Erro ao reportar evento:`, response.data);
    return false;
  } catch (error: any) {
    console.error('[FACEBOOK] Erro ao reportar conversão:', error.message);
    if (error.response) {
      console.error('[FACEBOOK] Detalhes do erro:', error.response.data);
    }
    return false;
  }
}

/**
 * Processar transação - verificar status e reportar se aprovada
 * @param paymentId ID do pagamento
 */
export async function processTransaction(paymentId: string): Promise<boolean> {
  try {
    // Verificar status da transação
    const transactionStatus = await checkTransactionStatus(paymentId);
    
    if (!transactionStatus) {
      console.log(`[MONITOR] Transação ${paymentId} não encontrada ou erro na consulta`);
      return false;
    }
    
    // Se a transação estiver aprovada, reportar para o Facebook
    if (transactionStatus.status === 'APPROVED') {
      console.log(`[MONITOR] Transação ${paymentId} APROVADA! Reportando conversão...`);
      
      // Adicionar código para salvar no banco de dados (quando implementado)
      
      // Reportar conversão para o Facebook
      const reported = await reportConversionToFacebook(transactionStatus);
      
      // Também podemos enviar um email de confirmação adicional aqui
      return reported;
    }
    
    console.log(`[MONITOR] Transação ${paymentId} com status: ${transactionStatus.status}. Nenhuma ação necessária.`);
    return false;
  } catch (error) {
    console.error('[MONITOR] Erro ao processar transação:', error);
    return false;
  }
}

/**
 * Função para criptografar dados do usuário antes de enviar para o Facebook
 * usando SHA-256 (somente implementada no cliente em produção)
 */
function encodeUserData(value: string): string {
  // Em produção, isso deveria ser criptografado com SHA-256
  // Para este exemplo, apenas retornamos mascarado
  return `hash_${value.substring(0, 3)}*****`;
}