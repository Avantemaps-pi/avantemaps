import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingPillProps {
  rating: number;
  totalReviews?: number | undefined;
  onClick?: (() => void) | undefined;
  className?: string;
}

const RatingPill: React.FC<RatingPillProps> = ({ rating, totalReviews, onClick, className }) => {
  const hasReviews = totalReviews === undefined ? rating > 0 : totalReviews > 0;
  const average = rating.toFixed(1);

  const label = !hasReviews
    ? 'No reviews yet'
    : totalReviews === undefined
      ? `Rated ${average} out of 5`
      : `Rated ${average} out of 5, ${totalReviews} ${totalReviews === 1 ? 'review' : 'reviews'}`;

  const content = hasReviews ? (
    <>
      <Star className="h-4 w-4 fill-current text-primary" aria-hidden="true" />
      <span className="text-sm font-semibold text-foreground">{average}</span>
      {totalReviews !== undefined && (
        <span className="text-sm text-muted-foreground">({totalReviews})</span>
      )}
    </>
  ) : (
    <span className="text-sm text-muted-foreground">No reviews yet</span>
  );

  const base = 'inline-flex items-center gap-1 leading-5';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        // ::after stretches the hit area to 44px without changing the row height
        className={cn(
          base,
          "relative rounded-sm after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']",
          className
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <span role="img" aria-label={label} className={cn(base, className)}>
      {content}
    </span>
  );
};

export default RatingPill;
