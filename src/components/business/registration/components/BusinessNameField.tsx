import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormValues } from '../formSchema';

interface BusinessNameFieldProps {
  disabled?: boolean | undefined;
}

const BusinessNameField: React.FC<BusinessNameFieldProps> = ({ disabled }) => {
  const form = useFormContext<FormValues>();

  return (
    <FormField
      control={form.control}
      name="businessName"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-base mb-1.5">Business Name *</FormLabel>
          <FormControl>
            <Input
              id="businessName"
              placeholder="Your business name"
              autoComplete="organization"
              {...field}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default BusinessNameField;
