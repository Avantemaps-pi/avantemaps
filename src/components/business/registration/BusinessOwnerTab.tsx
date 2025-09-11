
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormValues } from './formSchema';

interface BusinessOwnerTabProps {
  onNext: () => void;
  disabled?: boolean;
}

const BusinessOwnerTab: React.FC<BusinessOwnerTabProps> = ({ onNext, disabled }) => {
  const form = useFormContext<FormValues>();
  
  return (
    <div className="w-full max-w-none">
      <Card className="border shadow-sm">
      <CardHeader className="pb-4 space-y-2">
        <CardTitle className="text-2xl sm:text-xl">Business Owner Information</CardTitle>
        <CardDescription className="text-base sm:text-sm">
          Tell us about yourself as the business owner.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base mb-1.5">First Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your first name" {...field} disabled={disabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base mb-1.5">Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your last name" {...field} disabled={disabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base mb-1.5">Business Name</FormLabel>
              <FormControl>
                <Input placeholder="Your business name" {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
      <CardFooter className="flex justify-end pt-2">
        <Button 
          type="button" 
          onClick={onNext}
          className="bg-avante-blue hover:bg-avante-blue/90 min-w-24"
          disabled={disabled}
        >
          Next
        </Button>
      </CardFooter>
      </Card>
    </div>
  );
};

export default BusinessOwnerTab;
