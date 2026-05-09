import React from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: (e: React.MouseEvent) => void;
  isLoading?: boolean;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ isBookmarked, onToggle, isLoading }) => {
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
      aria-label={
        isLoading
          ? 'Saving bookmark'
          : isBookmarked
          ? 'Remove bookmark'
          : 'Add bookmark'
      }
      className={`inline-flex items-center gap-1 z-[101] bg-transparent p-0 border-0 transition-colors ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${isLoading ? 'opacity-70' : ''} ${
        !isAuthenticated && !isLoading ? 'opacity-70' : ''
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground" aria-live="polite">
            Saving…
          </span>
        </>
      ) : (
        <Bookmark
          className={`h-5 w-5 transition-colors ${
            isBookmarked
              ? 'text-blue-500 fill-blue-500'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        />
      )}
    </button>
  );
};

export default BookmarkButton;
