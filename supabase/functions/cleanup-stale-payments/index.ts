import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdminUrl = Deno.env.get('SUPABASE_ADMIN_URL')!;
const supabaseAdminKey = Deno.env.get('SUPABASE_ADMIN_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseAdminUrl, supabaseAdminKey);

serve(async (req) => {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
    }

    // Fetch all pending payments for the user
    const { data: payments, error: fetchError } = await supabase
      .from('payments')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Error fetching payments:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    if (!payments || payments.length === 0) {
      return new Response(JSON.stringify({ cleanedCount: 0 }), { status: 200 });
    }

    // Delete all pending payments
    const paymentIds = payments.map(p => p.id);

    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .in('id', paymentIds);

    if (deleteError) {
      console.error('Error deleting payments:', deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
    }

    console.log(`Cleaned up ${paymentIds.length} pending payment(s) for user ${userId}`);

    return new Response(JSON.stringify({ cleanedCount: paymentIds.length }), { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
