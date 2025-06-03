
import React, { useEffect, useRef } from 'react';
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

declare global {
  interface Window {
    L: any;
  }
}

const AddressTab: React.FC<AddressTabProps> = ({ onNext, onPrevious, disabled }) => {
  const form = useFormContext<FormValues>();
  const autocompleteRef = useRef<HTMLInputElement>(null);
  
  // Load LocationIQ autocomplete
  useEffect(() => {
    const initializeAutocomplete = async () => {
      try {
        // Get the LocationIQ token from Supabase secrets
        const { data, error } = await supabase.functions.invoke('get-locationiq-token');
        
        if (error) {
          console.error('Error getting LocationIQ token:', error);
          return;
        }
        
        const locationiqToken = data?.token;
        if (!locationiqToken) {
          console.warn('LocationIQ token not found');
          return;
        }

        // Load Leaflet if not already loaded
        if (!window.L) {
          const leafletScript = document.createElement('script');
          leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          leafletScript.onload = () => setupAutocomplete(locationiqToken);
          document.head.appendChild(leafletScript);
          
          const leafletCSS = document.createElement('link');
          leafletCSS.rel = 'stylesheet';
          leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(leafletCSS);
        } else {
          setupAutocomplete(locationiqToken);
        }
      } catch (error) {
        console.error('Error initializing autocomplete:', error);
      }
    };

    const setupAutocomplete = (token: string) => {
      if (!autocompleteRef.current) return;

      let timeout: NodeJS.Timeout;
      const suggestionsList = document.createElement('div');
      suggestionsList.className = 'absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto';
      suggestionsList.style.display = 'none';
      
      // Insert after the input field
      autocompleteRef.current.parentNode?.insertBefore(suggestionsList, autocompleteRef.current.nextSibling);

      const handleInput = (e: Event) => {
        const query = (e.target as HTMLInputElement).value;
        
        clearTimeout(timeout);
        
        if (query.length < 3) {
          suggestionsList.style.display = 'none';
          return;
        }

        timeout = setTimeout(async () => {
          try {
            const response = await fetch(
              `https://api.locationiq.com/v1/autocomplete.php?key=${token}&q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=us`
            );
            
            if (!response.ok) return;
            
            const data = await response.json();
            
            suggestionsList.innerHTML = '';
            
            if (data.length === 0) {
              suggestionsList.style.display = 'none';
              return;
            }

            data.forEach((place: any) => {
              const item = document.createElement('div');
              item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm';
              item.textContent = place.display_name;
              
              item.addEventListener('click', () => {
                // Parse the address components
                const addressParts = place.display_name.split(', ');
                let street = '';
                let state = '';
                let zipCode = '';
                
                // Try to extract components from the display name
                if (addressParts.length >= 3) {
                  street = addressParts[0];
                  const lastPart = addressParts[addressParts.length - 1];
                  const secondLastPart = addressParts[addressParts.length - 2];
                  
                  // Look for zip code pattern (5 digits)
                  const zipMatch = lastPart.match(/\b(\d{5})\b/);
                  if (zipMatch) {
                    zipCode = zipMatch[1];
                  }
                  
                  // Look for state (usually 2 letter abbreviation)
                  const stateMatch = secondLastPart.match(/\b([A-Z]{2})\b/);
                  if (stateMatch) {
                    state = stateMatch[1];
                  }
                }
                
                // Update form values
                form.setValue('streetAddress', street);
                if (state) form.setValue('state', state);
                if (zipCode) form.setValue('zipCode', zipCode);
                
                suggestionsList.style.display = 'none';
              });
              
              suggestionsList.appendChild(item);
            });
            
            suggestionsList.style.display = 'block';
          } catch (error) {
            console.error('Error fetching suggestions:', error);
          }
        }, 300);
      };

      const handleClickOutside = (e: Event) => {
        if (!suggestionsList.contains(e.target as Node) && e.target !== autocompleteRef.current) {
          suggestionsList.style.display = 'none';
        }
      };

      autocompleteRef.current.addEventListener('input', handleInput);
      document.addEventListener('click', handleClickOutside);

      return () => {
        autocompleteRef.current?.removeEventListener('input', handleInput);
        document.removeEventListener('click', handleClickOutside);
        suggestionsList.remove();
      };
    };

    initializeAutocomplete();
  }, [form]);

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
                  />
                </FormControl>
                <FormMessage />
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
