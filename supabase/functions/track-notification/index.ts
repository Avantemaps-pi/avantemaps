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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ✅ SECURITY: require a valid JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const token = authHeader.slice('Bearer '.length);

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const authenticatedUserId = userData.user.id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { notification_id, event_type, click_url } = await req.json();

    console.log(`📊 Tracking notification event: ${event_type} for notification ${notification_id}`);

    if (!notification_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing notification_id or event_type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    // ✅ SECURITY: verify the notification belongs to the authenticated user
    const { data: owned, error: ownedErr } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', notification_id)
      .maybeSingle();
    if (ownedErr || !owned) {
      return new Response(
        JSON.stringify({ error: 'Notification not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (owned.user_id !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Update notification tracking fields
    const updateData: any = {};

    if (event_type === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
      updateData.delivery_status = 'delivered';
    } else if (event_type === 'read') {
      updateData.read_at = new Date().toISOString();
      updateData.read = true;
    } else if (event_type === 'clicked') {
      updateData.clicked_at = new Date().toISOString();
      if (click_url) {
        updateData.click_url = click_url;
      }
    }

    const { data: notification, error: updateError } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', notification_id)
      .select('ab_test_id, ab_variant_id')
      .single();

    if (updateError) {
      console.error('Error updating notification:', updateError);
      throw updateError;
    }

    // Update A/B test variant metrics if applicable
    if (notification?.ab_variant_id) {
      await supabase.rpc(`increment_variant_${event_type}`, {
        variant_id: notification.ab_variant_id,
      });
    }

    console.log(`✅ Notification event tracked successfully`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('Error in track-notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
