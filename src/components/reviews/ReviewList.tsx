import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, MessageSquareText, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StateBlock } from '@/components/ui/state-block';
import { useBusinessReviews, type BusinessReview } from '@/hooks/useBusinessReviews';
import { useReviewStats } from '@/hooks/useReviewStats';
import { getSessionUserId } from '@/lib/sessionUserId';

interface ReviewListProps {
  businessId: string;
  onWriteReview: () => void;
}

const Stars: React.FC<{ rating: number; className?: string }> = ({ rating, className = 'h-4 w-4' }) => (
  <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        aria-hidden="true"
        className={`${className} ${n <= rating ? 'text-primary fill-primary' : 'text-input'}`}
      />
    ))}
  </span>
);

const relativeDate = (iso: string) => {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
};

const ReviewItem: React.FC<{ review: BusinessReview; isOwn: boolean }> = ({ review, isOwn }) => {
  const edited = new Date(review.updated_at).getTime() > new Date(review.created_at).getTime();
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{isOwn ? 'You' : 'Pi user'}</span>
        <span className="text-xs text-muted-foreground">
          {relativeDate(review.created_at)}
          {edited && ' (edited)'}
        </span>
      </div>
      <div className="mt-1">
        <Stars rating={review.rating} />
      </div>
      {review.content && (
        <p className="mt-2 text-sm leading-6 text-foreground whitespace-pre-line break-words">{review.content}</p>
      )}
    </li>
  );
};

const ReviewList: React.FC<ReviewListProps> = ({ businessId, onWriteReview }) => {
  const { reviews, isLoading, isError, refetch } = useBusinessReviews(businessId);
  const stats = useReviewStats().get(businessId);
  // Only used to label your own review "You"; other authors stay anonymous ("Pi user"),
  // because the users table is private.
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSessionUserId().then((id) => {
      if (!cancelled) setSessionUserId(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4" aria-busy="true" aria-label="Loading reviews">
          <Skeleton className="h-5 w-40" />
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <StateBlock
            kind="error"
            icon={AlertCircle}
            title="Couldn't load reviews"
            body="Check your connection and try again."
            action={{ label: 'Try again', onClick: () => void refetch() }}
          />
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <StateBlock
            kind="empty"
            icon={MessageSquareText}
            title="No reviews yet"
            body="Be the first to share how your visit went."
            action={{ label: 'Write the first review', onClick: onWriteReview }}
          />
        </CardContent>
      </Card>
    );
  }

  const count = stats?.totalReviews ?? reviews.length;
  const average =
    stats?.rating ?? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="flex items-center gap-1.5 text-sm text-foreground mb-4">
          <Star className="h-4 w-4 text-primary fill-primary" aria-hidden="true" />
          <span className="font-semibold">{average.toFixed(1)}</span>
          <span className="text-muted-foreground">
            · {count} {count === 1 ? 'review' : 'reviews'}
          </span>
        </p>
        <ul className="divide-y divide-border">
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} isOwn={!!sessionUserId && review.user_id === sessionUserId} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default ReviewList;
