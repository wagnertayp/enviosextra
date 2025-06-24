/**
 * Zipcodebase API integration for authentic postal code validation
 * Supports Argentina, Chile, Spain, and Mexico with real data
 */

export interface ZipcodebaseResponse {
  query: {
    codes: string[];
    country: string;
  };
  results: {
    [key: string]: Array<{
      postal_code: string;
      country_code: string;
      latitude: number;
      longitude: number;
      city: string;
      state: string;
      state_code?: string;
      province?: string;
      province_code?: string;
    }>;
  };
}

export interface PostalCodeResult {
  postalCode: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  isValid: boolean;
}

/**
 * Zipcodebase API client for postal code validation
 */
export class ZipcodebaseService {
  private static instance: ZipcodebaseService;
  private readonly API_BASE_URL = 'https://app.zipcodebase.com/api/v1';
  private apiKey: string | null = null;

  private constructor() {
    // Use hardcoded API key for development (as provided in GeolocationService)
    this.apiKey = 'fc9584d0-4f0a-11f0-9a26-9f6dbeaee456';
  }

  public static getInstance(): ZipcodebaseService {
    if (!ZipcodebaseService.instance) {
      ZipcodebaseService.instance = new ZipcodebaseService();
    }
    return ZipcodebaseService.instance;
  }

  /**
   * Set API key for Zipcodebase service
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Check if API key is available
   */
  public hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Validate postal code using Zipcodebase API
   */
  async validatePostalCode(postalCode: string, countryCode: string): Promise<PostalCodeResult | null> {
    if (!this.apiKey) {
      console.warn('Zipcodebase API key not available');
      return null;
    }

    try {
      const cleanedCode = this.cleanPostalCode(postalCode, countryCode);
      const url = `${this.API_BASE_URL}/search?apikey=${this.apiKey}&codes=${cleanedCode}&country=${countryCode}`;
      
      console.log(`Validating postal code ${cleanedCode} for country ${countryCode}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data: ZipcodebaseResponse = await response.json();
      
      // Check if we have results for the postal code
      const results = data.results[cleanedCode];
      if (!results || results.length === 0) {
        return {
          postalCode: cleanedCode,
          city: '',
          state: '',
          country: countryCode,
          latitude: 0,
          longitude: 0,
          isValid: false
        };
      }

      // Use the first result (most accurate)
      const result = results[0];
      
      console.log(`✅ Valid postal code for ${countryCode}: ${result.city}, ${result.state || result.province}`);
      
      return {
        postalCode: result.postal_code,
        city: result.city,
        state: result.state || result.province || '',
        country: result.country_code,
        latitude: result.latitude,
        longitude: result.longitude,
        isValid: true
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Zipcodebase API request timed out');
      } else {
        console.error('Error validating postal code with Zipcodebase:', error);
      }
      return null;
    }
  }

  /**
   * Clean postal code based on country format
   */
  private cleanPostalCode(postalCode: string, countryCode: string): string {
    switch (countryCode) {
      case 'AR':
        // Argentina: Remove spaces and ensure uppercase
        return postalCode.replace(/\s/g, '').toUpperCase();
      case 'CL':
        // Chile: Remove any non-numeric characters
        return postalCode.replace(/\D/g, '');
      case 'ES':
        // Spain: Remove any non-numeric characters
        return postalCode.replace(/\D/g, '');
      case 'MX':
        // Mexico: Remove any non-numeric characters
        return postalCode.replace(/\D/g, '');
      case 'BR':
        // Brazil: Remove any non-numeric characters
        return postalCode.replace(/\D/g, '');
      default:
        return postalCode;
    }
  }

  /**
   * Get example postal codes for testing
   */
  getExamplePostalCodes(): Record<string, { code: string; location: string }> {
    return {
      AR: { code: 'C1064AAB', location: 'Casa Rosada, Buenos Aires' },
      CL: { code: '8320000', location: 'Palacio de La Moneda, Santiago' },
      ES: { code: '28013', location: 'Puerta del Sol, Madrid' },
      MX: { code: '06000', location: 'Zócalo, Ciudad de México' },
      BR: { code: '01310-000', location: 'Avenida Paulista, São Paulo' }
    };
  }

  /**
   * Test API connection with example postal codes
   */
  async testApiConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.apiKey) {
      return { success: false, message: 'API key not configured' };
    }

    try {
      // Test with a simple postal code from Argentina
      const result = await this.validatePostalCode('C1064AAB', 'AR');
      
      if (result && result.isValid) {
        return { success: true, message: 'API connection successful' };
      } else {
        return { success: false, message: 'API returned invalid response' };
      }
    } catch (error) {
      return { success: false, message: `API connection failed: ${error}` };
    }
  }
}

// Export singleton instance
export const zipcodebaseService = ZipcodebaseService.getInstance();