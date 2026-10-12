
import React from 'react';
import { CircleCheck, Shield } from 'lucide-react';
import { CardTitle } from '@/components/ui/card';
import CategoryBadge from './CategoryBadge';
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
  // One indicator, same priority as before: Certified (navy badge) > Verified (check) > Pending (outline badge)
  const getStatusIndicator = () => {
    if (isCertified) {
      return <CategoryBadge category="Certified" tone="navy" icon={Shield} className="flex-shrink-0" />;
    }
    if (isVerified) {
      return (
        <span className="flex flex-shrink-0 items-center">
          <CircleCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="sr-only">Verified</span>
        </span>
      );
    }
    if (verificationStatus === 'pending') {
      return <CategoryBadge category="Pending verification" tone="outline" className="flex-shrink-0" />;
    }
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
