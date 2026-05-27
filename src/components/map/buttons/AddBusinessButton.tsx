
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const FAB_STORAGE_KEY = 'avante-map-fab-seen';

interface AddBusinessButtonProps {
  selectedPlace: string | null;
}

const AddBusinessButton: React.FC<AddBusinessButtonProps> = ({ selectedPlace }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(FAB_STORAGE_KEY);
    setIsExpanded(!hasSeen);
  }, []);

  const handleClick = () => {
    if (!localStorage.getItem(FAB_STORAGE_KEY)) {
      localStorage.setItem(FAB_STORAGE_KEY, 'true');
    }
    setIsExpanded(false);
  };

  const positionClass = selectedPlace ? 'right-16 md:right-[calc(50%+200px)]' : 'right-6';

  return (
    <div data-add-business-button className={`absolute bottom-20 sm:bottom-6 ${positionClass} z-20 transition-all duration-300`}>
      <Link to="/registration" onClick={handleClick}>
        {isExpanded ? (
          <Button
            className="h-14 pl-4 pr-6 rounded-full bg-primary hover:bg-primary/90 shadow-lg flex items-center gap-2 transition-all duration-300"
            aria-label="Register a business"
          >
            <Plus className="h-6 w-6 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">Register Business</span>
          </Button>
        ) : (
          <Button
            className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg transition-all duration-300"
            aria-label="Register a business"
          >
            <Plus className="h-6 w-6 md:h-7 md:w-7" />
          </Button>
        )}
      </Link>
    </div>
  );
};

export default AddBusinessButton;
