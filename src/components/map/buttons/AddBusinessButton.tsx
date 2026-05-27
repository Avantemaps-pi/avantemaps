
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth/useAuth';

interface AddBusinessButtonProps {
  selectedPlace: string | null;
}

const AddBusinessButton: React.FC<AddBusinessButtonProps> = ({ selectedPlace }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [hasBusinesses, setHasBusinesses] = useState<boolean | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!isAuthenticated || !user?.uid) {
        setHasBusinesses(false);
        return;
      }
      const { count } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.uid);
      if (!cancelled) setHasBusinesses((count ?? 0) > 0);
    };
    check();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.uid]);

  const positionClass = selectedPlace ? 'right-16 md:right-[calc(50%+200px)]' : 'right-6';

  // State 1: new user — expanded pill linking directly
  if (hasBusinesses === false) {
    return (
      <div data-add-business-button className={`absolute bottom-20 sm:bottom-24 ${positionClass} z-20 transition-all duration-300`}>
        <Link to="/registration">
          <Button
            className="h-14 pl-4 pr-6 rounded-full bg-primary hover:bg-primary/90 shadow-lg flex items-center gap-2 transition-all duration-300"
            aria-label="Register a business"
          >
            <Plus className="h-6 w-6 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">Register Business</span>
          </Button>
        </Link>
      </div>
    );
  }

  // State 2/3: returning user — collapsed icon, expand briefly on tap then navigate
  const handleClick = (e: React.MouseEvent) => {
    if (previewExpanded) return;
    e.preventDefault();
    setPreviewExpanded(true);
    setTimeout(() => {
      navigate('/registration');
    }, 2000);
  };

  return (
    <div data-add-business-button className={`absolute bottom-20 sm:bottom-24 ${positionClass} z-20 transition-all duration-300`}>
      <Button
        onClick={handleClick}
        aria-label="Register a business"
        className={`h-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg flex items-center gap-2 transition-all duration-300 ${
          previewExpanded ? 'w-auto pl-4 pr-6' : 'w-12 p-0 justify-center'
        }`}
      >
        <Plus className="h-5 w-5 flex-shrink-0" />
        {previewExpanded && (
          <span className="text-sm font-medium whitespace-nowrap animate-fade-in">Register Business</span>
        )}
      </Button>
    </div>
  );
};

export default AddBusinessButton;
