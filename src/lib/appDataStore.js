import { getDefaultAppData, loadPersistedAppData, normalizeAppData, persistAppData } from "./persistence";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { getClientFingerprint } from "./clientIdentity";
import { clearHumanTrust, getStoredHumanTrustToken, storeHumanTrust } from "./humanVerification";
import { buildExcerpt, contentToSlug } from "./content";
import { sanitizeBlogPost, sanitizeComment, sanitizeForumReply, sanitizeForumThread, sanitizeScholarshipName, sanitizeSubmission } from "./contentPolicy";
import {
  findMatchingScholarshipName,
  getCanonicalScholarshipName,
  isDatabaseScholarship,
  sortScholarshipNames,
} from "./scholarships";

const RESULTS_TABLE = "scholarship_results";
const COMMENTS_TABLE = "scholarship_comments";
const VERIFIED_TABLE = "verified_scholarships";
const BLOG_TABLE = "blog_posts";
const FORUM_THREADS_TABLE = "forum_threads";
const FORUM_REPLIES_TABLE = "forum_replies";
const ADMIN_RPC = "current_user_is_admin";
const ADMIN_FUNCTION = import.meta.env.VITE_SUPABASE_ADMIN_FUNCTION || "admin-actions";
const PUBLIC_FUNCTION = import.meta.env.VITE_SUPABASE_PUBLIC_FUNCTION || "public-actions";
const LOCAL_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "scholar2026";

export const DATA_BACKEND_MODE = isSupabaseConfigured ? "supabase" : "browser-local";

function buildResultPayload(entry) {
  return {
    scholarship_name: getCanonicalScholarshipName(entry.scholarship),
    country: entry.country.trim(),
    study_level: entry.level,
    field_of_study: entry.field.trim(),
    status: entry.status,
    decision_date: entry.date,
    nationality: entry.nationality?.trim() || null,
    gpa: entry.gpa?.trim() || null,
    note: entry.note?.trim() || null,
  };
}

function mapCommentRow(row) {
  return {
    id: row.id,
    resultId: row.result_id,
    text: row.text,
    time: row.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
    createdAt: row.created_at || new Date().toISOString(),
    reviewState: row.review_state || "approved",
    moderationReason: row.moderation_reason || "",
  };
}

function mapResultRow(row, comments = []) {
  return {
    id: row.id,
    scholarship: row.scholarship_name,
    country: row.country,
    level: row.study_level,
    field: row.field_of_study,
    status: row.status,
    date: row.decision_date,
    nationality: row.nationality || "",
    gpa: row.gpa || "",
    note: row.note || "",
    hidden: Boolean(row.hidden),
    reviewState: row.review_state || "approved",
    moderationReason: row.moderation_reason || "",
    createdAt: row.created_at,
    comments,
  };
}

function mapBlogPostRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || buildExcerpt(row.content || ""),
    content: row.content || "",
    published: Boolean(row.published),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    authorEmail: row.author_email || "",
  };
}

function mapForumReplyRow(row) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at || new Date().toISOString(),
    reviewState: row.review_state || "approved",
    moderationReason: row.moderation_reason || "",
  };
}

function mapForumThreadRow(row, replies = []) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    locked: Boolean(row.locked),
    reviewState: row.review_state || "approved",
    moderationReason: row.moderation_reason || "",
    createdAt: row.created_at || new Date().toISOString(),
    replies,
  };
}

function buildAppDataFromRows(
  resultRows = [],
  commentRows = [],
  verifiedRows = [],
  blogRows = [],
  forumThreadRows = [],
  forumReplyRows = [],
) {
  const commentsByResult = new Map();
  (commentRows || []).forEach((row) => {
    const comments = commentsByResult.get(row.result_id) || [];
    comments.push(mapCommentRow(row));
    commentsByResult.set(row.result_id, comments);
  });

  const repliesByThread = new Map();
  (forumReplyRows || []).forEach((row) => {
    const replies = repliesByThread.get(row.thread_id) || [];
    replies.push(mapForumReplyRow(row));
    repliesByThread.set(row.thread_id, replies);
  });

  return normalizeAppData({
    results: (resultRows || []).map((row) => mapResultRow(row, commentsByResult.get(row.id) || [])),
    blogPosts: (blogRows || []).map(mapBlogPostRow),
    forumThreads: (forumThreadRows || []).map((row) => mapForumThreadRow(row, repliesByThread.get(row.id) || [])),
    verifiedList: (verifiedRows || [])
      .filter((row) => (row.source || "manual") === "manual")
      .map((row) => row.name),
  });
}

function withLocalMutation(mutator) {
  const current = loadPersistedAppData();
  const next = normalizeAppData(mutator(current));
  persistAppData(next);
  return next;
}

async function getAuthHeaders() {
  if (!supabase) {
    return undefined;
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function invokeFunction(functionName, body, { withAuth = false } = {}) {
  const headers = withAuth ? await getAuthHeaders() : undefined;
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers,
  });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

function syncHumanTrustFromResponse(response) {
  if (response?.trustToken && response?.trustExpiresAt) {
    storeHumanTrust({
      token: response.trustToken,
      expiresAt: response.trustExpiresAt,
    });
  }
}

function maybeClearHumanTrustOnError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (message.toLowerCase().includes("human verification failed")) {
    clearHumanTrust();
  }
}

async function loadSupabaseAppData({ admin = false } = {}) {
  const resultsQuery = supabase.from(RESULTS_TABLE).select("*").order("created_at", { ascending: false });
  const commentsQuery = supabase.from(COMMENTS_TABLE).select("*").order("created_at", { ascending: true });
  const blogQuery = supabase.from(BLOG_TABLE).select("*").order("created_at", { ascending: false });
  const forumThreadsQuery = supabase.from(FORUM_THREADS_TABLE).select("*").order("created_at", { ascending: false });
  const forumRepliesQuery = supabase.from(FORUM_REPLIES_TABLE).select("*").order("created_at", { ascending: true });

  if (!admin) {
    resultsQuery.eq("review_state", "approved").eq("hidden", false);
    commentsQuery.eq("review_state", "approved");
    blogQuery.eq("published", true);
    forumThreadsQuery.eq("review_state", "approved");
    forumRepliesQuery.eq("review_state", "approved");
  }

  const [
    { data: resultRows, error: resultsError },
    { data: commentRows, error: commentsError },
    { data: verifiedRows, error: verifiedError },
    { data: blogRows, error: blogError },
    { data: forumThreadRows, error: forumThreadsError },
    { data: forumReplyRows, error: forumRepliesError },
  ] =
    await Promise.all([
      resultsQuery,
      commentsQuery,
      supabase.from(VERIFIED_TABLE).select("name, source").order("name", { ascending: true }),
      blogQuery,
      forumThreadsQuery,
      forumRepliesQuery,
    ]);

  if (resultsError) throw resultsError;
  if (commentsError) throw commentsError;
  if (verifiedError) throw verifiedError;
  if (blogError) throw blogError;
  if (forumThreadsError) throw forumThreadsError;
  if (forumRepliesError) throw forumRepliesError;

  return buildAppDataFromRows(resultRows, commentRows, verifiedRows, blogRows, forumThreadRows, forumReplyRows);
}

function formatFallbackMessage(error) {
  const detail = error instanceof Error ? error.message : "Unknown error";
  return `Supabase is unavailable right now. Using browser-local fallback on this device. (${detail})`;
}

async function isCurrentUserAdmin() {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc(ADMIN_RPC);
  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function loadPublicAppData() {
  return loadSupabaseAppData({ admin: false });
}

async function loadAdminAppData() {
  return loadSupabaseAppData({ admin: true });
}

async function loadAppData({ admin = false } = {}) {
  if (!isSupabaseConfigured) {
    return loadPersistedAppData();
  }

  try {
    return admin ? await loadAdminAppData() : await loadPublicAppData();
  } catch (error) {
    console.error("Falling back to browser-local data because Supabase load failed.", error);
    return loadPersistedAppData();
  }
}

function getUniqueLocalSlug(items = [], rawTitle, fallbackPrefix) {
  const baseSlug = contentToSlug(rawTitle) || `${fallbackPrefix}-${Date.now()}`;
  let nextSlug = baseSlug;
  let suffix = 2;

  while (items.some((item) => item.slug === nextSlug)) {
    nextSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return nextSlug;
}

async function hydrateAppData() {
  if (!isSupabaseConfigured) {
    return {
      activeMode: "browser-local",
      appData: loadPersistedAppData(),
      syncError: "",
      admin: null,
    };
  }

  try {
    const { data } = await supabase.auth.getSession();
    const hasSession = Boolean(data.session);
    const admin = hasSession && await isCurrentUserAdmin();

    return {
      activeMode: "supabase",
      appData: admin ? await loadAdminAppData() : await loadPublicAppData(),
      syncError: "",
      admin: admin ? { email: data.session?.user?.email || "admin@awaited.local" } : null,
    };
  } catch (error) {
    console.error("Falling back to browser-local data because Supabase load failed.", error);
    return {
      activeMode: "browser-local",
      appData: loadPersistedAppData(),
      syncError: formatFallbackMessage(error),
      admin: null,
    };
  }
}

async function signInAdmin({ email, password }) {
  if (!isSupabaseConfigured) {
    if (password !== LOCAL_ADMIN_PASSWORD) {
      throw new Error("Invalid admin credentials.");
    }

    return {
      appData: loadPersistedAppData(),
      admin: {
        email: email?.trim() || "local-admin@awaited.local",
      },
    };
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Admin email is required.");
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw error;
  }

  const admin = await isCurrentUserAdmin();
  if (!admin) {
    await supabase.auth.signOut();
    throw new Error("This account is not authorized to moderate Awaited.");
  }

  return {
    appData: await loadAdminAppData(),
    admin: {
      email: data.user?.email || normalizedEmail,
    },
  };
}

async function signOutAdmin() {
  if (!isSupabaseConfigured) {
    return {
      appData: loadPersistedAppData(),
      admin: null,
    };
  }

  await supabase.auth.signOut();
  return {
    appData: await loadPublicAppData(),
    admin: null,
  };
}

async function submitResult(entry, moderation = {}, options = {}) {
  const sanitizedEntry = sanitizeSubmission(entry);

  if (!isSupabaseConfigured) {
    const nextData = withLocalMutation((current) => {
      const matchedName =
        findMatchingScholarshipName(sanitizedEntry.scholarship, [...current.verifiedList, ...(current.customScholarships || [])]) ||
        getCanonicalScholarshipName(sanitizedEntry.scholarship);
      const nextCustomScholarships = !isDatabaseScholarship(matchedName)
        ? sortScholarshipNames([...(current.customScholarships || []), matchedName])
        : current.customScholarships || [];

      return {
        ...current,
        results: [
          {
            ...sanitizedEntry,
            id: `local-result-${Date.now()}`,
            scholarship: matchedName,
            comments: [],
            hidden: false,
            reviewState: "approved",
            moderationReason: "",
            createdAt: new Date().toISOString(),
          },
          ...current.results,
        ],
        customScholarships: nextCustomScholarships,
      };
    });

    return {
      appData: nextData,
      meta: { reviewState: "approved" },
    };
  }

  const response = await invokeFunction(
    PUBLIC_FUNCTION,
    {
      action: "submitResult",
      entry: buildResultPayload(sanitizedEntry),
      meta: {
        fingerprint: getClientFingerprint(),
        honeypot: moderation.honeypot || "",
        captchaToken: moderation.captchaToken || "",
        trustToken: getStoredHumanTrustToken(),
      },
    },
    { withAuth: false },
  ).catch((error) => {
    maybeClearHumanTrustOnError(error);
    throw error;
  });
  syncHumanTrustFromResponse(response);

  return {
    appData: options.admin ? await loadAdminAppData() : await loadPublicAppData(),
    meta: {
      reviewState: response?.reviewState || "approved",
      moderationReason: response?.moderationReason || "",
    },
  };
}

async function addComment(resultId, text, moderation = {}, options = {}) {
  const sanitizedText = sanitizeComment(text);

  if (!isSupabaseConfigured) {
    const nextData = withLocalMutation((current) => ({
      ...current,
      results: current.results.map((result) =>
        result.id === resultId
          ? {
              ...result,
              comments: [
                ...result.comments,
                {
                  id: `local-comment-${resultId}-${Date.now()}`,
                  text: sanitizedText,
                  time: new Date().toISOString().split("T")[0],
                  createdAt: new Date().toISOString(),
                  reviewState: "approved",
                  moderationReason: "",
                },
              ],
            }
          : result,
      ),
    }));

    return {
      appData: nextData,
      meta: { reviewState: "approved" },
    };
  }

  const response = await invokeFunction(
    PUBLIC_FUNCTION,
    {
      action: "addComment",
      resultId,
      text: sanitizedText,
      meta: {
        fingerprint: getClientFingerprint(),
        honeypot: moderation.honeypot || "",
        captchaToken: moderation.captchaToken || "",
        trustToken: getStoredHumanTrustToken(),
      },
    },
    { withAuth: false },
  ).catch((error) => {
    maybeClearHumanTrustOnError(error);
    throw error;
  });
  syncHumanTrustFromResponse(response);

  return {
    appData: options.admin ? await loadAdminAppData() : await loadPublicAppData(),
    meta: {
      reviewState: response?.reviewState || "approved",
      moderationReason: response?.moderationReason || "",
    },
  };
}

async function createForumThread(entry, moderation = {}, options = {}) {
  const sanitizedEntry = sanitizeForumThread(entry);

  if (!isSupabaseConfigured) {
    const nextData = withLocalMutation((current) => {
      const slug = getUniqueLocalSlug(current.forumThreads || [], sanitizedEntry.title, "thread");

      return {
        ...current,
        forumThreads: [
          {
            id: `local-forum-thread-${Date.now()}`,
            slug,
            title: sanitizedEntry.title,
            body: sanitizedEntry.body,
            locked: false,
            reviewState: "approved",
            moderationReason: "",
            createdAt: new Date().toISOString(),
            replies: [],
          },
          ...(current.forumThreads || []),
        ],
      };
    });

    return {
      appData: nextData,
      meta: { reviewState: "approved", slug: nextData.forumThreads[0]?.slug || "" },
    };
  }

  const response = await invokeFunction(
    PUBLIC_FUNCTION,
    {
      action: "createForumThread",
      entry: sanitizedEntry,
      meta: {
        fingerprint: getClientFingerprint(),
        honeypot: moderation.honeypot || "",
        captchaToken: moderation.captchaToken || "",
        trustToken: getStoredHumanTrustToken(),
      },
    },
    { withAuth: false },
  ).catch((error) => {
    maybeClearHumanTrustOnError(error);
    throw error;
  });
  syncHumanTrustFromResponse(response);

  return {
    appData: options.admin ? await loadAdminAppData() : await loadPublicAppData(),
    meta: {
      reviewState: response?.reviewState || "approved",
      moderationReason: response?.moderationReason || "",
      slug: response?.slug || "",
    },
  };
}

async function addForumReply(threadId, text, moderation = {}, options = {}) {
  const sanitizedText = sanitizeForumReply(text);

  if (!isSupabaseConfigured) {
    const nextData = withLocalMutation((current) => ({
      ...current,
      forumThreads: (current.forumThreads || []).map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              replies: [
                ...(thread.replies || []),
                {
                  id: `local-forum-reply-${threadId}-${Date.now()}`,
                  body: sanitizedText,
                  createdAt: new Date().toISOString(),
                  reviewState: "approved",
                  moderationReason: "",
                },
              ],
            }
          : thread,
      ),
    }));

    return {
      appData: nextData,
      meta: { reviewState: "approved" },
    };
  }

  const response = await invokeFunction(
    PUBLIC_FUNCTION,
    {
      action: "addForumReply",
      threadId,
      text: sanitizedText,
      meta: {
        fingerprint: getClientFingerprint(),
        honeypot: moderation.honeypot || "",
        captchaToken: moderation.captchaToken || "",
        trustToken: getStoredHumanTrustToken(),
      },
    },
    { withAuth: false },
  ).catch((error) => {
    maybeClearHumanTrustOnError(error);
    throw error;
  });
  syncHumanTrustFromResponse(response);

  return {
    appData: options.admin ? await loadAdminAppData() : await loadPublicAppData(),
    meta: {
      reviewState: response?.reviewState || "approved",
      moderationReason: response?.moderationReason || "",
    },
  };
}

async function invokeAdminMutation(action, payload = {}) {
  await invokeFunction(ADMIN_FUNCTION, { action, ...payload }, { withAuth: true });
  return loadAdminAppData();
}

async function saveBlogPost(entry) {
  const sanitizedEntry = sanitizeBlogPost(entry);

  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => {
      const now = new Date().toISOString();
      const existingPosts = current.blogPosts || [];
      const existing = existingPosts.find((post) => post.id === entry.id);
      const desiredSlug = existing?.slug || getUniqueLocalSlug(existingPosts, sanitizedEntry.title, "post");
      const nextPost = {
        id: entry.id || `local-blog-${Date.now()}`,
        slug: desiredSlug,
        title: sanitizedEntry.title,
        excerpt: sanitizedEntry.excerpt || buildExcerpt(sanitizedEntry.content),
        content: sanitizedEntry.content,
        published: entry.published !== false,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        authorEmail: existing?.authorEmail || "local-admin@awaited.local",
      };

      return {
        ...current,
        blogPosts: [nextPost, ...existingPosts.filter((post) => post.id !== nextPost.id)],
      };
    });
  }

  return invokeAdminMutation("upsertBlogPost", {
    postId: entry.id || null,
    title: sanitizedEntry.title,
    excerpt: sanitizedEntry.excerpt,
    content: sanitizedEntry.content,
    published: entry.published !== false,
  });
}

async function deleteBlogPost(postId) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      blogPosts: (current.blogPosts || []).filter((post) => post.id !== postId),
    }));
  }

  return invokeAdminMutation("deleteBlogPost", { postId });
}

async function setResultHidden(resultId, hidden) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      results: current.results.map((result) => (result.id === resultId ? { ...result, hidden } : result)),
    }));
  }

  return invokeAdminMutation("setResultHidden", { resultId, hidden });
}

async function deleteResult(resultId) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      results: current.results.filter((result) => result.id !== resultId),
    }));
  }

  return invokeAdminMutation("deleteResult", { resultId });
}

async function deleteComment(commentId) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      results: current.results.map((result) => ({
        ...result,
        comments: result.comments.filter((comment) => comment.id !== commentId),
      })),
    }));
  }

  return invokeAdminMutation("deleteComment", { commentId });
}

async function deleteForumThread(threadId) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      forumThreads: (current.forumThreads || []).filter((thread) => thread.id !== threadId),
    }));
  }

  return invokeAdminMutation("deleteForumThread", { threadId });
}

async function deleteForumReply(replyId) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      forumThreads: (current.forumThreads || []).map((thread) => ({
        ...thread,
        replies: (thread.replies || []).filter((reply) => reply.id !== replyId),
      })),
    }));
  }

  return invokeAdminMutation("deleteForumReply", { replyId });
}

async function setResultReviewState(resultId, reviewState, moderationReason = "") {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      results: current.results.map((result) =>
        result.id === resultId ? { ...result, reviewState, moderationReason } : result,
      ),
    }));
  }

  return invokeAdminMutation("setResultReviewState", { resultId, reviewState, moderationReason });
}

async function setCommentReviewState(commentId, reviewState, moderationReason = "") {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      results: current.results.map((result) => ({
        ...result,
        comments: result.comments.map((comment) =>
          comment.id === commentId ? { ...comment, reviewState, moderationReason } : comment,
        ),
      })),
    }));
  }

  return invokeAdminMutation("setCommentReviewState", { commentId, reviewState, moderationReason });
}

async function setForumThreadReviewState(threadId, reviewState, moderationReason = "") {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      forumThreads: (current.forumThreads || []).map((thread) =>
        thread.id === threadId ? { ...thread, reviewState, moderationReason } : thread,
      ),
    }));
  }

  return invokeAdminMutation("setForumThreadReviewState", { threadId, reviewState, moderationReason });
}

async function setForumReplyReviewState(replyId, reviewState, moderationReason = "") {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      forumThreads: (current.forumThreads || []).map((thread) => ({
        ...thread,
        replies: (thread.replies || []).map((reply) =>
          reply.id === replyId ? { ...reply, reviewState, moderationReason } : reply,
        ),
      })),
    }));
  }

  return invokeAdminMutation("setForumReplyReviewState", { replyId, reviewState, moderationReason });
}

async function setForumThreadLocked(threadId, locked) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      forumThreads: (current.forumThreads || []).map((thread) =>
        thread.id === threadId ? { ...thread, locked } : thread,
      ),
    }));
  }

  return invokeAdminMutation("setForumThreadLocked", { threadId, locked });
}

async function addVerifiedScholarship(name) {
  const canonicalName = getCanonicalScholarshipName(sanitizeScholarshipName(name));

  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      verifiedList: findMatchingScholarshipName(canonicalName, current.verifiedList)
        ? current.verifiedList
        : sortScholarshipNames([...current.verifiedList, canonicalName]),
      customScholarships: sortScholarshipNames([...(current.customScholarships || []), canonicalName]),
    }));
  }

  return invokeAdminMutation("addVerifiedScholarship", { name: canonicalName });
}

async function removeVerifiedScholarship(name) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      verifiedList: current.verifiedList.filter((item) => item !== name),
    }));
  }

  return invokeAdminMutation("removeVerifiedScholarship", { name });
}

function subscribeToAppData({ admin = false } = {}, onData, onError) {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  let active = true;
  let reloadTimer = null;
  const loadCurrent = async () => {
    try {
      const nextData = await loadSupabaseAppData({ admin });
      if (active) {
        onData(nextData);
      }
    } catch (error) {
      if (active) {
        onError?.(error);
      }
    }
  };

  const scheduleReload = () => {
    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }

    reloadTimer = setTimeout(loadCurrent, 150);
  };

  const channel = supabase
    .channel(admin ? "awaited-admin-data" : "awaited-public-data")
    .on("postgres_changes", { event: "*", schema: "public", table: RESULTS_TABLE }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: COMMENTS_TABLE }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: VERIFIED_TABLE }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: BLOG_TABLE }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: FORUM_THREADS_TABLE }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: FORUM_REPLIES_TABLE }, scheduleReload)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        scheduleReload();
      }

      if (status === "CHANNEL_ERROR") {
        onError?.(new Error("Supabase realtime connection failed."));
      }
    });

  return () => {
    active = false;

    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }

    supabase.removeChannel(channel);
  };
}

export const appDataStore = {
  mode: DATA_BACKEND_MODE,
  getDefaultAppData,
  getInitialAppData() {
    return DATA_BACKEND_MODE === "supabase"
      ? normalizeAppData({ results: [], blogPosts: [], forumThreads: [], verifiedList: [], customScholarships: [] })
      : loadPersistedAppData();
  },
  hydrateAppData,
  loadAppData,
  loadAdminAppData,
  loadPublicAppData,
  signInAdmin,
  signOutAdmin,
  isCurrentUserAdmin,
  subscribeToAppData,
  submitResult,
  addComment,
  createForumThread,
  addForumReply,
  saveBlogPost,
  deleteBlogPost,
  setResultHidden,
  deleteResult,
  deleteComment,
  deleteForumThread,
  deleteForumReply,
  setResultReviewState,
  setCommentReviewState,
  setForumThreadReviewState,
  setForumReplyReviewState,
  setForumThreadLocked,
  addVerifiedScholarship,
  removeVerifiedScholarship,
};
