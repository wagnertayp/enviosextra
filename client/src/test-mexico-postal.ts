/**
 * Teste específico para código postal mexicano
 */

import { zipcodebaseService } from '@/services/zipcodebase';

export async function testMexicoPostalCode() {
  console.log('🇲🇽 Testando código postal mexicano 06000...');
  
  try {
    const result = await zipcodebaseService.validatePostalCode('06000', 'MX');
    
    if (result && result.isValid) {
      console.log('✅ Código postal mexicano validado com sucesso!');
      console.log(`📍 Cidade: ${result.city}`);
      console.log(`🏛️ Estado: ${result.state}`);
      console.log(`📮 Código: ${result.postalCode}`);
      console.log(`🌎 País: ${result.country}`);
      console.log(`📍 Coordenadas: ${result.latitude}, ${result.longitude}`);
      return true;
    } else {
      console.log('❌ Falha na validação do código postal mexicano');
      console.log('Resultado:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao testar código postal mexicano:', error);
    return false;
  }
}

// Disponibilizar no window para teste manual
(window as any).testMexicoPostal = testMexicoPostalCode;