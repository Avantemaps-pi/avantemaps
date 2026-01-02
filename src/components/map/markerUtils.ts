
import { Icon } from 'leaflet';
import { MARKER_COLORS } from './mapConfig';

interface MarkerOptions {
  isActive?: boolean;
  isUserBusiness?: boolean;
  isVerified?: boolean;
  isCertified?: boolean;
}

// Function to create marker icon based on verification status
export const createMarkerIcon = (options: MarkerOptions = {}) => {
  const { isUserBusiness, isVerified, isCertified } = options;
  
  // Determine fill color based on verification status
  let fillColor = MARKER_COLORS.DEFAULT; // Gray for unverified
  
  if (isUserBusiness) {
    fillColor = MARKER_COLORS.USER_BUSINESS; // Gold for user's own businesses
  } else if (isCertified) {
    fillColor = MARKER_COLORS.CERTIFIED; // Green for certified
  } else if (isVerified) {
    fillColor = MARKER_COLORS.VERIFIED; // Blue for verified
  } else {
    fillColor = MARKER_COLORS.PENDING; // Amber for pending verification
  }
  
  const iconUrl = `data:image/svg+xml,
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="${fillColor}" stroke="%23FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="10" r="3"/>
      <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/>
    </svg>`;

  return new Icon({
    iconUrl,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};
