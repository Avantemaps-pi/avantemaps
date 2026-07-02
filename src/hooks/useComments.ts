import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const COMMENT_COLUMNS =
  'id, business_id, user_id, content, created_at, updated_at, upvotes, downvotes, report_count, is_hidden';

const buildAuthor = () => ({
  name: 'Pi User',
  username: '@pi_user',
  avatar: '/placeholder.svg',
  isVerified: true,
});

export const useComments = (businessId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = ['comments', businessId] as const;

  const fetchComments = async (): Promise<Comment[]> => {
    if (!businessId) return [];

    const { data, error } = await supabase
      .from('comments')
      .select(COMMENT_COLUMNS)
      .eq('business_id', parseInt(businessId))
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: { user } } = await supabase.auth.getUser();
    let userVotes: { comment_id: string; vote_type: 'up' | 'down' }[] = [];
    if (user) {
      const { data: votesData } = await supabase
        .from('comment_votes')
        .select('comment_id, vote_type')
        .eq('user_id', user.id);
      userVotes = (votesData || []) as typeof userVotes;
    }

    return (data || []).map((c: any) => ({
      ...c,
      userVote: userVotes.find((v) => v.comment_id === c.id)?.vote_type ?? null,
      author: buildAuthor(),
    }));
  };

  const { data: comments = [], isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: fetchComments,
    enabled: !!businessId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // Realtime subscription: invalidate cache on updates.
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`comments-changes-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);

  const setCache = (updater: (prev: Comment[]) => Comment[]) => {
    queryClient.setQueryData<Comment[]>(queryKey, (prev) => updater(prev ?? []));
  };

  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to comment');
      if (!businessId) throw new Error('Invalid business');
      const filtered = filterInappropriateContent(content);
      const { error } = await supabase.from('comments').insert({
        business_id: parseInt(businessId),
        user_id: user.id,
        content: filtered,
      });
      if (error) throw error;
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Comment[]>(queryKey);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !businessId) return { previous };
      const optimistic: Comment = {
        id: `temp-${Date.now()}`,
        business_id: parseInt(businessId),
        user_id: user.id,
        content: filterInappropriateContent(content),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        report_count: 0,
        is_hidden: false,
        userVote: null,
        author: buildAuthor(),
      };
      setCache((prev) => [optimistic, ...prev]);
      return { previous };
    },
    onError: (err, _content, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error(err instanceof Error ? err.message : 'Failed to post comment');
    },
    onSuccess: () => {
      toast.success('Comment posted successfully!');
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const createComment = async (content: string) => {
    try {
      await createMutation.mutateAsync(content);
      return true;
    } catch {
      return false;
    }
  };

  const voteComment = async (commentId: string, voteType: 'up' | 'down') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to vote');
      return;
    }

    const previous = queryClient.getQueryData<Comment[]>(queryKey);
    setCache((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const wasUp = c.userVote === 'up';
        const wasDown = c.userVote === 'down';
        let upvotes = c.upvotes;
        let downvotes = c.downvotes;
        let nextVote: 'up' | 'down' | null = voteType;

        if (c.userVote === voteType) {
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
      }),
    );

    try {
      const { data: existingVote } = await supabase
        .from('comment_votes')
        .select('id, vote_type')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          await supabase
            .from('comment_votes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('comment_votes')
            .update({ vote_type: voteType })
            .eq('comment_id', commentId)
            .eq('user_id', user.id);
        }
      } else {
        await supabase
          .from('comment_votes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            vote_type: voteType,
          });
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
      if (previous) queryClient.setQueryData(queryKey, previous);
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
          reason: reason || 'Inappropriate content',
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already reported this comment');
          return;
        }
        throw error;
      }

      toast.success('Comment reported successfully');
      queryClient.invalidateQueries({ queryKey });
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
    refreshComments: refetch,
  };
};
