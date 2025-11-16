
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormValues } from './formSchema';
import BusinessImageUpload from './components/BusinessImageUpload';
import BusinessDescriptionField from './components/BusinessDescriptionField';
import WalletAddressField from './components/WalletAddressField';
import BusinessTypeSelector from './components/BusinessTypeSelector';
import { Loader2 } from 'lucide-react';

interface DetailsTabProps {
  onNext: () => void;
  onPrevious: () => void;
  selectedImages: File[];
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageRemove?: (index: number) => void;
  handleImageReorder?: (newImages: File[]) => void;
  disabled?: boolean;
}

const DetailsTab: React.FC<DetailsTabProps> = ({
  onNext,
  onPrevious,
  selectedImages,
  handleImageUpload,
  handleImageRemove,
  handleImageReorder,
  disabled
}) => {
  const form = useFormContext<FormValues>();
  
  return (
    <div className="w-full">
      <Card className="border shadow-sm">
      <CardHeader className="pb-4 space-y-2">
        <CardTitle className="text-2xl sm:text-xl">Additional Details</CardTitle>
        <CardDescription className="text-base sm:text-sm">
          Tell customers more about your business.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <BusinessTypeSelector disabled={disabled} />
        <BusinessImageUpload 
          selectedImages={selectedImages}
          handleImageUpload={handleImageUpload}
          handleImageRemove={handleImageRemove}
          handleImageReorder={handleImageReorder}
          maxImages={3}
          disabled={disabled}
        />
        <BusinessDescriptionField disabled={disabled} />
        <WalletAddressField disabled={disabled} />
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="min-w-24"
          disabled={disabled}
        >
          Back
        </Button>
        <Button 
          type="button" 
          className="bg-avante-blue hover:bg-avante-blue/90 min-w-40"
          onClick={onNext}
          disabled={disabled}
        >
          Preview
        </Button>
      </CardFooter>
      </Card>
    </div>
  );
};

export default DetailsTab;
