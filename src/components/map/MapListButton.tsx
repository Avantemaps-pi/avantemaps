import React from 'react';
import { List } from 'lucide-react';
import { cn } from '@/lib/utils';

// Above this the label says "50+" (the list shows at most this many)
export const LIST_MAX = 50;

interface MapListButtonProps {
  count: number;
  onClick: () => void;
  /** Card strip open: sits above the strip instead of beside the + button */
  stripOpen: boolean;
  /** Hidden but mounted (keyboard, drawer or list open) */
  hidden?: boolean | undefined;
}

/**
 * "List · N": opens every business in view as a list. Bottom-left; level with
 * the + button, or 12px above the strip while it's open.
 */
const MapListButton = React.forwardRef<HTMLButtonElement, MapListButtonProps>(
  ({ count, onClick, stripOpen, hidden = false }, ref) => {
    const label = count > LIST_MAX ? `${LIST_MAX}+` : String(count);
    return (
      <button
        ref={ref}
        type="button"
        data-map-list-button
        onClick={onClick}
        aria-label={`Show ${count} ${count === 1 ? 'business' : 'businesses'} in this area as a list`}
        aria-hidden={hidden || undefined}
        inert={hidden}
        className={cn(
          'absolute left-4 z-20 flex h-11 items-center gap-2 rounded-full border border-border bg-surface-float px-4 text-sm font-semibold text-foreground shadow-float md:left-[280px]',
          'transition-opacity duration-150 motion-reduce:transition-none hover:bg-accent',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Strip closed: bottom edge level with the + button's; open: strip top (200px) + 12px
          stripOpen ? 'bottom-[calc(212px+env(safe-area-inset-bottom))]' : 'bottom-[calc(6rem+env(safe-area-inset-bottom))]',
          hidden && 'pointer-events-none opacity-0'
        )}
      >
        <List className="h-[18px] w-[18px]" aria-hidden="true" />
        <span className="whitespace-nowrap">List · {label}</span>
      </button>
    );
  }
);
MapListButton.displayName = 'MapListButton';

export default MapListButton;
