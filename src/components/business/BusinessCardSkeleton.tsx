import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface BusinessCardSkeletonProps {
  className?: string;
}

// Same shape as PlaceCard. The page wraps a group of these in one role="status".
const BusinessCardSkeleton: React.FC<BusinessCardSkeletonProps> = ({ className }) => {
  const bone = 'motion-reduce:animate-none';

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card',
        className
      )}
    >
      <Skeleton className={cn('aspect-video w-full rounded-none', bone)} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className={cn('h-5 w-[70%]', bone)} />
          <Skeleton className={cn('h-6 w-6 rounded-full', bone)} />
        </div>
        <Skeleton className={cn('h-4 w-[45%]', bone)} />
        <Skeleton className={cn('h-3.5 w-[60%]', bone)} />
        <Skeleton className={cn('mt-auto h-11 w-full', bone)} />
      </div>
    </div>
  );
};

export default BusinessCardSkeleton;
