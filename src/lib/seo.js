import { TRUST_PAGES } from "./trustPages";

const DEFAULT_SITE_URL = "https://awaited-orcin.vercel.app";
const DEFAULT_OG_IMAGE = "/og-image.svg";
const DEFAULT_TITLE = "Awaited — Scholarship Results Tracker";
const DEFAULT_DESCRIPTION =
  "Awaited is an anonymous scholarship results tracker where applicants compare timelines, decisions, and community signals.";

export function getSiteUrl() {
  return (import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

function buildAbsoluteUrl(pathname = "/") {
  return `${getSiteUrl()}${pathname === "/" ? "" : pathname}`;
}

function buildScholarshipDescription({ scholarshipName: _scholarshipName, scholarshipRecord, entryCount }) {
  const recordBits = [
    scholarshipRecord?.country ? `${scholarshipRecord.country} scholarship` : "Scholarship",
    scholarshipRecord?.funder ? `funded by ${scholarshipRecord.funder}` : "",
    scholarshipRecord?.results_timeline ? `Typical timeline: ${scholarshipRecord.results_timeline}.` : "",
  ].filter(Boolean);

  const communityBits = [
    entryCount ? `${entryCount} public report${entryCount === 1 ? "" : "s"} on Awaited.` : "No public reports yet on Awaited.",
    "Compare anonymous applicant updates, status changes, and decision dates.",
  ];

  return [...recordBits, ...communityBits].join(" ");
}

export function getRouteSeo({
  view,
  pathname = "/",
  scholarshipName = "",
  scholarshipRecord = null,
  scholarshipEntryCount = 0,
  blogPost = null,
  forumThread = null,
}) {
  const siteUrl = getSiteUrl();
  const baseSeo = {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    pathname,
    canonicalUrl: buildAbsoluteUrl(pathname),
    url: buildAbsoluteUrl(pathname),
    image: `${siteUrl}${DEFAULT_OG_IMAGE}`,
    type: "website",
  };

  if (view === "submit") {
    return {
      ...baseSeo,
      title: "Awaited — Submit Scholarship Result",
      description:
        "Submit an anonymous scholarship result to help other applicants compare timelines, decisions, and interviews.",
    };
  }

  if (view === "blog") {
    return {
      ...baseSeo,
      title: "Awaited — Blog",
      description:
        "Read Awaited blog posts on scholarship strategy, launch updates, and community trend reports.",
    };
  }

  if (view === "blogPost" && blogPost) {
    return {
      ...baseSeo,
      title: `Awaited — ${blogPost.title}`,
      description: blogPost.excerpt || DEFAULT_DESCRIPTION,
      type: "article",
    };
  }

  if (view === "forum") {
    return {
      ...baseSeo,
      title: "Awaited — Forum",
      description:
        "Browse anonymous scholarship discussions, applicant questions, and community advice on Awaited.",
    };
  }

  if (view === "forumThread" && forumThread) {
    return {
      ...baseSeo,
      title: `Awaited — ${forumThread.title}`,
      description: forumThread.body.slice(0, 180).trim(),
      type: "article",
    };
  }

  if (view === "scholarship" && scholarshipName) {
    return {
      ...baseSeo,
      title: `Awaited — ${scholarshipName}`,
      description: buildScholarshipDescription({
        scholarshipName,
        scholarshipRecord,
        entryCount: scholarshipEntryCount,
      }),
    };
  }

  if (view === "admin" || view === "login") {
    return {
      ...baseSeo,
      title: "Awaited — Admin",
      description: "Private moderation and publishing tools for Awaited administrators.",
    };
  }

  if (TRUST_PAGES[view]) {
    return {
      ...baseSeo,
      title: `Awaited — ${TRUST_PAGES[view].title}`,
      description: TRUST_PAGES[view].intro,
    };
  }

  return baseSeo;
}

function ensureMeta(selector, attributes) {
  if (typeof document === "undefined") {
    return null;
  }

  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== "content") {
        tag.setAttribute(key, value);
      }
    });
    document.head.appendChild(tag);
  }

  return tag;
}

function ensureLink(selector, attributes) {
  if (typeof document === "undefined") {
    return null;
  }

  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("link");
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== "href") {
        tag.setAttribute(key, value);
      }
    });
    document.head.appendChild(tag);
  }

  return tag;
}

export function applyDocumentSeo(seo) {
  if (typeof document === "undefined") {
    return;
  }

  document.title = seo.title;

  const description = ensureMeta('meta[name="description"]', { name: "description" });
  const ogTitle = ensureMeta('meta[property="og:title"]', { property: "og:title" });
  const ogDescription = ensureMeta('meta[property="og:description"]', { property: "og:description" });
  const ogType = ensureMeta('meta[property="og:type"]', { property: "og:type" });
  const ogUrl = ensureMeta('meta[property="og:url"]', { property: "og:url" });
  const ogImage = ensureMeta('meta[property="og:image"]', { property: "og:image" });
  const twitterCard = ensureMeta('meta[name="twitter:card"]', { name: "twitter:card" });
  const twitterTitle = ensureMeta('meta[name="twitter:title"]', { name: "twitter:title" });
  const twitterDescription = ensureMeta('meta[name="twitter:description"]', { name: "twitter:description" });
  const twitterImage = ensureMeta('meta[name="twitter:image"]', { name: "twitter:image" });
  const canonical = ensureLink('link[rel="canonical"]', { rel: "canonical" });

  description?.setAttribute("content", seo.description);
  ogTitle?.setAttribute("content", seo.title);
  ogDescription?.setAttribute("content", seo.description);
  ogType?.setAttribute("content", seo.type || "website");
  ogUrl?.setAttribute("content", seo.url);
  ogImage?.setAttribute("content", seo.image);
  twitterCard?.setAttribute("content", "summary_large_image");
  twitterTitle?.setAttribute("content", seo.title);
  twitterDescription?.setAttribute("content", seo.description);
  twitterImage?.setAttribute("content", seo.image);
  canonical?.setAttribute("href", seo.canonicalUrl);
}
