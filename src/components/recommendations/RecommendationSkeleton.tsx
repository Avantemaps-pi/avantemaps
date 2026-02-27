import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const RecommendationSkeleton = () => {
  return (
    <div className="w-80 flex-none rounded-xl border border-border bg-card p-4 space-y-4 animate-pulse">
      <Skeleton className="h-44 w-full rounded-lg" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-2/5 rounded" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/5 rounded" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
};

export default RecommendationSkeleton;
