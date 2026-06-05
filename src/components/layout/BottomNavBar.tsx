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
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl font-extrabold">
                {isActive && (
                  <span className="absolute inset-0 bg-primary/15 rounded-xl" />
                )}
                <Icon className="h-5 w-5 relative z-10" strokeWidth={isActive ? 2.5 : 2} />
                <span className="relative z-10 leading-none">{label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
