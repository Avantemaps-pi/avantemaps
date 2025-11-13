import React, { useRef, useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';
import { Building2, MapPinned, Mail, Globe, MapPin, Loader2 } from 'lucide-react';
import { useLocationIQAutocomplete } from '@/hooks/useLocationIQAutocomplete';
interface AddressFormFieldsProps {
  disabled?: boolean;
}

const AddressFormFields: React.FC<AddressFormFieldsProps> = ({ disabled }) => {
  const form = useFormContext<FormValues>();
  const { predictions, isLoading, getSuggestions, getPlaceDetails, clearSuggestions } = useLocationIQAutocomplete();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleAddressChange = (value: string) => {
    form.setValue('streetAddress', value);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const trimmedValue = value.trim();
    if (trimmedValue.length < 3) {
      clearSuggestions();
      setShowSuggestions(false);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      getSuggestions(trimmedValue);
      setShowSuggestions(true);
    }, 200);
  };

  const handleSuggestionClick = (prediction: typeof predictions[0]) => {
    console.log('📍 Address selected:', prediction);
    console.log('📦 Address object:', prediction.address);
    
    const streetAddress = [
      prediction.address.house_number,
      prediction.address.road
    ].filter(Boolean).join(' ') || prediction.mainText;

    // Set street address
    form.setValue('streetAddress', streetAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

    // Auto-fill city (LocationIQ may use city, town, village, or municipality)
    const city = prediction.address.city || 
                 prediction.address.town || 
                 prediction.address.village || 
                 prediction.address.municipality;
    if (city) {
      console.log('✓ Setting city:', city);
      form.setValue('city', city, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    } else {
      console.warn('⚠️ No city found in address');
    }

    // Auto-fill state/province (LocationIQ may use state, province, or region)
    const state = prediction.address.state || 
                  prediction.address.province || 
                  prediction.address.region;
    if (state) {
      console.log('✓ Setting state:', state);
      form.setValue('state', state, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    } else {
      console.warn('⚠️ No state found in address');
    }

    // Auto-fill postal code
    const postcode = prediction.address.postcode;
    if (postcode) {
      console.log('✓ Setting zipCode:', postcode);
      form.setValue('zipCode', postcode, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    } else {
      console.warn('⚠️ No postcode found in address');
    }

    // Auto-fill country
    const country = prediction.address.country;
    if (country) {
      console.log('✓ Setting country:', country);
      form.setValue('country', country, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    } else {
      console.warn('⚠️ No country found in address');
    }

    console.log('✅ Address autocomplete completed');
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
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      {/* Street Address - Autocomplete (First Field) */}
      <FormField
        control={form.control}
        name="streetAddress"
        render={({ field }) => (
          <FormItem ref={containerRef} className="relative">
            <FormLabel className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Street Address
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  id="streetAddress"
                  placeholder="Start typing to search for an address..."
                  {...field}
                  
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => predictions.length > 0 && setShowSuggestions(true)}
                  disabled={disabled}
                  autoComplete="address-line1"
                  className="h-12 rounded-xl border-2 focus:border-primary transition-colors pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <MapPin className="w-5 h-5" />
                  )}
                </div>
              </div>
            </FormControl>
            <FormMessage />
            
            {/* Address Suggestions Dropdown */}
            {showSuggestions && predictions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-auto">
                {predictions.map((prediction, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0 flex items-start gap-3"
                    onClick={() => handleSuggestionClick(prediction)}
                  >
                    <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                      📍
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {prediction.mainText}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {prediction.secondaryText}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </FormItem>
        )}
      />

      {/* Apartment/Complex */}
      <FormField
        control={form.control}
        name="apartment"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Apartment / Unit / Suite <span className="text-muted-foreground">(Optional)</span>
            </FormLabel>
            <FormControl>
              <Input
                id="apartment"
                placeholder="e.g., Suite 100, Unit 5B, Apt 2A"
                {...field}
                disabled={disabled}
                autoComplete="address-line2"
                className="h-12 rounded-xl border-2 focus:border-primary transition-colors"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* City, Province, Postal Code - Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <MapPinned className="w-4 h-4 text-muted-foreground" />
                City
              </FormLabel>
              <FormControl>
                <Input
                  id="city"
                  placeholder="e.g., Toronto"
                  {...field}
                  disabled={disabled}
                  autoComplete="address-level2"
                  className="h-12 rounded-xl border-2 focus:border-primary transition-colors"
                />
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
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Province / State
              </FormLabel>
              <FormControl>
                <Input
                  id="state"
                  placeholder="e.g., ON"
                  {...field}
                  disabled={disabled}
                  autoComplete="address-level1"
                  className="h-12 rounded-xl border-2 focus:border-primary transition-colors"
                />
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
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Postal Code
              </FormLabel>
              <FormControl>
                <Input
                  id="zipCode"
                  placeholder="e.g., M5H 2N2"
                  {...field}
                  disabled={disabled}
                  autoComplete="postal-code"
                  className="h-12 rounded-xl border-2 focus:border-primary transition-colors"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Country - Full Width */}
      <FormField
        control={form.control}
        name="country"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Country
            </FormLabel>
            <FormControl>
              <Input
                id="country"
                placeholder="e.g., Canada"
                {...field}
                disabled={disabled}
                autoComplete="country-name"
                className="h-12 rounded-xl border-2 focus:border-primary transition-colors"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default AddressFormFields;
