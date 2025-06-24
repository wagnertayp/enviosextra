/**
 * Cliente direto para a For4Payments API
 * Para uso quando o secret está disponível como variável de ambiente na Netlify
 */

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

// Gerar email aleatório para casos onde o email não é fornecido
function generateRandomEmail(name: string): string {
  const username = name.toLowerCase().replace(/\s+/g, '.').substring(0, 15);
  const randomString = Math.random().toString(36).substring(2, 10);
  return `${username}.${randomString}@mail.shopee.br`;
}

// Gerar telefone aleatório para casos onde o telefone não é fornecido
function generateRandomPhone(): string {
  const ddd = Math.floor(Math.random() * (99 - 11) + 11);
  const numero1 = Math.floor(Math.random() * (99999 - 10000) + 10000);
  const numero2 = Math.floor(Math.random() * (9999 - 1000) + 1000);
  return `${ddd}${numero1}${numero2}`;
}

/**
 * Cria um pagamento PIX diretamente pelo frontend usando a API For4Payments
 * 
 * ATENÇÃO: Isto deve ser usado apenas quando FOR4PAYMENTS_SECRET_KEY está 
 * configurada no ambiente Netlify como variável segura.
 */
export async function createPixPaymentDirect(data: PaymentRequest): Promise<PaymentResponse> {
  // Obter SECRET_KEY da variável de ambiente definida na Netlify
  const secretKey = import.meta.env.VITE_FOR4PAYMENTS_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('VITE_FOR4PAYMENTS_SECRET_KEY não configurada no ambiente. Configure nas Environment Variables da Netlify.');
  }
  
  // URL da API For4Payments
  const apiUrl = 'https://app.for4payments.com.br/api/v1/transaction.purchase';
  
  console.log(`Criando pagamento PIX diretamente via For4Payments`);
  
  try {
    // Montar o payload da requisição conforme formato exigido pela API
    const amount = data.amount || 79.90; // Valor padrão para o kit de segurança
    const amountInCents = Math.round(amount * 100); // Converter para centavos
    
    // Processar CPF - remover caracteres não numéricos
    const cpf = data.cpf.replace(/[^0-9]/g, '');
    
    // Processar telefone - remover caracteres não numéricos
    const phone = data.phone ? data.phone.replace(/\D/g, '') : generateRandomPhone();
    
    const payload = {
      name: data.name,
      email: data.email || generateRandomEmail(data.name),
      cpf: cpf,
      phone: phone, // Telefone limpo, apenas números
      paymentMethod: "PIX",
      amount: amountInCents,
      items: [{
        title: "Crachá Shopee + Treinamento Exclusivo",
        quantity: 1,
        unitPrice: amountInCents,
        tangible: false
      }]
    };
    
    console.log('Enviando requisição para For4Payments:', {
      ...payload,
      cpf: `${cpf.substring(0, 3)}***${cpf.substring(cpf.length - 2)}`,
    });
    
    // Configurar e enviar a requisição para a For4Payments API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': secretKey, // A API espera apenas o token sem o prefixo 'Bearer'
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(payload)
    });
    
    // Verificar se a resposta foi bem sucedida
    if (!response.ok) {
      throw new Error(`Falha na comunicação com For4Payments: ${response.statusText}`);
    }
    
    // Processar a resposta
    const responseData = await response.json();
    console.log('Resposta da For4Payments recebida:', responseData);
    
    // Extrair os campos relevantes conforme os possíveis formatos da resposta
    // Baseado no código Python, a resposta pode vir em várias estruturas
    let pixCode = null;
    let pixQrCode = null;
    let transactionId = responseData.id || responseData.transactionId || '';
    
    // Verificar campos no primeiro nível
    if (responseData.pixCode) pixCode = responseData.pixCode;
    else if (responseData.copy_paste) pixCode = responseData.copy_paste;
    else if (responseData.code) pixCode = responseData.code;
    else if (responseData.pix_code) pixCode = responseData.pix_code;
    
    if (responseData.pixQrCode) pixQrCode = responseData.pixQrCode;
    else if (responseData.qr_code_image) pixQrCode = responseData.qr_code_image;
    else if (responseData.qr_code) pixQrCode = responseData.qr_code;
    else if (responseData.pix_qr_code) pixQrCode = responseData.pix_qr_code;
    
    // Verificar em estrutura aninhada (pix)
    if (!pixCode && responseData.pix && typeof responseData.pix === 'object') {
      const pixData = responseData.pix;
      
      if (pixData.code) pixCode = pixData.code;
      else if (pixData.copy_paste) pixCode = pixData.copy_paste;
      else if (pixData.pixCode) pixCode = pixData.pixCode;
      
      if (!pixQrCode) {
        if (pixData.qrCode) pixQrCode = pixData.qrCode;
        else if (pixData.qr_code_image) pixQrCode = pixData.qr_code_image;
        else if (pixData.pixQrCode) pixQrCode = pixData.pixQrCode;
      }
    }
    
    // Validar a resposta
    if (!pixCode || !pixQrCode) {
      console.error('Resposta da For4Payments incompleta:', responseData);
      throw new Error('Resposta da For4Payments não contém os dados de pagamento PIX necessários');
    }
    
    return {
      id: transactionId,
      pixCode: pixCode,
      pixQrCode: pixQrCode
    };
  } catch (error: any) {
    console.error('Erro ao processar pagamento direto:', error);
    // Propagar o erro para que o caller possa tentar com o Heroku
    throw new Error(error.message || 'Não foi possível processar o pagamento no momento');
  }
}