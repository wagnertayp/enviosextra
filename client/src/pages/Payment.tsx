import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { useScrollTop } from '@/hooks/use-scroll-top';
import { API_BASE_URL } from '../lib/api-config';
import { initFacebookPixel, trackPurchase, checkPaymentStatus } from '@/lib/facebook-pixel';
import ConversionTracker from '@/components/ConversionTracker';

import pixLogo from '../assets/pix-logo.png';
import kitEpiImage from '../assets/kit-epi-new.webp';

interface PaymentInfo {
  id: string;
  pixCode: string;
  pixQrCode: string;
  timeLeft?: number;
  status?: string;
  approvedAt?: string;
  rejectedAt?: string;
  facebookReported?: boolean;
}

// Definir um tipo auxiliar para atualizações de estado mais seguras
type PaymentInfoUpdate = Partial<PaymentInfo> & { id: string; pixCode: string; pixQrCode: string; }

const Payment: React.FC = () => {
  useScrollTop();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutos em segundos
  const timerRef = useRef<number | null>(null);
  
  // Informações do usuário
  const [name, setName] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Buscar parâmetros da URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const emailParam = urlParams.get('email');
    
    if (!id || !emailParam) {
      setErrorMessage('Link de pagamento inválido. Verifique o link recebido por email.');
      setIsLoading(false);
      return;
    }
    
    setEmail(emailParam);
    fetchPaymentInfo(id);
  }, []);

  // Buscar informações de pagamento da API e priorizar verificação direta no frontend (Netlify)
  const fetchPaymentInfo = async (id: string, checkStatus: boolean = false) => {
    try {
      setIsLoading(true);
      
      // Primeiro, obter os dados básicos do pagamento do backend
      const url = `${API_BASE_URL}/api/payments/${id}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Não foi possível recuperar as informações de pagamento');
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Extrair nome e CPF das informações recuperadas
      if (data.name) setName(data.name);
      if (data.cpf) setCpf(data.cpf);
      
      // Atualizar as informações básicas do pagamento
      setPaymentInfo({
        id: data.id,
        pixCode: data.pixCode,
        pixQrCode: data.pixQrCode,
        status: data.status || 'PENDING',
        approvedAt: data.approvedAt,
        rejectedAt: data.rejectedAt,
        facebookReported: data.facebookReported
      });
      
      // Se a verificação de status estiver ativada, verifica diretamente na For4Payments (frontend)
      if (checkStatus) {
        console.log('[PAYMENT] Verificando status diretamente do frontend...');
        
        // Obter a chave de API For4Payments via variável de ambiente específica para frontend
        // Esta variável deve ser configurada no arquivo .env com VITE_FOR4PAYMENTS_SECRET_KEY
        const apiKey = import.meta.env.VITE_FOR4PAYMENTS_SECRET_KEY;
        
        if (apiKey) {
          try {
            // Usar a nova função que verifica diretamente do frontend
            const { success, data: statusData, approved } = await checkPaymentStatus(id, apiKey);
            
            if (success && statusData) {
              console.log('[PAYMENT] Status obtido diretamente:', statusData);
              
              // Atualizar o status local
              setPaymentInfo(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  status: statusData.status || prev.status || 'PENDING',
                  approvedAt: statusData.approvedAt || prev.approvedAt,
                  rejectedAt: statusData.rejectedAt || prev.rejectedAt
                };
              });
              
              // Verificar se está aprovado usando o retorno 'approved' ou verificando o status
              const isApproved = approved || (
                statusData.status && 
                ['APPROVED', 'approved', 'PAID', 'paid', 'COMPLETED', 'completed'].includes(
                  statusData.status.toUpperCase()
                )
              );
              
              // Se aprovado, relatar diretamente do frontend para o Facebook
              if (isApproved) {
                console.log('[PAYMENT] Pagamento APROVADO! Rastreando do frontend...');
                
                // Inicializar o Facebook Pixel e rastrear o evento explicitamente
                initFacebookPixel();
                
                // Calcular o valor de forma robusta
                let amount = 79.90; // Valor padrão
                if (statusData.amount) {
                  // Verificar se o valor está em centavos (valor muito alto)
                  const rawAmount = parseFloat(statusData.amount);
                  amount = rawAmount > 1000 ? rawAmount / 100 : rawAmount;
                }
                
                // Rastrear a compra com diferentes abordagens para garantir recebimento
                trackPurchase(id, amount);
                
                // Também notifica o backend para fins de registro
                try {
                  await fetch(`${API_BASE_URL}/api/payments/${id}/check-status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                  });
                } catch (err) {
                  console.warn('[PIXEL] Falha ao notificar backend, mas evento já foi enviado do frontend:', err);
                }
                
                // Mostra um feedback adicional para o usuário através de um toast
                toast({
                  title: "Pagamento Confirmado",
                  description: "Seu pagamento foi processado com sucesso!",
                  variant: "default",
                });
              }
            }
          } catch (directError) {
            console.error('[PAYMENT] Erro ao verificar status diretamente:', directError);
            
            // Se falhar a verificação direta, tentar via backend como fallback
            try {
              const backendCheckUrl = `${API_BASE_URL}/api/payments/${id}?check_status=true`;
              const backendResponse = await fetch(backendCheckUrl);
              if (backendResponse.ok) {
                const backendData = await backendResponse.json();
                
                // Atualizar o estado com os dados do backend
                setPaymentInfo(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    status: backendData.status || prev.status || 'PENDING',
                    approvedAt: backendData.approvedAt || prev.approvedAt,
                    rejectedAt: backendData.rejectedAt || prev.rejectedAt,
                    facebookReported: backendData.facebookReported || prev.facebookReported
                  };
                });
                
                // Lista de status que podem ser considerados "aprovados"
                const approvedStatusList = ['APPROVED', 'approved', 'PAID', 'paid', 'COMPLETED', 'completed'];
                
                // Verificar se está aprovado
                const isApproved = backendData.status && approvedStatusList.includes(backendData.status.toUpperCase());
                
                // Se aprovado via backend, relatar via frontend de qualquer forma
                if (isApproved && !backendData.facebookReported) {
                  console.log('[PAYMENT] Pagamento aprovado via backend. Rastreando do frontend...');
                  initFacebookPixel();
                  
                  // Calcular o valor de forma robusta
                  let amount = 79.90; // Valor padrão
                  if (backendData.amount) {
                    const rawAmount = parseFloat(backendData.amount);
                    amount = rawAmount > 1000 ? rawAmount / 100 : rawAmount;
                  }
                  
                  trackPurchase(id, amount);
                  
                  // Notificar o usuário
                  toast({
                    title: "Pagamento Confirmado",
                    description: "Seu pagamento foi processado com sucesso!",
                    variant: "default",
                  });
                }
              }
            } catch (backendError) {
              console.error('[PAYMENT] Erro também no fallback:', backendError);
            }
          }
        } else {
          // Sem a chave API no frontend, fazemos a verificação via backend
          console.log('[PAYMENT] Sem acesso à chave API no frontend, verificando via backend...');
          const backendCheckUrl = `${API_BASE_URL}/api/payments/${id}?check_status=true`;
          try {
            const backendResponse = await fetch(backendCheckUrl);
            if (backendResponse.ok) {
              const backendData = await backendResponse.json();
              
              // Atualizar o estado com os dados do backend
              setPaymentInfo(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  status: backendData.status || prev.status || 'PENDING',
                  approvedAt: backendData.approvedAt || prev.approvedAt,
                  rejectedAt: backendData.rejectedAt || prev.rejectedAt,
                  facebookReported: backendData.facebookReported || prev.facebookReported
                };
              });
              
              // Se aprovado, garantir que o evento seja enviado do frontend
              if (backendData.status === 'APPROVED') {
                initFacebookPixel();
                trackPurchase(id, 79.90);
              }
            }
          } catch (backendError) {
            console.error('[PAYMENT] Erro na verificação via backend:', backendError);
          }
        }
      }
    } catch (error: any) {
      console.error('Erro ao recuperar informações de pagamento:', error);
      setErrorMessage(error.message || 'Ocorreu um erro ao carregar as informações de pagamento.');
    } finally {
      setIsLoading(false);
    }
  };

  // Configurar o cronômetro e verificação periódica de status
  useEffect(() => {
    // Referência para o intervalo de verificação de status
    let statusCheckInterval: number | null = null;
    
    if (paymentInfo) {
      // Configurar o cronômetro de contagem regressiva
      if (timeLeft > 0 && paymentInfo.status !== 'APPROVED' && paymentInfo.status !== 'REJECTED') {
        timerRef.current = window.setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000) as unknown as number;
      }
      
      // Verificar o status do pagamento periodicamente (a cada 15 segundos)
      // apenas se o pagamento não estiver aprovado ou rejeitado
      if (paymentInfo.status !== 'APPROVED' && paymentInfo.status !== 'REJECTED') {
        console.log('[PAYMENT] Iniciando verificação periódica de status...');
        statusCheckInterval = window.setInterval(() => {
          console.log('[PAYMENT] Verificando status do pagamento...');
          fetchPaymentInfo(paymentInfo.id, true);
        }, 15000) as unknown as number;
      } else {
        console.log(`[PAYMENT] Pagamento com status ${paymentInfo.status}. Parando verificações.`);
      }
    }
    
    // Limpar intervalos quando o componente for desmontado ou quando o status mudar
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (statusCheckInterval) clearInterval(statusCheckInterval);
    };
  }, [paymentInfo?.id, paymentInfo?.status, timeLeft]);
  
  // Inicializar o Facebook Pixel quando o componente é montado
  useEffect(() => {
    // Inicializar o Facebook Pixel apenas uma vez quando o componente é montado
    initFacebookPixel();
  }, []);

  // Formatar o tempo restante
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Copiar código PIX para área de transferência
  const copiarCodigoPix = () => {
    if (paymentInfo?.pixCode) {
      navigator.clipboard.writeText(paymentInfo.pixCode);
      toast({
        title: "Código PIX copiado!",
        description: "O código PIX foi copiado para a área de transferência.",
      });
    }
  };

  // Verifica se o pagamento está aprovado para rastrear conversão
  const isApproved = paymentInfo?.status && 
    ['APPROVED', 'approved', 'PAID', 'paid', 'COMPLETED', 'completed'].includes(
      paymentInfo.status.toUpperCase()
    );

  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Componente de rastreamento de conversão que não renderiza nada visualmente */}
      {isApproved && (
        <ConversionTracker 
          transactionId={paymentInfo.id} 
          amount={79.90} 
          enabled={true} 
        />
      )}
      
      <Header />
      
      <div className="w-full bg-[#EE4E2E] py-1 px-6 flex items-center relative overflow-hidden">
        {/* Meia-lua no canto direito */}
        <div className="absolute right-0 top-0 bottom-0 w-32 h-full rounded-l-full bg-[#E83D22]"></div>
        
        <div className="flex items-center relative z-10">
          <div className="text-white mr-3">
            <i className="fas fa-chevron-right text-3xl font-black" style={{color: 'white'}}></i>
          </div>
          <div className="leading-none">
            <h1 className="text-base font-bold text-white mb-0">Pagamento Personalizado</h1>
            <p className="text-white text-sm mt-0" style={{transform: 'translateY(-2px)'}}>Shopee</p>
          </div>
        </div>
      </div>
      
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <div className="bg-[#FFF8F6] p-4 border-b border-[#E83D2220]">
              <h3 className="font-semibold text-[#E83D22] text-center">Pagamento do Kit de Segurança</h3>
            </div>
            
            <div className="p-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-[#E83D22]">
                    <Spinner size="lg" />
                  </div>
                  <p className="mt-4 text-gray-600">Carregando informações de pagamento...</p>
                </div>
              ) : errorMessage ? (
                <div className="py-8 text-center">
                  <div className="text-red-500 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Erro no Pagamento</h3>
                  <p className="text-gray-600 mb-6">{errorMessage}</p>
                  <Button
                    onClick={() => setLocation('/')}
                    className="bg-[#E83D22] hover:bg-[#d73920]"
                  >
                    Voltar para a Página Inicial
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cabeçalho com imagem e dados */}
                  <div className="flex flex-row gap-3 items-start">
                    <div className="flex-shrink-0">
                      <img 
                        src={kitEpiImage} 
                        alt="Kit EPI Shopee" 
                        className="w-20 rounded-md"
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-sm font-medium text-gray-800">Kit de Segurança Oficial</h3>
                      <p className="text-lg font-bold text-[#E83D22]">R$ 64,90</p>
                      
                      <div className="w-full mt-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Nome:</span> {name}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">CPF:</span> {cpf}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Email:</span> {email}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status de pagamento dinâmico baseado no status */}
                  {paymentInfo?.status === 'APPROVED' ? (
                    <div className="flex items-center justify-center gap-2 py-3 bg-[#e7ffe7] rounded-md border border-green-200">
                      <div className="text-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-medium">
                          Pagamento Aprovado!
                        </p>
                        <p className="text-xs text-gray-500">
                          Seu cadastro foi atualizado com sucesso.
                        </p>
                      </div>
                    </div>
                  ) : paymentInfo?.status === 'REJECTED' ? (
                    <div className="flex items-center justify-center gap-2 py-3 bg-[#ffeeee] rounded-md border border-red-200">
                      <div className="text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-medium">
                          Pagamento Rejeitado
                        </p>
                        <p className="text-xs text-gray-500">
                          Por favor, tente novamente ou contate o suporte.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-2 bg-[#fff8f6] rounded-md">
                      <div className="text-[#E83D22] animate-spin">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-700 font-medium">
                        Aguardando pagamento PIX...
                      </p>
                    </div>
                  )}
                  
                  {/* QR Code e demais detalhes de pagamento - mostrados apenas se não estiver aprovado ou rejeitado */}
                  {(!paymentInfo?.status || paymentInfo?.status === 'PENDING') && (
                    <>
                      {/* QR Code */}
                      <div className="flex flex-col items-center">
                        <div className="mb-2">
                          <img 
                            src={pixLogo}
                            alt="PIX Logo"
                            className="h-8 mb-2 mx-auto"
                          />
                        </div>
                        
                        <img 
                          src={paymentInfo?.pixQrCode} 
                          alt="QR Code PIX" 
                          className="w-full max-w-[200px] h-auto mx-auto"
                        />
                        
                        {/* Tempo restante */}
                        <div className="bg-[#fff3e6] border-[#E83D22] border p-2 rounded-md mt-3 w-[80%] mx-auto">
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-[#E83D22]">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                            </div>
                            <div className="flex flex-col">
                              <p className="text-sm text-gray-700 font-medium">
                                PIX expira em <span className="text-[#E83D22] font-bold">{formatTime(timeLeft)}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Código PIX e botão copiar */}
                      <div className="mt-4">
                        <p className="text-sm text-gray-700 mb-2 font-medium text-center">
                          Copie o código PIX e pague no seu aplicativo de banco:
                        </p>
                        <div className="relative">
                          <div 
                            className="bg-gray-50 p-3 rounded-md border border-gray-200 text-sm text-gray-600 break-all pr-12 max-h-[80px] overflow-y-auto"
                          >
                            {paymentInfo?.pixCode}
                          </div>
                          <Button
                            variant="ghost"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 text-[#E83D22] hover:text-[#d73920] p-1"
                            onClick={copiarCodigoPix}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Se aprovado, mostrar mensagem de sucesso */}
                  {paymentInfo?.status === 'APPROVED' && (
                    <div className="flex flex-col items-center justify-center p-6 bg-[#f8fff8] rounded-md border border-green-100 mt-4">
                      <div className="text-green-500 mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Pagamento Confirmado!</h3>
                      <p className="text-center text-gray-600 mb-4">
                        Seu pagamento foi processado com sucesso. Seu cadastro foi atualizado 
                        e você será contatado em breve para as próximas etapas.
                      </p>
                      <Button
                        onClick={() => setLocation('/')}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        Voltar para a Página Inicial
                      </Button>
                    </div>
                  )}
                  
                  {/* Se rejeitado, mostrar mensagem de erro */}
                  {paymentInfo?.status === 'REJECTED' && (
                    <div className="flex flex-col items-center justify-center p-6 bg-[#fff8f8] rounded-md border border-red-100 mt-4">
                      <div className="text-red-500 mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Pagamento Rejeitado</h3>
                      <p className="text-center text-gray-600 mb-4">
                        Houve um problema com o seu pagamento. Por favor, tente novamente 
                        ou entre em contato com o suporte para assistência.
                      </p>
                      <Button
                        onClick={() => setLocation('/')}
                        className="bg-[#E83D22] hover:bg-[#d73920] text-white"
                      >
                        Voltar e Tentar Novamente
                      </Button>
                    </div>
                  )}
                  
                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                      Após o pagamento, o sistema atualizará automaticamente seu cadastro.
                      Você receberá um e-mail com a confirmação do pagamento.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Payment;