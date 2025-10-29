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

  const handleSuggestionClick = async (placeId: string) => {
    const placeDetails = await getPlaceDetails(placeId);
    
    if (placeDetails) {
      // Parse the address to extract components
      const addressParts = placeDetails.address.split(',').map(s => s.trim());
      
      form.setValue('streetAddress', placeDetails.name);
      if (addressParts.length > 1) form.setValue('city', addressParts[addressParts.length - 3] || '');
      if (addressParts.length > 2) form.setValue('state', addressParts[addressParts.length - 2] || '');
      if (addressParts.length > 0) form.setValue('country', addressParts[addressParts.length - 1] || '');
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
              <div className="absolute z-50 w-full mt-2 bg-background border-2 border-primary/20 rounded-xl shadow-2xl max-h-80 overflow-auto backdrop-blur-sm">
                <div className="p-2">
                  {predictions.map((prediction) => (
                    <button
                      key={prediction.placeId}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-primary/10 rounded-lg transition-colors border-b border-border/50 last:border-b-0 group"
                      onClick={() => handleSuggestionClick(prediction.placeId)}
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
