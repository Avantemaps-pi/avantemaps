
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AddressInput from './components/AddressInput';
import AddressFormFields from './components/AddressFormFields';
import { CheckCircle2 } from 'lucide-react';

interface AddressTabProps {
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
}

const AddressTab: React.FC<AddressTabProps> = ({ onNext, onPrevious, disabled }) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Details</span>
          </div>
          <div className="w-12 sm:w-16 h-0.5 bg-primary"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-foreground">2</span>
            </div>
            <span className="text-sm font-semibold hidden sm:inline">Address</span>
          </div>
          <div className="w-12 sm:w-16 h-0.5 bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm text-muted-foreground">3</span>
            </div>
            <span className="text-sm text-muted-foreground hidden sm:inline">Contact</span>
          </div>
          <div className="w-12 sm:w-16 h-0.5 bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm text-muted-foreground">4</span>
            </div>
            <span className="text-sm text-muted-foreground hidden sm:inline">Hours</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Step 2 of 4: Business Address</p>
        </div>
      </div>

      <Card className="border-border/40 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="pb-6 space-y-3 bg-gradient-to-br from-background to-muted/20">
          <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Business Location
          </CardTitle>
          <CardDescription className="text-base sm:text-lg">
            Help customers find you by providing your business address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 px-4 sm:px-6">
          <AddressInput disabled={disabled} />
          <AddressFormFields disabled={disabled} />
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6 pb-6 px-4 sm:px-6 bg-muted/30">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            disabled={disabled}
            className="w-full sm:w-auto order-2 sm:order-1 border-2 hover:bg-background"
          >
            Back
          </Button>
          <Button 
            type="button" 
            onClick={onNext}
            disabled={disabled}
            className="w-full sm:w-auto sm:ml-auto order-1 sm:order-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Continue to Contact Info
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AddressTab;
