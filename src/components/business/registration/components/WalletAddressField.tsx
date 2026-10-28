
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';
import { STEP_LABEL_CLASS } from './stepLabel';

interface WalletAddressFieldProps {
  disabled?: boolean | undefined;
  /** Registration steps: sentence-case label in the steps' label style */
  stepLabels?: boolean | undefined;
}

const WalletAddressField: React.FC<WalletAddressFieldProps> = ({ disabled, stepLabels }) => {
  const form = useFormContext<FormValues>();
  
  return (
    <FormField
      control={form.control}
      name="piWalletAddress"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={stepLabels ? STEP_LABEL_CLASS : "text-base mb-1.5"}>{stepLabels ? 'Pi wallet address (business)' : 'Pi Wallet Address (Business)'}</FormLabel>
          <FormControl>
            <Input 
              id="piWalletAddress"
              placeholder="Your Pi wallet address" 
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

export default WalletAddressField;
