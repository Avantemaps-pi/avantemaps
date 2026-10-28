import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormValues } from '../formSchema';
import { STEP_LABEL_CLASS } from './stepLabel';

interface BusinessNameFieldProps {
  disabled?: boolean | undefined;
  /** Registration steps: sentence-case label in the steps' label style */
  stepLabels?: boolean | undefined;
}

const BusinessNameField: React.FC<BusinessNameFieldProps> = ({ disabled, stepLabels }) => {
  const form = useFormContext<FormValues>();

  return (
    <FormField
      control={form.control}
      name="businessName"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={stepLabels ? STEP_LABEL_CLASS : "text-base mb-1.5"}>{stepLabels ? 'Business name *' : 'Business Name *'}</FormLabel>
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
