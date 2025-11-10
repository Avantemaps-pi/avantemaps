import React, { useRef, useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';
import { useLocationIQAutocomplete } from '@/hooks/useLocationIQAutocomplete';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressInputProps {
  disabled?: boolean;
}

const AddressInput: React.FC<AddressInputProps> = ({ disabled }) => {
  const form = useFormContext<FormValues>();
  const { predictions, isLoading, getSuggestions, getPlaceDetails, clearSuggestions } = useLocationIQAutocomplete();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleAddressChange = (value: string) => {
    form.setValue('streetAddress', value);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (value.length < 3) {
      clearSuggestions();
      setShowSuggestions(false);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      getSuggestions(value);
      setShowSuggestions(true);
    }, 200);
  };

  const handleSuggestionClick = (prediction: typeof predictions[0]) => {
    console.log('📍 Address selected:', prediction);
    
    const streetAddress = [
      prediction.address.house_number,
      prediction.address.road
    ].filter(Boolean).join(' ') || prediction.mainText;

    // Set street address
    form.setValue('streetAddress', streetAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

    // Auto-fill city
    const city = prediction.address.city;
    if (city) {
      console.log('Setting city:', city);
      form.setValue('city', city, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }

    // Auto-fill state/province
    const state = prediction.address.state;
    if (state) {
      console.log('Setting state:', state);
      form.setValue('state', state, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }

    // Auto-fill postal code
    const postcode = prediction.address.postcode;
    if (postcode) {
      console.log('Setting zipCode:', postcode);
      form.setValue('zipCode', postcode, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }

    // Auto-fill country
    const country = prediction.address.country;
    if (country) {
      console.log('Setting country:', country);
      form.setValue('country', country, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }

    console.log('✅ All address fields updated');
    clearSuggestions();
    setShowSuggestions(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      <FormField
        control={form.control}
        name="streetAddress"
        render={({ field }) => (
          <FormItem className="relative">
            <FormLabel className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Search Address
            </FormLabel>
            <FormControl>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <MapPin className="w-5 h-5" />}
                </div>
                <Input
                  placeholder="Start typing your business address..."
                  {...field}
                  ref={inputRef}
                  onChange={(e) => {
                    field.onChange(e);
                    handleAddressChange(e.target.value);
                  }}
                  disabled={disabled}
                  autoComplete="off"
                  className="pl-12 h-14 text-base rounded-xl border-2 focus:border-primary transition-colors shadow-sm"
                />
              </div>
            </FormControl>
            <p className="text-xs text-muted-foreground mt-1.5 ml-1">
              We'll automatically fill in city, province, and postal code
            </p>
            <FormMessage />
            {showSuggestions && predictions.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-background border-2 border-primary/20 rounded-xl shadow-2xl max-h-80 overflow-auto backdrop-blur-sm">
                <div className="p-2">
                  {predictions.map((prediction) => (
                    <button
                      key={prediction.placeId}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-primary/10 rounded-lg transition-colors border-b border-border/50 last:border-b-0 group"
                      onClick={() => handleSuggestionClick(prediction)}
                    >
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-start gap-2">
                        <span className="text-primary mt-0.5">📍</span>
                        <span>{prediction.mainText}</span>
                      </div>
                      <div className="text-muted-foreground text-sm mt-1 ml-6">
                        {prediction.secondaryText}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </FormItem>
        )}
      />
    </div>
  );
};

export default AddressInput;
