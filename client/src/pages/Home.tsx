import React, { useEffect } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';

import AdvantagesSection from '@/components/AdvantagesSection';
import InfoSection from '@/components/InfoSection';

import BenefitsSection from '@/components/BenefitsSection';
import FAQSection from '@/components/FAQSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import CepModal from '@/components/CepModal';
import { useAppContext } from '@/contexts/AppContext';
import { useLocation } from 'wouter';

const Home: React.FC = () => {
  const { 
    showCepModal, 
    setShowCepModal, 
    setCepData, 
    setUserCheckedCep 
  } = useAppContext();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Modal will only show when user clicks a button
    console.log('Home page loaded - CEP modal ready for user interaction');
  }, []);
  
  const handleCepConfirm = (cepData: { cep: string, city: string, state: string }) => {
    setCepData(cepData);
    setUserCheckedCep(true);
    setShowCepModal(false);
    
    // Navegar para a página de cadastro após confirmar o CEP
    setTimeout(() => {
      setLocation('/cadastro');
    }, 500);
  };
  
  const handleCepModalClose = () => {
    // Permitir fechar o modal sempre que o usuário clicar no X
    setShowCepModal(false);
  };

  return (
    <div className="bg-white">
      <CepModal 
        isOpen={showCepModal} 
        onClose={handleCepModalClose}
        onConfirm={handleCepConfirm}
      />
      <Header />
      <HeroSection />
      <AdvantagesSection />
      <InfoSection />
      
      <BenefitsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Home;
