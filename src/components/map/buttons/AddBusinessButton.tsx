
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AddBusinessButtonProps {
  selectedPlace: string | null;
}

const AddBusinessButton: React.FC<AddBusinessButtonProps> = ({ selectedPlace }) => {
  return (
    <div className={`absolute bottom-6 ${selectedPlace ? 'right-16 md:right-[calc(50%+200px)]' : 'right-6'} z-20 transition-all duration-300`}>
      <Link to="/registration">
        <Button 
          className="h-14 w-14 md:h-16 md:w-16 lg:h-16 lg:w-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
          aria-label="Register a business"
        >
          <Plus className="h-6 w-6 md:h-7 md:w-7 lg:h-7 lg:w-7" />
        </Button>
      </Link>
    </div>
  );
};

export default AddBusinessButton;
