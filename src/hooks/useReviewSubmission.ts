import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { containsInappropriateContent, filterInappropriateContent } from '@/utils/contentFilter';

// Review validation schema
export const reviewSchema = z.object({
  rating: z.number().min(1, "Please select a rating").max(5),
  content: z.string().max(2000, "Review must be less than 2000 characters").optional(),
  businessId: z.number().positive("Invalid business ID"),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

interface UseReviewSubmissionOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useReviewSubmission(options?: UseReviewSubmissionOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReview = async (input: ReviewInput, userId: string): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate input
      const validatedData = reviewSchema.parse(input);

      // Check for inappropriate content
      if (validatedData.content && containsInappropriateContent(validatedData.content)) {
        const filtered = filterInappropriateContent(validatedData.content);
        validatedData.content = filtered;
        toast.warning("Some content was filtered for appropriateness");
      }

      // Check if user already reviewed this business
      const { data: existingReview, error: checkError } = await supabase
        .from('reviews')
        .select('id')
        .eq('business_id', validatedData.businessId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        throw new Error('Failed to check existing review');
      }

      if (existingReview) {
        // Update existing review
        const { error: updateError } = await supabase
          .from('reviews')
          .update({
            rating: validatedData.rating,
            content: validatedData.content || null,
          })
          .eq('id', existingReview.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        toast.success("Review updated successfully!");
      } else {
        // Insert new review
        const { error: insertError } = await supabase
          .from('reviews')
          .insert({
            business_id: validatedData.businessId,
            user_id: userId,
            rating: validatedData.rating,
            content: validatedData.content || null,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        toast.success("Review submitted successfully!");
      }

      options?.onSuccess?.();
      return true;
    } catch (err) {
      const errorMessage = err instanceof z.ZodError 
        ? err.errors[0]?.message || 'Validation failed'
        : err instanceof Error 
        ? err.message 
        : 'Failed to submit review';
      
      setError(errorMessage);
      toast.error(errorMessage);
      options?.onError?.(err instanceof Error ? err : new Error(errorMessage));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchUserReview = async (businessId: number, userId: string) => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user review:', error);
      return null;
    }

    return data;
  };

  return {
    submitReview,
    fetchUserReview,
    isSubmitting,
    error,
  };
}
