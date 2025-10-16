
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useParams, useLocation } from 'react-router-dom';
import CommentList from './CommentList';
import CommentSorter from './CommentSorter';
import LoginDialog from '@/components/auth/LoginDialog';
import { useComments } from '@/hooks/useComments';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/auth/useAuth';

export type SortOption = 'useful' | 'recent' | 'controversial';

const CommentSection: React.FC<{ businessId?: string }> = ({ businessId }) => {
  const params = useParams();
  const location = useLocation();
  const [comment, setComment] = useState('');
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('useful');
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  const targetBusinessId = businessId || 
                           params.businessId || 
                           (location.state?.businessDetails?.id);

  const { createComment, loading: isSubmitting } = useComments(targetBusinessId);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  };

  const handleSubmitComment = async () => {
    if (!comment.trim()) {
      return;
    }
    
    if (!user) {
      setLoginDialogOpen(true);
      return;
    }
    
    const success = await createComment(comment);
    if (success) {
      setComment('');
    }
  };

  return (
    <Card className={`${isMobile ? 'mt-4' : 'mt-8'} w-full`}>
      <CardHeader>
        <CardTitle className="text-xl">Comments & Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Textarea
            placeholder="Share your thoughts about this place..."
            value={comment}
            onChange={handleCommentChange}
            className="min-h-[100px] mb-2"
            disabled={isSubmitting}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Please keep comments respectful and relevant
            </p>
            <Button 
              onClick={handleSubmitComment} 
              disabled={isSubmitting || !comment.trim()}
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </div>
        
        <CommentSorter 
          sortOption={sortOption} 
          onSortChange={(option) => setSortOption(option)} 
        />
        
        <CommentList 
          businessId={targetBusinessId} 
          sortOption={sortOption} 
        />
      </CardContent>
      
      <LoginDialog 
        open={loginDialogOpen} 
        onOpenChange={setLoginDialogOpen} 
      />
    </Card>
  );
};

export default CommentSection;
