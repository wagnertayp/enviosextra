// Teste da integração direta com For4Payments
import fetch from 'node-fetch';

// Função para testar a integração direta For4Payments
async function testarIntegracaoDireta() {
  console.log('Testando integração direta com For4Payments (/transaction.purchase)...');
  
  // Limpar o telefone - remover todos os caracteres não numéricos
  const telefoneFormatado = "(11) 99856-7892".replace(/\D/g, '');
  
  // API URL da For4Payments
  const apiUrl = 'https://app.for4payments.com.br/api/v1/transaction.purchase';
  
  // Obter a chave secreta do ambiente
  const secretKey = process.env.VITE_FOR4PAYMENTS_SECRET_KEY;
  
  if (!secretKey) {
    console.error('❌ Teste direto: Falha - VITE_FOR4PAYMENTS_SECRET_KEY não configurada');
    return;
  }
  
  const amount = 84.70;
  const amountInCents = Math.round(amount * 100);
  
  const payload = {
    name: "Almir Santos",
    email: "almirpcc1@gmail.com",
    cpf: "03939004103",
    phone: telefoneFormatado, // Apenas números: 11998567892
    paymentMethod: "PIX",
    amount: amountInCents,
    items: [{
      title: "Kit de Segurança",
      quantity: 1,
      unitPrice: amountInCents,
      tangible: false
    }]
  };
  
  try {
    console.log('Enviando requisição direta para For4Payments...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': secretKey, // A API espera apenas o token sem o prefixo 'Bearer'
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}`, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Resposta da For4Payments (direto):', data);
    
    // Extrair os campos relevantes
    let pixCode = null;
    let pixQrCode = null;
    let transactionId = data.id || data.transactionId || '';
    
    // Verificar campos no primeiro nível
    if (data.pixCode) pixCode = data.pixCode;
    else if (data.copy_paste) pixCode = data.copy_paste;
    else if (data.code) pixCode = data.code;
    else if (data.pix_code) pixCode = data.pix_code;
    
    if (data.pixQrCode) pixQrCode = data.pixQrCode;
    else if (data.qr_code_image) pixQrCode = data.qr_code_image;
    else if (data.qr_code) pixQrCode = data.qr_code;
    else if (data.pix_qr_code) pixQrCode = data.pix_qr_code;
    
    // Verificar em estrutura aninhada (pix)
    if (!pixCode && data.pix && typeof data.pix === 'object') {
      const pixData = data.pix;
      
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
    if (pixCode && pixQrCode) {
      console.log('✅ Teste direto: OK');
      console.log('Código PIX:', pixCode.substring(0, 30) + '...');
      console.log('QR Code URL disponível');
    } else {
      console.log('❌ Teste direto: Falha - Resposta incompleta');
      console.log('Dados recebidos:', data);
    }
  } catch (error) {
    console.error('❌ Teste direto: Falha', error.message);
  }
}

// Executar testes
async function executarTestes() {
  console.log('Iniciando testes de integração For4Payments (direto)');
  console.log('==================================================');
  
  await testarIntegracaoDireta();
  
  console.log('==================================================');
  console.log('Testes concluídos');
}

// Executar
executarTestes().catch(console.error);