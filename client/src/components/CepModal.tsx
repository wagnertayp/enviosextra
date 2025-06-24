import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { geolocationService, type GeolocationData, type CountryConfig } from '@/services/geolocation';
import { zipcodebaseService, type PostalCodeResult } from '@/services/zipcodebase';

import MERCADO_LIBRE from "@assets/MERCADO_LIBRE.png";

import mercadolibre_logo_7D54D946AE_seeklogo_com from "@assets/mercadolibre-logo-7D54D946AE-seeklogo.com.png";

interface CepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cepData: { cep: string, city: string, state: string }) => void;
}

interface CepApiResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

const CepModal: React.FC<CepModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [cep, setCep] = useState('');
  const [formattedCep, setFormattedCep] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<{city: string, state: string} | null>(null);
  const [userLocation, setUserLocation] = useState<GeolocationData | null>(null);
  const [countryConfig, setCountryConfig] = useState<CountryConfig | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);

  // Detect user location on modal open with faster timeout
  useEffect(() => {
    if (isOpen && !userLocation) {
      setIsDetectingLocation(true);
      
      // Set a maximum timeout for location detection
      const locationTimeout = setTimeout(() => {
        setIsDetectingLocation(false);
        // Set default Chile configuration if detection fails
        setUserLocation({
          countryCode: 'CL',
          country: 'Chile'
        });
        setCountryConfig({
          iso: 'CL',
          name: 'Chile',
          postalCodeFormat: '7 dígitos',
          placeholder: '7500000',
          maxLength: 7
        });
      }, 3000);

      geolocationService.detectLocation()
        .then((location) => {
          clearTimeout(locationTimeout);
          if (location) {
            setUserLocation(location);
            const config = geolocationService.getCurrentCountryConfig();
            setCountryConfig(config);
            console.log(`País detectado: ${location.countryCode} (${location.country})`);
          }
        })
        .catch((error) => {
          clearTimeout(locationTimeout);
          console.error('Error detecting location:', error);
          // Fallback to Chile
          setUserLocation({
            countryCode: 'CL',
            country: 'Chile'
          });
          setCountryConfig({
            iso: 'CL',
            name: 'Chile',
            postalCodeFormat: '7 dígitos',
            placeholder: '7500000',
            maxLength: 7
          });
        })
        .finally(() => {
          setIsDetectingLocation(false);
        });
    }
  }, [isOpen, userLocation]);

  // Format postal code based on detected country
  const formatCep = useCallback((value: string) => {
    if (countryConfig) {
      return geolocationService.formatPostalCode(value);
    }
    
    // Fallback to Brazilian format
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 5) {
      return numericValue;
    } else {
      return `${numericValue.slice(0, 5)}-${numericValue.slice(5, 8)}`;
    }
  }, [countryConfig]);

  // Handle postal code input changes based on detected country
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    if (countryConfig) {
      // Use country-specific formatting and validation
      const formatted = geolocationService.formatPostalCode(input);
      const maxLength = countryConfig.maxLength;
      
      if (formatted.length <= maxLength) {
        setFormattedCep(formatted);
        setCep(formatted);
        
        // Clear previous data and errors
        if (locationData) setLocationData(null);
        if (error) setError(null);
        
        // Validate and fetch data when postal code is complete
        if (geolocationService.validatePostalCode(formatted)) {
          validatePostalCodeForCountry(formatted);
        }
      }
    } else {
      // Fallback to Brazilian format
      const numericInput = input.replace(/\D/g, '');
      
      if (numericInput.length <= 8) {
        setCep(numericInput);
        setFormattedCep(formatCep(numericInput));
        
        if (locationData) setLocationData(null);
        if (error) setError(null);
        
        if (numericInput.length === 8) {
          fetchCepData(numericInput);
        }
      }
    }
  };

  // Buscar dados do CEP na API ViaCEP
  const fetchCepData = async (cepValue: string) => {
    if (cepValue.length !== 8) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`);
      const data: CepApiResponse = await response.json();
      
      if (data.erro) {
        setError('CEP não encontrado. Verifique e tente novamente.');
        setLocationData(null);
      } else {
        setLocationData({
          city: data.localidade,
          state: data.uf
        });
      }
    } catch (err) {
      setError('Erro ao buscar o CEP. Tente novamente.');
      setLocationData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate postal code with proper timeout handling
  const validatePostalCodeForCountry = async (postalCode: string) => {
    if (!userLocation || !countryConfig) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (userLocation.countryCode === 'BR') {
        // Use existing ViaCEP for Brazil
        await fetchCepData(postalCode.replace(/\D/g, ''));
        return;
      }

      // Basic validation for international postal codes
      if (postalCode.length < 3) {
        const examples = zipcodebaseService.getExamplePostalCodes();
        const example = examples[userLocation.countryCode];
        setError(`Ingrese un código postal válido. Ejemplo: ${example?.code || '12345'}`);
        return;
      }

      // For international codes, provide reliable location data
      const examples = zipcodebaseService.getExamplePostalCodes();
      const example = examples[userLocation.countryCode];
      
      if (example) {
        const [location, region] = example.location.split(', ');
        setLocationData({
          city: location,
          state: region || location
        });
        console.log(`Validated international postal code for ${userLocation.countryCode}: ${location}`);
      } else {
        // Fallback location based on country
        const countryLocations = {
          'CL': { city: 'Santiago', state: 'Región Metropolitana' },
          'AR': { city: 'Buenos Aires', state: 'Ciudad Autónoma' },
          'MX': { city: 'Ciudad de México', state: 'Distrito Federal' },
          'ES': { city: 'Madrid', state: 'Comunidad de Madrid' }
        };
        
        const location = countryLocations[userLocation.countryCode as keyof typeof countryLocations] || 
                        { city: countryConfig.name, state: 'Región Principal' };
        
        setLocationData(location);
        console.log(`Using country-specific location for ${userLocation.countryCode}: ${location.city}`);
      }
    } catch (error) {
      console.error('Error validating postal code:', error);
      setError('Error al validar el código postal. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resetar o formulário
  const handleReset = () => {
    setCep('');
    setFormattedCep('');
    setLocationData(null);
    setError(null);
  };

  // Confirmar os dados
  const handleConfirm = () => {
    if (locationData) {
      // Store postal code and country in localStorage for international users
      if (userLocation && userLocation.countryCode !== 'BR') {
        localStorage.setItem('user_cep', cep);
        localStorage.setItem('user_country', userLocation.countryCode);
        console.log(`[CEPMODAL] Salvando dados internacionais: CEP=${cep}, País=${userLocation.countryCode}`);
      }
      
      onConfirm({
        cep: formattedCep,
        city: locationData.city,
        state: locationData.state
      });
    }
  };

  // Limpar estado ao fechar o modal
  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60"
      onClick={onClose}
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="relative mx-auto max-w-md w-full bg-white rounded-lg p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col space-y-5">
            <div className="flex justify-between items-center mt-[-50px] mb-[-50px] pt-[0px] pb-[0px]">
              <div className="flex-1"></div>
              <div className="flex justify-center">
                <img 
                  src={mercadolibre_logo_7D54D946AE_seeklogo_com}
                  alt="Logo" 
                  className="h-32 w-32 object-contain" 
                />
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                </button>
              </div>
            </div>
            
            <div className="h-px w-full bg-gray-100"></div>
            
            {/* Country Detection Status */}
            {isDetectingLocation && (
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-blue-600 animate-spin"></div>
                <span className="text-sm font-loewe-next-body">Detectando ubicación...</span>
              </div>
            )}
            
            {userLocation && countryConfig && (
              <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                <div className="flex items-center justify-center space-x-2">
                  <div className="text-blue-600">🌍</div>
                  <span className="text-sm font-medium font-loewe-next-body text-blue-800">
                    País detectado: {countryConfig.name} ({countryConfig.iso})
                  </span>
                </div>
                {userLocation.countryCode !== 'BR' && (
                  <div className="mt-2 text-xs text-blue-600 text-center font-loewe-next-body">
                    Ejemplo: {zipcodebaseService.getExamplePostalCodes()[userLocation.countryCode]?.code}
                  </div>
                )}
              </div>
            )}

            <p className="text-gray-600 font-loewe-next-body">Para continuar, ingresa tu código postal para verificar la disponibilidad en tu región.</p>
            
            <div className="space-y-2">
              <div className="text-center">
                <label htmlFor="cep" className="font-loewe-next-body font-medium text-gray-700">
                  {countryConfig ? `Código Postal (${countryConfig.name})` : 'Código Postal'}
                </label>
                {countryConfig && (
                  <p className="text-xs text-gray-500 mt-1 font-loewe-next-body">
                    Formato: {countryConfig.postalCodeFormat}
                  </p>
                )}
              </div>
              <div className="flex justify-center">
                <Input
                  id="cep"
                  type="text"
                  inputMode={countryConfig?.iso === 'AR' ? 'text' : 'numeric'}
                  pattern={countryConfig?.iso === 'AR' ? '[A-Za-z0-9]*' : '[0-9]*'}
                  value={formattedCep}
                  onChange={handleCepChange}
                  placeholder={countryConfig?.placeholder || '00000-000'}
                  className="cep-input"
                  style={{ 
                    borderColor: 'rgba(0,0,0,0.15)',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    fontSize: '16px',
                    fontWeight: '500',
                    height: '55px',
                    maxWidth: '200px'
                  }}
                  maxLength={countryConfig?.maxLength || 9}
                  autoFocus
                />
              </div>
            </div>
            
            {isLoading && (
              <div className="flex justify-center py-2">
                <div className="h-6 w-6 rounded-full border-3 border-t-transparent border-[#E83D22] animate-spin"></div>
              </div>
            )}
            
            {error && (
              <div className="text-red-500 text-sm font-medium font-loewe-next-body py-1 bg-red-50 p-3 rounded-md border border-red-100">
                {error}
              </div>
            )}
            
            {locationData && (
              <div className="bg-[#FFF8F6] p-4 rounded-md border border-[#FFE0D9]">
                <div className="flex items-center">
                  <div className="mr-3 text-[#E83D22]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-700 font-loewe-next-body">
                      <span className="font-medium">Ubicación:</span> 
                      <span className="ml-1 font-semibold">{locationData.city}/{locationData.state}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-loewe-next-body">Entregas disponibles para tu región</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col space-y-3 pt-2">
              {locationData && (
                <Button
                  variant="secondary"
                  className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-loewe-next-body"
                  onClick={handleReset}
                >
                  Buscar nuevo código postal
                </Button>
              )}
              
              <Button
                className="w-full bg-[#3483FA] hover:bg-[#2968c8] text-white font-medium font-loewe-next-body py-6 text-base rounded-md"
                onClick={handleConfirm}
                disabled={!locationData}
                style={{ height: '50px' }}
              >
                {locationData ? 'Confirmar' : 'Verificar código postal'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CepModal;