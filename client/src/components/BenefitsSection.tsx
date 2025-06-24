import React from 'react';

const BenefitsSection: React.FC = () => {
  return (
    <section className="bg-white py-20 px-4 pt-[19px] pb-[19px]">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-[#222] text-2xl sm:text-3xl font-bold font-loewe-next-heading text-center mb-2">
            Conduce por tu ciudad entregando paquetes
          </h1>
          <p className="text-[#757575] text-base sm:text-lg font-loewe-next-body text-center mb-4">
            Descarga la app, configura tus preferencias y comienza a prestar servicios.
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[32px] md:left-[40px] top-[60px] bottom-0 w-px bg-[#E3EAFF] z-0"></div>
            
            {/* Step 1 */}
            <div className="flex items-start relative z-10 mb-12">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center border-2 border-[#3483FA] shadow-lg">
                  <img 
                    src="https://http2.mlstatic.com/frontend-assets/shipping-crowd-frontend/icons/hand-app-yellow-web.svg" 
                    alt="Recibe ofertas" 
                    className="w-8 h-8 md:w-12 md:h-12"
                  />
                </div>
              </div>
              <div className="ml-6 pt-2">
                <h3 className="font-loewe-next-heading text-lg md:text-xl text-gray-900 mb-2 leading-tight">
                  Recibe ofertas de recorridos y acepta las que quieras
                </h3>
                <p className="text-gray-600 font-loewe-next-body text-sm md:text-base leading-relaxed">
                  Podrás ver las tarifas y la duración estimada.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start relative z-10 mb-12">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center border-2 border-[#3483FA] shadow-lg">
                  <img 
                    src="https://http2.mlstatic.com/frontend-assets/shipping-crowd-frontend/icons/warehouse-yellow-web.svg" 
                    alt="Recoge paquetes" 
                    className="w-8 h-8 md:w-12 md:h-12"
                  />
                </div>
              </div>
              <div className="ml-6 pt-2">
                <h3 className="font-loewe-next-heading text-lg md:text-xl text-gray-900 mb-2 leading-tight">
                  Recoge los paquetes
                </h3>
                <p className="text-gray-600 font-loewe-next-body text-sm md:text-base leading-relaxed">
                  Comenzarás recogiendo todos los paquetes en un punto de colecta.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start relative z-10 mb-12">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center border-2 border-[#3483FA] shadow-lg">
                  <img 
                    src="https://http2.mlstatic.com/frontend-assets/shipping-crowd-frontend/icons/packages-yellow-web.svg" 
                    alt="Reparte en tu ciudad" 
                    className="w-8 h-8 md:w-12 md:h-12"
                  />
                </div>
              </div>
              <div className="ml-6 pt-2">
                <h3 className="font-loewe-next-heading text-lg md:text-xl text-gray-900 mb-2 leading-tight">
                  Reparte en tu ciudad
                </h3>
                <p className="text-gray-600 font-loewe-next-body text-sm md:text-base leading-relaxed">
                  En la app tendrás tu recorrido de entregas, con el orden y ubicación de cada parada.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start relative z-10">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center border-2 border-[#3483FA] shadow-lg">
                  <img 
                    src="https://http2.mlstatic.com/frontend-assets/shipping-crowd-frontend/icons/coins-yellow-web.svg" 
                    alt="Disfruta ganancias" 
                    className="w-8 h-8 md:w-12 md:h-12"
                  />
                </div>
              </div>
              <div className="ml-6 pt-2">
                <h3 className="font-loewe-next-heading text-lg md:text-xl text-gray-900 mb-2 leading-tight">
                  Disfruta tus ganancias
                </h3>
                <p className="text-gray-600 font-loewe-next-body text-sm md:text-base leading-relaxed">
                  Entre el miércoles y el viernes recibirás en tu cuenta de Mercado Pago el dinero de los servicios prestados.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-20">
          <div className="bg-[#3483FA] rounded-2xl p-8 md:p-12 text-white max-w-4xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-loewe-next-heading mb-6">Tú tienes el control. Tú defines tus ganancias.</h3>
            <p className="text-lg font-loewe-next-body leading-relaxed max-w-2xl mx-auto">En Mercado Libre, creemos que mereces flexibilidad y recompensas justas por tu trabajo. Nuestra plataforma está diseñada para valorar cada entrega que realizas, garantizando las mejores ganancias del mercado.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
