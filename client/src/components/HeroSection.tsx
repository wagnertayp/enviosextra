import React from 'react';

import totaelipe from "@assets/totaelipe.png";

import mercadolibre1 from "@assets/mercadolibre1.png";

import NOVO_BANNER__1_ from "@assets/NOVO_BANNER (1).png";

import condiciones_azul_normal from "@assets/condiciones_azul_normal.png";

import BANNER_COR_CERTA from "@assets/BANNER_COR_CERTA.png";

const HeroSection: React.FC = () => {
  return (
    <section className="bg-[#FEE80D] relative overflow-hidden">
      <img src={BANNER_COR_CERTA} alt="Mercado Livre Delivery Partners" className="w-full" />
      {/* Requirements Section */}
      <div className="bg-[#fafafa] flex flex-col items-center py-8 px-4">
        <div className="w-full max-w-[600px] flex flex-col items-center">
          {/* Down arrow */}
          <div className="w-full flex justify-center -mb-6 z-10">
            <div className="bg-[#ffe600] rounded-full w-12 h-12 flex items-center justify-center border-4 border-white shadow-lg" style={{marginTop: '-24px'}}>
              <i className="fas fa-chevron-down text-[#3483fa] text-2xl"></i>
            </div>
          </div>
          
          {/* Requirements block */}
          <div className="relative bg-[#ffe600] rounded-2xl shadow-md px-6 pt-10 pb-8 w-full" style={{maxWidth: '600px', minHeight: '480px'}}>
            <h2 className="text-[#3483fa] text-xl sm:text-2xl font-bold font-loewe-next-heading leading-tight mb-5">
              Requisitos para ser socio conductor de entregas
            </h2>
            <ul className="space-y-4 mb-2">
              <li className="flex items-start">
                <span className="flex-shrink-0 mt-1 mr-3">
                  <i className="fas fa-check text-[#3483fa] text-xl"></i>
                </span>
                <span className="text-[#3483fa] text-base sm:text-lg font-medium font-loewe-next-body">
                  Permiso de conducir
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 mt-1 mr-3">
                  <i className="fas fa-check text-[#3483fa] text-xl"></i>
                </span>
                <span className="text-[#3483fa] text-base sm:text-lg font-medium font-loewe-next-body">
                  Vehículo con documentos al día, modelo 1998 en adelante y en buen estado.
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 mt-1 mr-3">
                  <i className="fas fa-check text-[#3483fa] text-xl"></i>
                </span>
                <span className="text-[#3483fa] text-base sm:text-lg font-medium font-loewe-next-body">
                  Mercado Libre acepta para entregas autos particulares de 2 o 4 puertas, motos, furgonetas tipo Fiorino, Kombi y vans.
                </span>
              </li>
            </ul>
            
            {/* Mercado Libre box image */}
            <img 
              src="https://i.postimg.cc/q7HDKND7/20250621-0256-Caixa-Mercado-Libre-remix-01jy8gwz73f9z9pqv77xxvvthp.png" 
              alt="Caja amarilla de Mercado Libre con logo" 
              className="absolute right-4 bottom-4 w-40 h-32 sm:w-56 sm:h-44 object-contain"
              style={{minWidth: '120px'}}
            />
          </div>
        </div>
      </div>
      {/* Special Monthly Condition Section */}
      <div className="bg-[#fafafa] flex flex-col items-center py-12 px-4">
        <div className="w-full max-w-[600px] flex flex-col items-center pt-[0px] pb-[0px] mt-[-19px] mb-[-19px]">
          <h2 className="sm:text-3xl font-loewe-next-heading text-center text-[20px] font-medium mt-[1px] mb-[1px] text-[#000000]">
            Condición Especial del Mes
          </h2>
          
          {/* Promotion Description */}
          <p className="text-gray-600 text-sm sm:text-base font-loewe-next-body text-center mb-6 max-w-md">
            Válido para participantes que se registren desde el <span className="font-bold">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span> hasta el <span className="font-bold">{new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>.
          </p>
          
          {/* Realistic 3D Fuel Card */}
          <div className="w-80 h-52 sm:w-96 sm:h-60 perspective-1000">
            <div className="relative w-full h-full transform-style-preserve-3d hover:rotate-y-12 transition-transform duration-500">
              {/* Card Front */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 rounded-xl shadow-2xl backface-hidden border border-blue-500/30">
                {/* Card Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-xl"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-white/10 to-transparent rounded-full -translate-y-8 translate-x-8"></div>
                
                {/* Card Type - Centered */}
                <div className="absolute top-4 left-6 right-6 flex flex-col items-center">
                  <span className="text-white text-lg sm:text-xl font-bold tracking-wider">
                    VALE COMBUSTIBLE
                  </span>
                  <span className="text-white text-2xl sm:text-3xl font-bold tracking-wide mt-1">
                    $300
                  </span>
                </div>
                
                {/* Card Number */}
                <div className="absolute top-1/2 left-6 -translate-y-1/2">
                  <div className="text-white font-mono text-lg sm:text-2xl tracking-widest">
                    **** **** **** 1234
                  </div>
                </div>
                
                {/* Bottom Section */}
                <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
                  <div>
                    <div className="text-white/80 text-sm uppercase tracking-wide">
                      Válido hasta
                    </div>
                    <div className="text-white font-mono text-lg">
                      12/28
                    </div>
                  </div>
                  
                  {/* Mastercard Logo */}
                  <div className="flex items-center">
                    <div className="relative">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-full opacity-90"></div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-400 rounded-full opacity-90 absolute top-0 left-5 sm:left-6"></div>
                    </div>
                  </div>
                </div>
                
                {/* Holographic Effect */}
                <div className="absolute inset-0 card-holographic rounded-xl opacity-60"></div>
              </div>
              
              {/* Card Shadow */}
              <div className="absolute inset-0 bg-black/30 rounded-xl transform translate-y-3 translate-x-3 -z-10 blur-sm"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
