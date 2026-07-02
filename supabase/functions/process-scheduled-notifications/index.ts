import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { verifyCronRequest } from '../_shared/cronAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface ScheduledNotification {
  id: string;
  template_id: string;
  scheduled_for: string;
  status: string;
  target_criteria: any;
  target_user_ids: string[] | null;
  metadata: any;
}

interface NotificationTemplate {
  id: string;
  type: string;
  content_template: string;
  priority: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ✅ SECURITY: Only pg_cron (with the shared secret) may trigger processing.
    const isCron = await verifyCronRequest(req, supabase);
    if (!isCron) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('🔔 Processing scheduled notifications...');

    // Find notifications that are ready to be sent
    const now = new Date().toISOString();
    const { data: scheduledNotifications, error: fetchError } = await supabase
      .from('scheduled_notifications')
      .select('*, notification_templates(*)')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(100);

    if (fetchError) {
      console.error('Error fetching scheduled notifications:', fetchError);
      throw fetchError;
    }

    if (!scheduledNotifications || scheduledNotifications.length === 0) {
      console.log('No scheduled notifications to process');
      return new Response(
        JSON.stringify({ message: 'No notifications to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${scheduledNotifications.length} notifications to process`);

    let totalProcessed = 0;
    let totalSent = 0;
    let totalFailed = 0;

    for (const notification of scheduledNotifications) {
      try {
        // Mark as processing
        await supabase
          .from('scheduled_notifications')
          .update({ status: 'processing' })
          .eq('id', notification.id);

        // Determine target users
        let targetUserIds: string[] = [];

        if (notification.target_user_ids && notification.target_user_ids.length > 0) {
          // Use explicit user IDs
          targetUserIds = notification.target_user_ids;
        } else if (notification.target_criteria && Object.keys(notification.target_criteria).length > 0) {
          // Build query based on criteria
          targetUserIds = await getUserIdsByCriteria(supabase, notification.target_criteria);
        }

        console.log(`Sending to ${targetUserIds.length} users`);

        // Send notifications to each user
        let sentCount = 0;
        let failedCount = 0;

        for (const userId of targetUserIds) {
          try {
            const template = notification.notification_templates;
            
            // Check frequency cap
            const { data: canSend } = await supabase.rpc('check_frequency_cap', {
              p_user_id: userId,
              p_notification_type: template.type,
              p_priority: template.priority
            });

            if (!canSend) {
              console.log(`Skipping user ${userId} due to frequency cap`);
              failedCount++;
              continue;
            }
            
            // Render template with metadata
            let content = template.content_template;
            if (notification.metadata) {
              content = renderTemplate(content, notification.metadata);
            }

            // Insert notification
            const { error: insertError } = await supabase
              .from('notifications')
              .insert([{
                user_id: userId,
                type: template.type,
                content,
                metadata: notification.metadata,
                priority: template.priority,
                read: false,
                delivery_status: 'delivered',
                delivered_at: new Date().toISOString(),
              }]);

            if (insertError) {
              console.error(`Failed to send to user ${userId}:`, insertError);
              failedCount++;
            } else {
              sentCount++;
            }
          } catch (error) {
            console.error(`Error sending to user ${userId}:`, error);
            failedCount++;
          }
        }

        // Update scheduled notification status
        await supabase
          .from('scheduled_notifications')
          .update({
            status: failedCount > 0 && sentCount === 0 ? 'failed' : 'sent',
            sent_count: sentCount,
            failed_count: failedCount,
            processed_at: new Date().toISOString(),
            error_message: failedCount > 0 ? `Failed to send to ${failedCount} users` : null,
          })
          .eq('id', notification.id);

        totalProcessed++;
        totalSent += sentCount;
        totalFailed += failedCount;

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('scheduled_notifications')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processed_at: new Date().toISOString(),
          })
          .eq('id', notification.id);
        
        totalFailed++;
      }
    }

    console.log(`✅ Processed ${totalProcessed} scheduled notifications`);
    console.log(`📤 Sent: ${totalSent}, ❌ Failed: ${totalFailed}`);

    return new Response(
      JSON.stringify({
        message: 'Notifications processed',
        processed: totalProcessed,
        sent: totalSent,
        failed: totalFailed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in process-scheduled-notifications:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function getUserIdsByCriteria(supabase: any, criteria: any): Promise<string[]> {
  let query = supabase.from('users').select('id');

  // Apply filters based on criteria
  if (criteria.subscription) {
    query = query.eq('subscription', criteria.subscription);
  }

  if (criteria.has_business) {
    // Users who have at least one business
    const { data: businessOwners } = await supabase
      .from('businesses')
      .select('owner_id')
      .not('owner_id', 'is', null);
    
    if (businessOwners) {
      const ownerIds = [...new Set(businessOwners.map((b: any) => b.owner_id))];
      query = query.in('id', ownerIds);
    }
  }

  if (criteria.created_after) {
    query = query.gte('created_at', criteria.created_after);
  }

  if (criteria.created_before) {
    query = query.lte('created_at', criteria.created_before);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching users by criteria:', error);
    return [];
  }

  return data ? data.map((u: any) => u.id) : [];
}

function renderTemplate(template: string, metadata: any): string {
  let rendered = template;
  const variableRegex = /\{\{(\w+)\}\}/g;
  
  rendered = rendered.replace(variableRegex, (match, variableName) => {
    const value = metadata[variableName];
    if (value !== undefined && value !== null) {
      return String(value);
    }
    return match;
  });
  
  return rendered;
}
