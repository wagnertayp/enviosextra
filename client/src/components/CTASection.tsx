import React from 'react';

const CTASection: React.FC = () => {
  return (
    <section className="bg-[#3483FA] py-14 px-4">
      <div className="container mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-loewe-next-heading text-white mb-4">¡Conviértete en Repartidor Socio de Mercado Libre Hoy!</h2>
        <p className="text-white mb-6 max-w-2xl mx-auto text-lg font-loewe-next-body">Transforma tu vehículo en una fuente de ingresos extra con horarios flexibles y pagos rápidos.</p>
        <div className="flex flex-col md:flex-row justify-center md:space-x-8 space-y-4 md:space-y-0 mt-6">
          <div className="bg-white bg-opacity-30 p-4 rounded-lg backdrop-blur-sm">
            <span className="text-white font-bold text-3xl font-loewe-next-heading">18</span>
            <p className="text-white text-sm mt-1 font-loewe-next-body">Países con Envíos</p>
          </div>
          <div className="bg-white bg-opacity-30 p-4 rounded-lg backdrop-blur-sm">
            <span className="text-white font-bold text-3xl font-loewe-next-heading">+50K</span>
            <p className="text-white text-sm mt-1 font-loewe-next-body">Repartidores Activos</p>
          </div>
          <div className="bg-white bg-opacity-30 p-4 rounded-lg backdrop-blur-sm">
            <span className="text-white font-bold text-3xl font-loewe-next-heading">Mismo día</span>
            <p className="text-white text-sm mt-1 font-loewe-next-body">Entrega Express</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
