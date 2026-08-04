
import React from 'react';
import { MapPin } from 'lucide-react';

interface PlaceAddressProps {
  address: string;
  onClick: () => void;
}

const PlaceAddress: React.FC<PlaceAddressProps> = ({ address, onClick }) => {
  return (
    <div 
      className="flex items-center gap-1 text-sm text-gray-600 mb-2 cursor-pointer hover:text-primary transition-colors"
      onClick={onClick}
    >
      <MapPin className="h-4 w-4" />
      <span className="text-xs">{address}</span>
    </div>
  );
};

export default PlaceAddress;
