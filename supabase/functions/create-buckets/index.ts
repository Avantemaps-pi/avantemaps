
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

Deno.serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false }
      }
    );

    // Check if bucket exists
    const { data: existingBuckets } = await supabaseClient.storage.listBuckets();
    const bucketExists = existingBuckets?.some(bucket => bucket.name === 'business-images');
    
    if (!bucketExists) {
      // Create storage bucket for business images (private with RLS policies)
      const { data: newBucket, error: bucketError } = await supabaseClient.storage.createBucket('business-images', {
        public: false
      });
      
      if (bucketError) {
        throw bucketError;
      }
      
      return new Response(
        JSON.stringify({ message: 'Storage bucket created successfully', bucket: newBucket }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ message: 'Storage bucket already exists' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
