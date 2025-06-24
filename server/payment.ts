import axios from 'axios';

// Interface para o payload de solicitação de pagamento
interface PaymentRequest {
  name: string;
  email: string;
  cpf: string;
  phone?: string;
  amount: number;
  items?: Array<{
    title: string;
    quantity: number;
    unitPrice: number;
    tangible: boolean;
  }>;
}

// Interface para a resposta de pagamento
interface PaymentResponse {
  id: string;
  pixCode: string;
  pixQrCode: string;
  status?: string;
  error?: string;
  emailSent?: boolean;
  emailError?: string;
}

/**
 * Serviço para processar pagamentos através da API For4Payments
 */
export class PaymentService {
  private readonly API_URL = 'https://app.for4payments.com.br/api/v1';
  private readonly secretKey: string;

  constructor() {
    // Obter a chave secreta das variáveis de ambiente
    const secretKey = process.env.FOR4PAYMENTS_SECRET_KEY;
    
    if (!secretKey) {
      console.warn('FOR4PAYMENTS_SECRET_KEY não configurada - serviço de pagamento indisponível');
      this.secretKey = '';
    } else {
      this.secretKey = secretKey;
    }
  }

  /**
   * Cria um pagamento PIX
   */
  async createPixPayment(data: PaymentRequest): Promise<PaymentResponse> {
    if (!this.secretKey) {
      console.warn('FOR4PAYMENTS_SECRET_KEY não configurada - retornando dados de demonstração');
      // Return demo data for development/testing
      return {
        id: `demo_${Date.now()}`,
        pixCode: '00020126580014BR.GOV.BCB.PIX01369f2b8d4b-1234-5678-9abc-def123456789520400005303986540517.005802BR5925Nome do Destinatario6009SAO PAULO62070503***6304',
        pixQrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        status: 'PENDING'
      };
    }
    try {
      console.log('Processando pagamento PIX via For4Payments API:', {
        name: data.name,
        email: data.email,
        cpf: data.cpf ? data.cpf.substring(0, 3) + '...' + data.cpf.substring(data.cpf.length - 2) : '',
        amount: data.amount
      });
      
      // Formatar CPF (remover caracteres não numéricos)
      const cpf = data.cpf.replace(/\D/g, '');
      
      // Converter valor para centavos (exigido pela API)
      const amountInCents = Math.round(data.amount * 100);
      console.log(`[DEBUG-PAYMENT] Valor original: ${data.amount}, em centavos: ${amountInCents}`);
      
      // Formato do telefone (remover caracteres não numéricos)
      const phone = data.phone ? data.phone.replace(/\D/g, '') : this.generateRandomPhone();
      
      // Preparar dados para a API For4Payments
      const paymentData = {
        name: data.name,
        email: data.email || this.generateRandomEmail(data.name),
        cpf: cpf,
        phone: phone,
        paymentMethod: 'PIX',
        amount: amountInCents,
        items: data.items || [{
          title: 'Kit de Segurança Shopee',
          quantity: 1,
          unitPrice: amountInCents,
          tangible: true
        }]
      };
      
      console.log('Enviando dados para API For4Payments');
      
      // Configurar headers
      const headers = {
        'Authorization': this.secretKey, // A API espera apenas o token sem o prefixo 'Bearer'
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Cache-Buster': Date.now().toString(),
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      };
      
      // Chamar API For4Payments
      const response = await axios.post(
        `${this.API_URL}/transaction.purchase`,
        paymentData,
        { headers, timeout: 30000 }
      );
      
      console.log('Resposta da API For4Payments:', response.status);
      
      if (response.status === 200) {
        // Extrair dados da resposta
        const responseData = response.data;
        console.log('Dados da transação recebidos');
        
        // Mapeamento de campos de resposta para lidar com diferentes formatos
        let pixCode = null;
        let pixQrCode = null;
        
        // Verificar campos de código PIX em vários formatos possíveis
        if (responseData.pixCode) pixCode = responseData.pixCode;
        else if (responseData.copy_paste) pixCode = responseData.copy_paste;
        else if (responseData.code) pixCode = responseData.code;
        else if (responseData.pix_code) pixCode = responseData.pix_code;
        else if (responseData.pix?.code) pixCode = responseData.pix.code;
        else if (responseData.pix?.copy_paste) pixCode = responseData.pix.copy_paste;
        else if (responseData.pix?.pixCode) pixCode = responseData.pix.pixCode;
        
        // Verificar campos de QR code em vários formatos possíveis
        if (responseData.pixQrCode) pixQrCode = responseData.pixQrCode;
        else if (responseData.qr_code_image) pixQrCode = responseData.qr_code_image;
        else if (responseData.qr_code) pixQrCode = responseData.qr_code;
        else if (responseData.pix_qr_code) pixQrCode = responseData.pix_qr_code;
        else if (responseData.pix?.qrCode) pixQrCode = responseData.pix.qrCode;
        else if (responseData.pix?.qr_code_image) pixQrCode = responseData.pix.qr_code_image;
        else if (responseData.pix?.pixQrCode) pixQrCode = responseData.pix.pixQrCode;
        
        // Caso não haja QR code na resposta, gere um
        if (!pixQrCode && pixCode) {
          pixQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;
        }
        
        // Verificar e organizar a resposta final
        if (!pixCode) {
          throw new Error('Código PIX não encontrado na resposta da API');
        }
        
        // Formar resposta final
        const result: PaymentResponse = {
          id: responseData.id || responseData.transactionId || `tx_${Date.now()}`,
          pixCode: pixCode,
          pixQrCode: pixQrCode || '',
          status: responseData.status || 'pending'
        };
        
        console.log('Transação PIX processada com sucesso:',
          result.id,
          'Código PIX gerado com',
          result.pixCode ? result.pixCode.length : 0,
          'caracteres'
        );
        
        return result;
      } else {
        throw new Error(`Erro ao processar pagamento: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Erro na API For4Payments:', error.message);
      
      if (error.response) {
        console.error('Detalhes do erro:', error.response.data);
      }
      
      // Não usamos mais geração de fallback conforme solicitado pelo cliente
      
      throw new Error(error.message || 'Erro ao processar pagamento');
    }
  }
  
  // Método auxiliar para gerar email aleatório quando não fornecido
  private generateRandomEmail(name: string): string {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${cleanName}${randomNum}@${domain}`;
  }
  
  // Método auxiliar para gerar telefone aleatório quando não fornecido
  private generateRandomPhone(): string {
    const ddd = Math.floor(Math.random() * (99 - 11 + 1) + 11).toString();
    const number = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    return `${ddd}${number}`;
  }
}

// Exportar instância única do serviço
export const paymentService = new PaymentService();