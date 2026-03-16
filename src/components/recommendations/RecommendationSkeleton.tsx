import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const RecommendationSkeleton = () => {
  return (
    <div className="w-80 flex-none rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
      {/* Title + Bookmark row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-2/5 rounded" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      {/* Image */}
      <Skeleton className="h-44 w-full rounded-lg" />
      {/* Address */}
      <Skeleton className="h-4 w-3/4 rounded" />
      {/* Description block */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-5/6 rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />
      </div>
      {/* Rating + Category + Button row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
};

export default RecommendationSkeleton;
