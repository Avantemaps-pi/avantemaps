
import React from 'react';
import { CircleCheck, Shield, Clock, XCircle } from 'lucide-react';
import { CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import HighlightText from './HighlightText';

interface PlaceCardTitleProps {
  name: string;
  onClick: (() => void) | undefined;
  isVerified?: boolean | undefined;
  isCertified?: boolean | undefined;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | null | undefined;
  highlightQuery?: string | undefined;
}

const PlaceCardTitle: React.FC<PlaceCardTitleProps> = ({ 
  name, 
  onClick, 
  isVerified = false,
  isCertified = false,
  verificationStatus = null,
  highlightQuery,
}) => {
  // Determine verification status display
  const getStatusIndicator = () => {
    if (isCertified) {
      return (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Shield className="h-4 w-4 text-emerald-500" />
          <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400">
            Certified
          </Badge>
        </div>
      );
    }
    if (isVerified) {
      return (
        <div className="flex items-center gap-1 flex-shrink-0">
          <CircleCheck className="h-4 w-4 text-blue-500" />
          <Badge variant="outline" className="text-xs border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400">
            Verified
          </Badge>
        </div>
      );
    }
    // Pending verification - only show if explicitly pending
    if (verificationStatus === 'pending') {
      return (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Clock className="h-4 w-4 text-amber-500" />
          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400">
            Pending
          </Badge>
        </div>
      );
    }
    // Not verified (never requested, rejected, or null)
    return null;
  };

  return (
    <div className="flex items-start justify-between gap-2">
      <CardTitle 
        className="text-base font-bold cursor-pointer hover:text-primary transition-colors line-clamp-1 flex-1"
        onClick={onClick}
      >
        <HighlightText text={name} query={highlightQuery} />
      </CardTitle>
      {getStatusIndicator()}
    </div>
  );
};

export default PlaceCardTitle;
