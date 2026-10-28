import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from '@/lib/router-compat';
import { Map, LayoutGrid, Bookmark, Wallet, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';

const navItems = [
  { to: '/recommendations', icon: LayoutGrid, label: 'Discover' },
  { to: '/bookmarks', icon: Bookmark, label: 'Saved' },
  { to: '/', icon: Map, label: 'Map' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface BottomNavBarProps {
  /** A tab was tapped (also when it's the current page, e.g. Map while the list view is open) */
  onItemClick?: ((to: string) => void) | undefined;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ onItemClick }) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const keyboardOpen = useKeyboardOpen();
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

  // Off-screen while scrolled away or while the on-screen keyboard is open
  const hidden = !visible || keyboardOpen;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface-float shadow-sheet transition-transform duration-300",
        hidden ? "translate-y-[calc(100%+env(safe-area-inset-bottom))]" : "translate-y-0"
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-hidden={hidden || undefined}
      inert={hidden}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              onClick={() => onItemClick?.(to)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full text-xs transition-colors',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground font-medium hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-14 items-center justify-center rounded-full',
                  isActive && 'bg-accent'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
