import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, X, MapPin, Bookmark, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth/useAuth';

interface AddBusinessButtonProps {
  selectedPlace: string | null;
}

type FabState = 'expanded' | 'collapsed' | 'hasBusiness';

const FIRST_VISIT_KEY = 'fab_first_visit';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const AddBusinessButton: React.FC<AddBusinessButtonProps> = ({ selectedPlace }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [fabState, setFabState] = useState<FabState | null>(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const determineState = async () => {
      // Record first visit timestamp if missing
      let firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
      if (!firstVisit) {
        firstVisit = new Date().toISOString();
        localStorage.setItem(FIRST_VISIT_KEY, firstVisit);
      }

      // Check business ownership
      let hasBusiness = false;
      if (isAuthenticated && user?.uid) {
        try {
          const { count } = await supabase
            .from('businesses')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', user.uid);
          hasBusiness = (count ?? 0) > 0;
        } catch (error) {
          console.warn('Failed to check business count, defaulting FAB to expanded:', error);
          if (!cancelled) setFabState('expanded');
          return;
        }
      }

      if (cancelled) return;

      if (hasBusiness) {
        setFabState('hasBusiness');
        return;
      }

      const elapsed = Date.now() - new Date(firstVisit).getTime();
      setFabState(elapsed > TWENTY_FOUR_HOURS_MS ? 'collapsed' : 'expanded');
    };
    determineState();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.uid]);

  const positionClass = selectedPlace ? 'right-16 md:right-[calc(50%+200px)]' : 'right-6';

  if (fabState === null) return null;

  // State 1: expanded pill
  if (fabState === 'expanded') {
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

  // State 2 / 3: collapsed icon with speed dial
  const registerLabel = fabState === 'hasBusiness' ? 'Add Another Business' : 'Register Business';

  const actions = [
    { icon: MapPin, label: 'Explore Map', onClick: () => navigate('/') },
    { icon: Bookmark, label: 'Save a Business', onClick: () => navigate('/bookmarks') },
    { icon: Store, label: registerLabel, onClick: () => navigate('/registration') },
  ];

  const handleActionClick = (onClick: () => void) => {
    setSpeedDialOpen(false);
    onClick();
  };

  return (
    <>
      {speedDialOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[25] animate-fade-in"
          onClick={() => setSpeedDialOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        data-add-business-button
        className={`absolute bottom-20 sm:bottom-24 ${positionClass} z-30 flex flex-col items-end gap-3`}
      >
        {speedDialOpen && (
          <div className="flex flex-col items-end gap-3 mb-1 animate-fade-in">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <div key={action.label} className="flex items-center gap-3">
                  <span className="bg-background text-foreground text-sm font-medium px-3 py-1.5 rounded-md shadow-md whitespace-nowrap">
                    {action.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleActionClick(action.onClick)}
                    aria-label={action.label}
                    className="h-12 w-12 rounded-full bg-background hover:bg-muted shadow-lg flex items-center justify-center text-foreground transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <Button
          onClick={() => setSpeedDialOpen((s) => !s)}
          aria-label={speedDialOpen ? 'Close menu' : 'Open quick actions'}
          aria-expanded={speedDialOpen}
          className="h-12 w-12 p-0 rounded-full bg-primary hover:bg-primary/90 shadow-lg flex items-center justify-center"
        >
          {speedDialOpen ? (
            <X className="h-5 w-5 transition-transform duration-300" />
          ) : (
            <Plus className="h-5 w-5 transition-transform duration-300" />
          )}
        </Button>
      </div>
    </>
  );
};

export default AddBusinessButton;
