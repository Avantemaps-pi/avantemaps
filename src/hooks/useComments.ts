import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { filterInappropriateContent } from '@/utils/contentFilter';

export interface Comment {
  id: string;
  business_id: number;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  upvotes: number;
  downvotes: number;
  report_count: number;
  is_hidden: boolean;
  userVote?: 'up' | 'down' | null;
  author: {
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
}

export const useComments = (businessId: string | undefined) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('business_id', parseInt(businessId))
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user votes
      const { data: { user } } = await supabase.auth.getUser();
      let userVotes: any[] = [];
      
      if (user) {
        const { data: votesData } = await supabase
          .from('comment_votes')
          .select('comment_id, vote_type')
          .eq('user_id', user.id);
        userVotes = votesData || [];
      }

      const formattedComments: Comment[] = (data || []).map((comment) => {
        const userVote = userVotes.find(v => v.comment_id === comment.id);
        return {
          ...comment,
          userVote: userVote?.vote_type || null,
          author: {
            name: 'Pi User',
            username: '@pi_user',
            avatar: '/placeholder.svg',
            isVerified: true,
          }
        };
      });

      setComments(formattedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();

    // Subscribe to realtime updates
    if (businessId) {
      const channel = supabase
        .channel('comments-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `business_id=eq.${businessId}`
          },
          () => {
            fetchComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [businessId]);

  const createComment = async (content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to comment');
      return false;
    }

    if (!businessId) {
      toast.error('Invalid business');
      return false;
    }

    const filteredContent = filterInappropriateContent(content);

    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      business_id: parseInt(businessId),
      user_id: user.id,
      content: filteredContent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      report_count: 0,
      is_hidden: false,
      userVote: null,
      author: {
        name: 'Pi User',
        username: '@pi_user',
        avatar: '/placeholder.svg',
        isVerified: true,
      },
    };
    const previous = comments;
    setComments((prev) => [optimistic, ...prev]);

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          business_id: parseInt(businessId),
          user_id: user.id,
          content: filteredContent
        });

      if (error) throw error;

      toast.success('Comment posted successfully!');
      await fetchComments();
      return true;
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Failed to post comment');
      setComments(previous);
      return false;
    }
  };

  const voteComment = async (commentId: string, voteType: 'up' | 'down') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to vote');
      return;
    }

    // Optimistic vote update
    const previous = comments;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const wasUp = c.userVote === 'up';
        const wasDown = c.userVote === 'down';
        let upvotes = c.upvotes;
        let downvotes = c.downvotes;
        let nextVote: 'up' | 'down' | null = voteType;

        if (c.userVote === voteType) {
          // toggle off
          nextVote = null;
          if (voteType === 'up') upvotes -= 1;
          else downvotes -= 1;
        } else {
          if (voteType === 'up') {
            upvotes += 1;
            if (wasDown) downvotes -= 1;
          } else {
            downvotes += 1;
            if (wasUp) upvotes -= 1;
          }
        }
        return { ...c, upvotes, downvotes, userVote: nextVote };
      })
    );

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('comment_votes')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote
          await supabase
            .from('comment_votes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id);
        } else {
          // Update vote
          await supabase
            .from('comment_votes')
            .update({ vote_type: voteType })
            .eq('comment_id', commentId)
            .eq('user_id', user.id);
        }
      } else {
        // Create new vote
        await supabase
          .from('comment_votes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            vote_type: voteType
          });
      }

      // Realtime subscription will sync counts; no forced refetch needed.
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
      setComments(previous);
    }
  };


  const voteComment = async (commentId: string, voteType: 'up' | 'down') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to vote');
      return;
    }

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('comment_votes')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote
          await supabase
            .from('comment_votes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id);
        } else {
          // Update vote
          await supabase
            .from('comment_votes')
            .update({ vote_type: voteType })
            .eq('comment_id', commentId)
            .eq('user_id', user.id);
        }
      } else {
        // Create new vote
        await supabase
          .from('comment_votes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            vote_type: voteType
          });
      }

      await fetchComments();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const reportComment = async (commentId: string, reason?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to report');
      return;
    }

    try {
      const { error } = await supabase
        .from('comment_reports')
        .insert({
          comment_id: commentId,
          reported_by: user.id,
          reason: reason || 'Inappropriate content'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already reported this comment');
          return;
        }
        throw error;
      }

      toast.success('Comment reported successfully');
      await fetchComments();
    } catch (error) {
      console.error('Error reporting comment:', error);
      toast.error('Failed to report comment');
    }
  };

  return {
    comments,
    loading,
    createComment,
    voteComment,
    reportComment,
    refreshComments: fetchComments
  };
};
