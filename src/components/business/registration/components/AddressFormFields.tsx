
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';
import { Building2, MapPinned, Mail, Globe } from 'lucide-react';

interface AddressFormFieldsProps {
  disabled?: boolean;
}

const AddressFormFields: React.FC<AddressFormFieldsProps> = ({ disabled }) => {
  const form = useFormContext<FormValues>();

  return (
    <div className="space-y-6">
      {/* Apartment/Complex - Always Visible */}
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
                  placeholder="e.g., Toronto"
                  {...field}
                  disabled={disabled}
                  autoComplete="address-level2"
                  className="h-12 rounded-xl border-2 focus:border-primary transition-colors bg-muted/30"
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
                  placeholder="e.g., ON"
                  {...field}
                  disabled={disabled}
                  autoComplete="address-level1"
                  className="h-12 rounded-xl border-2 focus:border-primary transition-colors bg-muted/30"
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
                  placeholder="e.g., M5H 2N2"
                  {...field}
                  disabled={disabled}
                  autoComplete="postal-code"
                  className="h-12 rounded-xl border-2 focus:border-primary transition-colors bg-muted/30"
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
                placeholder="e.g., Canada"
                {...field}
                disabled={disabled}
                autoComplete="country-name"
                className="h-12 rounded-xl border-2 focus:border-primary transition-colors bg-muted/30"
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
