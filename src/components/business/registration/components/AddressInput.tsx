import React, { useRef, useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';
import AddressSuggestions, { AddressSuggestion } from './AddressSuggestions';
import { fetchAddressSuggestions } from '../utils/addressUtils';

interface AddressInputProps {
  disabled?: boolean;
}

const AddressInput: React.FC<AddressInputProps> = ({ disabled = false }) => {
  const form = useFormContext<FormValues>();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleAddressChange = async (value: string) => {
    form.setValue('streetAddress', value);
    
    // Don't search if disabled or input is too short
    if (disabled || value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced search
    timeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        console.log('Fetching suggestions for:', value);
        const fetchedSuggestions = await fetchAddressSuggestions(value);
        console.log('Received suggestions:', fetchedSuggestions);
        setSuggestions(fetchedSuggestions);
        setShowSuggestions(fetchedSuggestions.length > 0);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    if (disabled) return;
    
    const streetAddress = `${suggestion.address.house_number} ${suggestion.address.road}`.trim();
    
    // Update form fields with selected suggestion
    form.setValue('streetAddress', streetAddress);
    form.setValue('city', suggestion.address.city);
    form.setValue('state', suggestion.address.state);
    form.setValue('zipCode', suggestion.address.postcode);
    
    // Clear suggestions and hide dropdown
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Update input value manually to ensure it displays correctly
    if (inputRef.current) {
      inputRef.current.value = streetAddress;
    }
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

  // Hide suggestions when input is disabled
  useEffect(() => {
    if (disabled) {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [disabled]);

  return (
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
                  className={disabled ? "bg-gray-100 cursor-not-allowed" : ""}
                />
                {isLoading && !disabled && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
            
            <AddressSuggestions
              suggestions={suggestions}
              isVisible={showSuggestions && !disabled}
              onSuggestionClick={handleSuggestionClick}
            />
          </FormItem>
        )}
      />
    </div>
  );
};

export default AddressInput;
