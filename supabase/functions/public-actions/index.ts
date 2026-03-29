import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY") || "";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
const HUMAN_TRUST_HOURS = 12;

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
}

function ensure(value: string, label: string, maxLength: number) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
}

function ensureOptional(value: string, label: string, maxLength: number) {
  if (!value) {
    return;
  }

  if (value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
}

function ensureDateValue(value: string, label: string, { required = false }: { required?: boolean } = {}) {
  if (!value) {
    if (required) {
      throw new Error(`${label} is required.`);
    }
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
}

function compareDates(left: string, right: string) {
  return new Date(`${left}T00:00:00Z`).getTime() - new Date(`${right}T00:00:00Z`).getTime();
}

function containsContactDetails(value: string) {
  return /(@|telegram|whatsapp|discord|signal|\+?\d[\d\s\-()]{7,})/i.test(value);
}

function containsRepeatedNoise(value: string) {
  return /(.)\1{6,}/.test(value);
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

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  return forwarded.split(",")[0].trim();
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyTurnstile(captchaToken: string, ipAddress: string) {
  if (!turnstileSecret) {
    return true;
  }

  if (!captchaToken) {
    return false;
  }

  const body = new URLSearchParams({
    secret: turnstileSecret,
    response: captchaToken,
  });

  if (ipAddress && ipAddress !== "unknown") {
    body.set("remoteip", ipAddress);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const data = await response.json();
  return Boolean(data?.success);
}

async function countRecentRows(table: string, fingerprintHash: string, isoThreshold: string) {
  const { count, error } = await adminClient
    .from(table)
    .select("*", { head: true, count: "exact" })
    .eq("fingerprint_hash", fingerprintHash)
    .gte("created_at", isoThreshold);

  if (error) {
    throw error;
  }

  return count || 0;
}

async function lookupHumanTrustSession(trustToken: string, fingerprintHash: string) {
  const tokenHash = await sha256(trustToken);
  const nowIso = new Date().toISOString();
  const { data, error } = await adminClient
    .from("human_verification_sessions")
    .select("id, expires_at")
    .eq("token_hash", tokenHash)
    .eq("fingerprint_hash", fingerprintHash)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    return null;
  }

  await adminClient
    .from("human_verification_sessions")
    .update({ last_used_at: nowIso })
    .eq("id", data.id);

  return {
    trustToken,
    trustExpiresAt: data.expires_at,
  };
}

async function createHumanTrustSession(fingerprintHash: string) {
  const rawToken = crypto.randomUUID();
  const tokenHash = await sha256(rawToken);
  const expiresAt = new Date(Date.now() + HUMAN_TRUST_HOURS * 60 * 60 * 1000).toISOString();

  const { error } = await adminClient.from("human_verification_sessions").insert({
    token_hash: tokenHash,
    fingerprint_hash: fingerprintHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw error;
  }

  return {
    trustToken: rawToken,
    trustExpiresAt: expiresAt,
  };
}

async function ensureUniqueSlug(table: string, title: string) {
  const baseSlug = contentToSlug(title) || `${table}-${Date.now()}`;
  let nextSlug = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await adminClient.from(table).select("id").eq("slug", nextSlug).maybeSingle();
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

async function isKnownScholarship(name: string) {
  const { data, error } = await adminClient
    .from("verified_scholarships")
    .select("name")
    .ilike("name", name)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.name);
}

async function ensureHuman(meta: Record<string, unknown>, request: Request, fingerprintHash: string) {
  const honeypot = cleanText(meta.honeypot);
  const captchaToken = cleanText(meta.captchaToken);
  const trustToken = cleanText(meta.trustToken);

  if (honeypot) {
    throw new Error("Spam submission blocked.");
  }

  if (trustToken) {
    const trustedSession = await lookupHumanTrustSession(trustToken, fingerprintHash);
    if (trustedSession) {
      return trustedSession;
    }
  }

  const verified = await verifyTurnstile(captchaToken, getClientIp(request));
  if (!verified) {
    throw new Error("Human verification failed.");
  }

  return createHumanTrustSession(fingerprintHash);
}

async function buildFingerprintHash(meta: Record<string, unknown>, request: Request) {
  const fingerprint = cleanText(meta.fingerprint);
  ensure(fingerprint, "Fingerprint", 200);
  return sha256(`${fingerprint}:${getClientIp(request)}`);
}

function inferResultModeration(entry: Record<string, unknown>, knownScholarship: boolean, recentResultCount: number) {
  const note = cleanText(entry.note);

  if (!knownScholarship) {
    return { reviewState: "pending", moderationReason: "Unknown scholarship name" };
  }

  if (containsContactDetails(note)) {
    return { reviewState: "pending", moderationReason: "Contains contact details" };
  }

  if (containsRepeatedNoise(note)) {
    return { reviewState: "pending", moderationReason: "Looks autogenerated" };
  }

  if (recentResultCount >= 1) {
    return { reviewState: "pending", moderationReason: "High submission frequency" };
  }

  return { reviewState: "approved", moderationReason: "" };
}

function inferCommentModeration(text: string, recentCommentCount: number) {
  if (containsContactDetails(text)) {
    return { reviewState: "pending", moderationReason: "Contains contact details" };
  }

  if (containsRepeatedNoise(text)) {
    return { reviewState: "pending", moderationReason: "Looks autogenerated" };
  }

  if (recentCommentCount >= 3) {
    return { reviewState: "pending", moderationReason: "High comment frequency" };
  }

  return { reviewState: "approved", moderationReason: "" };
}

function inferForumModeration(text: string, recentCount: number) {
  if (containsContactDetails(text)) {
    return { reviewState: "pending", moderationReason: "Contains contact details" };
  }

  if (containsRepeatedNoise(text)) {
    return { reviewState: "pending", moderationReason: "Looks autogenerated" };
  }

  if (recentCount >= 2) {
    return { reviewState: "pending", moderationReason: "High posting frequency" };
  }

  return { reviewState: "approved", moderationReason: "" };
}

async function handleSubmitResult(entry: Record<string, unknown>, meta: Record<string, unknown>, request: Request) {
  const scholarshipName = cleanText(entry.scholarship_name);
  const cycleYear = cleanText(entry.cycle_year);
  const country = cleanText(entry.country);
  const studyLevel = cleanText(entry.study_level);
  const fieldOfStudy = cleanText(entry.field_of_study);
  const hostUniversity = cleanText(entry.host_university);
  const programName = cleanText(entry.program_name);
  const applicationRound = cleanText(entry.application_round);
  const status = cleanText(entry.status);
  const decisionDate = cleanText(entry.decision_date);
  const appliedDate = cleanText(entry.applied_date);
  const interviewDate = cleanText(entry.interview_date);
  const finalDecisionDate = cleanText(entry.final_decision_date);
  const nationality = cleanText(entry.nationality);
  const gpa = cleanText(entry.gpa);
  const note = cleanText(entry.note);

  ensure(scholarshipName, "Scholarship name", 160);
  ensure(cycleYear, "Cycle year", 32);
  ensure(country, "Country", 120);
  ensure(studyLevel, "Study level", 40);
  ensure(fieldOfStudy, "Field of study", 160);
  ensure(status, "Status", 40);
  ensureDateValue(decisionDate, "Latest update date", { required: true });
  ensureOptional(hostUniversity, "University", 160);
  ensureOptional(programName, "Program", 160);
  ensureOptional(applicationRound, "Application round", 80);
  ensureDateValue(appliedDate, "Applied date");
  ensureDateValue(interviewDate, "Interview date");
  ensureDateValue(finalDecisionDate, "Final decision date");

  const normalizedAppliedDate = appliedDate || (status === "Applied" ? decisionDate : "");
  const normalizedInterviewDate = interviewDate || (status === "Interview" ? decisionDate : "");
  const normalizedFinalDecisionDate =
    finalDecisionDate || (["Accepted", "Rejected", "Waitlisted"].includes(status) ? decisionDate : "");

  if (normalizedAppliedDate && normalizedInterviewDate && compareDates(normalizedInterviewDate, normalizedAppliedDate) < 0) {
    throw new Error("Interview date cannot be earlier than applied date.");
  }

  if (normalizedAppliedDate && normalizedFinalDecisionDate && compareDates(normalizedFinalDecisionDate, normalizedAppliedDate) < 0) {
    throw new Error("Final decision date cannot be earlier than applied date.");
  }

  if (normalizedInterviewDate && normalizedFinalDecisionDate && compareDates(normalizedFinalDecisionDate, normalizedInterviewDate) < 0) {
    throw new Error("Final decision date cannot be earlier than interview date.");
  }

  const fingerprintHash = await buildFingerprintHash(meta, request);
  const humanTrust = await ensureHuman(meta, request, fingerprintHash);
  const recentWindow = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const recentResultCount = await countRecentRows("scholarship_results", fingerprintHash, recentWindow);

  if (recentResultCount >= 3) {
    return jsonResponse({ error: "Too many submissions right now. Try again later." }, 429);
  }

  const knownScholarship = await isKnownScholarship(scholarshipName);
  const moderation = inferResultModeration(entry, knownScholarship, recentResultCount);

  const { error } = await adminClient.from("scholarship_results").insert({
    scholarship_name: scholarshipName,
    cycle_year: cycleYear,
    country,
    study_level: studyLevel,
    field_of_study: fieldOfStudy,
    host_university: hostUniversity || null,
    program_name: programName || null,
    application_round: applicationRound || null,
    status,
    decision_date: decisionDate,
    applied_date: normalizedAppliedDate || null,
    interview_date: normalizedInterviewDate || null,
    final_decision_date: normalizedFinalDecisionDate || null,
    nationality: nationality || null,
    gpa: gpa || null,
    note: note || null,
    fingerprint_hash: fingerprintHash,
    review_state: moderation.reviewState,
    moderation_reason: moderation.moderationReason || null,
  });

  if (error) {
    throw error;
  }

  return jsonResponse({
    ok: true,
    reviewState: moderation.reviewState,
    moderationReason: moderation.moderationReason,
    ...humanTrust,
  });
}

async function handleAddComment(resultId: number, text: string, meta: Record<string, unknown>, request: Request) {
  const cleanComment = cleanText(text);
  ensure(cleanComment, "Comment", 400);

  const { data: targetResult, error: resultError } = await adminClient
    .from("scholarship_results")
    .select("id, hidden, review_state")
    .eq("id", resultId)
    .maybeSingle();

  if (resultError) {
    throw resultError;
  }

  if (!targetResult || targetResult.hidden || targetResult.review_state !== "approved") {
    return jsonResponse({ error: "This result is not available for comments." }, 400);
  }

  const fingerprintHash = await buildFingerprintHash(meta, request);
  const humanTrust = await ensureHuman(meta, request, fingerprintHash);
  const recentWindow = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const recentCommentCount = await countRecentRows("scholarship_comments", fingerprintHash, recentWindow);

  if (recentCommentCount >= 8) {
    return jsonResponse({ error: "Too many comments right now. Try again later." }, 429);
  }

  const moderation = inferCommentModeration(cleanComment, recentCommentCount);

  const { error } = await adminClient.from("scholarship_comments").insert({
    result_id: resultId,
    text: cleanComment,
    fingerprint_hash: fingerprintHash,
    review_state: moderation.reviewState,
    moderation_reason: moderation.moderationReason || null,
  });

  if (error) {
    throw error;
  }

  return jsonResponse({
    ok: true,
    reviewState: moderation.reviewState,
    moderationReason: moderation.moderationReason,
    ...humanTrust,
  });
}

async function handleCreateForumThread(entry: Record<string, unknown>, meta: Record<string, unknown>, request: Request) {
  const title = cleanText(entry.title);
  const body = cleanText(entry.body);

  ensure(title, "Thread title", 160);
  ensure(body, "Thread body", 2400);

  const fingerprintHash = await buildFingerprintHash(meta, request);
  const humanTrust = await ensureHuman(meta, request, fingerprintHash);
  const recentWindow = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const recentThreadCount = await countRecentRows("forum_threads", fingerprintHash, recentWindow);

  if (recentThreadCount >= 2) {
    return jsonResponse({ error: "Too many forum threads right now. Try again later." }, 429);
  }

  const moderation = inferForumModeration(`${title}\n${body}`, recentThreadCount);
  const slug = await ensureUniqueSlug("forum_threads", title);

  const { error } = await adminClient.from("forum_threads").insert({
    slug,
    title,
    body,
    fingerprint_hash: fingerprintHash,
    review_state: moderation.reviewState,
    moderation_reason: moderation.moderationReason || null,
  });

  if (error) {
    throw error;
  }

  return jsonResponse({
    ok: true,
    slug,
    reviewState: moderation.reviewState,
    moderationReason: moderation.moderationReason,
    ...humanTrust,
  });
}

async function handleAddForumReply(threadId: number, text: string, meta: Record<string, unknown>, request: Request) {
  const body = cleanText(text);
  ensure(body, "Reply", 1200);

  const { data: targetThread, error: threadError } = await adminClient
    .from("forum_threads")
    .select("id, locked, review_state")
    .eq("id", threadId)
    .maybeSingle();

  if (threadError) {
    throw threadError;
  }

  if (!targetThread || targetThread.locked || targetThread.review_state !== "approved") {
    return jsonResponse({ error: "This discussion is not open for replies." }, 400);
  }

  const fingerprintHash = await buildFingerprintHash(meta, request);
  const humanTrust = await ensureHuman(meta, request, fingerprintHash);
  const recentWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentReplyCount = await countRecentRows("forum_replies", fingerprintHash, recentWindow);

  if (recentReplyCount >= 10) {
    return jsonResponse({ error: "Too many forum replies right now. Try again later." }, 429);
  }

  const moderation = inferForumModeration(body, recentReplyCount);

  const { error } = await adminClient.from("forum_replies").insert({
    thread_id: threadId,
    body,
    fingerprint_hash: fingerprintHash,
    review_state: moderation.reviewState,
    moderation_reason: moderation.moderationReason || null,
  });

  if (error) {
    throw error;
  }

  return jsonResponse({
    ok: true,
    reviewState: moderation.reviewState,
    moderationReason: moderation.moderationReason,
    ...humanTrust,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const action = cleanText(body.action);

    switch (action) {
      case "submitResult":
        return await handleSubmitResult(body.entry || {}, body.meta || {}, request);

      case "addComment":
        return await handleAddComment(Number(body.resultId), cleanText(body.text), body.meta || {}, request);

      case "createForumThread":
        return await handleCreateForumThread(body.entry || {}, body.meta || {}, request);

      case "addForumReply":
        return await handleAddForumReply(Number(body.threadId), cleanText(body.text), body.meta || {}, request);

      default:
        return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
    }
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
