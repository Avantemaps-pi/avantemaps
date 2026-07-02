import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCronRequest } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ✅ SECURITY: Only pg_cron (with the shared secret) may trigger cleanup.
    const isCron = await verifyCronRequest(req, adminClient);
    if (!isCron) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Find users whose scheduled_deletion_at has passed
    const { data: expiredUsers, error: fetchError } = await adminClient
      .from("users")
      .select("id")
      .not("scheduled_deletion_at", "is", null)
      .lte("scheduled_deletion_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching expired users:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch expired users" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No accounts to clean up", deleted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const user of expiredUsers) {
      try {
        // Delete associated data first (cascades handle most, but be explicit for safety)
        await adminClient.from("bookmarks").delete().eq("user_id", user.id);
        await adminClient.from("user_searches").delete().eq("user_id", user.id);
        await adminClient.from("notifications").delete().eq("user_id", user.id);
        await adminClient.from("comment_votes").delete().eq("user_id", user.id);
        await adminClient.from("comments").delete().eq("user_id", user.id);
        await adminClient.from("reviews").delete().eq("user_id", user.id);
        await adminClient.from("payments").delete().eq("user_id", user.id);
        await adminClient.from("subscriptions").delete().eq("user_id", user.id);
        await adminClient.from("user_roles").delete().eq("user_id", user.id);

        // Delete businesses owned by this user
        const { data: businesses } = await adminClient
          .from("businesses")
          .select("id")
          .eq("owner_id", user.id);

        if (businesses && businesses.length > 0) {
          const businessIds = businesses.map((b) => b.id);
          await adminClient.from("business_views").delete().in("business_id", businessIds);
          await adminClient.from("verification_audit").delete().in("business_id", businessIds);
          await adminClient.from("businesses").delete().eq("owner_id", user.id);
        }

        // Delete from public.users
        await adminClient.from("users").delete().eq("id", user.id);

        // Delete from auth.users (permanently removes auth record)
        const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user.id);
        if (authDeleteError) {
          console.error(`Error deleting auth user ${user.id}:`, authDeleteError);
          errors.push(`Auth deletion failed for ${user.id}: ${authDeleteError.message}`);
        } else {
          deletedCount++;
        }
      } catch (err) {
        console.error(`Error cleaning up user ${user.id}:`, err);
        errors.push(`Cleanup failed for ${user.id}: ${String(err)}`);
      }
    }

    console.log(`Cleanup complete: ${deletedCount} deleted, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${deletedCount} account(s)`,
        deleted: deletedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
