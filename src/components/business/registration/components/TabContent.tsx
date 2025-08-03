
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import BusinessOwnerTab from '../BusinessOwnerTab';
import ContactTab from '../ContactTab';
import AddressTab from '../AddressTab';
import HoursTab from '../HoursTab';
import DetailsTab from '../DetailsTab';

interface TabContentProps {
  selectedImages: File[];
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageRemove?: (index: number) => void;
  setSelectedTab: (tab: string) => void;
  isSubmitting?: boolean;
}

const TabContent: React.FC<TabContentProps> = ({ 
  selectedImages, 
  handleImageUpload,
  handleImageRemove,
  setSelectedTab,
  isSubmitting
}) => {
  return (
    <div className="w-full min-h-[500px]">
      <TabsContent value="business-owner" className="space-y-4 w-full">
        <BusinessOwnerTab 
          onNext={() => setSelectedTab('contact')}
          disabled={isSubmitting} 
        />
      </TabsContent>

      <TabsContent value="contact" className="space-y-4 w-full">
        <ContactTab 
          onNext={() => setSelectedTab('address')} 
          onPrevious={() => setSelectedTab('business-owner')} 
          disabled={isSubmitting}
        />
      </TabsContent>

      <TabsContent value="address" className="space-y-4 w-full">
        <AddressTab 
          onNext={() => setSelectedTab('hours')} 
          onPrevious={() => setSelectedTab('contact')} 
          disabled={isSubmitting}
        />
      </TabsContent>

      <TabsContent value="hours" className="space-y-4 w-full">
        <HoursTab 
          onNext={() => setSelectedTab('details')} 
          onPrevious={() => setSelectedTab('address')} 
          disabled={isSubmitting}
        />
      </TabsContent>

      <TabsContent value="details" className="space-y-4 w-full">
        <DetailsTab 
          onPrevious={() => setSelectedTab('hours')}
          selectedImages={selectedImages}
          handleImageUpload={handleImageUpload}
          handleImageRemove={handleImageRemove}
          disabled={isSubmitting}
        />
      </TabsContent>
    </div>
  );
};

export default TabContent;
