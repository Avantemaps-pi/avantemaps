import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, X, Store, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth/useAuth';

interface AddBusinessButtonProps {
  selectedPlace: string | null;
}

type FabState = 'expanded' | 'collapsed' | 'hasBusiness';

const FIRST_VISIT_KEY = 'fab_first_visit';
const BUSINESS_COUNT_CACHE_KEY = 'fab_business_count_cache';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface BusinessCountCache {
  uid: string;
  count: number;
  timestamp: string;
}

const AddBusinessButton: React.FC<AddBusinessButtonProps> = ({ selectedPlace }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [fabState, setFabState] = useState<FabState | null>(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanding, setIsExpanding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applyState = (hasBusiness: boolean, firstVisit: string) => {
      if (hasBusiness) {
        setFabState('hasBusiness');
        setIsLoading(false);
        return;
      }
      const elapsed = Date.now() - new Date(firstVisit).getTime();
      setFabState(elapsed > TWENTY_FOUR_HOURS_MS ? 'collapsed' : 'expanded');
      setIsLoading(false);
    };

    const determineState = async () => {
      // Record first visit timestamp if missing
      let firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
      if (!firstVisit) {
        firstVisit = new Date().toISOString();
        localStorage.setItem(FIRST_VISIT_KEY, firstVisit);
      }

      let hasBusiness = false;

      if (isAuthenticated && user?.uid) {
        // Try cache first for instant state
        try {
          const raw = localStorage.getItem(BUSINESS_COUNT_CACHE_KEY);
          if (raw) {
            const cache: BusinessCountCache = JSON.parse(raw);
            if (cache.uid === user.uid) {
              hasBusiness = cache.count > 0;
            }
          }
        } catch {
          // ignore parse errors
        }

        // Apply cached state immediately so UI renders fast
        if (!cancelled) applyState(hasBusiness, firstVisit);

        // Background refresh from Supabase
        try {
          const { count } = await supabase
            .from('businesses')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', user.uid);
          const freshHasBusiness = (count ?? 0) > 0;

          // Update cache
          const cache: BusinessCountCache = {
            uid: user.uid,
            count: count ?? 0,
            timestamp: new Date().toISOString(),
          };
          localStorage.setItem(BUSINESS_COUNT_CACHE_KEY, JSON.stringify(cache));

          if (!cancelled) applyState(freshHasBusiness, firstVisit);
          return;
        } catch (error) {
          console.warn('Failed to refresh business count, using cached/default state:', error);
          // Cached state is already applied; ensure loading is cleared
          if (!cancelled) setIsLoading(false);
          return;
        }
      }

      // Not authenticated: rely solely on first visit timing
      if (!cancelled) applyState(false, firstVisit);
    };

    determineState();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.uid]);

  const positionClass = selectedPlace ? 'right-16 md:right-[calc(50%+200px)]' : 'right-6';

  if (isLoading) {
    return (
      <div
        data-add-business-button
        className={`absolute bottom-20 sm:bottom-24 ${positionClass} z-20`}
      >
        <Button
          disabled
          className="h-12 w-12 p-0 rounded-full bg-primary/60 opacity-70 shadow-lg flex items-center justify-center cursor-not-allowed"
          aria-label="Loading"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
        </Button>
      </div>
    );
  }

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

  const handleRegisterExpand = () => {
    setSpeedDialOpen(false);
    setIsExpanding(true);
    window.setTimeout(() => {
      navigate('/registration');
    }, 2000);
  };

  const actions = [
    { icon: Store, label: registerLabel, onClick: handleRegisterExpand, isRegister: true },
  ];

  const handleActionClick = (action: typeof actions[number]) => {
    if (action.isRegister) {
      action.onClick();
      return;
    }
    setSpeedDialOpen(false);
    action.onClick();
  };

  // Expanding transition: animate collapsed icon into full pill, then navigate
  if (isExpanding) {
    return (
      <div
        data-add-business-button
        className={`absolute bottom-20 sm:bottom-24 ${positionClass} z-30`}
      >
        <Button
          disabled
          style={{ animation: 'fab-expand 600ms ease-out forwards' }}
          className="h-14 pl-4 pr-6 rounded-full bg-primary shadow-lg flex items-center gap-2 overflow-hidden"
          aria-label={registerLabel}
        >
          <Plus className="h-6 w-6 flex-shrink-0" />
          <span
            style={{ animation: 'fab-label-fade 500ms ease-out 250ms forwards', opacity: 0 }}
            className="text-sm font-medium whitespace-nowrap"
          >
            {registerLabel}
          </span>
        </Button>
        <style>{`
          @keyframes fab-expand {
            from { width: 3rem; padding-left: 0; padding-right: 0; }
            to { width: auto; padding-left: 1rem; padding-right: 1.5rem; }
          }
          @keyframes fab-label-fade {
            from { opacity: 0; transform: translateX(-4px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    );
  }

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
                    onClick={() => handleActionClick(action)}
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
