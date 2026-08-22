import React from 'react';
import CommentItem from './CommentItem';
import { SortOption } from './CommentSection';
import { useComments } from '@/hooks/useComments';
import { Skeleton } from '@/components/ui/skeleton';

interface CommentListProps {
  businessId?: string | undefined;
  sortOption: SortOption;
}

const CommentList: React.FC<CommentListProps> = ({ 
  businessId, 
  sortOption 
}) => {
  const { comments, loading, voteComment, reportComment } = useComments(businessId);

  const getSortedComments = () => {
    const sortedComments = [...comments];
    
    switch (sortOption) {
      case 'useful':
        return sortedComments.sort((a, b) => 
          (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)
        );
      case 'recent':
        return sortedComments.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'controversial':
        return sortedComments.sort((a, b) => 
          (b.upvotes + b.downvotes) - (a.upvotes + a.downvotes)
        );
      default:
        return sortedComments;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const sortedComments = getSortedComments();

  if (sortedComments.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No comments yet. Be the first to share your thoughts!
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full">
      {sortedComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={{
            ...comment,
            timestamp: comment.created_at,
            isReported: comment.report_count > 0
          }}
          onVote={voteComment}
          onReport={reportComment}
        />
      ))}
    </div>
  );
};

export default CommentList;
