
import { Icon } from 'leaflet';
import { PIN_COLORS } from './mapConfig';

interface MarkerOptions {
  isActive?: boolean;
  isUserBusiness?: boolean;
  isVerified?: boolean;
  isCertified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | null | undefined;
}

type PinKind = 'user' | 'certified' | 'verified' | 'pending' | 'unverified';

const PIN_BODY = 'M12 23s9-7 9-13.5a9 9 0 0 0-18 0C3 16 12 23 12 23z';
const SHIELD = 'M12 5.5c1.3 1 2.7 1.6 4 1.6v3.1c0 2.7-1.8 4.1-4 4.9-2.2-.8-4-2.2-4-4.9V7.1c1.3 0 2.7-.6 4-1.6z';
const CHECK = 'm8.5 9.5 2.5 2.5 4.5-4.5';

const { PRIMARY, NAVY, WHITE, PENDING, UNVERIFIED } = PIN_COLORS;

// Body + inner mark for each status
const PIN_SHAPES: Record<PinKind, string> = {
  user:
    `<path d="${PIN_BODY}" stroke-linejoin="round" fill="${WHITE}" stroke="${PRIMARY}" stroke-width="2.5"/>` +
    `<circle cx="12" cy="9.5" r="3.5" fill="${PRIMARY}"/>`,
  certified:
    `<path d="${PIN_BODY}" stroke-linejoin="round" fill="${NAVY}" stroke="${WHITE}" stroke-width="1.5"/>` +
    `<path d="${SHIELD}" fill="${WHITE}"/>`,
  verified:
    `<path d="${PIN_BODY}" stroke-linejoin="round" fill="${PRIMARY}" stroke="${WHITE}" stroke-width="1.5"/>` +
    `<path d="${CHECK}" fill="none" stroke="${WHITE}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  pending:
    `<path d="${PIN_BODY}" stroke-linejoin="round" fill="${WHITE}" stroke="${PENDING}" stroke-width="2" stroke-dasharray="3 2.2"/>` +
    `<circle cx="12" cy="9.5" r="2.2" fill="${PENDING}"/>`,
  unverified:
    `<path d="${PIN_BODY}" stroke-linejoin="round" fill="${UNVERIFIED}" stroke="${WHITE}" stroke-width="1.5"/>` +
    `<circle cx="12" cy="9.5" r="2.5" fill="${WHITE}"/>`,
};

const getPinKind = ({ isUserBusiness, isCertified, isVerified, verificationStatus }: MarkerOptions): PinKind => {
  if (isUserBusiness) return 'user';
  if (isCertified) return 'certified';
  if (isVerified) return 'verified';
  if (verificationStatus === 'pending') return 'pending';
  return 'unverified';
};

// Icons are identical per status/active pair, so share instances
const iconCache = new Map<string, Icon>();

// Function to create marker icon based on verification status
export const createMarkerIcon = (options: MarkerOptions = {}) => {
  const kind = getPinKind(options);
  const isActive = !!options.isActive;
  const key = `${kind}:${isActive}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const size = isActive ? 48 : 40;
  // 1 unit of padding on every side so the strokes aren't clipped at the tip;
  // the tip (12,23) lands at [20,37] (40px) / [24,44] (48px)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-1 -1 26 26">${PIN_SHAPES[kind]}</svg>`;

  const icon = new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    iconSize: [size, size],
    iconAnchor: isActive ? [24, 44] : [20, 37],
    popupAnchor: [0, isActive ? -44 : -37],
    className: 'am-pin',
  });
  iconCache.set(key, icon);
  return icon;
};
