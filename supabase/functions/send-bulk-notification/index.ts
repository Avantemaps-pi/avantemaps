import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Admin access required');
    }

    const { 
      template_id, 
      target_criteria, 
      target_user_ids,
      metadata,
      send_immediately = true,
      scheduled_for,
    } = await req.json();

    if (!template_id) {
      throw new Error('template_id is required');
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    if (send_immediately) {
      // Send immediately
      console.log('Sending notifications immediately...');

      // Determine target users
      let targetUsers: string[] = [];

      if (target_user_ids && target_user_ids.length > 0) {
        targetUsers = target_user_ids;
      } else if (target_criteria && Object.keys(target_criteria).length > 0) {
        targetUsers = await getUserIdsByCriteria(supabase, target_criteria);
      } else {
        throw new Error('Either target_user_ids or target_criteria must be provided');
      }

      console.log(`Sending to ${targetUsers.length} users`);

      // Render template
      const content = renderTemplate(template.content_template, metadata || {});

      // Send notifications to each user with frequency capping and A/B testing
      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      // Check if there's an active A/B test for this template
      const { data: abTest } = await supabase
        .from('notification_ab_tests')
        .select('*, notification_ab_variants(*)')
        .eq('template_id', template_id)
        .eq('status', 'running')
        .single();

      for (const userId of targetUsers) {
        try {
          // Check frequency cap
          const { data: canSend } = await supabase.rpc('check_frequency_cap', {
            p_user_id: userId,
            p_notification_type: template.type,
            p_priority: template.priority
          });

          if (!canSend) {
            console.log(`Skipping user ${userId} due to frequency cap`);
            skippedCount++;
            continue;
          }

          // Select variant if A/B testing
          let finalContent = content;
          let abTestId = null;
          let abVariantId = null;

          if (abTest && abTest.notification_ab_variants) {
            // Simple random selection based on traffic percentage
            const random = Math.random() * 100;
            let cumulative = 0;
            
            for (const variant of abTest.notification_ab_variants) {
              cumulative += variant.traffic_percentage;
              if (random <= cumulative) {
                finalContent = renderTemplate(variant.content_template, metadata || {});
                abTestId = abTest.id;
                abVariantId = variant.id;
                
                // Increment sent count for variant
                await supabase
                  .from('notification_ab_variants')
                  .update({ sent_count: variant.sent_count + 1 })
                  .eq('id', variant.id);
                
                break;
              }
            }
          }

          const { error: insertError } = await supabase
            .from('notifications')
            .insert([{
              user_id: userId,
              type: template.type,
              content: finalContent,
              metadata: metadata || {},
              priority: template.priority,
              read: false,
              delivery_status: 'delivered',
              delivered_at: new Date().toISOString(),
              ab_test_id: abTestId,
              ab_variant_id: abVariantId,
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

      console.log(`✅ Sent: ${sentCount}, ❌ Failed: ${failedCount}, ⏭️ Skipped: ${skippedCount}`);

      return new Response(
        JSON.stringify({ 
          message: 'Notifications sent successfully',
          sent: sentCount,
          failed: failedCount,
          skipped: skippedCount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else {
      // Schedule for later
      if (!scheduled_for) {
        throw new Error('scheduled_for is required when send_immediately is false');
      }

      console.log(`Scheduling notifications for ${scheduled_for}...`);

      const { data: scheduled, error: scheduleError } = await supabase
        .from('scheduled_notifications')
        .insert([{
          template_id,
          scheduled_for,
          target_criteria: target_criteria || {},
          target_user_ids: target_user_ids || null,
          metadata: metadata || {},
          created_by: user.id,
        }])
        .select()
        .single();

      if (scheduleError) {
        throw scheduleError;
      }

      return new Response(
        JSON.stringify({ 
          message: 'Notification scheduled successfully',
          scheduled_notification_id: scheduled.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

  } catch (error) {
    console.error('Error in send-bulk-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function getUserIdsByCriteria(supabase: any, criteria: any): Promise<string[]> {
  let query = supabase.from('users').select('id');

  if (criteria.subscription) {
    query = query.eq('subscription', criteria.subscription);
  }

  if (criteria.has_business) {
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
  if (!template) return '';
  
  let rendered = template;
  const variableRegex = /\{\{(\w+)\}\}/g;
  
  rendered = rendered.replace(variableRegex, (match, variableName) => {
    const value = metadata?.[variableName];
    if (value !== undefined && value !== null) {
      return String(value);
    }
    return match;
  });
  
  return rendered;
}
