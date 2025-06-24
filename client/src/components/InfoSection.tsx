import React from 'react';

const InfoSection: React.FC = () => {
  return (
    <section className="bg-[#fafafa] py-16">
      <div className="flex flex-col items-center justify-center px-4">
        {/* Sección 1: ¿Cómo funciona? */}
        <div className="w-full max-w-[450px] bg-[#fafafa] mb-12 text-center">
          <img 
            src="https://i.postimg.cc/d3V3KYd2/DM-20250621063424-001.png" 
            alt="Ilustración de una persona repartiendo paquetes en una ciudad" 
            className="w-20 h-20 mx-auto mb-6 object-contain"
          />
          <h1 className="text-[#222] text-xl sm:text-2xl font-bold font-loewe-next-heading text-center mb-6">
            ¿Cómo funciona el Programa de Repartidores de Mercado Libre?
          </h1>
          <p className="text-[#757575] text-base sm:text-lg font-loewe-next-body text-center leading-relaxed">
            El Programa de Repartidores de Mercado Libre es una oportunidad para quienes desean generar ingresos adicionales entregando paquetes. Con horarios flexibles y autonomía, tú eliges cuándo y dónde trabajar.
            <br /><br />
            Mercado Libre acepta motos, autos (2 o 4 puertas), furgonetas, combis y vans. Así, más personas pueden participar y transformar su vehículo en una fuente de ingresos.
          </p>
        </div>

        {/* Sección 2: Ingresos como Repartidor */}
        <div className="w-full max-w-[450px] bg-[#fafafa] text-center">
          <img 
            src="https://i.postimg.cc/rsZmVPCv/DM-20250621063508-001.png" 
            alt="Ilustración de ingresos y pagos rápidos" 
            className="w-20 h-20 mx-auto mb-6 object-contain"
          />
          <div className="bg-white rounded-lg shadow-sm p-8 text-left">
            <h2 className="text-[#222] text-lg sm:text-xl font-bold font-loewe-next-heading mb-4 border-b border-[#eaeaea] pb-3">
              Ingresos como Repartidor de Mercado Libre
            </h2>
            <p className="text-[#757575] text-base sm:text-lg font-loewe-next-body mb-4 leading-relaxed">
              En Mercado Libre, los pagos se realizan de forma rápida y segura. Una vez que el repartidor completa sus entregas, el valor correspondiente se transfiere a su cuenta. Esto garantiza mayor seguridad y agilidad para nuestros socios, permitiéndoles tener acceso rápido a sus ganancias y planificar mejor sus finanzas.
            </p>
            <p className="text-[#757575] text-base sm:text-lg font-loewe-next-body leading-relaxed">
              Después del registro, podrás acceder a las rutas disponibles, gestionar tu agenda y seguir tus ganancias en tiempo real directamente desde la aplicación.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoSection;
