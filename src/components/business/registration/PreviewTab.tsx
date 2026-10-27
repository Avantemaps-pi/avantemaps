import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageUploadStatus } from '@/hooks/useImageUpload';
import ListingPreview from './components/ListingPreview';

interface PreviewTabProps {
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
  images: ImageUploadStatus[];
  existingImages?: string[];
}

const PreviewTab: React.FC<PreviewTabProps> = ({
  onNext,
  onPrevious,
  disabled,
  images,
  existingImages = [],
}) => {
  return (
    <div className="w-full">
      <Card className="border shadow-xs">
        <CardHeader className="pb-4 space-y-2">
          <CardTitle className="text-2xl sm:text-xl">Preview Your Listing</CardTitle>
          <CardDescription className="text-base sm:text-sm">
            This is how your business will appear to customers on Avante Maps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Review your business listing carefully. You can go back to edit any section before submitting.
            </AlertDescription>
          </Alert>

          <ListingPreview images={images} existingImages={existingImages} />
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious} 
            disabled={disabled}
          >
            Back
          </Button>
          <Button 
            type="submit" 
            disabled={disabled}
          >
            Submit Registration
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PreviewTab;
