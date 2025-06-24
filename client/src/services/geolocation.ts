/**
 * Geolocation service for IP-based country detection and postal code validation
 * Supports Chile, Argentina, Spain, and Mexico
 */

export interface CountryConfig {
  iso: string;
  name: string;
  postalCodeFormat: string;
  postalCodePattern: RegExp;
  placeholder: string;
  maxLength: number;
  formatFunction: (value: string) => string;
  validateFunction: (value: string) => boolean;
}

export interface GeolocationData {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  timezone: string;
  ip: string;
}

// Country configurations for supported countries
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  CL: {
    iso: 'CL',
    name: 'Chile',
    postalCodeFormat: '0000000',
    postalCodePattern: /^\d{7}$/,
    placeholder: '1234567',
    maxLength: 7,
    formatFunction: (value: string) => value.replace(/\D/g, '').slice(0, 7),
    validateFunction: (value: string) => /^\d{7}$/.test(value)
  },
  AR: {
    iso: 'AR',
    name: 'Argentina',
    postalCodeFormat: 'A0000AAA',
    postalCodePattern: /^[A-Z]\d{4}[A-Z]{3}$/,
    placeholder: 'C1234ABC',
    maxLength: 8,
    formatFunction: (value: string) => {
      // Remove non-alphanumeric characters and convert to uppercase
      const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (clean.length <= 1) return clean;
      if (clean.length <= 5) return clean.charAt(0) + clean.slice(1).replace(/\D/g, '');
      return clean.charAt(0) + clean.slice(1, 5).replace(/\D/g, '') + clean.slice(5).replace(/\d/g, '');
    },
    validateFunction: (value: string) => /^[A-Z]\d{4}[A-Z]{3}$/.test(value)
  },
  ES: {
    iso: 'ES',
    name: 'España',
    postalCodeFormat: '00000',
    postalCodePattern: /^\d{5}$/,
    placeholder: '28001',
    maxLength: 5,
    formatFunction: (value: string) => value.replace(/\D/g, '').slice(0, 5),
    validateFunction: (value: string) => /^\d{5}$/.test(value)
  },
  MX: {
    iso: 'MX',
    name: 'México',
    postalCodeFormat: '00000',
    postalCodePattern: /^\d{5}$/,
    placeholder: '01000',
    maxLength: 5,
    formatFunction: (value: string) => value.replace(/\D/g, '').slice(0, 5),
    validateFunction: (value: string) => /^\d{5}$/.test(value)
  }
};

// Default configuration for unsupported countries (fallback to Brazil format)
const DEFAULT_CONFIG: CountryConfig = {
  iso: 'BR',
  name: 'Brasil',
  postalCodeFormat: '00000-000',
  postalCodePattern: /^\d{5}-?\d{3}$/,
  placeholder: '00000-000',
  maxLength: 9,
  formatFunction: (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 5) return clean;
    return clean.slice(0, 5) + '-' + clean.slice(5, 8);
  },
  validateFunction: (value: string) => /^\d{5}-?\d{3}$/.test(value)
};

/**
 * GeolocationService class for handling IP-based country detection
 */
export class GeolocationService {
  private static instance: GeolocationService;
  private cachedLocation: GeolocationData | null = null;
  private currentCountryConfig: CountryConfig = DEFAULT_CONFIG;

  private constructor() {}

  public static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  /**
   * Detect user's location based on IP address
   */
  async detectLocation(): Promise<GeolocationData | null> {
    if (this.cachedLocation) {
      return this.cachedLocation;
    }

    try {
      // Try multiple IP geolocation services for reliability
      const services = [
        'https://ipapi.co/json/',
        'https://api.ipify.org?format=json', // Fallback for IP only
        'https://httpbin.org/ip' // Another fallback
      ];

      for (const serviceUrl of services) {
        try {
          const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            }
          });

          if (!response.ok) continue;

          const data = await response.json();
          
          // Handle different API response formats
          if (data.country_code || data.country) {
            const locationData: GeolocationData = {
              country: data.country_name || data.country || 'Unknown',
              countryCode: data.country_code || data.country || 'BR',
              region: data.region || data.region_name || '',
              city: data.city || '',
              lat: data.latitude || data.lat || 0,
              lon: data.longitude || data.lon || 0,
              timezone: data.timezone || '',
              ip: data.ip || ''
            };

            this.cachedLocation = locationData;
            this.updateCountryConfig(locationData.countryCode);
            return locationData;
          }
        } catch (serviceError) {
          console.warn(`Geolocation service ${serviceUrl} failed:`, serviceError);
          continue;
        }
      }

      // If all services fail, try to detect from browser timezone as fallback
      return this.detectFromTimezone();
    } catch (error) {
      console.error('Failed to detect location:', error);
      return this.detectFromTimezone();
    }
  }

  /**
   * Fallback: detect country from browser timezone
   */
  private detectFromTimezone(): GeolocationData | null {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      let countryCode = 'BR'; // Default

      // Map common timezones to countries
      const timezoneMap: Record<string, string> = {
        'America/Santiago': 'CL',
        'America/Argentina/Buenos_Aires': 'AR',
        'Europe/Madrid': 'ES',
        'America/Mexico_City': 'MX',
        'America/Sao_Paulo': 'BR'
      };

      countryCode = timezoneMap[timezone] || 'BR';

      const locationData: GeolocationData = {
        country: COUNTRY_CONFIGS[countryCode]?.name || 'Brasil',
        countryCode,
        region: '',
        city: '',
        lat: 0,
        lon: 0,
        timezone,
        ip: ''
      };

      this.cachedLocation = locationData;
      this.updateCountryConfig(countryCode);
      return locationData;
    } catch (error) {
      console.error('Timezone detection failed:', error);
      return null;
    }
  }

  /**
   * Update country configuration based on detected country
   */
  private updateCountryConfig(countryCode: string): void {
    this.currentCountryConfig = COUNTRY_CONFIGS[countryCode] || DEFAULT_CONFIG;
  }

  /**
   * Get current country configuration
   */
  public getCurrentCountryConfig(): CountryConfig {
    return this.currentCountryConfig;
  }

  /**
   * Validate postal code based on current country
   */
  public validatePostalCode(postalCode: string): boolean {
    return this.currentCountryConfig.validateFunction(postalCode);
  }

  /**
   * Format postal code based on current country
   */
  public formatPostalCode(postalCode: string): string {
    return this.currentCountryConfig.formatFunction(postalCode);
  }

  /**
   * Get postal code validation details for current country
   */
  public getPostalCodeInfo(): {
    format: string;
    placeholder: string;
    maxLength: number;
    countryName: string;
  } {
    return {
      format: this.currentCountryConfig.postalCodeFormat,
      placeholder: this.currentCountryConfig.placeholder,
      maxLength: this.currentCountryConfig.maxLength,
      countryName: this.currentCountryConfig.name
    };
  }

  /**
   * Clear cached location (for testing purposes)
   */
  public clearCache(): void {
    this.cachedLocation = null;
    this.currentCountryConfig = DEFAULT_CONFIG;
  }

  /**
   * Check if current country is supported
   */
  public isCurrentCountrySupported(): boolean {
    return this.cachedLocation ? 
      Object.keys(COUNTRY_CONFIGS).includes(this.cachedLocation.countryCode) : 
      false;
  }
}

// Export singleton instance
export const geolocationService = GeolocationService.getInstance();