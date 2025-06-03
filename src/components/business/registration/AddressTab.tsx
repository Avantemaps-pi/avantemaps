
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

interface AddressSuggestion {
  display_name: string;
  lat: number;
  lon: number;
  address: {
    house_number: string;
    road: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
}

const AddressTab: React.FC<AddressTabProps> = ({ onNext, onPrevious, disabled }) => {
  const form = useFormContext<FormValues>();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const fetchAddressSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address: query }
      });

      if (error) {
        console.error('Error fetching address suggestions:', error);
        setSuggestions([]);
        return;
      }

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error calling geocode function:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressChange = (value: string) => {
    form.setValue('streetAddress', value);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced search
    timeoutRef.current = setTimeout(() => {
      fetchAddressSuggestions(value);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const streetAddress = `${suggestion.address.house_number} ${suggestion.address.road}`.trim();
    
    form.setValue('streetAddress', streetAddress);
    form.setValue('state', suggestion.address.state);
    form.setValue('zipCode', suggestion.address.postcode);
    
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
                  <div className="relative">
                    <Input 
                      placeholder="123 Business Street" 
                      {...field}
                      ref={inputRef}
                      onChange={(e) => {
                        field.onChange(e);
                        handleAddressChange(e.target.value);
                      }}
                      disabled={disabled}
                      autoComplete="off"
                    />
                    {isLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
                
                {/* Address suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b border-gray-100 last:border-b-0 text-sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="font-medium text-gray-900">
                          {suggestion.address.house_number} {suggestion.address.road}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {suggestion.address.city}, {suggestion.address.state} {suggestion.address.postcode}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </FormItem>
            )}
          />
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
