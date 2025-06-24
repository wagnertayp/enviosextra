import React from 'react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';

const AdvantagesSection: React.FC = () => {
  const { setShowCepModal } = useAppContext();

  const handleBecomePartner = () => {
    setShowCepModal(true);
  };
  return (
    <section className="bg-white py-16 px-4 pt-[1px] pb-[1px]">
      <div className="container mx-auto">
        {/* Call to action button */}
        <div className="text-center mt-[17px] mb-[17px]">
          <Button
            onClick={handleBecomePartner}
            className="bg-[#3483FA] hover:bg-[#2968C8] text-white font-semibold font-loewe-next-body px-12 py-4 text-lg rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            Hazte socio conductor
          </Button>
        </div>

        {/* YouTube Video */}
        <div className="text-center mb-12">
          <div className="max-w-4xl mx-auto mb-8">
            <iframe 
              className="w-full aspect-video rounded-2xl shadow-lg"
              src="https://www.youtube.com/embed/MH7B3J3sHTI" 
              title="¡Entrega paquetes con la App y dale ese EXTRA a tu vida!" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
            ></iframe>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto font-loewe-next-body text-[16px]">Únete a miles de repartidores que ya están transformando su tiempo en oportunidades lucrativas</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Section 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-6">
              <img 
                src="https://http2.mlstatic.com/frontend-assets/shipping-crowd-frontend/icons/calendar-yellow.svg" 
                alt="Elige qué días conducir" 
                className="w-20 h-16 mx-auto"
              />
            </div>
            <h3 className="text-xl font-loewe-next-heading text-[#0A2342] mb-3">
              Elige qué días conducir
            </h3>
            <p className="text-gray-600 font-loewe-next-body text-sm leading-relaxed max-w-xs">
              Todos los días habrá paquetes de usuarios para entregar, agrupados en recorridos y en diferentes horarios.
            </p>
          </div>

          {/* Section 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-6">
              <img 
                src="https://http2.mlstatic.com/frontend-assets/shipping-crowd-frontend/icons/diagram-yellow.svg" 
                alt="Gana hasta $1,000 por día" 
                className="w-20 h-16 mx-auto"
              />
            </div>
            <h3 className="text-xl font-loewe-next-heading text-[#0A2342] mb-3">
              Gana hasta $ 1,000* por día
            </h3>
            <p className="text-gray-600 font-loewe-next-body text-sm leading-relaxed max-w-xs mb-2">
              Conocerás la tarifa de cada recorrido antes de aceptarlo.
            </p>
            <p className="text-gray-500 font-loewe-next-body text-xs">
              *Incluye cargos e impuestos
            </p>
          </div>

          {/* Section 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-6">
              <img 
                src="https://http2.mlstatic.com/frontend-assets/shipping-crowd-frontend/icons/payapp-yellow.svg" 
                alt="Cobras sin cuenta bancaria" 
                className="w-20 h-16 mx-auto"
              />
            </div>
            <h3 className="text-xl font-loewe-next-heading text-[#0A2342] mb-3">
              Cobras sin cuenta bancaria
            </h3>
            <p className="text-gray-600 font-loewe-next-body text-sm leading-relaxed max-w-xs">
              Recibe el dinero por los servicios prestados en tu cuenta de Mercado Pago y disfruta de sus beneficios.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdvantagesSection;