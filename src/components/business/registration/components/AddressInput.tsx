
import React, { useRef, useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';
import AddressSuggestions, { AddressSuggestion } from './AddressSuggestions';
import { fetchAddressSuggestions } from '../utils/addressUtils';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressInputProps {
  disabled?: boolean;
}

const AddressInput: React.FC<AddressInputProps> = ({ disabled }) => {
  const form = useFormContext<FormValues>();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleAddressChange = (value: string) => {
    form.setValue('streetAddress', value);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Minimal debounce for instant feel while preventing API spam
    timeoutRef.current = setTimeout(async () => {
      if (value.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const fetchedSuggestions = await fetchAddressSuggestions(value);
        setSuggestions(fetchedSuggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const streetAddress = `${suggestion.address.house_number} ${suggestion.address.road}`.trim();
    
    form.setValue('streetAddress', streetAddress);
    form.setValue('city', suggestion.address.city);
    form.setValue('state', suggestion.address.state);
    form.setValue('zipCode', suggestion.address.postcode);
    form.setValue('country', suggestion.address.country);
    
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
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <MapPin className="w-5 h-5" />
                  )}
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
            <AddressSuggestions
              suggestions={suggestions}
              isVisible={showSuggestions}
              onSuggestionClick={handleSuggestionClick}
            />
          </FormItem>
        )}
      />
    </div>
  );
};

export default AddressInput;
