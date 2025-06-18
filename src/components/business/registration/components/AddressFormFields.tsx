
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';

interface AddressFormFieldsProps {
  disabled?: boolean;
}

const AddressFormFields: React.FC<AddressFormFieldsProps> = ({ disabled }) => {
  const form = useFormContext<FormValues>();

  return (
    <>
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
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>City</FormLabel>
            <FormControl>
              <Input placeholder="San Francisco" {...field} disabled={disabled} />
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
      
      <FormField
        control={form.control}
        name="country"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country</FormLabel>
            <FormControl>
              <Input placeholder="United States" {...field} disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default AddressFormFields;
