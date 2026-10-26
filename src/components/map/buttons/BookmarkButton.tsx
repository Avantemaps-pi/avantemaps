import React from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: (e: React.MouseEvent) => void;
  isLoading?: boolean;
  className?: string;
  /** Floating over a photo: unsaved icon in text-foreground so it stays readable */
  onPhoto?: boolean;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ isBookmarked, onToggle, isLoading, className, onPhoto }) => {
  const { isAuthenticated } = useAuth();
  const disabled = !!isLoading || !isAuthenticated;

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onToggle(e);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={isBookmarked}
      aria-busy={isLoading}
      aria-label={isBookmarked ? 'Remove from saved' : 'Save business'}
      className={cn(
        'z-[101] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        (isLoading || !isAuthenticated) && 'opacity-70',
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-[22px] w-[22px] animate-spin text-muted-foreground" />
          <span className="sr-only" aria-live="polite">
            Saving…
          </span>
        </>
      ) : (
        <Bookmark
          className={cn(
            'h-[22px] w-[22px] transition-colors',
            isBookmarked ? 'text-primary fill-current' : onPhoto ? 'text-foreground' : 'text-muted-foreground'
          )}
        />
      )}
    </button>
  );
};

export default BookmarkButton;
