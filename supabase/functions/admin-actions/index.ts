import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlugText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function contentToSlug(value: string) {
  return normalizeSlugText(value).replace(/\s+/g, "-");
}

async function ensureUniqueSlug(table: string, title: string, excludeId?: number) {
  const baseSlug = contentToSlug(title) || `${table}-${Date.now()}`;
  let nextSlug = baseSlug;
  let suffix = 2;

  while (true) {
    const query = adminClient.from(table).select("id").eq("slug", nextSlug);
    if (excludeId) {
      query.neq("id", excludeId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw error;
    }

    if (!data?.id) {
      return nextSlug;
    }

    nextSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return { error: jsonResponse({ error: "Missing admin session." }, 401) };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const [{ data: userData, error: userError }, { data: adminFlag, error: adminError }] = await Promise.all([
    userClient.auth.getUser(),
    userClient.rpc("current_user_is_admin"),
  ]);

  if (userError || !userData.user) {
    return { error: jsonResponse({ error: "Invalid admin session." }, 401) };
  }

  if (adminError || !adminFlag) {
    return { error: jsonResponse({ error: "This account is not authorized." }, 403) };
  }

  return {
    user: userData.user,
    error: null,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminCheck = await requireAdmin(request);
  if (adminCheck.error) {
    return adminCheck.error;
  }

  try {
    const body = await request.json();
    const action = cleanText(body.action);

    switch (action) {
      case "verifyAdminSession":
        return jsonResponse({ ok: true, email: adminCheck.user?.email || "admin@awaited.local" });

      case "setResultHidden": {
        const { error } = await adminClient
          .from("scholarship_results")
          .update({ hidden: Boolean(body.hidden) })
          .eq("id", body.resultId);

        if (error) throw error;
        break;
      }

      case "setResultReviewState": {
        const reviewState = cleanText(body.reviewState);
        const moderationReason = cleanText(body.moderationReason) || null;
        const { error } = await adminClient
          .from("scholarship_results")
          .update({
            review_state: reviewState,
            moderation_reason: reviewState === "approved" ? null : moderationReason,
            hidden: reviewState === "approved" ? false : undefined,
          })
          .eq("id", body.resultId);

        if (error) throw error;
        break;
      }

      case "setCommentReviewState": {
        const reviewState = cleanText(body.reviewState);
        const moderationReason = cleanText(body.moderationReason) || null;
        const { error } = await adminClient
          .from("scholarship_comments")
          .update({
            review_state: reviewState,
            moderation_reason: reviewState === "approved" ? null : moderationReason,
          })
          .eq("id", body.commentId);

        if (error) throw error;
        break;
      }

      case "deleteResult": {
        const { error } = await adminClient.from("scholarship_results").delete().eq("id", body.resultId);
        if (error) throw error;
        break;
      }

      case "deleteComment": {
        const { error } = await adminClient.from("scholarship_comments").delete().eq("id", body.commentId);
        if (error) throw error;
        break;
      }

      case "upsertBlogPost": {
        const postId = Number(body.postId) || null;
        const title = cleanText(body.title);
        const excerpt = cleanText(body.excerpt) || null;
        const content = cleanText(body.content);
        const published = Boolean(body.published);
        const slug = await ensureUniqueSlug("blog_posts", title, postId || undefined);
        const payload = {
          slug,
          title,
          excerpt,
          content,
          published,
          author_email: adminCheck.user?.email || null,
          updated_at: new Date().toISOString(),
        };

        const query = postId
          ? adminClient.from("blog_posts").update(payload).eq("id", postId)
          : adminClient.from("blog_posts").insert(payload);
        const { error } = await query;
        if (error) throw error;
        break;
      }

      case "deleteBlogPost": {
        const { error } = await adminClient.from("blog_posts").delete().eq("id", body.postId);
        if (error) throw error;
        break;
      }

      case "setForumThreadReviewState": {
        const reviewState = cleanText(body.reviewState);
        const moderationReason = cleanText(body.moderationReason) || null;
        const { error } = await adminClient
          .from("forum_threads")
          .update({
            review_state: reviewState,
            moderation_reason: reviewState === "approved" ? null : moderationReason,
          })
          .eq("id", body.threadId);

        if (error) throw error;
        break;
      }

      case "setForumReplyReviewState": {
        const reviewState = cleanText(body.reviewState);
        const moderationReason = cleanText(body.moderationReason) || null;
        const { error } = await adminClient
          .from("forum_replies")
          .update({
            review_state: reviewState,
            moderation_reason: reviewState === "approved" ? null : moderationReason,
          })
          .eq("id", body.replyId);

        if (error) throw error;
        break;
      }

      case "setForumThreadLocked": {
        const { error } = await adminClient
          .from("forum_threads")
          .update({ locked: Boolean(body.locked) })
          .eq("id", body.threadId);

        if (error) throw error;
        break;
      }

      case "deleteForumThread": {
        const { error } = await adminClient.from("forum_threads").delete().eq("id", body.threadId);
        if (error) throw error;
        break;
      }

      case "deleteForumReply": {
        const { error } = await adminClient.from("forum_replies").delete().eq("id", body.replyId);
        if (error) throw error;
        break;
      }

      case "addVerifiedScholarship": {
        const name = cleanText(body.name);
        const { error } = await adminClient
          .from("verified_scholarships")
          .upsert({ name, source: "manual" }, { onConflict: "name", ignoreDuplicates: false });

        if (error) throw error;
        break;
      }

      case "removeVerifiedScholarship": {
        const name = cleanText(body.name);
        const { error } = await adminClient
          .from("verified_scholarships")
          .delete()
          .eq("name", name)
          .eq("source", "manual");

        if (error) throw error;
        break;
      }

      default:
        return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
