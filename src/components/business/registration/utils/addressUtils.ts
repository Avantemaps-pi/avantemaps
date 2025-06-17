
import { supabase } from '@/integrations/supabase/client';
import { AddressSuggestion } from '../components/AddressSuggestions';

export const fetchAddressSuggestions = async (query: string): Promise<AddressSuggestion[]> => {
  if (query.length < 3) {
    return [];
  }

  try {
    const { data, error } = await supabase.functions.invoke('geocode-address', {
      body: { address: query }
    });

    if (error) {
      console.error('Error fetching address suggestions:', error);
      return [];
    }

    return data?.suggestions || [];
  } catch (error) {
    console.error('Error calling geocode function:', error);
    return [];
  }
};
