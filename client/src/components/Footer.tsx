import React from 'react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useLocation } from 'wouter';

import mercadolibre_logo_7D54D946AE_seeklogo_com from "@assets/mercadolibre-logo-7D54D946AE-seeklogo.com.png";

const Footer: React.FC = () => {
  const { setShowCepModal } = useAppContext();
  const [, setLocation] = useLocation();

  const handleStartRegistration = () => {
    // Show CEP modal to start the registration process
    setShowCepModal(true);
  };

  const handleGoToRegistration = () => {
    // Navigate directly to registration page
    setLocation('/cadastro');
  };

  return (
    <footer className="bg-[#3483FA] text-white py-10 mt-auto">
      <div className="container mx-auto px-4">
        {/* Call-to-action button section */}
        <div className="text-center mb-8">
          <div className="bg-white bg-opacity-10 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-loewe-next-heading mb-3">¿Listo para empezar?</h3>
            <p className="text-sm opacity-90 mb-4 font-loewe-next-body">
              Regístrate ahora y forma parte del equipo de repartidores de Mercado Libre
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleStartRegistration}
                className="bg-[#FFE802] hover:bg-[#E6D102] text-black font-semibold font-loewe-next-body px-8 py-3 rounded-lg transition-colors duration-200"
              >
                Verificar mi región
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <img 
              src={mercadolibre_logo_7D54D946AE_seeklogo_com}
              alt="Mercado Livre Logo" 
              className="h-10 mb-2 mx-auto md:mx-0 bg-white p-1 rounded"
            />
            <p className="text-sm text-center md:text-left font-loewe-next-body">© 2024 Mercado Libre. Todos los derechos reservados.</p>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-sm opacity-80 mb-2 font-loewe-next-body">Programa de Repartidores Socios de Mercado Libre</p>
            <p className="text-xs opacity-70 font-loewe-next-body">Trabaja con nosotros y forma parte de nuestro equipo de entregas</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;