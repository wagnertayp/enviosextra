import axios from 'axios';

interface EmailData {
  recipient: string;
  subject: string;
  body: string;
  html: boolean;
}

/**
 * Serviço para envio de emails
 */
export class EmailService {
  private readonly API_URL = 'https://api-entregador.replit.app/api/send';
  private readonly API_KEY = '8c6638b0-7a89-4c3f-bd2c-2afd6d1e4123';
  
  /**
   * Envia um email para o destinatário
   */
  async sendEmail(data: EmailData): Promise<boolean> {
    try {
      console.log(`[EMAIL] Enviando email para ${data.recipient}...`);
      console.log(`[EMAIL] Assunto: ${data.subject}`);
      
      // Verificar se estamos em ambiente de produção ou desenvolvimento
      const isProduction = process.env.NODE_ENV === 'production';
      console.log(`[EMAIL] Ambiente: ${isProduction ? 'Produção' : 'Desenvolvimento'}`);
      
      // Log detalhado para depuração
      console.log(`[EMAIL] URL da API: ${this.API_URL}`);
      console.log(`[EMAIL] Dados do email:`, {
        recipient: data.recipient,
        subject: data.subject,
        htmlEnabled: data.html,
        bodyLength: data.body.length
      });
      
      // Adicionar timeout mais longo para ambiente de produção
      const response = await axios.post(
        this.API_URL, 
        data, 
        { 
          headers: { 
            'Content-Type': 'application/json',
            'X-API-Key': this.API_KEY,
            'User-Agent': 'ShopeeDeliveryApp/1.0'
          },
          timeout: 10000 // 10 segundos de timeout
        }
      );
      
      // Verificar se a resposta contém os dados esperados
      if (response.data && response.status === 200) {
        console.log(`[EMAIL] Resposta da API:`, response.data);
        console.log(`[EMAIL] Email enviado com sucesso para ${data.recipient}`);
        return true;
      } else {
        console.error(`[EMAIL] Resposta inesperada da API:`, response.data);
        return false;
      }
    } catch (error: any) {
      console.error('[EMAIL] Erro ao enviar email:', error.response?.data || error.message);
      if (error.response) {
        console.error('[EMAIL] Status do erro:', error.response.status);
        console.error('[EMAIL] Detalhes da resposta:', error.response.data);
      } else if (error.request) {
        console.error('[EMAIL] Erro na requisição (sem resposta do servidor):', error.request);
      } else {
        console.error('[EMAIL] Erro ao configurar a requisição:', error.message);
      }
      // Logar o erro completo para diagnóstico
      console.error('[EMAIL] Erro completo:', error);
      return false;
    }
  }
  
  /**
   * Envia o email de confirmação de pagamento PIX
   */
  async sendPaymentConfirmationEmail(params: {
    email: string;
    name: string;
    pixCode: string;
    pixQrCode: string;
    amount: number;
    formattedAmount: string;
    paymentLink: string;
  }): Promise<boolean> {
    const { email, name, pixCode, pixQrCode, amount, formattedAmount, paymentLink } = params;
    
    // Gerar a data de expiração (30 minutos a partir de agora)
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 30);
    
    const formattedExpiration = expirationDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Construir o corpo do email HTML - versão simplificada sem imagens para evitar spam
    const emailBody = `
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmação de Cadastro - Entregador Shopee</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #e84c3d; margin-bottom: 20px; font-size: 24px;">Confirmação de Cadastro - Entregador Shopee</h1>
    
    <p>Olá ${name},</p>
    
    <p>Seu cadastro para se tornar Entregador Parceiro Shopee foi aprovado com sucesso.</p>
    
    <p>Para finalizar seu processo de registro, você precisa realizar o pagamento do Kit de Segurança no valor de ${formattedAmount}.</p>
    
    <p>Acesse sua página de pagamento pessoal através do link abaixo:</p>
    
    <p style="margin: 30px 0; text-align: center;">
        <a href="${paymentLink}" style="background-color: #e84c3d; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Acessar Página de Pagamento</a>
    </p>
    
    <p><strong>Informações importantes:</strong></p>
    <ul>
        <li>O pagamento deve ser realizado via PIX</li>
        <li>O link expira em: ${formattedExpiration}</li>
        <li>O Kit de Segurança será entregue em até 5 dias úteis após confirmação do pagamento</li>
    </ul>
    
    <p>O kit contém todos os itens necessários para iniciar suas atividades como entregador parceiro.</p>
    
    <p>Atenciosamente,<br>
    Equipe Shopee</p>
    
    <hr style="border: 1px solid #eee; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #777;">
        Em caso de dúvidas, entre em contato conosco pelo email: suporte.entregador@shopee.com.br<br>
        Esta é uma mensagem automática, não responda este email.
    </p>
</body>
</html>
    `;
    
    return this.sendEmail({
      recipient: email,
      subject: "Cadastro Aprovado - Pagamento do Kit de Segurança Shopee",
      body: emailBody,
      html: true
    });
  }
}

export const emailService = new EmailService();