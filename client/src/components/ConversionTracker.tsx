import React, { useEffect } from 'react';
import { trackPurchase, initFacebookPixel } from '@/lib/facebook-pixel';

interface ConversionTrackerProps {
  transactionId: string;
  amount: number;
  enabled: boolean;
}

/**
 * Componente especializado para rastreamento de conversões que funciona
 * mesmo em ambientes com bloqueadores de anúncios ou cookies
 */
const ConversionTracker: React.FC<ConversionTrackerProps> = ({ 
  transactionId, 
  amount, 
  enabled 
}) => {
  const FACEBOOK_PIXEL_ID = '1418766538994503';
  
  useEffect(() => {
    if (!enabled) return;
    
    // Inicializar Facebook Pixel caso ainda não esteja inicializado
    initFacebookPixel();
    
    const trackConversion = async () => {
      console.log('[CONVERSION] Iniciando rastreamento robusto da conversão:', { transactionId, amount });
      
      // Método 1: Rastreamento padrão com fbq (pode ser bloqueado)
      trackPurchase(transactionId, amount);
      
      try {
        // Método 2: Rastreamento via script dinâmico (mais difícil de bloquear)
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.innerHTML = `
          try {
            var fbPixelId = "${FACEBOOK_PIXEL_ID}";
            if (typeof fbq !== 'undefined') {
              fbq('trackSingle', fbPixelId, 'Purchase', {
                value: ${amount},
                currency: 'BRL',
                content_name: 'Kit de Segurança Shopee',
                content_type: 'product',
                content_ids: ['${transactionId}'],
                transaction_id: '${transactionId}'
              });
              console.log("[FB-DIRECT] Evento de conversão enviado diretamente");
            }
          } catch(e) {
            console.error("[FB-DIRECT] Erro:", e);
          }
        `;
        document.head.appendChild(script);
        
        // Método 3: Imagem pixel direta contornando bloqueadores (muito resistente)
        const timestamp = new Date().getTime();
        const pixelUrl = `https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=Purchase&cd[value]=${amount}&cd[currency]=BRL&cd[content_name]=Kit+de+Seguranca+Shopee&cd[transaction_id]=${transactionId}&noscript=1&_=${timestamp}`;
        
        // Múltiplas abordagens para garantir entrega
        // 3.1 - Via imagem
        const img = new Image();
        img.src = pixelUrl;
        
        // 3.2 - Via fetch (pode ser bloqueado, mas tentamos)
        fetch(pixelUrl, { 
          mode: 'no-cors',
          cache: 'no-cache',
          credentials: 'omit'
        }).catch(() => {});
        
        // 3.3 - Via XHR (alternativa ao fetch)
        const xhr = new XMLHttpRequest();
        xhr.open('GET', pixelUrl, true);
        xhr.send();
        
        // 3.4 - Via iframe (contorna alguns bloqueadores)
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = pixelUrl;
        document.body.appendChild(iframe);
        setTimeout(() => document.body.removeChild(iframe), 2000);
        
        // Método 4: Beacon API (funciona bem em fechamento de página)
        if (navigator.sendBeacon) {
          navigator.sendBeacon(pixelUrl);
        }
        
        console.log('[CONVERSION] Todos os métodos de rastreamento executados');
      } catch (error) {
        console.error('[CONVERSION] Erro no rastreamento:', error);
      }
    };

    // Rastrear a conversão
    trackConversion();
    
    // Configurar um retry para garantir que o evento seja enviado mesmo se
    // o Facebook Pixel ainda não estiver carregado na primeira tentativa
    const retryTimeout = setTimeout(() => {
      console.log('[CONVERSION] Executando segunda tentativa de rastreamento');
      trackConversion();
    }, 3000);
    
    return () => {
      clearTimeout(retryTimeout);
    };
  }, [transactionId, amount, enabled]);

  // Não renderiza nada visualmente
  return null;
};

export default ConversionTracker;