
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import BusinessOwnerTab from '../BusinessOwnerTab';
import ContactTab from '../ContactTab';
import AddressTab from '../AddressTab';
import HoursTab from '../HoursTab';
import DetailsTab from '../DetailsTab';
import PreviewTab from '../PreviewTab';
import { ImageUploadStatus } from '@/hooks/useImageUpload';

interface TabContentProps {
  images: ImageUploadStatus[];
  onAddImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (id: string) => void;
  onRetryImage?: (id: string) => void;
  isProcessing?: boolean;
  setSelectedTab: (tab: string) => void;
  isSubmitting?: boolean;
}

const TabContent: React.FC<TabContentProps> = ({ 
  images, 
  onAddImage,
  onRemoveImage,
  onRetryImage,
  isProcessing,
  setSelectedTab,
  isSubmitting
}) => {
  return (
    <div className="w-full min-h-[500px]">
      <TabsContent value="business-owner" className="space-y-4 w-full">
        <BusinessOwnerTab 
          onNext={() => setSelectedTab('address')}
          disabled={isSubmitting} 
        />
      </TabsContent>

      <TabsContent value="address" className="space-y-4 w-full">
        <AddressTab 
          onNext={() => setSelectedTab('contact')} 
          onPrevious={() => setSelectedTab('business-owner')} 
          disabled={isSubmitting}
        />
      </TabsContent>

      <TabsContent value="contact" className="space-y-4 w-full">
        <ContactTab 
          onNext={() => setSelectedTab('hours')} 
          onPrevious={() => setSelectedTab('address')} 
          disabled={isSubmitting}
        />
      </TabsContent>

      <TabsContent value="hours" className="space-y-4 w-full">
        <HoursTab 
          onNext={() => setSelectedTab('details')} 
          onPrevious={() => setSelectedTab('contact')} 
          disabled={isSubmitting}
        />
      </TabsContent>

      <TabsContent value="details" className="space-y-4 w-full">
        <DetailsTab 
          onNext={() => setSelectedTab('preview')}
          onPrevious={() => setSelectedTab('hours')}
          images={images}
          onAddImage={onAddImage}
          onRemoveImage={onRemoveImage}
          onRetryImage={onRetryImage}
          isProcessing={isProcessing}
          disabled={isSubmitting}
        />
      </TabsContent>

      <TabsContent value="preview" className="space-y-4 w-full">
        <PreviewTab 
          onNext={() => {}}
          onPrevious={() => setSelectedTab('details')}
          images={images}
          disabled={isSubmitting}
        />
      </TabsContent>
    </div>
  );
};

export default TabContent;
