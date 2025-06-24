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

  return null;
};

export default Footer;