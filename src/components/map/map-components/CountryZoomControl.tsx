import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Zoom level considered "country view". */
const COUNTRY_ZOOM = 5;

/**
 * Floating +/- control:
 *  - "+" zooms out to country level when currently zoomed-out further;
 *        disabled once at/closer than country zoom.
 *  - "-" zooms back out to country level when zoomed in past it;
 *        disabled otherwise.
 */
const CountryZoomControl: React.FC = () => {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => {
      map.off('zoomend', onZoom);
    };
  }, [map]);

  const plusDisabled = zoom >= COUNTRY_ZOOM;
  const minusDisabled = zoom <= COUNTRY_ZOOM;

  const goToCountry = () => map.setZoom(COUNTRY_ZOOM);

  const btn =
    'w-9 h-9 flex items-center justify-center bg-background text-foreground ' +
    'transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background';

  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'none' }}>
      <div
        className="leaflet-control rounded-md overflow-hidden border border-border shadow-md bg-background"
        style={{ pointerEvents: 'auto', margin: '12px' }}
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Zoom to country level"
          disabled={plusDisabled}
          onClick={goToCountry}
          className={cn(btn, 'border-b border-border')}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom out to country level"
          disabled={minusDisabled}
          onClick={goToCountry}
          className={btn}
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CountryZoomControl;
