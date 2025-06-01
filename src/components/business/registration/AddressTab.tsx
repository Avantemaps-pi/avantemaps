
import React, { useEffect, useRef } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFormContext } from 'react-hook-form';
import { FormValues } from './formSchema';
import { GOOGLE_MAPS_API_KEY } from '@/components/map/mapConfig';

interface AddressTabProps {
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

const AddressTab: React.FC<AddressTabProps> = ({ onNext, onPrevious, disabled }) => {
  const form = useFormContext<FormValues>();
  const autocompleteRef = useRef<HTMLInputElement>(null);
  
  // Load Google Maps script with Places API
  useEffect(() => {
    // Check if script is already loaded
    const googleMapsScriptId = 'google-maps-script';
    
    // Function to initialize autocomplete
    const initializeAutocomplete = () => {
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.places) {
        const autocomplete = new window.google.maps.places.Autocomplete(
          autocompleteRef.current,
          { types: ['address'] }
        );
        
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry) {
            // User entered the name of a Place that was not suggested
            return;
          }
          
          // Get address components
          const addressComponents = place.address_components;
          let street = '';
          let state = '';
          let zipCode = '';
          
          for (const component of addressComponents) {
            const componentType = component.types[0];
            
            switch (componentType) {
              case 'street_number':
                street = component.long_name;
                break;
              case 'route':
                street += ' ' + component.long_name;
                break;
              case 'administrative_area_level_1':
                state = component.long_name;
                break;
              case 'postal_code':
                zipCode = component.long_name;
                break;
            }
          }
          
          // Update form values
          form.setValue('streetAddress', street.trim());
          form.setValue('state', state);
          form.setValue('zipCode', zipCode);
        });
      }
    };

    if (!document.getElementById(googleMapsScriptId) && !window.google) {
      const script = document.createElement('script');
      script.id = googleMapsScriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      // Use onload event instead of callback
      script.onload = initializeAutocomplete;
      
      document.head.appendChild(script);
    } else if (window.google && window.google.maps && window.google.maps.places) {
      // If script is already loaded, initialize autocomplete directly
      initializeAutocomplete();
    }
    
    return () => {
      // Clean up if needed
    };
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>
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
