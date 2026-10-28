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
 * Uses ipwho.is over HTTPS (free, no API key required), as useIpLocationFocus does.
 * Its cache only holds coordinates, so the country needs its own request.
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
        // HTTPS: the old http://ip-api.com request was blocked as mixed content on the https site
        const response = await fetch('https://ipwho.is/?fields=success,country,country_code');
        
        if (!response.ok) {
          throw new Error('Failed to fetch geolocation');
        }

        const data = await response.json();
        
        if (data.success) {
          setResult({
            country: data.country,
            countryCode: data.country_code?.toLowerCase() || null,
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
