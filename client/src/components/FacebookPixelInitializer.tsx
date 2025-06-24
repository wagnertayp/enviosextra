import { useEffect } from 'react';
import { initFacebookPixel } from '@/lib/facebook-pixel';

/**
 * Componente que inicializa o Facebook Pixel no carregamento da aplicação
 * Deve ser usado no App.tsx para garantir que o pixel seja carregado globalmente
 */
export const FacebookPixelInitializer: React.FC = () => {
  useEffect(() => {
    // Inicializar o Facebook Pixel uma vez quando o aplicativo é carregado
    initFacebookPixel();
    console.log('[PIXEL] Inicializado globalmente via componente FacebookPixelInitializer');
  }, []);

  return null; // Este componente não renderiza nada visualmente
};

export default FacebookPixelInitializer;