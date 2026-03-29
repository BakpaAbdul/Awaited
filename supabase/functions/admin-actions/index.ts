import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const adminPassword = Deno.env.get("AWAITED_ADMIN_PASSWORD");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { action, adminPassword: providedPassword, resultId, commentId, hidden, name } = body;

    if (!adminPassword || providedPassword !== adminPassword) {
      return new Response(JSON.stringify({ error: "Invalid admin password." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "verifyAdminPassword":
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "setResultHidden": {
        const { error } = await adminClient
          .from("scholarship_results")
          .update({ hidden: Boolean(hidden) })
          .eq("id", resultId);
        if (error) throw error;
        break;
      }

      case "deleteResult": {
        const { error } = await adminClient.from("scholarship_results").delete().eq("id", resultId);
        if (error) throw error;
        break;
      }

      case "deleteComment": {
        const { error } = await adminClient.from("scholarship_comments").delete().eq("id", commentId);
        if (error) throw error;
        break;
      }

      case "addVerifiedScholarship": {
        const { error } = await adminClient
          .from("verified_scholarships")
          .upsert({ name }, { onConflict: "name", ignoreDuplicates: false });
        if (error) throw error;
        break;
      }

      case "removeVerifiedScholarship": {
        const { error } = await adminClient.from("verified_scholarships").delete().eq("name", name);
        if (error) throw error;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unsupported action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
