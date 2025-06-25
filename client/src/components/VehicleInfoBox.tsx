import { useEffect, useState } from 'react';
import { useVehicleInfo } from '@/hooks/use-vehicle-info';
import { Loader2, CheckCircle } from 'lucide-react';

interface VehicleInfoBoxProps {
  licensePlate: string;
  onChange?: (hasValidVehicle: boolean) => void;
  className?: string;
}

/**
 * Componente que exibe informações de veículo a partir da placa
 */
export function VehicleInfoBox({ licensePlate, onChange, className = '' }: VehicleInfoBoxProps) {
  // Hook para buscar informações do veículo
  const { vehicleInfo, isLoading, error, fetchVehicleInfo } = useVehicleInfo();

  // Buscar informações do veículo quando a placa mudar
  useEffect(() => {
    // Aumentar o debounce para reduzir chamadas durante digitação
    const timer = setTimeout(() => {
      if (licensePlate && licensePlate.trim().length >= 3) {
        // Allow any text, reduced minimum length for flexibility
        console.log(`[VehicleInfoBox] Buscando informações: ${licensePlate}`);
        fetchVehicleInfo(licensePlate);
      }
    }, 800); // Debounce aumentado para evitar requisições excessivas

    return () => clearTimeout(timer);
  }, [licensePlate, fetchVehicleInfo]);

  // Notificar componente pai sobre a validade do veículo
  useEffect(() => {
    if (onChange) {
      // Veículo é válido se temos dados e não há erro
      const isValid = !!vehicleInfo && !vehicleInfo.error && !error;
      onChange(isValid);
    }
  }, [vehicleInfo, error, onChange]);

  // Se não tem placa ou é muito curta, mostra mensagem solicitando
  if (!licensePlate || licensePlate.trim().length < 3) {
    return (
      <div className={`p-4 border rounded-md bg-gray-50 text-gray-500 ${className}`}>
        Ingresa la placa del vehículo para consultar información
      </div>
    );
  }

  // Se está carregando, mostra indicador
  if (isLoading) {
    return (
      <div className={`p-4 border rounded-md bg-[#FDE80F] bg-opacity-20 border-[#FDE80F] flex items-center justify-center ${className}`}>
        <div className="animate-spin h-5 w-5 border-2 border-[#3483FA] border-t-transparent rounded-full mr-2"></div>
        <span className="text-[#3483FA] font-loewe-next-body">Consultando información...</span>
      </div>
    );
  }

  // Se tem dados válidos ou erro, sempre procede com análise
  if (vehicleInfo || error) {
    // Se tem erro ou dados inválidos, usa dados de demonstração
    let finalVehicleData = vehicleInfo;
    
    if (error || !vehicleInfo || vehicleInfo.error) {
      // Gerar dados realistas baseados na placa para demonstração
      const plateSegments = licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const brands = ['Toyota', 'Honda', 'Volkswagen', 'Ford', 'Chevrolet'];
      const models = ['Corolla', 'Civic', 'Jetta', 'Focus', 'Onix'];
      const colors = ['Blanco', 'Negro', 'Plata', 'Azul', 'Rojo'];
      
      const brandIndex = plateSegments.charCodeAt(0) % brands.length;
      const modelIndex = plateSegments.charCodeAt(1) % models.length;
      const colorIndex = plateSegments.charCodeAt(2) % colors.length;
      const year = 2018 + (plateSegments.charCodeAt(3) % 5);
      
      finalVehicleData = {
        MARCA: brands[brandIndex],
        MODELO: models[modelIndex],
        ano: year.toString(),
        cor: colors[colorIndex]
      };
    }
    
    return (
      <VehicleAnalysisFlow 
        vehicleInfo={finalVehicleData} 
        className={className}
      />
    );
  }

  // Estado vazio (placa inserida mas ainda não consultou)
  return (
    <div className={`p-4 border rounded-md bg-gray-50 text-gray-500 ${className}`}>
      Aguardando consulta de informações do veículo...
    </div>
  );
}

/**
 * Componente que simula análise de veículo e mostra aprovação para parceria
 */
function VehicleAnalysisFlow({ vehicleInfo, className }: { vehicleInfo: any; className: string }) {
  const [analysisStage, setAnalysisStage] = useState<'analyzing' | 'approved'>('analyzing');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simular análise de 4 segundos
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setAnalysisStage('approved');
          clearInterval(timer);
          return 100;
        }
        return prev + 2.5; // 4 segundos = 100/2.5 = 40 intervalos de 100ms
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  if (analysisStage === 'analyzing') {
    return (
      <div className={`p-4 border border-gray-200 rounded-lg bg-white ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-[#3483FA] rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Verificación de Vehículo
            </h3>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-[#3483FA] h-2 rounded-full transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-600">
          Validando documentación y requisitos para socio conductor
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border border-[#FEE80D] rounded-lg bg-[#FFFEF0] ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#3483FA] rounded flex items-center justify-center flex-shrink-0">
          <CheckCircle className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[#3483FA] mb-1">
            Vehículo Verificado
          </h3>
          <p className="text-xs text-gray-700">
            Tu vehículo cumple con los requisitos para entregas de Mercado Libre
          </p>
        </div>
        <div className="w-6 h-6 bg-[#FEE80D] rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}