
/**
 * Cleanup stale payments endpoint
 * 
 * This endpoint handles cleaning up stale or abandoned payments
 * to prevent the "pending payment" error in Pi Network
 */
import { supabase } from '@/integrations/supabase/client';

export interface CleanupResponse {
  success: boolean;
  message: string;
  cleanedCount?: number;
}

export const cleanupStalePayments = async (userId: string): Promise<CleanupResponse> => {
  try {
    console.log('Calling cleanup-stale-payments edge function for user:', userId);
    
    const { data, error } = await supabase.functions.invoke('cleanup-stale-payments', {
      body: JSON.stringify({ userId })
    });
    
    if (error) {
      console.error('Error calling cleanup edge function:', error);
      return {
        success: false,
        message: `Failed to cleanup stale payments: ${error.message}`
      };
    }
    
    console.log('Cleanup edge function response:', data);
    
    return data as CleanupResponse;
  } catch (error) {
    console.error('Error cleaning up stale payments:', error);
    return {
      success: false,
      message: 'Failed to cleanup stale payments: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
};
