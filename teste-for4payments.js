// Teste da integração com For4Payments
import fetch from 'node-fetch';

// Função para testar a integração via proxy Heroku
async function testarViaProxy() {
  console.log('Testando integração via proxy Heroku (/api/proxy/for4payments/pix)...');
  
  // Limpar o telefone - remover todos os caracteres não numéricos
  const telefoneFormatado = "(11) 99856-7892".replace(/\D/g, '');
  
  const payloadTeste = {
    name: "Almir Santos",
    cpf: "03939004103",
    email: "almirpcc1@gmail.com",
    phone: telefoneFormatado, // Apenas números: 11998567892
    amount: 84.70
  };
  
  try {
    const response = await fetch('http://localhost:5000/api/proxy/for4payments/pix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payloadTeste)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}`, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Resposta do proxy:', data);
    
    // Verificar dados necessários
    if (data.pixCode && data.pixQrCode) {
      console.log('✅ Teste via proxy: OK');
      console.log('Código PIX:', data.pixCode.substring(0, 30) + '...');
      console.log('QR Code URL disponível');
    } else {
      console.log('❌ Teste via proxy: Falha - Resposta incompleta');
      console.log('Dados recebidos:', data);
    }
  } catch (error) {
    console.error('❌ Teste via proxy: Falha', error.message);
  }
}

// Executar testes
async function executarTestes() {
  console.log('Iniciando testes de integração For4Payments');
  console.log('==================================================');
  
  await testarViaProxy();
  
  console.log('==================================================');
  console.log('Testes concluídos');
}

// Executar
executarTestes().catch(console.error);