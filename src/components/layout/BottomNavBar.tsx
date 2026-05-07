import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, LayoutGrid, Bookmark, Wallet, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { to: '/recommendations', icon: LayoutGrid, label: 'Discover' },
  { to: '/bookmarks', icon: Bookmark, label: 'Saved' },
  { to: '/', icon: Map, label: 'Map' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const BottomNavBar: React.FC = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isMobile) return null;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-[calc(100%+env(safe-area-inset-bottom))]"
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-end justify-around h-16 pt-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          const isMap = to === '/';
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className={cn(
                'flex flex-col items-center justify-end gap-0.5 flex-1 h-full min-h-[44px] min-w-[44px] text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isMap ? (
                <span className={cn(
                  'flex items-center justify-center h-14 w-14 rounded-full border-2 -mt-6 mb-0.5 bg-background shadow-md',
                  isActive ? 'border-primary' : 'border-border'
                )}>
                  <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                </span>
              ) : (
                <span className="flex items-center justify-center h-11 w-11 mb-0.5">
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                </span>
              )}
              <span className="leading-none pb-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
