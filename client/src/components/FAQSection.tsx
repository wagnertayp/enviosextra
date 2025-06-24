import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';

interface FAQItem {
  question: string;
  answer: string;
  isOpen: boolean;
}

const FAQSection: React.FC = () => {
  const { setShowCepModal } = useAppContext();
  
  const [faqs, setFaqs] = useState<FAQItem[]>([
    {
      question: "¿Qué necesito para registrarme?",
      answer: "Para registrarte como Repartidor Socio necesitas: tener más de 18 años, documento de identidad válido, licencia de conducir vigente, un vehículo propio (moto, auto, van o camioneta) y una cuenta de Mercado Pago.",
      isOpen: false
    },
    {
      question: "¿Cómo y cuándo cobro?",
      answer: "Los pagos se realizan de forma rápida después de completar cada entrega. Entre miércoles y viernes recibirás en tu cuenta de Mercado Pago el dinero de los servicios prestados durante la semana.",
      isOpen: false
    },
    {
      question: "¿Necesito tener una cuenta de Mercado Pago?",
      answer: "Sí, es necesario tener una cuenta de Mercado Pago activa para recibir los pagos por tus entregas. Si no tienes una, puedes crearla fácilmente desde la app de forma gratuita.",
      isOpen: false
    },
    {
      question: "¿Cuánto tiempo y en qué zonas conduciré?",
      answer: "Tú decides cuándo y dónde trabajar. Puedes elegir los horarios que mejor se adapten a tu rutina y las zonas donde prefieras hacer entregas dentro de tu ciudad. Tienes total flexibilidad.",
      isOpen: false
    }
  ]);

  const handleRegisterClick = () => {
    setShowCepModal(true);
  };

  const toggleFAQ = (index: number) => {
    const updatedFaqs = [...faqs];
    updatedFaqs[index].isOpen = !updatedFaqs[index].isOpen;
    setFaqs(updatedFaqs);
  };

  return (
    <section className="bg-white">
      {/* Banner Section */}
      <div 
        className="w-full relative overflow-hidden pb-8 pt-6 px-3 flex flex-col items-center justify-center"
        style={{
          background: "url('https://i.postimg.cc/sfNG4KMH/DM-20250621060259-001.png') center top / cover no-repeat",
          minHeight: "270px"
        }}
      >
        <div className="relative z-10 flex flex-col items-center justify-center w-full">
          <h2 className="text-center text-[22px] xs:text-[24px] sm:text-[28px] font-bold font-loewe-next-heading text-[#222222] leading-tight mt-6 mb-6">
            ¡Regístrate en la<br className="block sm:hidden" /> app de Envíos<br className="block sm:hidden" /> Extra y comienza a<br className="block sm:hidden" /> ganar dinero!
          </h2>
          <button 
            onClick={handleRegisterClick}
            className="mt-2 w-full max-w-[320px] bg-[#3483fa] text-white text-[16px] font-normal font-loewe-next-body rounded-lg py-3 transition-colors duration-200 hover:bg-[#2968c8]"
          >
            Ser asociado
          </button>
        </div>
      </div>
      
      {/* FAQ Section */}
      <div className="max-w-[600px] mx-auto pt-12 pb-8 px-6">
        <h1 className="text-center text-[28px] leading-[1.1] font-normal font-loewe-next-heading text-[#222222] mb-10">
          Preguntas<br />frecuentes
        </h1>
        
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-[#e6e6e6] rounded-lg overflow-hidden">
              <div 
                className="py-5 px-6 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                onClick={() => toggleFAQ(index)}
              >
                <span className="text-[16px] font-bold font-loewe-next-body text-[#222222] leading-relaxed pr-4">
                  {faq.question}
                </span>
                <i className={`fas ${faq.isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-[#3483fa] text-base flex-shrink-0 transition-transform duration-200`}></i>
              </div>
              {faq.isOpen && (
                <div className="px-6 pb-5">
                  <div className="border-t border-[#f0f0f0] pt-4">
                    <p className="text-[14px] text-[#666666] font-normal font-loewe-next-body leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="pt-8 mt-6 border-t border-[#e6e6e6]">
          <p className="text-[14px] text-[#222222] font-normal font-loewe-next-body leading-relaxed text-center">
            Si tienes más dudas, puedes <a href="#" className="text-[#3483fa] hover:underline">revisar nuestra página de ayuda.</a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;