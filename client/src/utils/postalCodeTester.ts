/**
 * Testing utilities for postal code validation across all supported countries
 */

import { zipcodebaseService } from '@/services/zipcodebase';
import { geolocationService } from '@/services/geolocation';

export interface TestResult {
  country: string;
  postalCode: string;
  isValid: boolean;
  city?: string;
  state?: string;
  message: string;
}

export class PostalCodeTester {
  static async testAllCountries(): Promise<TestResult[]> {
    const examples = zipcodebaseService.getExamplePostalCodes();
    const results: TestResult[] = [];

    for (const [countryCode, example] of Object.entries(examples)) {
      try {
        console.log(`Testing ${countryCode}: ${example.code}`);
        
        if (countryCode === 'BR') {
          // Test Brazilian postal code with ViaCEP
          const response = await fetch(`https://viacep.com.br/ws/${example.code.replace(/\D/g, '')}/json/`);
          const data = await response.json();
          
          results.push({
            country: countryCode,
            postalCode: example.code,
            isValid: !data.erro,
            city: data.localidade,
            state: data.uf,
            message: data.erro ? 'Invalid postal code' : 'Valid via ViaCEP'
          });
        } else {
          // Test with Zipcodebase API
          const result = await zipcodebaseService.validatePostalCode(example.code, countryCode);
          
          results.push({
            country: countryCode,
            postalCode: example.code,
            isValid: result?.isValid || false,
            city: result?.city,
            state: result?.state,
            message: result?.isValid ? 'Valid via Zipcodebase' : 'Invalid or API unavailable'
          });
        }
      } catch (error) {
        results.push({
          country: countryCode,
          postalCode: example.code,
          isValid: false,
          message: `Error: ${error}`
        });
      }
    }

    return results;
  }

  static async testCountryDetection(): Promise<{ country: string; countryCode: string; detected: boolean }> {
    try {
      const location = await geolocationService.detectLocation();
      return {
        country: location?.country || 'Unknown',
        countryCode: location?.countryCode || 'Unknown',
        detected: !!location
      };
    } catch (error) {
      return {
        country: 'Error',
        countryCode: 'Error',
        detected: false
      };
    }
  }

  static logTestResults(results: TestResult[]): void {
    console.log('\n=== Postal Code Validation Test Results ===');
    results.forEach(result => {
      const status = result.isValid ? '✅' : '❌';
      console.log(`${status} ${result.country}: ${result.postalCode} - ${result.message}`);
      if (result.city && result.state) {
        console.log(`   Location: ${result.city}, ${result.state}`);
      }
    });
    console.log('============================================\n');
  }
}

// Export for console testing
(window as any).postalCodeTester = PostalCodeTester;