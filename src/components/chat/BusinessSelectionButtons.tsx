
import React from 'react';
import { Button } from '@/components/ui/button';

interface Business {
  id: number;
  name: string;
}

interface BusinessSelectionButtonsProps {
  businesses: Business[];
  onBusinessSelect: (business: Business) => void;
}

const BusinessSelectionButtons: React.FC<BusinessSelectionButtonsProps> = ({
  businesses,
  onBusinessSelect
}) => {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {businesses.map((business) => (
        <Button 
          key={business.id}
          variant="outline" 
          size="sm"
          onClick={() => onBusinessSelect(business)}
          className="flex-shrink-0"
        >
          {business.name}
        </Button>
      ))}
    </div>
  );
};

export default BusinessSelectionButtons;
