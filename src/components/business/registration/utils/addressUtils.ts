import { supabase } from '@/integrations/supabase/client';
import { AddressSuggestion } from '../components/AddressSuggestions';

/**
 * Fetches address suggestions from the supabase edge function
 * using the logged-in user's JWT for authentication.
 */
export const fetchAddressSuggestions = async (query: string): Promise<AddressSuggestion[]> => {
  if (query.length < 3) return [];

  try {
    // Get current session & JWT
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      console.error('User not logged in. Cannot fetch address suggestions.');
      return [];
    }

    const { data, error } = await supabase.functions.invoke('geocode-address', {
      body: { address: query },
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (error) {
      console.error('Error fetching address suggestions:', error);
      return [];
    }

    if (!data?.suggestions || !Array.isArray(data.suggestions)) {
      console.warn('No suggestions returned from geocode-address function.');
      return [];
    }

    // Optional debug logging
    console.log('Fetched suggestions:', data.suggestions);

    return data.suggestions;
  } catch (err) {
    console.error('Error calling geocode function:', err);
    return [];
  }
};
