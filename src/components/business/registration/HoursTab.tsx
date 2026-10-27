
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import HoursFields from './components/HoursFields';

interface HoursTabProps {
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
}

const HoursTab: React.FC<HoursTabProps> = ({ onNext, onPrevious, disabled }) => {
  return (
    <div className="w-full">
      <Card className="border shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl">Trading Hours</CardTitle>
          <CardDescription>
            Let customers know when your business is open.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HoursFields disabled={disabled} />
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
            className="bg-primary hover:bg-primary/90"
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

export default HoursTab;
