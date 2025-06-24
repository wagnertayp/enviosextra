interface PostalCodeValidationResult {
  isValid: boolean;
  country: string;
  region?: string;
  city?: string;
  error?: string;
}

interface Municipality {
  city: string;
  state?: string;
  postal_code: string;
  distance?: number;
}

interface GeolocationData {
  ip: string;
  country_code: string;
  country_name: string;
  region_code?: string;
  region_name?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export class GeolocationService {
  private static readonly ZIPCODEBASE_API_KEY = 'fc9584d0-4f0a-11f0-9a26-9f6dbeaee456';

  /**
   * Detectar país do usuário pelo IP usando múltiplos serviços de geolocalização
   */
  static async detectUserCountry(): Promise<string> {
    const geolocationServices = [
      {
        url: 'https://ipapi.co/json/',
        field: 'country_code'
      },
      {
        url: 'http://ip-api.com/json/',
        field: 'countryCode'
      },
      {
        url: 'https://ipinfo.io/json',
        field: 'country'
      },
      {
        url: 'https://api.country.is/',
        field: 'country'
      }
    ];

    for (const service of geolocationServices) {
      try {
        console.log(`[GEOLOCATION] Tentando detectar país via: ${service.url}`);
        
        const response = await fetch(service.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; GeolocationService/1.0)'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[GEOLOCATION] Resposta de ${service.url}:`, data);
        
        const countryCode = data[service.field];
        
        if (countryCode && typeof countryCode === 'string' && countryCode.length === 2) {
          console.log(`[GEOLOCATION] País detectado: ${countryCode} via ${service.url}`);
          // Store detected country in localStorage for consistent usage
          localStorage.setItem('user_country', countryCode.toUpperCase());
          return countryCode.toUpperCase();
        }
      } catch (error) {
        console.warn(`[GEOLOCATION] Falha ao detectar país via ${service.url}:`, error);
      }
    }
    
    // Fallback para Chile
    console.log('[GEOLOCATION] Usando fallback: CL (Chile)');
    return 'CL';
  }

  /**
   * Buscar municípios próximos usando API radius do Zipcodebase
   */
  static async getNearbyMunicipalities(postalCode: string, country?: string, radius: number = 15): Promise<Municipality[]> {
    const apiKey = this.ZIPCODEBASE_API_KEY;
    const unit = 'km';
    
    try {
      // Detectar país automaticamente se não fornecido
      const targetCountry = country || await this.detectUserCountry();
      
      console.log(`[GEOLOCATION] Buscando municípios próximos ao código ${postalCode} no país ${targetCountry} em raio de ${radius}${unit}`);
      
      const url = `https://app.zipcodebase.com/api/v1/radius?apikey=${apiKey}&code=${postalCode}&country=${targetCountry}&radius=${radius}&unit=${unit}`;
      console.log(`[GEOLOCATION] URL da API: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GEOLOCATION] API error ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[GEOLOCATION] Resposta completa da API Zipcodebase:', data);

      // Handle different possible response formats
      let resultsArray = [];
      if (data.results && Array.isArray(data.results)) {
        resultsArray = data.results;
      } else if (data.results && typeof data.results === 'object') {
        // Sometimes API returns results as an object with postal code as key
        const keys = Object.keys(data.results);
        if (keys.length > 0) {
          resultsArray = data.results[keys[0]] || [];
        }
      } else if (Array.isArray(data)) {
        resultsArray = data;
      }

      if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
        console.warn('[GEOLOCATION] Nenhum município encontrado na resposta:', data);
        return [];
      }

      console.log(`[GEOLOCATION] Resultados brutos: ${resultsArray.length} itens`);

      // Transformar os resultados em formato padronizado
      const municipalities: Municipality[] = resultsArray.map((item: any, index: number) => {
        console.log(`[GEOLOCATION] Processando item ${index}:`, item);
        return {
          city: item.city || item.place_name || 'Ciudad Desconocida',
          state: item.state || item.state_code || item.province || '',
          postal_code: item.postal_code || item.code || postalCode,
          distance: item.distance ? parseFloat(item.distance.toString()) : 0
        };
      });

      console.log(`[GEOLOCATION] Municípios processados:`, municipalities);

      // Remover duplicatas baseadas na cidade
      const uniqueMunicipalities = municipalities.filter((municipality, index, self) => 
        index === self.findIndex(m => m.city === municipality.city)
      );

      // Ordenar por distância
      uniqueMunicipalities.sort((a, b) => {
        const distA = a.distance || 999;
        const distB = b.distance || 999;
        return distA - distB;
      });

      console.log(`[GEOLOCATION] Encontrados ${uniqueMunicipalities.length} municípios únicos:`, uniqueMunicipalities);
      return uniqueMunicipalities;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('[GEOLOCATION] Timeout ao buscar municípios próximos');
        throw new Error('Timeout na busca de municípios');
      } else {
        console.error('[GEOLOCATION] Erro ao buscar municípios próximos:', error);
        throw error;
      }
    }
  }

  /**
   * Validar código postal usando API Zipcodebase
   */
  static async validatePostalCodeWithZipcodebase(code: string, country: string): Promise<PostalCodeValidationResult> {
    const apiKey = this.ZIPCODEBASE_API_KEY;
    
    try {
      console.log(`Validating postal code ${code} for country ${country}`);
      
      const response = await fetch(
        `https://app.zipcodebase.com/api/v1/search?apikey=${apiKey}&codes=${code}&country=${country}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Zipcodebase API response:', data);

      if (data.results && data.results[code] && data.results[code].length > 0) {
        const result = data.results[code][0];
        return {
          isValid: true,
          country: result.country_code || country,
          region: result.state || result.province,
          city: result.city
        };
      }

      return {
        isValid: false,
        country: country,
        error: 'Código postal não encontrado'
      };

    } catch (error) {
      console.error('Error validating postal code with Zipcodebase:', error);
      return {
        isValid: false,
        country: country,
        error: 'API returned invalid response'
      };
    }
  }

  /**
   * Detectar país baseado no IP do usuário
   */
  static async detectCountryByIP(): Promise<string> {
    const geolocationAPIs = [
      'https://ipapi.co/json/',
      'https://api.ipgeolocation.io/ipgeo?apiKey=free',
      'https://ipinfo.io/json'
    ];

    for (const apiUrl of geolocationAPIs) {
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) continue;

        const data = await response.json();
        
        // Diferentes APIs têm diferentes formatos de resposta
        const countryCode = data.country_code || data.country || data.countryCode;
        
        if (countryCode && typeof countryCode === 'string') {
          console.log(`País detectado: ${countryCode} via ${apiUrl}`);
          return countryCode.toUpperCase();
        }
      } catch (error) {
        console.warn(`Falha na API de geolocalização ${apiUrl}:`, error);
        continue;
      }
    }

    console.log('Não foi possível detectar o país, usando Brasil como padrão');
    return 'BR';
  }

  /**
   * Validação de formato de código postal por país
   */
  static validatePostalCodeFormat(code: string, country: string): boolean {
    const patterns: { [key: string]: RegExp } = {
      'CL': /^\d{7}$/, // Chile: 7 dígitos
      'AR': /^[A-Z]\d{4}[A-Z]{3}$/, // Argentina: A0000AAA
      'MX': /^\d{5}$/, // México: 5 dígitos
      'ES': /^\d{5}$/, // Espanha: 5 dígitos
      'BR': /^\d{5}-?\d{3}$/ // Brasil: 00000-000
    };

    const pattern = patterns[country.toUpperCase()];
    return pattern ? pattern.test(code.replace(/\s/g, '')) : true;
  }

  /**
   * Obter exemplo de código postal para um país
   */
  static getPostalCodeExample(country: string): string {
    const examples: { [key: string]: string } = {
      'CL': '7500000',
      'AR': 'C1064AAB',
      'MX': '06000',
      'ES': '28001',
      'BR': '01310-100'
    };

    return examples[country.toUpperCase()] || '00000';
  }
}

export type { Municipality, PostalCodeValidationResult, GeolocationData };