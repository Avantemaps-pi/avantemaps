
import React, { useEffect, useRef, useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFormContext } from 'react-hook-form';
import { FormValues } from './formSchema';
import { supabase } from '@/integrations/supabase/client';

interface AddressTabProps {
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
}

interface LocationIQSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

const AddressTab: React.FC<AddressTabProps> = ({ onNext, onPrevious, disabled }) => {
  const form = useFormContext<FormValues>();
  const [suggestions, setSuggestions] = useState<LocationIQSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationiqToken, setLocationiqToken] = useState<string>('');
  const autocompleteRef = useRef<HTMLInputElement>(null);
  
  // Get LocationIQ token from Supabase secrets
  useEffect(() => {
    const getLocationIQToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-locationiq-token');
        if (error) {
          console.error('Error getting LocationIQ token:', error);
        } else {
          setLocationiqToken(data?.token || '');
        }
      } catch (error) {
        console.error('Error fetching LocationIQ token:', error);
      }
    };

    getLocationIQToken();
  }, []);

  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3 || !locationiqToken) return;

    try {
      const response = await fetch(
        `https://api.locationiq.com/v1/search.php?key=${locationiqToken}&q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=us`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error searching addresses:', error);
    }
  };

  const handleAddressChange = (value: string) => {
    form.setValue('streetAddress', value);
    searchAddresses(value);
  };

  const handleSuggestionClick = (suggestion: LocationIQSuggestion) => {
    const address = suggestion.address;
    const streetAddress = `${address.house_number || ''} ${address.road || ''}`.trim();
    
    form.setValue('streetAddress', streetAddress || suggestion.display_name);
    form.setValue('state', address.state || '');
    form.setValue('zipCode', address.postcode || '');
    
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Physical Address</CardTitle>
        <CardDescription>
          Where your business is located.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <FormField
            control={form.control}
            name="streetAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="123 Business Street" 
                    {...field}
                    ref={autocompleteRef}
                    disabled={disabled}
                    onChange={(e) => {
                      field.onChange(e);
                      handleAddressChange(e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Address suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.place_id}
                  className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.display_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <FormField
          control={form.control}
          name="apartment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Apartment / Complex (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Suite 101" {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State / Province</FormLabel>
              <FormControl>
                <Input placeholder="California" {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="zipCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Postal / Zip Code</FormLabel>
              <FormControl>
                <Input placeholder="94103" {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          disabled={disabled}
        >
          Back
        </Button>
        <Button 
          type="button" 
          className="bg-avante-blue hover:bg-avante-blue/90"
          onClick={onNext}
          disabled={disabled}
        >
          Next
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AddressTab;
