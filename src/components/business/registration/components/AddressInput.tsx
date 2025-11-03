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
    const streetAddress = [
      prediction.address.house_number,
      prediction.address.road
    ].filter(Boolean).join(' ') || prediction.mainText;

    form.setValue('streetAddress', streetAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

    const city = prediction.address.city;
    if (city) {
      form.setValue('city', city, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }

    const state = prediction.address.state;
    if (state) {
      form.setValue('state', state, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }

    const postcode = prediction.address.postcode;
    if (postcode) {
      form.setValue('zipCode', postcode, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }

    const country = prediction.address.country;
    if (country) {
      form.setValue('country', country, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }

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
              <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-auto">
                {predictions.map((prediction) => (
                  <button
                    key={prediction.placeId}
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0 flex items-start gap-3"
                    onClick={() => handleSuggestionClick(prediction)}
                  >
                    <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                      📍
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {prediction.address.house_number} {prediction.address.road}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {prediction.address.city}, {prediction.address.state}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </FormItem>
        )}
      />
    </div>
  );
};

export default AddressInput;
