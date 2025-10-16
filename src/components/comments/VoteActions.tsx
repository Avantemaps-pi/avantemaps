
import React from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface VoteActionsProps {
  comment: {
    id: string;
    upvotes: number;
    downvotes: number;
    userVote?: 'up' | 'down' | null;
    isReported?: boolean;
  };
  onVote: (commentId: string, voteType: 'up' | 'down') => void | Promise<void>;
  onReport: (commentId: string) => void | Promise<void>;
}

const VoteActions: React.FC<VoteActionsProps> = ({ comment, onVote, onReport }) => {
  return (
    <div className="flex items-center mt-3 gap-3">
      <Button 
        variant="outline" 
        size="sm" 
        className={`px-3 py-1 ${comment.userVote === 'up' ? 'bg-green-50 text-green-600 border-green-200' : ''}`}
        onClick={() => onVote(comment.id, 'up')}
      >
        <ThumbsUp className="h-4 w-4 mr-2" />
        <span>{comment.upvotes}</span>
      </Button>
      
      <Button 
        variant="outline" 
        size="sm" 
        className={`px-3 py-1 ${comment.userVote === 'down' ? 'bg-red-50 text-red-600 border-red-200' : ''}`}
        onClick={() => onVote(comment.id, 'down')}
      >
        <ThumbsDown className="h-4 w-4 mr-2" />
        <span>{comment.downvotes}</span>
      </Button>
    </div>
  );
};

export default VoteActions;
