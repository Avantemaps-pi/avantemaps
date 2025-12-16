import { useState, useEffect } from 'react';
import { getCountryName } from '@/components/business/registration/utils/countryCodeMapping';

interface GeolocationResult {
  country: string | null;
  countryCode: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to detect user's country based on IP geolocation.
 * Uses ip-api.com (free, no API key required).
 */
export function useCountryGeolocation(): GeolocationResult {
  const [result, setResult] = useState<GeolocationResult>({
    country: null,
    countryCode: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // ip-api.com is free and doesn't require an API key
        const response = await fetch('http://ip-api.com/json/?fields=status,country,countryCode');
        
        if (!response.ok) {
          throw new Error('Failed to fetch geolocation');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
          setResult({
            country: data.country,
            countryCode: data.countryCode?.toLowerCase() || null,
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error('Geolocation lookup failed');
        }
      } catch (err) {
        console.warn('Country geolocation failed:', err);
        setResult({
          country: null,
          countryCode: null,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    };

    detectCountry();
  }, []);

  return result;
}
