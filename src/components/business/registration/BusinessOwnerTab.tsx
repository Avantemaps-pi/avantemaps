
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';
import { useAuth } from '@/context/auth';
import { FormValues } from './formSchema';

interface BusinessOwnerTabProps {
  onNext: () => void;
  disabled?: boolean;
}

const BusinessOwnerTab: React.FC<BusinessOwnerTabProps> = ({ onNext, disabled }) => {
  const form = useFormContext<FormValues>();
  const { user } = useAuth();
  
  return (
    <div className="w-full">
      <Card className="border shadow-sm">
      <CardHeader className="pb-4 space-y-2">
        <CardTitle className="text-2xl sm:text-xl">Business Owner Information</CardTitle>
        <CardDescription className="text-base sm:text-sm">
          Confirm your identity as the business owner.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Username Display */}
        <div className="space-y-2">
          <Label className="text-base">Pi Network Username</Label>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-md border">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{user?.username || 'Unknown'}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This username is linked to your Pi Network account and will be associated with your business.
          </p>
        </div>

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
