
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import AuthorInfo from './AuthorInfo';
import CommentContent from './CommentContent';
import VoteActions from './VoteActions';
import CommentOptions from './CommentOptions';
import { useAuthRestrictions } from '@/hooks/useAuthRestrictions';

interface CommentProps {
  comment: {
    id: string;
    author: {
      name: string;
      username: string;
      avatar: string;
      isVerified: boolean;
    };
    content: string;
    timestamp: string;
    upvotes: number;
    downvotes: number;
    userVote?: 'up' | 'down' | null;
    isReported: boolean;
  };
  onVote: (commentId: string, voteType: 'up' | 'down') => void;
  onReport: (commentId: string) => void;
}

const CommentItem: React.FC<CommentProps> = ({ comment, onVote, onReport }) => {
  const { checkAuthForAction } = useAuthRestrictions();

  const handleVote = async (commentId: string, voteType: 'up' | 'down') => {
    if (checkAuthForAction('vote')) {
      await onVote(commentId, voteType);
    }
  };

  return (
    <Card className="border-gray-200">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <AuthorInfo 
            author={comment.author} 
            timestamp={comment.timestamp} 
          />
          
          <CommentOptions 
            isReported={comment.isReported} 
            onReport={() => {}} 
          />
        </div>
        
        <CommentContent content={comment.content} />
        
        <VoteActions 
          comment={comment} 
          onVote={handleVote} 
          onReport={onReport} 
        />
      </CardContent>
    </Card>
  );
};

export default CommentItem;
