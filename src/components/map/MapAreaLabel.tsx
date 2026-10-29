import React from 'react';
import { ChevronUp, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapAreaLabelProps {
  /** The highlighted area's name; null when none is selected */
  name: string | null;
  /** The area one level up; null at country level (no "Up" button) */
  parentName: string | null;
  onUp: () => void;
  onClear: () => void;
  /** Hidden but mounted (a map state card or the keyboard is showing) */
  hidden?: boolean | undefined;
}

/**
 * The highlighted map area under the category chips: its name, "Up" to the
 * area one level up, and "Clear". Changes are announced politely.
 */
const MapAreaLabel: React.FC<MapAreaLabelProps> = ({ name, parentName, onUp, onClear, hidden = false }) => (
  <>
    <p className="sr-only" aria-live="polite">
      {name ? `Showing ${name}` : ''}
    </p>
    {name && (
      <div
        data-map-area-label
        aria-hidden={hidden || undefined}
        inert={hidden}
        className={cn(
          'flex justify-center transition-opacity duration-150 motion-reduce:transition-none',
          hidden && 'pointer-events-none opacity-0'
        )}
      >
        <div className="pointer-events-auto flex h-11 max-w-full items-center rounded-full border border-border bg-surface-float pl-3 text-sm font-semibold text-foreground shadow-float">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="ml-1.5 truncate">{name}</span>
          {parentName && (
            <button
              type="button"
              onClick={onUp}
              aria-label={`Up to ${parentName}`}
              className="ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronUp className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear area"
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
              !parentName && 'ml-1'
            )}
          >
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>
    )}
  </>
);

export default MapAreaLabel;
