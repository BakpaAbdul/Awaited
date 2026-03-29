import {
  buildExcerpt,
  contentToSlug,
} from "./content";
import {
  getCanonicalScholarshipName,
  isDatabaseScholarship,
  sortScholarshipNames,
} from "./scholarships";
import { inferMissingTimelineDates } from "./statusSemantics";

const STORAGE_KEY = "awaited:app-data:v2";

function normalizeComments(comments = [], resultId = "result") {
  return comments
    .filter((comment) => comment && typeof comment.text === "string")
    .map((comment, index) => ({
      id: comment.id ?? `local-comment-${resultId}-${index}`,
      text: comment.text,
      time: comment.time || new Date().toISOString().split("T")[0],
      createdAt: comment.createdAt || new Date().toISOString(),
      reviewState: comment.reviewState || "approved",
      moderationReason: comment.moderationReason || "",
    }));
}

function normalizeResults(results = []) {
  return results
    .filter((result) => result && typeof result.scholarship === "string")
    .map((result, index) => {
      const status = result.status || "Applied";
      const date = result.date || "";
      const inferredTimeline = inferMissingTimelineDates(status, date, {
        appliedDate: result.appliedDate || "",
        interviewDate: result.interviewDate || "",
        finalDecisionDate: result.finalDecisionDate || "",
      });

      return {
        ...result,
        id: result.id ?? `local-result-${index}`,
        scholarship: getCanonicalScholarshipName(result.scholarship),
        cycleYear: result.cycleYear || "",
        university: result.university || "",
        program: result.program || "",
        applicationRound: result.applicationRound || "",
        appliedDate: inferredTimeline.appliedDate,
        interviewDate: inferredTimeline.interviewDate,
        finalDecisionDate: inferredTimeline.finalDecisionDate,
        comments: normalizeComments(result.comments, result.id ?? `local-result-${index}`),
        hidden: Boolean(result.hidden),
        reviewState: result.reviewState || "approved",
        moderationReason: result.moderationReason || "",
        createdAt: result.createdAt || new Date().toISOString(),
      };
    });
}

function normalizeBlogPosts(posts = []) {
  return posts
    .filter((post) => post && typeof post.title === "string")
    .map((post, index) => {
      const title = post.title.trim();
      const content = typeof post.content === "string" ? post.content.replace(/\r\n/g, "\n").trim() : "";
      const slug = (post.slug || contentToSlug(title) || `post-${index}`).trim();

      return {
        id: post.id ?? `local-blog-${index}`,
        slug,
        title,
        excerpt: (post.excerpt || buildExcerpt(content)).trim(),
        content,
        published: post.published !== false,
        createdAt: post.createdAt || new Date().toISOString(),
        updatedAt: post.updatedAt || post.createdAt || new Date().toISOString(),
        authorEmail: post.authorEmail || "",
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function normalizeForumReplies(replies = [], threadId = "thread") {
  return replies
    .filter((reply) => reply && typeof reply.body === "string")
    .map((reply, index) => ({
      id: reply.id ?? `local-forum-reply-${threadId}-${index}`,
      body: reply.body.replace(/\r\n/g, "\n").trim(),
      createdAt: reply.createdAt || new Date().toISOString(),
      reviewState: reply.reviewState || "approved",
      moderationReason: reply.moderationReason || "",
    }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function normalizeForumThreads(threads = []) {
  return threads
    .filter((thread) => thread && typeof thread.title === "string")
    .map((thread, index) => {
      const title = thread.title.trim();
      const body = typeof thread.body === "string" ? thread.body.replace(/\r\n/g, "\n").trim() : "";

      return {
        id: thread.id ?? `local-forum-thread-${index}`,
        slug: (thread.slug || contentToSlug(title) || `thread-${index}`).trim(),
        title,
        body,
        locked: Boolean(thread.locked),
        reviewState: thread.reviewState || "approved",
        moderationReason: thread.moderationReason || "",
        createdAt: thread.createdAt || new Date().toISOString(),
        replies: normalizeForumReplies(thread.replies, thread.id ?? `local-forum-thread-${index}`),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function normalizeAppData(appData = {}) {
  const results = normalizeResults(Array.isArray(appData.results) ? appData.results : []);
  const blogPosts = normalizeBlogPosts(Array.isArray(appData.blogPosts) ? appData.blogPosts : []);
  const forumThreads = normalizeForumThreads(Array.isArray(appData.forumThreads) ? appData.forumThreads : []);
  const manualVerified = sortScholarshipNames(
    (Array.isArray(appData.verifiedList) ? appData.verifiedList : [])
      .map((name) => getCanonicalScholarshipName(name))
      .filter((name) => name && !isDatabaseScholarship(name)),
  );
  const customScholarships = sortScholarshipNames([
    ...(Array.isArray(appData.customScholarships) ? appData.customScholarships : []),
    ...results.map((result) => result.scholarship).filter((name) => !isDatabaseScholarship(name)),
  ]);

  return {
    results,
    blogPosts,
    forumThreads,
    verifiedList: manualVerified,
    customScholarships: customScholarships.filter((name) => !manualVerified.includes(name)),
  };
}

export function getDefaultAppData() {
  return normalizeAppData();
}

export function loadPersistedAppData() {
  const fallbackData = normalizeAppData();

  if (typeof window === "undefined" || !window.localStorage) {
    return fallbackData;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      persistAppData(fallbackData);
      return fallbackData;
    }

    const parsed = JSON.parse(raw);
    const normalized = normalizeAppData(parsed);
    persistAppData(normalized);
    return normalized;
  } catch {
    persistAppData(fallbackData);
    return fallbackData;
  }
}

export function persistAppData(appData) {
  const normalized = normalizeAppData(appData);

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
}
