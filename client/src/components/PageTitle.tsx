import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

const PageTitle: React.FC = () => {
  return (
    <div className="bg-[#3483FA] text-white py-4 px-6 relative overflow-hidden">
      <div className="container mx-auto">
        <div className="flex items-center space-x-2 text-sm font-loewe-next-body">
          <span className="font-bold">Inicio</span>
          <FontAwesomeIcon icon={faChevronRight} className="text-xs opacity-70" />
          <span className="font-bold">Socio Conductor Mercado Libre</span>
        </div>
      </div>
      
      {/* Elemento decorativo curvado */}
      <div className="absolute bottom-0 right-0 w-32 h-8 bg-[#FEE80D] transform rotate-12 translate-x-16 translate-y-4 rounded-l-full opacity-80"></div>
    </div>
  );
};

export default PageTitle;
