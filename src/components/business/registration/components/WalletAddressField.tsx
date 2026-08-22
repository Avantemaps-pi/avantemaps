
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';

interface WalletAddressFieldProps {
  disabled?: boolean | undefined;
}

const WalletAddressField: React.FC<WalletAddressFieldProps> = ({ disabled }) => {
  const form = useFormContext<FormValues>();
  
  return (
    <FormField
      control={form.control}
      name="piWalletAddress"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-base mb-1.5">Pi Wallet Address (Business)</FormLabel>
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
