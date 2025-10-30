// /supabase/functions/test-env/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");

  const result = {
    SUPABASE_URL: supabaseUrl ? "✅ Available" : "❌ Missing",
    SUPABASE_ANON_KEY: anonKey ? "✅ Available" : "❌ Missing",
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ? "✅ Available" : "❌ Missing",
    SUPABASE_DB_URL: dbUrl ? "✅ Available" : "❌ Missing",
  };

  return new Response(JSON.stringify(result, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
