
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormValues } from './formSchema';
import BusinessImageUpload from './components/BusinessImageUpload';
import BusinessDescriptionField from './components/BusinessDescriptionField';
import WalletAddressField from './components/WalletAddressField';
import { ImageUploadStatus } from '@/hooks/useImageUpload';

interface UpdateDetailsTabProps {
  onPrevious: () => void;
  images: ImageUploadStatus[];
  onAddImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (id: string) => void;
  onRetryImage?: (id: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

const UpdateDetailsTab: React.FC<UpdateDetailsTabProps> = ({ 
  onPrevious, 
  images, 
  onAddImage,
  onRemoveImage,
  onRetryImage,
  isProcessing,
  disabled 
}) => {
  const form = useFormContext<FormValues>();
  
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4 space-y-2">
        <CardTitle className="text-2xl sm:text-xl">Additional Details</CardTitle>
        <CardDescription className="text-base sm:text-sm">
          Update additional information about your business.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <BusinessImageUpload 
          images={images}
          onAddImage={onAddImage}
          onRemoveImage={onRemoveImage}
          onRetryImage={onRetryImage}
          isProcessing={isProcessing}
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
          type="submit" 
          className="bg-avante-blue hover:bg-avante-blue/90 min-w-40"
          disabled={disabled}
        >
          Submit
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UpdateDetailsTab;
