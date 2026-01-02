import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type NotificationType = 
  | 'message' 
  | 'review' 
  | 'business' 
  | 'follower' 
  | 'like'
  | 'verification'
  | 'certification'
  | 'payment'
  | 'bookmark'
  | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  content: string;
  metadata?: Record<string, unknown>;
  priority?: NotificationPriority;
}

/**
 * Creates a notification in the database
 * Should be called with a service role client for server-side notification creation
 */
export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
): Promise<{ success: boolean; error?: string }> {
  const { userId, type, content, metadata = {}, priority = 'medium' } = params;

  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        content,
        metadata,
        priority,
        read: false,
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to create notification:', error);
      return { success: false, error: error.message };
    }

    console.log(`Notification created for user ${userId}: ${type}`);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error creating notification:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Helper to create a business-related notification
 */
export async function createBusinessNotification(
  supabase: SupabaseClient,
  userId: string,
  businessName: string,
  eventType: 'registered' | 'verified' | 'certified'
): Promise<{ success: boolean; error?: string }> {
  const messages: Record<string, { content: string; type: NotificationType; priority: NotificationPriority }> = {
    registered: {
      content: `Your business "${businessName}" has been successfully registered and is now listed on Avante Maps!`,
      type: 'business',
      priority: 'medium',
    },
    verified: {
      content: `Congratulations! Your business "${businessName}" has been verified. You now have a verified badge.`,
      type: 'verification',
      priority: 'high',
    },
    certified: {
      content: `Amazing! Your business "${businessName}" has been certified. You now have a certified badge!`,
      type: 'certification',
      priority: 'high',
    },
  };

  const { content, type, priority } = messages[eventType];

  return createNotification(supabase, {
    userId,
    type,
    content,
    metadata: { businessName, status: eventType },
    priority,
  });
}

/**
 * Helper to create a payment-related notification
 */
export async function createPaymentNotification(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  subscriptionTier?: string
): Promise<{ success: boolean; error?: string }> {
  const tierMessage = subscriptionTier 
    ? ` Your ${subscriptionTier} subscription is now active.`
    : '';
  
  return createNotification(supabase, {
    userId,
    type: 'payment',
    content: `Payment of ${amount} Pi received successfully!${tierMessage}`,
    metadata: { amount, tier: subscriptionTier, status: 'approved' },
    priority: 'high',
  });
}
