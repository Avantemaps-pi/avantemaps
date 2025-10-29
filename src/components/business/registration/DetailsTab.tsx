import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AddressInput from './components/AddressInput';
import { Separator } from '@/components/ui/separator';

interface DetailsTabProps {
  onSubmit: (values: FormValues) => Promise<void>;
}

const DetailsTab = ({ onSubmit }: DetailsTabProps) => {
  const form = useFormContext<FormValues>();
  const { isSubmitting } = form.formState;

  return (
    <div className="space-y-6">
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Name */}
        <FormField
          control={form.control}
          name="business_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your business name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Business Email */}
        <FormField
          control={form.control}
          name="business_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Email</FormLabel>
              <FormControl>
                <Input placeholder="e.g. example@business.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Business Address */}
        <AddressInput />

        {/* Contact Number */}
        <FormField
          control={form.control}
          name="contact_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter contact number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          className="bg-avante-blue hover:bg-avante-blue/90 min-w-40"
          disabled={isSubmitting}
          onClick={form.handleSubmit(onSubmit)}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </div>
    </div>
  );
};

export default DetailsTab;
