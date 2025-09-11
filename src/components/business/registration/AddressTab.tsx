
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AddressInput from './components/AddressInput';
import AddressFormFields from './components/AddressFormFields';

interface AddressTabProps {
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
}

const AddressTab: React.FC<AddressTabProps> = ({ onNext, onPrevious, disabled }) => {
  return (
    <div className="w-full max-w-none">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Physical Address</CardTitle>
          <CardDescription>
            Where your business is located.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddressInput disabled={disabled} />
          <AddressFormFields disabled={disabled} />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            disabled={disabled}
          >
            Back
          </Button>
          <Button 
            type="button" 
            className="bg-avante-blue hover:bg-avante-blue/90"
            onClick={onNext}
            disabled={disabled}
          >
            Next
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AddressTab;
