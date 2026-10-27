
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OwnerUsernameField from './components/OwnerUsernameField';
import BusinessNameField from './components/BusinessNameField';

interface BusinessOwnerTabProps {
  onNext: () => void;
  disabled?: boolean;
}

const BusinessOwnerTab: React.FC<BusinessOwnerTabProps> = ({ onNext, disabled }) => {
  return (
    <div className="w-full">
      <Card className="border shadow-xs">
      <CardHeader className="pb-4 space-y-2">
        <CardTitle className="text-2xl sm:text-xl">Business Owner Information</CardTitle>
        <CardDescription className="text-base sm:text-sm">
          Confirm your identity as the business owner.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <OwnerUsernameField />

        <BusinessNameField disabled={disabled} />
      </CardContent>
      <CardFooter className="flex justify-end pt-2">
        <Button 
          type="button" 
          onClick={onNext}
          className="min-w-24"
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
