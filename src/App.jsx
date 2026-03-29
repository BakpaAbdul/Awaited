import { useEffect, useMemo, useRef, useState } from "react";
import { AdminBlogPanel, BlogIndex, BlogPostView, ForumIndex, ForumThreadView } from "./components/communitySections";
import { LEVELS, STATUSES, STATUS_CONFIG } from "./lib/constants";
import { appDataStore, DATA_BACKEND_MODE } from "./lib/appDataStore";
import { hasStoredHumanTrust } from "./lib/humanVerification";
import { parseAppRoute, pushAppRoute } from "./lib/router";
import { loadTurnstileScript } from "./lib/turnstile";
import { turnstileSiteKey } from "./lib/supabaseClient";
import {
  buildScholarshipSuggestions,
  DATABASE_SCHOLARSHIP_NAMES,
  findMatchingScholarshipName,
  findScholarshipNameBySlug,
  getCanonicalScholarshipName,
  getScholarshipRecord,
  getScholarshipRecordBySlug,
  isDatabaseScholarship,
  scholarshipToSlug,
  sortScholarshipNames,
} from "./lib/scholarships";

const INITIAL_ROUTE =
  typeof window !== "undefined"
    ? parseAppRoute(window.location.pathname)
    : { view: "feed", scholarshipSlug: null, blogSlug: null, forumSlug: null };
const ADMIN_ENTRY_STORAGE_KEY = "awaited:admin-entry:v1";

const TRUST_PAGES = {
  privacy: {
    title: "Privacy Policy",
    intro:
      "Awaited is built around anonymous scholarship reporting. We keep the data we collect as limited as possible and use it only to run the service, reduce abuse, and moderate community content.",
    sections: [
      {
        heading: "What Awaited collects",
        items: [
          "Anonymous report fields such as scholarship name, country, level, field, outcome dates, notes, and anonymous comments.",
          "Technical anti-abuse data such as CAPTCHA verification results, IP-derived fingerprint hashes, and moderation metadata used to slow spam and repeated abuse.",
          "Moderator account details for authorized admins who sign in to review queued content.",
        ],
      },
      {
        heading: "How Awaited uses that data",
        items: [
          "To publish public scholarship timelines and community signals.",
          "To review, approve, reject, hide, or delete suspicious content.",
          "To secure the service, investigate abuse, and keep the feed usable.",
        ],
      },
      {
        heading: "What you should never post",
        items: [
          "Do not post passport numbers, application IDs, email addresses, phone numbers, bank details, admission documents, or any other personal identifiers.",
          "Do not post information that could expose another applicant without their consent.",
        ],
      },
      {
        heading: "Retention and moderation",
        items: [
          "Approved submissions can remain public until removed by a moderator or the original service policy changes.",
          "Rejected, hidden, and anti-abuse records can be retained for security and moderation purposes.",
        ],
      },
    ],
  },
  community: {
    title: "Community Rules",
    intro:
      "Awaited works only if reports are honest, useful, and safe for other applicants. These rules apply to reports, comments, and scholarship-name submissions.",
    sections: [
      {
        heading: "Post accurate scholarship updates",
        items: [
          "Submit only real updates about your own scholarship process or first-hand experience.",
          "Do not invent outcomes, impersonate committees, or post rumor as fact.",
        ],
      },
      {
        heading: "Protect anonymity",
        items: [
          "Keep posts free of phone numbers, email addresses, usernames, links, or other identifying information.",
          "Do not pressure others to contact you off-platform.",
        ],
      },
      {
        heading: "Respect other applicants",
        items: [
          "No harassment, abuse, discrimination, threats, or mocking of rejected applicants.",
          "No marketing, fundraising, lead generation, or unrelated promotion.",
        ],
      },
      {
        heading: "Moderation outcomes",
        items: [
          "Awaited may queue, reject, hide, or delete posts that look misleading, abusive, or spammy.",
          "Repeat abuse can result in stricter automated filtering or permanent removal of content.",
        ],
      },
    ],
  },
  disclaimer: {
    title: "Community Disclaimer",
    intro:
      "Awaited is a community reporting platform, not an official scholarship authority. Every public result is a user-submitted signal and should be read with caution.",
    sections: [
      {
        heading: "Not official scholarship communication",
        items: [
          "Awaited is not operated by scholarship providers, universities, embassies, or government agencies.",
          "A post on Awaited does not confirm that decisions have officially been released.",
        ],
      },
      {
        heading: "Use Awaited as a signal, not proof",
        items: [
          "Community reports can be incomplete, mistaken, delayed, or malicious even after moderation.",
          "Always verify timelines and eligibility details through the official scholarship website, email, or portal.",
        ],
      },
      {
        heading: "No professional advice",
        items: [
          "Awaited does not provide legal, immigration, financial, or admissions advice.",
          "You remain responsible for your own application decisions and document security.",
        ],
      },
    ],
  },
};

function getStoredAdminEntryAccess() {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    return window.localStorage.getItem(ADMIN_ENTRY_STORAGE_KEY) === "enabled";
  } catch {
    return false;
  }
}

function setStoredAdminEntryAccess(enabled) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    if (enabled) {
      window.localStorage.setItem(ADMIN_ENTRY_STORAGE_KEY, "enabled");
    } else {
      window.localStorage.removeItem(ADMIN_ENTRY_STORAGE_KEY);
    }
  } catch {
    // Ignore localStorage failures and keep the session behavior in memory.
  }
}

export default function AwaitedApp() {
  const flashTimerRef = useRef(null);
  const hiddenAdminTapRef = useRef({ count: 0, lastTap: 0 });
  const [appData, setAppData] = useState(() => appDataStore.getInitialAppData());
  const [activeDataMode, setActiveDataMode] = useState(DATA_BACKEND_MODE);
  const [isHydrating, setIsHydrating] = useState(DATA_BACKEND_MODE === "supabase");
  const [syncError, setSyncError] = useState("");
  const [view, setView] = useState(INITIAL_ROUTE.view);
  const [routeScholarshipSlug, setRouteScholarshipSlug] = useState(INITIAL_ROUTE.scholarshipSlug);
  const [routeBlogSlug, setRouteBlogSlug] = useState(INITIAL_ROUTE.blogSlug);
  const [routeForumSlug, setRouteForumSlug] = useState(INITIAL_ROUTE.forumSlug);
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [filterCountry, setFilterCountry] = useState("All");
  const [flashMessage, setFlashMessage] = useState("");
  const [expandedCard, setExpandedCard] = useState(null);
  const [newComments, setNewComments] = useState({});

  const [adminUser, setAdminUser] = useState(null);
  const [adminEmail, setAdminEmail] = useState("admin@awaited.local");
  const [adminPw, setAdminPw] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [adminTab, setAdminTab] = useState("moderation");
  const [newVerified, setNewVerified] = useState("");
  const [adminEntryUnlocked, setAdminEntryUnlocked] = useState(() => getStoredAdminEntryAccess());

  const isAdmin = Boolean(adminUser);
  const canAccessAdminEntry = isAdmin || adminEntryUnlocked;
  const results = appData.results;
  const blogPosts = appData.blogPosts || [];
  const forumThreads = appData.forumThreads || [];
  const manualVerifiedList = appData.verifiedList;
  const customScholarships = appData.customScholarships || [];
  const verifiedList = useMemo(
    () => sortScholarshipNames([...DATABASE_SCHOLARSHIP_NAMES, ...manualVerifiedList]),
    [manualVerifiedList],
  );

  const allScholarshipNames = useMemo(
    () => sortScholarshipNames([...verifiedList, ...customScholarships, ...results.map((result) => result.scholarship)]),
    [verifiedList, customScholarships, results],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateAppData() {
      try {
        const { appData: nextData, activeMode, syncError: nextSyncError, admin } = await appDataStore.hydrateAppData();
        if (!cancelled) {
          setAppData(nextData);
          setActiveDataMode(activeMode);
          setSyncError(nextSyncError);
          setAdminUser(admin);
        }
      } catch (error) {
        if (!cancelled) {
          setSyncError(error instanceof Error ? error.message : "Failed to load data.");
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    }

    hydrateAppData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (DATA_BACKEND_MODE !== "supabase") {
      return undefined;
    }

    return appDataStore.subscribeToAppData(
      { admin: isAdmin },
      (nextData) => {
        setAppData(nextData);
        setActiveDataMode("supabase");
        setSyncError("");
      },
      (error) => {
        setSyncError(error instanceof Error ? error.message : "Realtime sync failed.");
      },
    );
  }, [isAdmin]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handlePopstate = () => {
      const nextRoute = parseAppRoute(window.location.pathname);
      setView(nextRoute.view);
      setRouteScholarshipSlug(nextRoute.scholarshipSlug);
      setRouteBlogSlug(nextRoute.blogSlug);
      setRouteForumSlug(nextRoute.forumSlug);
      if (nextRoute.view !== "scholarship") {
        setSelectedScholarship(null);
      }
    };

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, []);

  useEffect(() => {
    if (view !== "scholarship") {
      setSelectedScholarship(null);
      return;
    }

    const resolvedName =
      findScholarshipNameBySlug(routeScholarshipSlug, allScholarshipNames) ||
      getScholarshipRecordBySlug(routeScholarshipSlug)?.name ||
      null;

    setSelectedScholarship(resolvedName);
  }, [view, routeScholarshipSlug, allScholarshipNames]);

  useEffect(() => {
    if (!canAccessAdminEntry && (view === "login" || view === "admin")) {
      applyRoute("feed");
    }
  }, [canAccessAdminEntry, view]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (view === "scholarship" && selectedScholarship) {
      document.title = `Awaited — ${selectedScholarship}`;
      return;
    }

    if (view === "submit") {
      document.title = "Awaited — Submit Scholarship Result";
      return;
    }

    if (view === "blog") {
      document.title = "Awaited — Blog";
      return;
    }

    if (view === "blogPost") {
      const post = blogPosts.find((item) => item.slug === routeBlogSlug);
      document.title = post ? `Awaited — ${post.title}` : "Awaited — Blog";
      return;
    }

    if (view === "forum") {
      document.title = "Awaited — Forum";
      return;
    }

    if (view === "forumThread") {
      const thread = forumThreads.find((item) => item.slug === routeForumSlug);
      document.title = thread ? `Awaited — ${thread.title}` : "Awaited — Forum";
      return;
    }

    if (view === "admin" || view === "login") {
      document.title = "Awaited — Admin";
      return;
    }

    if (TRUST_PAGES[view]) {
      document.title = `Awaited — ${TRUST_PAGES[view].title}`;
      return;
    }

    document.title = "Awaited — Scholarship Results Tracker";
  }, [view, selectedScholarship, blogPosts, routeBlogSlug, forumThreads, routeForumSlug]);

  const showFlash = (message) => {
    setFlashMessage(message);
    if (flashTimerRef.current) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => setFlashMessage(""), 3200);
  };

  const unlockAdminEntry = () => {
    setStoredAdminEntryAccess(true);
    setAdminEntryUnlocked(true);
    showFlash("Admin entry enabled on this browser.");
    applyRoute("login");
  };

  const handleBetaTap = (event) => {
    event.stopPropagation();

    if (isAdmin || adminEntryUnlocked) {
      return;
    }

    const now = Date.now();
    const thresholdMs = 3500;
    const nextCount = now - hiddenAdminTapRef.current.lastTap <= thresholdMs
      ? hiddenAdminTapRef.current.count + 1
      : 1;

    hiddenAdminTapRef.current = {
      count: nextCount,
      lastTap: now,
    };

    if (nextCount >= 5) {
      hiddenAdminTapRef.current = { count: 0, lastTap: 0 };
      unlockAdminEntry();
    }
  };

  const applyRoute = (nextView, { scholarshipName = null, blogSlug = null, forumSlug = null } = {}) => {
    let pathname = "/";
    let nextSlug = null;
    let nextBlogSlug = null;
    let nextForumSlug = null;

    if (nextView === "submit") {
      pathname = "/submit";
    } else if (nextView === "blog") {
      pathname = "/blog";
    } else if (nextView === "blogPost" && blogSlug) {
      nextBlogSlug = blogSlug;
      pathname = `/blog/${encodeURIComponent(nextBlogSlug)}`;
    } else if (nextView === "forum") {
      pathname = "/forum";
    } else if (nextView === "forumThread" && forumSlug) {
      nextForumSlug = forumSlug;
      pathname = `/forum/${encodeURIComponent(nextForumSlug)}`;
    } else if (nextView === "privacy") {
      pathname = "/privacy";
    } else if (nextView === "community") {
      pathname = "/community";
    } else if (nextView === "disclaimer") {
      pathname = "/disclaimer";
    } else if (nextView === "login") {
      pathname = "/admin/login";
    } else if (nextView === "admin") {
      pathname = "/admin";
    } else if (nextView === "scholarship" && scholarshipName) {
      nextSlug = scholarshipToSlug(scholarshipName);
      pathname = `/scholarships/${encodeURIComponent(nextSlug)}`;
    }

    setView(nextView);
    setRouteScholarshipSlug(nextSlug);
    setRouteBlogSlug(nextBlogSlug);
    setRouteForumSlug(nextForumSlug);
    if (nextView === "scholarship") {
      setSelectedScholarship(scholarshipName);
    } else {
      setSelectedScholarship(null);
    }

    pushAppRoute(pathname);
  };

  const isVerifiedScholarship = (name) =>
    isDatabaseScholarship(name) || Boolean(findMatchingScholarshipName(name, manualVerifiedList));

  const applyStoreMutation = async (operation, { onSuccess } = {}) => {
    try {
      const result = await operation();
      const nextData = result?.appData ?? result;
      const meta = result?.meta ?? {};

      if (nextData) {
        setAppData(nextData);
      }

      setSyncError("");
      onSuccess?.(nextData, meta);
      return result;
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Failed to save changes.");
      return null;
    }
  };

  const visibleResults = useMemo(
    () => results.filter((result) => isAdmin || (!result.hidden && result.reviewState === "approved")),
    [results, isAdmin],
  );

  const countries = useMemo(() => [...new Set(visibleResults.map((result) => result.country))].sort(), [visibleResults]);
  const scholarships = useMemo(() => [...new Set(visibleResults.map((result) => result.scholarship))].sort(), [visibleResults]);

  const filtered = useMemo(() => {
    return visibleResults
      .filter((result) => {
        const query = searchQuery.toLowerCase();
        const matchSearch =
          !query ||
          result.scholarship.toLowerCase().includes(query) ||
          result.country.toLowerCase().includes(query) ||
          result.field.toLowerCase().includes(query);
        const matchStatus = filterStatus === "All" || result.status === filterStatus;
        const matchLevel = filterLevel === "All" || result.level === filterLevel;
        const matchCountry = filterCountry === "All" || result.country === filterCountry;
        return matchSearch && matchStatus && matchLevel && matchCountry;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [visibleResults, searchQuery, filterStatus, filterLevel, filterCountry]);

  const approvedVisibleResults = useMemo(
    () => results.filter((result) => result.reviewState === "approved" && !result.hidden),
    [results],
  );

  const stats = useMemo(() => {
    const nextStats = { total: approvedVisibleResults.length };
    STATUSES.forEach((status) => {
      nextStats[status] = approvedVisibleResults.filter((result) => result.status === status).length;
    });
    return nextStats;
  }, [approvedVisibleResults]);

  const analytics = useMemo(() => {
    const byMonth = {};
    approvedVisibleResults.forEach((result) => {
      const month = result.date.slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    const byScholarship = {};
    approvedVisibleResults.forEach((result) => {
      byScholarship[result.scholarship] = (byScholarship[result.scholarship] || 0) + 1;
    });

    const byCountry = {};
    approvedVisibleResults.forEach((result) => {
      byCountry[result.country] = (byCountry[result.country] || 0) + 1;
    });

    const byLevel = {};
    LEVELS.forEach((level) => {
      byLevel[level] = approvedVisibleResults.filter((result) => result.level === level).length;
    });

    const byStatus = {};
    STATUSES.forEach((status) => {
      byStatus[status] = approvedVisibleResults.filter((result) => result.status === status).length;
    });

    return {
      byMonth,
      topScholarships: Object.entries(byScholarship).sort((a, b) => b[1] - a[1]).slice(0, 8),
      topCountries: Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 6),
      byLevel,
      byStatus,
      hiddenCount: results.filter((result) => result.hidden).length,
      pendingCount: results.filter((result) => result.reviewState === "pending").length,
      totalComments: approvedVisibleResults.reduce((sum, result) => sum + result.comments.filter((comment) => comment.reviewState === "approved").length, 0),
      totalVisible: approvedVisibleResults.length,
    };
  }, [approvedVisibleResults, results]);

  const scholarshipData = useMemo(() => {
    if (!selectedScholarship) {
      return null;
    }

    const entries = (isAdmin ? results : visibleResults).filter((result) => result.scholarship === selectedScholarship);
    const statusCounts = {};
    STATUSES.forEach((status) => {
      statusCounts[status] = entries.filter((entry) => entry.status === status && entry.reviewState === "approved" && !entry.hidden).length;
    });

    return {
      entries,
      statusCounts,
      name: selectedScholarship,
      record: getScholarshipRecord(selectedScholarship),
    };
  }, [isAdmin, results, selectedScholarship, visibleResults]);

  const visibleBlogPosts = useMemo(
    () => blogPosts.filter((post) => isAdmin || post.published),
    [blogPosts, isAdmin],
  );

  const selectedBlogPost = useMemo(
    () => visibleBlogPosts.find((post) => post.slug === routeBlogSlug) || null,
    [visibleBlogPosts, routeBlogSlug],
  );

  const visibleForumThreads = useMemo(
    () => forumThreads.filter((thread) => isAdmin || thread.reviewState === "approved"),
    [forumThreads, isAdmin],
  );

  const selectedForumThread = useMemo(
    () => visibleForumThreads.find((thread) => thread.slug === routeForumSlug) || null,
    [visibleForumThreads, routeForumSlug],
  );

  const pendingResults = useMemo(
    () => results.filter((result) => result.reviewState === "pending"),
    [results],
  );

  const pendingComments = useMemo(() => {
    return results
      .flatMap((result) =>
        result.comments.map((comment) => ({
          ...comment,
          scholarship: result.scholarship,
          resultId: result.id,
        })),
      )
      .filter((comment) => comment.reviewState === "pending");
  }, [results]);

  const pendingForumThreads = useMemo(
    () => forumThreads.filter((thread) => thread.reviewState === "pending"),
    [forumThreads],
  );

  const pendingForumReplies = useMemo(() => {
    return forumThreads
      .flatMap((thread) =>
        thread.replies.map((reply) => ({
          ...reply,
          threadId: thread.id,
          threadTitle: thread.title,
          threadLocked: thread.locked,
        })),
      )
      .filter((reply) => reply.reviewState === "pending");
  }, [forumThreads]);

  const handleSubmit = async (entry, moderation) => {
    await applyStoreMutation(
      () => appDataStore.submitResult(entry, moderation, { admin: isAdmin }),
      {
        onSuccess: (_, meta) => {
          applyRoute("feed");
          showFlash(
            meta.reviewState === "pending"
              ? "Result received and sent to moderation."
              : "Result submitted anonymously.",
          );
        },
      },
    );
  };

  const handleAddComment = async (resultId, text, moderation) => {
    if (!text.trim()) {
      return null;
    }

    return applyStoreMutation(
      () => appDataStore.addComment(resultId, text.trim(), moderation, { admin: isAdmin }),
      {
        onSuccess: (_, meta) => {
          setNewComments((current) => ({ ...current, [resultId]: "" }));
          showFlash(
            meta.reviewState === "pending"
              ? "Comment received and queued for moderation."
              : "Comment posted anonymously.",
          );
        },
      },
    );
  };

  const handleCreateForumThread = async (entry, moderation) => {
    const result = await applyStoreMutation(
      () => appDataStore.createForumThread(entry, moderation, { admin: isAdmin }),
      {
        onSuccess: (_, meta) => {
          if (meta.reviewState === "pending") {
            showFlash("Forum thread received and queued for moderation.");
            applyRoute("forum");
            return;
          }

          showFlash("Forum thread posted.");
          if (meta.slug) {
            applyRoute("forumThread", { forumSlug: meta.slug });
          } else {
            applyRoute("forum");
          }
        },
      },
    );

    return Boolean(result);
  };

  const handleAddForumReply = async (threadId, text, moderation) => {
    if (!text.trim()) {
      return false;
    }

    const result = await applyStoreMutation(
      () => appDataStore.addForumReply(threadId, text.trim(), moderation, { admin: isAdmin }),
      {
        onSuccess: (_, meta) => {
          showFlash(
            meta.reviewState === "pending"
              ? "Reply received and queued for moderation."
              : "Reply posted.",
          );
        },
      },
    );

    return Boolean(result);
  };

  const handleAdminLogin = async () => {
    try {
      const result = await appDataStore.signInAdmin({
        email: adminEmail.trim(),
        password: adminPw,
      });
      setAdminUser(result.admin);
      setAppData(result.appData);
      setAdminPw("");
      setAdminAuthError("");
      applyRoute("admin");
    } catch (error) {
      setAdminAuthError(error instanceof Error ? error.message : "Admin login failed.");
    }
  };

  const handleAdminLogout = async () => {
    try {
      const result = await appDataStore.signOutAdmin();
      setAdminUser(null);
      setAppData(result.appData);
      setAdminAuthError("");
      applyRoute("feed");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Failed to sign out.");
    }
  };

  const addManualVerifiedScholarship = async (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const canonicalName = getCanonicalScholarshipName(trimmedName);
    const matchedName =
      findMatchingScholarshipName(canonicalName, [...manualVerifiedList, ...customScholarships]) ||
      findMatchingScholarshipName(trimmedName, [...manualVerifiedList, ...customScholarships]) ||
      canonicalName;

    if (!matchedName || isDatabaseScholarship(matchedName)) {
      setNewVerified("");
      return;
    }

    await applyStoreMutation(() => appDataStore.addVerifiedScholarship(matchedName), {
      onSuccess: () => setNewVerified(""),
    });
  };

  const handleSaveBlogPost = async (entry) => {
    const result = await applyStoreMutation(
      () => appDataStore.saveBlogPost(entry),
      {
        onSuccess: (nextData) => {
          const updatedPosts = nextData?.blogPosts || [];
          const latestPost = updatedPosts.find((post) => post.title === entry.title) || updatedPosts[0];
          showFlash(entry.id ? "Blog post updated." : "Blog post saved.");
          if (latestPost?.slug) {
            applyRoute("blogPost", { blogSlug: latestPost.slug });
          }
        },
      },
    );

    return Boolean(result);
  };

  const handleDeleteBlogPost = async (postId) => {
    await applyStoreMutation(() => appDataStore.deleteBlogPost(postId), {
      onSuccess: () => showFlash("Blog post deleted."),
    });
  };

  const requestedView = view === "admin" && !isAdmin ? "login" : view;
  const resolvedView =
    !canAccessAdminEntry && (requestedView === "login" || requestedView === "admin")
      ? "feed"
      : requestedView;
  const trustPage = TRUST_PAGES[resolvedView] || null;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)", color: "#E2E8F0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />

      {flashMessage && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "#059669", color: "white", padding: "12px 28px", borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px rgba(5,150,105,0.4)", animation: "slideDown 0.3s ease" }}>
          {flashMessage}
        </div>
      )}

      <header style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, cursor: "pointer" }} onClick={() => applyRoute("feed")}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, #38BDF8, #818CF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Awaited</span>
          <span
            onClick={handleBetaTap}
            style={{ fontSize: 11, color: "#64748B", fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase" }}
          >
            Beta
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <NavBtn active={resolvedView === "feed"} onClick={() => applyRoute("feed")}>Browse</NavBtn>
          <NavBtn active={resolvedView === "blog" || resolvedView === "blogPost"} onClick={() => applyRoute("blog")}>Blog</NavBtn>
          <NavBtn active={resolvedView === "forum" || resolvedView === "forumThread"} onClick={() => applyRoute("forum")}>Forum</NavBtn>
          <NavBtn active={resolvedView === "submit"} onClick={() => applyRoute("submit")} accent>+ Submit</NavBtn>
          {isAdmin ? (
            <>
              <NavBtn active={resolvedView === "admin"} onClick={() => applyRoute("admin")} admin>⚙ Admin</NavBtn>
              <button onClick={handleAdminLogout} style={{ background: "none", border: "none", color: "#64748B", fontSize: 11, cursor: "pointer", padding: "4px 8px" }}>Logout</button>
            </>
          ) : canAccessAdminEntry ? (
            <button onClick={() => applyRoute("login")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, color: "#475569", fontSize: 11, cursor: "pointer", padding: "6px 12px" }}>Admin</button>
          ) : null}
        </div>
      </header>

      {isAdmin && resolvedView !== "admin" && (
        <div style={{ background: "rgba(99,102,241,0.1)", borderBottom: "1px solid rgba(99,102,241,0.2)", padding: "8px 28px", fontSize: 12, color: "#A5B4FC", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366F1" }} />
          Admin session active as {adminUser?.email}. Pending and hidden content is visible in review mode.
        </div>
      )}

      {activeDataMode === "supabase" && (
        <div style={{ background: "rgba(5,150,105,0.08)", borderBottom: "1px solid rgba(5,150,105,0.18)", padding: "8px 28px", fontSize: 12, color: "#6EE7B7", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
          Shared backend active — submissions, moderation, and live updates sync across users through Supabase.
        </div>
      )}

      {activeDataMode === "browser-local" && DATA_BACKEND_MODE === "supabase" && (
        <div style={{ background: "rgba(217,119,6,0.08)", borderBottom: "1px solid rgba(217,119,6,0.16)", padding: "8px 28px", fontSize: 12, color: "#FBBF24", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
          Supabase is configured, but this session is currently using browser-local fallback because the backend could not be reached.
        </div>
      )}

      {activeDataMode === "browser-local" && DATA_BACKEND_MODE === "browser-local" && (
        <div style={{ background: "rgba(217,119,6,0.08)", borderBottom: "1px solid rgba(217,119,6,0.16)", padding: "8px 28px", fontSize: 12, color: "#FBBF24", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
          Browser-local fallback active — local testing only. Secure auth, moderation queue, and shared routing need Supabase mode.
        </div>
      )}

      {isHydrating && (
        <div style={{ background: "rgba(56,189,248,0.08)", borderBottom: "1px solid rgba(56,189,248,0.16)", padding: "8px 28px", fontSize: 12, color: "#7DD3FC" }}>
          Loading shared scholarship data…
        </div>
      )}

      {syncError && (
        <div style={{ background: "rgba(220,38,38,0.08)", borderBottom: "1px solid rgba(220,38,38,0.16)", padding: "8px 28px", fontSize: 12, color: "#FCA5A5" }}>
          {syncError}
        </div>
      )}

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 64px" }}>
        {(resolvedView === "login") && (
          <div style={{ maxWidth: 420, margin: "60px auto" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Admin Sign In</h2>
              <p style={{ color: "#64748B", fontSize: 13, marginBottom: 24 }}>
                Use the Awaited admin account. Production now requires a real Supabase user session, not a shared browser password.
              </p>
              <input
                type="email"
                value={adminEmail}
                onChange={(event) => {
                  setAdminEmail(event.target.value);
                  setAdminAuthError("");
                }}
                placeholder="Admin email"
                style={{ ...inputStyle, textAlign: "center", marginBottom: 12 }}
              />
              <input
                type="password"
                value={adminPw}
                onChange={(event) => {
                  setAdminPw(event.target.value);
                  setAdminAuthError("");
                }}
                onKeyDown={(event) => event.key === "Enter" && handleAdminLogin()}
                placeholder="Password"
                style={{ ...inputStyle, textAlign: "center", marginBottom: 12 }}
              />
              {adminAuthError && <div style={{ color: "#FCA5A5", fontSize: 12, marginBottom: 12 }}>{adminAuthError}</div>}
              <button onClick={handleAdminLogin} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366F1, #818CF8)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Enter Admin</button>
              <button onClick={() => applyRoute("feed")} style={{ background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", marginTop: 12 }}>Cancel</button>
            </div>
          </div>
        )}

        {resolvedView === "admin" && isAdmin && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <button onClick={() => applyRoute("feed")} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", padding: 0 }}>← Back</button>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: 0 }}>Admin Panel</h2>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
              {[["moderation", "🛡 Moderation"], ["analytics", "📊 Analytics"], ["scholarships", "🎓 Scholarships"], ["blog", "📝 Blog"]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setAdminTab(key)}
                  style={{
                    flex: "1 1 180px",
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: adminTab === key ? "rgba(99,102,241,0.15)" : "transparent",
                    color: adminTab === key ? "#A5B4FC" : "#64748B",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {adminTab === "moderation" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <AnalyticsCard label="Pending Results" value={pendingResults.length} color="#F59E0B" />
                  <AnalyticsCard label="Pending Comments" value={pendingComments.length} color="#F59E0B" />
                  <AnalyticsCard label="Pending Threads" value={pendingForumThreads.length} color="#F59E0B" />
                  <AnalyticsCard label="Pending Replies" value={pendingForumReplies.length} color="#F59E0B" />
                  <AnalyticsCard label="Rejected Results" value={results.filter((result) => result.reviewState === "rejected").length} color="#EF4444" />
                  <AnalyticsCard label="Hidden Results" value={results.filter((result) => result.hidden).length} color="#DC2626" />
                </div>

                {pendingResults.length > 0 && (
                  <div style={panelStyle}>
                    <h3 style={panelTitle}>Queue: Pending Results</h3>
                    <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
                      New reports can be auto-queued when they use an unknown scholarship name, trip throttles, or look suspicious.
                    </p>
                    {pendingResults.map((result) => (
                      <ModerationResultRow
                        key={`pending-result-${result.id}`}
                        result={result}
                        verified={isVerifiedScholarship(result.scholarship)}
                        onApprove={() => applyStoreMutation(() => appDataStore.setResultReviewState(result.id, "approved"))}
                        onReject={() => applyStoreMutation(() => appDataStore.setResultReviewState(result.id, "rejected", "Rejected during moderation"))}
                        onDelete={() => applyStoreMutation(() => appDataStore.deleteResult(result.id))}
                        onVerifyName={() => addManualVerifiedScholarship(result.scholarship)}
                      />
                    ))}
                  </div>
                )}

                {pendingComments.length > 0 && (
                  <div style={panelStyle}>
                    <h3 style={panelTitle}>Queue: Pending Comments</h3>
                    {pendingComments.map((comment) => (
                      <div key={`pending-comment-${comment.id}`} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", marginBottom: 4 }}>{comment.scholarship}</div>
                            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>Commented on {comment.time}</div>
                            <div style={{ fontSize: 13, color: "#CBD5E1", marginBottom: 6 }}>{comment.text}</div>
                            {comment.moderationReason && <ModerationChip reviewState="pending" reason={comment.moderationReason} />}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.setCommentReviewState(comment.id, "approved"))} color="#059669">Approve</AdminBtn>
                            <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.setCommentReviewState(comment.id, "rejected", "Rejected during moderation"))} color="#D97706">Reject</AdminBtn>
                            <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.deleteComment(comment.id))} color="#DC2626">Delete</AdminBtn>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pendingForumThreads.length > 0 && (
                  <div style={panelStyle}>
                    <h3 style={panelTitle}>Queue: Pending Forum Threads</h3>
                    {pendingForumThreads.map((thread) => (
                      <div key={`pending-thread-${thread.id}`} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", marginBottom: 4 }}>{thread.title}</div>
                            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>{new Date(thread.createdAt).toLocaleString()}</div>
                            <div style={{ fontSize: 13, color: "#CBD5E1", marginBottom: 6, whiteSpace: "pre-wrap" }}>{thread.body}</div>
                            {thread.moderationReason && <ModerationChip reviewState="pending" reason={thread.moderationReason} />}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.setForumThreadReviewState(thread.id, "approved"))} color="#059669">Approve</AdminBtn>
                            <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.setForumThreadReviewState(thread.id, "rejected", "Rejected during moderation"))} color="#D97706">Reject</AdminBtn>
                            <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.deleteForumThread(thread.id))} color="#DC2626">Delete</AdminBtn>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pendingForumReplies.length > 0 && (
                  <div style={panelStyle}>
                    <h3 style={panelTitle}>Queue: Pending Forum Replies</h3>
                    {pendingForumReplies.map((reply) => (
                      <div key={`pending-forum-reply-${reply.id}`} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", marginBottom: 4 }}>{reply.threadTitle}</div>
                            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>{new Date(reply.createdAt).toLocaleString()}</div>
                            <div style={{ fontSize: 13, color: "#CBD5E1", marginBottom: 6, whiteSpace: "pre-wrap" }}>{reply.body}</div>
                            {reply.moderationReason && <ModerationChip reviewState="pending" reason={reply.moderationReason} />}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.setForumReplyReviewState(reply.id, "approved"))} color="#059669">Approve</AdminBtn>
                            <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.setForumReplyReviewState(reply.id, "rejected", "Rejected during moderation"))} color="#D97706">Reject</AdminBtn>
                            <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.deleteForumReply(reply.id))} color="#DC2626">Delete</AdminBtn>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={panelStyle}>
                  <h3 style={panelTitle}>All Submitted Results</h3>
                  <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
                    {results.length} total results across approved, pending, rejected, and hidden states
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[...results].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((result) => (
                      <div
                        key={result.id}
                        style={{
                          background: result.hidden ? "rgba(220,38,38,0.05)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${result.hidden ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.06)"}`,
                          borderRadius: 12,
                          padding: "14px 18px",
                          opacity: result.hidden ? 0.65 : 1,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, fontSize: 14, textDecoration: result.hidden ? "line-through" : "none" }}>{result.scholarship}</span>
                              <StatusBadge status={result.status} />
                              <ModerationChip reviewState={result.reviewState} reason={result.moderationReason} />
                              {!isVerifiedScholarship(result.scholarship) && <span style={{ fontSize: 10, color: "#D97706", fontWeight: 500 }}>⚠ Unverified name</span>}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748B" }}>{result.country} · {result.level} · {result.field} {result.nationality ? `· ${result.nationality}` : ""} · {result.date}</div>
                            {result.note && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 6, lineHeight: 1.5 }}>{result.note}</div>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {result.reviewState !== "approved" && (
                              <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.setResultReviewState(result.id, "approved"))} color="#059669">Approve</AdminBtn>
                            )}
                            {result.reviewState !== "rejected" && (
                              <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.setResultReviewState(result.id, "rejected", "Rejected during moderation"))} color="#D97706">Reject</AdminBtn>
                            )}
                            <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.setResultHidden(result.id, !result.hidden))} color={result.hidden ? "#059669" : "#EF4444"}>{result.hidden ? "Unhide" : "Hide"}</AdminBtn>
                            <AdminBtn onClick={() => applyStoreMutation(() => appDataStore.deleteResult(result.id))} color="#DC2626">Delete</AdminBtn>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {adminTab === "analytics" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <AnalyticsCard label="Visible Results" value={analytics.totalVisible} color="#38BDF8" />
                  <AnalyticsCard label="Pending Queue" value={analytics.pendingCount} color="#F59E0B" />
                  <AnalyticsCard label="Hidden / Spam" value={analytics.hiddenCount} color="#DC2626" />
                  <AnalyticsCard label="Total Comments" value={analytics.totalComments} color="#818CF8" />
                </div>

                <div style={panelStyle}>
                  <h3 style={panelTitle}>Status Distribution</h3>
                  <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 12, background: "rgba(255,255,255,0.05)" }}>
                    {STATUSES.map((status) => analytics.byStatus[status] > 0 ? (
                      <div key={status} style={{ width: `${(analytics.byStatus[status] / Math.max(analytics.totalVisible, 1)) * 100}%`, background: STATUS_CONFIG[status].color }} />
                    ) : null)}
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {STATUSES.map((status) => (
                      <div key={status} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_CONFIG[status].color }} />
                        <span style={{ color: "#94A3B8" }}>{status}</span>
                        <span style={{ color: "#E2E8F0", fontWeight: 700 }}>{analytics.byStatus[status]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={panelStyle}>
                  <h3 style={panelTitle}>Top Scholarships by Reports</h3>
                  {analytics.topScholarships.map(([name, count]) => {
                    const maxCount = analytics.topScholarships[0]?.[1] || 1;
                    return (
                      <div key={name} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: "#E2E8F0", fontWeight: 500 }}>{name}</span>
                          <span style={{ color: "#64748B" }}>{count}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(count / maxCount) * 100}%`, background: "linear-gradient(90deg, #6366F1, #818CF8)", borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {adminTab === "scholarships" && (
              <div>
                <div style={{ ...panelStyle, marginBottom: 16 }}>
                  <h3 style={panelTitle}>Scholarship Catalog</h3>
                  <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
                    Database-backed scholarships are seeded into the backend and stay canonical. Community-added names remain possible, but they can now be verified manually or left queued in moderation.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <input type="text" value={newVerified} onChange={(event) => setNewVerified(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addManualVerifiedScholarship(newVerified)} placeholder="Manually verify a community-added scholarship..." style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => addManualVerifiedScholarship(newVerified)} disabled={!newVerified.trim()} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: newVerified.trim() ? "linear-gradient(135deg, #6366F1, #818CF8)" : "rgba(255,255,255,0.05)", color: newVerified.trim() ? "#fff" : "#475569", fontSize: 13, fontWeight: 600, cursor: newVerified.trim() ? "pointer" : "default" }}>Add</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: "#38BDF8" }}>{DATABASE_SCHOLARSHIP_NAMES.length} database scholarships</span>
                    <span style={{ fontSize: 12, color: "#A78BFA" }}>{manualVerifiedList.length} manual verified names</span>
                    <span style={{ fontSize: 12, color: "#F59E0B" }}>{customScholarships.length} community-added names</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {verifiedList.map((name) => {
                      const count = approvedVisibleResults.filter((result) => result.scholarship === name).length;
                      const databaseBacked = isDatabaseScholarship(name);
                      return (
                        <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#059669", fontSize: 12 }}>✓</span>
                            <span style={{ fontSize: 13, color: "#E2E8F0" }}>{name}</span>
                            <span style={{ fontSize: 10, color: databaseBacked ? "#38BDF8" : "#A78BFA", textTransform: "uppercase", letterSpacing: 0.8 }}>
                              {databaseBacked ? "Database" : "Manual"}
                            </span>
                            <span style={{ fontSize: 11, color: "#475569" }}>({count} reports)</span>
                          </div>
                          {!databaseBacked && (
                            <button onClick={() => applyStoreMutation(() => appDataStore.removeVerifiedScholarship(name))} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 11, cursor: "pointer", opacity: 0.5, padding: "4px 8px" }}>Remove</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {adminTab === "blog" && (
              <AdminBlogPanel
                posts={blogPosts}
                onSavePost={handleSaveBlogPost}
                onDeletePost={handleDeleteBlogPost}
                onOpenPost={(slug) => applyRoute("blogPost", { blogSlug: slug })}
              />
            )}
          </div>
        )}

        {resolvedView === "feed" && (
          <>
            <TrustNotice onNavigate={applyRoute} />

            <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
              <StatChip label="Total Reports" value={stats.total} color="#94A3B8" />
              {STATUSES.map((status) => (
                <StatChip key={status} label={status} value={stats[status]} color={STATUS_CONFIG[status].color} onClick={() => setFilterStatus(filterStatus === status ? "All" : status)} active={filterStatus === status} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <input type="text" placeholder="Search scholarships, countries, fields..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} style={{ flex: 1, minWidth: 220, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#E2E8F0", fontSize: 14, outline: "none" }} />
              <FilterSelect value={filterLevel} onChange={(event) => setFilterLevel(event.target.value)} options={["All", ...LEVELS]} label="Level" />
              <FilterSelect value={filterCountry} onChange={(event) => setFilterCountry(event.target.value)} options={["All", ...countries]} label="Country" />
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {scholarships.map((name) => {
                const count = visibleResults.filter((result) => result.scholarship === name).length;
                if (count === 0 && !isAdmin) {
                  return null;
                }

                return (
                  <button key={name} onClick={() => applyRoute("scholarship", { scholarshipName: name })} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#94A3B8", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    {isVerifiedScholarship(name) && <span style={{ color: "#059669", fontSize: 10 }}>✓</span>}
                    {name} ({count})
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              visibleResults.length === 0 ? (
                <EmptyFeedState onSubmit={() => applyRoute("submit")} />
              ) : (
                <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>∅</div>
                  <div style={{ fontSize: 15 }}>No results match your filters</div>
                </div>
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map((result) => (
                  <ResultCard
                    key={result.id}
                    result={result}
                    expanded={expandedCard === result.id}
                    onToggle={() => setExpandedCard(expandedCard === result.id ? null : result.id)}
                    onScholarshipClick={(name) => applyRoute("scholarship", { scholarshipName: name })}
                    commentText={newComments[result.id] || ""}
                    onCommentChange={(value) => setNewComments((current) => ({ ...current, [result.id]: value }))}
                    onCommentSubmit={(text, moderation) => handleAddComment(result.id, text, moderation)}
                    isAdmin={isAdmin}
                    onApprove={() => applyStoreMutation(() => appDataStore.setResultReviewState(result.id, "approved"))}
                    onReject={() => applyStoreMutation(() => appDataStore.setResultReviewState(result.id, "rejected", "Rejected during moderation"))}
                    onToggleHide={() => applyStoreMutation(() => appDataStore.setResultHidden(result.id, !result.hidden))}
                    onDelete={() => applyStoreMutation(() => appDataStore.deleteResult(result.id))}
                    verified={isVerifiedScholarship(result.scholarship)}
                  />
                ))}
              </div>
            )}
            <div style={{ textAlign: "center", marginTop: 32, color: "#475569", fontSize: 13 }}>Showing {filtered.length} of {visibleResults.length} results</div>
          </>
        )}

        {resolvedView === "blog" && (
          <BlogIndex
            posts={visibleBlogPosts}
            onOpenPost={(slug) => applyRoute("blogPost", { blogSlug: slug })}
          />
        )}

        {resolvedView === "blogPost" && selectedBlogPost && (
          <BlogPostView
            post={selectedBlogPost}
            onBack={() => applyRoute("blog")}
          />
        )}

        {resolvedView === "blogPost" && !selectedBlogPost && (
          <div style={{ ...panelStyle, textAlign: "center", padding: 40 }}>
            <h3 style={{ ...panelTitle, marginBottom: 8 }}>Blog Post Not Found</h3>
            <p style={{ color: "#64748B", fontSize: 13, marginBottom: 12 }}>
              That post either does not exist or is not published for the public site.
            </p>
            <button onClick={() => applyRoute("blog")} style={{ ...primaryButtonStyle, width: "auto", padding: "10px 18px" }}>Back to blog</button>
          </div>
        )}

        {resolvedView === "forum" && (
          <ForumIndex
            threads={visibleForumThreads}
            isAdmin={isAdmin}
            onOpenThread={(slug) => applyRoute("forumThread", { forumSlug: slug })}
            onCreateThread={handleCreateForumThread}
          />
        )}

        {resolvedView === "forumThread" && selectedForumThread && (
          <ForumThreadView
            thread={selectedForumThread}
            isAdmin={isAdmin}
            onBack={() => applyRoute("forum")}
            onReplySubmit={handleAddForumReply}
          />
        )}

        {resolvedView === "forumThread" && !selectedForumThread && (
          <div style={{ ...panelStyle, textAlign: "center", padding: 40 }}>
            <h3 style={{ ...panelTitle, marginBottom: 8 }}>Discussion Not Found</h3>
            <p style={{ color: "#64748B", fontSize: 13, marginBottom: 12 }}>
              That thread either does not exist or is still waiting for moderation.
            </p>
            <button onClick={() => applyRoute("forum")} style={{ ...primaryButtonStyle, width: "auto", padding: "10px 18px" }}>Back to forum</button>
          </div>
        )}

        {resolvedView === "submit" && (
          <SubmitForm
            onSubmit={handleSubmit}
            onCancel={() => applyRoute("feed")}
            onNavigate={applyRoute}
            verifiedScholarships={verifiedList}
            customScholarships={customScholarships}
          />
        )}

        {trustPage && (
          <PolicyPage
            title={trustPage.title}
            intro={trustPage.intro}
            sections={trustPage.sections}
            onBack={() => applyRoute("feed")}
            onNavigate={applyRoute}
          />
        )}

        {resolvedView === "scholarship" && selectedScholarship && scholarshipData && (
          <ScholarshipView
            data={scholarshipData}
            onBack={() => applyRoute("feed")}
            expandedCard={expandedCard}
            setExpandedCard={setExpandedCard}
            newComments={newComments}
            setNewComments={setNewComments}
            onCommentSubmit={handleAddComment}
            isAdmin={isAdmin}
            onApprove={(id) => applyStoreMutation(() => appDataStore.setResultReviewState(id, "approved"))}
            onReject={(id) => applyStoreMutation(() => appDataStore.setResultReviewState(id, "rejected", "Rejected during moderation"))}
            onToggleHide={(id, hidden) => applyStoreMutation(() => appDataStore.setResultHidden(id, hidden))}
            onDelete={(id) => applyStoreMutation(() => appDataStore.deleteResult(id))}
            verified={isVerifiedScholarship(scholarshipData.name)}
          />
        )}

        {resolvedView === "scholarship" && !selectedScholarship && (
          <div style={{ ...panelStyle, textAlign: "center", padding: 40 }}>
            <h3 style={{ ...panelTitle, marginBottom: 8 }}>Scholarship Not Found</h3>
            <p style={{ color: "#64748B", fontSize: 13, marginBottom: 12 }}>
              The link is valid only if Awaited has seen reports or a verified record for that scholarship name.
            </p>
            <button onClick={() => applyRoute("feed")} style={{ ...primaryButtonStyle, width: "auto", padding: "10px 18px" }}>Back to feed</button>
          </div>
        )}
      </main>

      <SiteFooter onNavigate={applyRoute} />

      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        input::placeholder, textarea::placeholder { color: #475569; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>
    </div>
  );
}

function NavBtn({ children, active, accent, admin, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        border: active ? "1px solid rgba(129,140,248,0.3)" : "1px solid rgba(255,255,255,0.06)",
        background: active
          ? accent
            ? "linear-gradient(135deg, #6366F1, #818CF8)"
            : admin
              ? "rgba(99,102,241,0.16)"
              : "rgba(255,255,255,0.06)"
          : accent
            ? "linear-gradient(135deg, #6366F1, #818CF8)"
            : "rgba(255,255,255,0.03)",
        color: accent || active ? "#fff" : "#CBD5E1",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function StatChip({ label, value, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 12,
        border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.06)",
        background: active ? `${color}18` : "rgba(255,255,255,0.03)",
        color: "#E2E8F0",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 12, color: "#94A3B8" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{value}</span>
    </button>
  );
}

function TrustNotice({ onNavigate, compact = false }) {
  return (
    <div
      style={{
        ...panelStyle,
        marginBottom: compact ? 20 : 24,
        padding: compact ? "16px 18px" : "18px 20px",
        background: "rgba(56,189,248,0.06)",
        border: "1px solid rgba(56,189,248,0.14)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7DD3FC", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            Trust Notice
          </div>
          <div style={{ fontSize: compact ? 14 : 15, fontWeight: 700, color: "#E2E8F0", marginBottom: 6 }}>
            Awaited shows user-submitted scholarship signals, not official scholarship decisions.
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "#94A3B8" }}>
            Treat every report as community intelligence. Verify final decisions through the official scholarship portal, email, or provider website, and never post personal identifiers.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FooterLink onClick={() => onNavigate("privacy")}>Privacy</FooterLink>
          <FooterLink onClick={() => onNavigate("community")}>Rules</FooterLink>
          <FooterLink onClick={() => onNavigate("disclaimer")}>Disclaimer</FooterLink>
        </div>
      </div>
    </div>
  );
}

function EmptyFeedState({ onSubmit }) {
  return (
    <div style={{ ...panelStyle, textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>⌛</div>
      <h3 style={{ ...panelTitle, marginBottom: 8 }}>No public scholarship reports yet</h3>
      <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 18px" }}>
        Awaited is now running with a clean live dataset. The next public report will come from a real community submission, not seeded beta content.
      </p>
      <button onClick={onSubmit} style={{ ...primaryButtonStyle, width: "auto", padding: "12px 22px" }}>
        Submit the first report
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: `${STATUS_CONFIG[status].color}18`, color: STATUS_CONFIG[status].color, fontSize: 11, fontWeight: 700 }}>
      <span>{STATUS_CONFIG[status].icon}</span>
      {status}
    </span>
  );
}

function ModerationChip({ reviewState, reason }) {
  if (!reviewState || reviewState === "approved") {
    return null;
  }

  const config = reviewState === "pending"
    ? { color: "#F59E0B", label: "Pending" }
    : { color: "#EF4444", label: "Rejected" };

  return (
    <span title={reason || config.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: `${config.color}18`, color: config.color, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
      {config.label}
    </span>
  );
}

function FilterSelect({ value, onChange, options, label }) {
  return (
    <select value={value} onChange={onChange} aria-label={label} style={{ ...inputStyle, width: "auto", minWidth: 140 }}>
      {options.map((option) => (
        <option key={option} value={option} style={{ background: "#1E293B" }}>{option}</option>
      ))}
    </select>
  );
}

function AdminBtn({ children, color, onClick, small }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? "6px 10px" : "8px 12px",
        borderRadius: 8,
        border: `1px solid ${color}44`,
        background: `${color}18`,
        color,
        fontSize: small ? 11 : 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function AnalyticsCard({ label, value, color }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function ModerationResultRow({ result, verified, onApprove, onReject, onDelete, onVerifyName }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{result.scholarship}</span>
            <StatusBadge status={result.status} />
            <ModerationChip reviewState={result.reviewState} reason={result.moderationReason} />
            {!verified && <span style={{ fontSize: 10, color: "#D97706" }}>Unknown scholarship</span>}
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>{result.country} · {result.level} · {result.field} · {result.date}</div>
          {result.note && <div style={{ fontSize: 13, color: "#CBD5E1", marginBottom: 6 }}>{result.note}</div>}
          {result.moderationReason && <div style={{ fontSize: 12, color: "#FBBF24" }}>Reason: {result.moderationReason}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <AdminBtn onClick={onApprove} color="#059669">Approve</AdminBtn>
          <AdminBtn onClick={onReject} color="#D97706">Reject</AdminBtn>
          {!verified && <AdminBtn onClick={onVerifyName} color="#6366F1">Verify Name</AdminBtn>}
          <AdminBtn onClick={onDelete} color="#DC2626">Delete</AdminBtn>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  expanded,
  onToggle,
  onScholarshipClick,
  commentText,
  onCommentChange,
  onCommentSubmit,
  isAdmin,
  onApprove,
  onReject,
  onToggleHide,
  onDelete,
  verified,
}) {
  const [honeypot, setHoneypot] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const requiresCaptcha = turnstileSiteKey && !hasStoredHumanTrust();

  const handleSendComment = async () => {
    const resultMeta = await onCommentSubmit(commentText, {
      honeypot,
      captchaToken,
    });

    if (resultMeta) {
      setHoneypot("");
      setCaptchaToken("");
      setCaptchaResetKey((value) => value + 1);
    }
  };

  const visibleComments = isAdmin ? result.comments : result.comments.filter((comment) => comment.reviewState === "approved");

  return (
    <div style={{ background: result.hidden ? "rgba(220,38,38,0.03)" : "rgba(255,255,255,0.03)", border: `1px solid ${result.hidden ? "rgba(220,38,38,0.1)" : "rgba(255,255,255,0.06)"}`, borderRadius: 14, overflow: "hidden", opacity: result.hidden ? 0.55 : 1 }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 16, cursor: "pointer" }} onClick={onToggle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            {verified && <span style={{ color: "#059669", fontSize: 11 }} title="Verified scholarship">✓</span>}
            <span onClick={(event) => { event.stopPropagation(); onScholarshipClick(result.scholarship); }} style={{ fontSize: 15, fontWeight: 600, color: "#E2E8F0", cursor: "pointer", borderBottom: "1px dashed rgba(255,255,255,0.2)", textDecoration: result.hidden ? "line-through" : "none" }}>{result.scholarship}</span>
            <StatusBadge status={result.status} />
            <ModerationChip reviewState={result.reviewState} reason={result.moderationReason} />
            {result.hidden && <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 700 }}>HIDDEN</span>}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748B", flexWrap: "wrap" }}>
            <span>📍 {result.country}</span>
            <span>🎓 {result.level}</span>
            <span>📚 {result.field}</span>
            {result.nationality && <span>🌍 {result.nationality}</span>}
            {result.gpa && <span>📊 GPA: {result.gpa}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "#475569" }}>{result.date}</div>
          {visibleComments.length > 0 && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>💬 {visibleComments.length}</div>}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>
          {result.note && (
            <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6, marginBottom: 16, padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 10, borderLeft: `3px solid ${STATUS_CONFIG[result.status].color}44` }}>
              {result.note}
            </div>
          )}

          {isAdmin && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, padding: "8px 12px", background: "rgba(99,102,241,0.06)", borderRadius: 8, border: "1px solid rgba(99,102,241,0.1)", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#A5B4FC", marginRight: "auto", display: "flex", alignItems: "center" }}>⚙ Admin</span>
              {result.reviewState !== "approved" && <AdminBtn onClick={onApprove} color="#059669">Approve</AdminBtn>}
              {result.reviewState !== "rejected" && <AdminBtn onClick={onReject} color="#D97706">Reject</AdminBtn>}
              <AdminBtn onClick={onToggleHide} color={result.hidden ? "#059669" : "#D97706"}>{result.hidden ? "Unhide" : "Hide"}</AdminBtn>
              <AdminBtn onClick={onDelete} color="#DC2626">Delete</AdminBtn>
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Discussion ({visibleComments.length})</div>
            {visibleComments.map((comment) => (
              <div key={comment.id} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, marginBottom: 6, fontSize: 13, color: "#94A3B8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: "#64748B", fontSize: 11 }}>Anonymous · {comment.time}</span>
                  {isAdmin && <ModerationChip reviewState={comment.reviewState} reason={comment.moderationReason} />}
                </div>
                <div style={{ marginTop: 4 }}>{comment.text}</div>
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              <input type="text" placeholder="Add a comment anonymously..." value={commentText} onChange={(event) => onCommentChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSendComment()} style={{ ...inputStyle, padding: "8px 14px" }} />
              <input type="text" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }} aria-hidden="true" />
              {requiresCaptcha && <TurnstileGate resetKey={captchaResetKey} onVerify={setCaptchaToken} />}
              <button onClick={handleSendComment} style={{ ...primaryButtonStyle, width: "auto", alignSelf: "flex-end", padding: "8px 16px", fontSize: 12 }} disabled={requiresCaptcha ? !captchaToken : !commentText.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitForm({ onSubmit, onCancel, onNavigate, verifiedScholarships, customScholarships }) {
  const [form, setForm] = useState({
    scholarship: "",
    country: "",
    level: "Masters",
    field: "",
    status: "Applied",
    date: new Date().toISOString().split("T")[0],
    nationality: "",
    gpa: "",
    note: "",
  });
  const [suggestions, setSuggestions] = useState([]);
  const [honeypot, setHoneypot] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const requiresCaptcha = turnstileSiteKey && !hasStoredHumanTrust();
  const trimmedScholarship = form.scholarship.trim();
  const exactKnownMatch = findMatchingScholarshipName(trimmedScholarship, [...verifiedScholarships, ...customScholarships]);
  const exactDatabaseMatch = isDatabaseScholarship(trimmedScholarship);

  const set = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "scholarship" && value.length > 0) {
      setSuggestions(buildScholarshipSuggestions(value, { verifiedScholarships, customScholarships }));
    } else if (key === "scholarship") {
      setSuggestions([]);
    }
  };

  const valid = form.scholarship.trim() && form.country.trim() && form.field.trim() && (!requiresCaptcha || captchaToken);

  const handleSubmit = async () => {
    if (!valid) {
      return;
    }

    await onSubmit(form, {
      honeypot,
      captchaToken,
    });
    setCaptchaToken("");
    setCaptchaResetKey((value) => value + 1);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <button onClick={onCancel} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back to results</button>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 32 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#E2E8F0" }}>Submit Your Result</h2>
        <p style={{ color: "#64748B", fontSize: 13, marginBottom: 28 }}>
          Anonymous results now go through throttling and moderation. Known scholarships can publish immediately; risky or unknown reports can land in the review queue first.
        </p>
        <TrustNotice compact onNavigate={onNavigate} />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <FormField label="Scholarship Name *">
            <div style={{ position: "relative" }}>
              <input value={form.scholarship} onChange={set("scholarship")} placeholder="e.g. Chevening, Fulbright, DAAD..." style={inputStyle} />
              {suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, marginTop: 4, overflow: "hidden" }}>
                  {suggestions.map((suggestion) => (
                    <div key={`${suggestion.source}-${suggestion.name}`} onClick={() => { setForm((current) => ({ ...current, scholarship: suggestion.name })); setSuggestions([]); }}
                      style={{ padding: "8px 14px", fontSize: 13, color: "#E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ color: suggestion.source === "community" ? "#F59E0B" : "#059669", fontSize: 11 }}>
                          {suggestion.source === "community" ? "⊕" : "✓"}
                        </span>
                        <span>{suggestion.name}</span>
                      </span>
                      <span style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8 }}>
                        {suggestion.source}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {trimmedScholarship && exactDatabaseMatch && <div style={{ fontSize: 11, color: "#059669", marginTop: 4 }}>✓ Matched to the imported scholarship database</div>}
            {trimmedScholarship && !exactDatabaseMatch && exactKnownMatch && <div style={{ fontSize: 11, color: "#A78BFA", marginTop: 4 }}>✓ Known community/manual scholarship name</div>}
            {trimmedScholarship && !exactKnownMatch && suggestions.length === 0 && <div style={{ fontSize: 11, color: "#D97706", marginTop: 4 }}>Unknown scholarships are still accepted, but they will usually enter the moderation queue first.</div>}
          </FormField>

          <div style={{ display: "flex", gap: 12 }}>
            <FormField label="Country *" style={{ flex: 1 }}>
              <input value={form.country} onChange={set("country")} placeholder="e.g. United Kingdom" style={inputStyle} />
            </FormField>
            <FormField label="Study Level *" style={{ flex: 1 }}>
              <select value={form.level} onChange={set("level")} style={inputStyle}>
                {LEVELS.map((level) => <option key={level} value={level} style={{ background: "#1E293B" }}>{level}</option>)}
              </select>
            </FormField>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <FormField label="Field of Study *" style={{ flex: 1 }}>
              <input value={form.field} onChange={set("field")} placeholder="e.g. Economics, Engineering..." style={inputStyle} />
            </FormField>
            <FormField label="Status *" style={{ flex: 1 }}>
              <select value={form.status} onChange={set("status")} style={inputStyle}>
                {STATUSES.map((status) => <option key={status} value={status} style={{ background: "#1E293B" }}>{status}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Date Notified">
            <input type="date" value={form.date} onChange={set("date")} style={inputStyle} />
          </FormField>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginTop: 4 }}>
            <p style={{ color: "#475569", fontSize: 12, marginBottom: 12 }}>Optional — share only what you want</p>
            <div style={{ display: "flex", gap: 12 }}>
              <FormField label="Nationality" style={{ flex: 1 }}>
                <input value={form.nationality} onChange={set("nationality")} placeholder="Optional" style={inputStyle} />
              </FormField>
              <FormField label="GPA" style={{ flex: 1 }}>
                <input value={form.gpa} onChange={set("gpa")} placeholder="Optional" style={inputStyle} />
              </FormField>
            </div>
          </div>

          <FormField label="Notes / Tips">
            <textarea value={form.note} onChange={set("note")} placeholder="Share your experience, timeline, tips for others..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </FormField>

          <input type="text" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }} aria-hidden="true" />
          {requiresCaptcha && <TurnstileGate resetKey={captchaResetKey} onVerify={setCaptchaToken} />}

          <button onClick={handleSubmit} disabled={!valid} style={primaryButtonStyle}>Submit Anonymously</button>
        </div>
      </div>
    </div>
  );
}

function ScholarshipView({ data, onBack, expandedCard, setExpandedCard, newComments, setNewComments, onCommentSubmit, isAdmin, onApprove, onReject, onToggleHide, onDelete, verified }) {
  const { entries, statusCounts, name, record } = data;
  const total = entries.filter((entry) => entry.reviewState === "approved" && !entry.hidden).length;

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back to all results</button>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          {verified && <span style={{ color: "#059669", fontSize: 14 }}>✓</span>}
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: "#E2E8F0", margin: 0 }}>{name}</h2>
        </div>
        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 16, background: "rgba(255,255,255,0.05)" }}>
          {STATUSES.map((status) => statusCounts[status] > 0 ? <div key={status} style={{ width: `${(statusCounts[status] / Math.max(total, 1)) * 100}%`, background: STATUS_CONFIG[status].color }} /> : null)}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {STATUSES.map((status) => (
            <div key={status} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_CONFIG[status].color }} />
              <span style={{ color: "#94A3B8" }}>{status}:</span>
              <span style={{ color: "#E2E8F0", fontWeight: 600 }}>{statusCounts[status]}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 13, color: "#64748B" }}>{total} public reports</div>
        </div>
      </div>
      {record && (
        <div style={{ ...panelStyle, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            <MetadataItem label="Country" value={record.country} />
            <MetadataItem label="Funder" value={record.funder} />
            <MetadataItem label="Funding Type" value={record.type} />
            <MetadataItem label="Typical Deadline" value={record.typical_deadline} />
            <MetadataItem label="Results Timeline" value={record.results_timeline} />
            <MetadataItem label="Levels" value={record.levels?.join(", ")} />
          </div>
          {record.description && <p style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>{record.description}</p>}
          {record.eligibility_notes && <p style={{ color: "#64748B", fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>{record.eligibility_notes}</p>}
          {record.website && <a href={record.website} target="_blank" rel="noreferrer" style={{ color: "#38BDF8", fontSize: 13, textDecoration: "none" }}>Visit official scholarship website →</a>}
        </div>
      )}
      {entries.length === 0 ? (
        <div style={{ ...panelStyle, textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>⌛</div>
          <h3 style={{ ...panelTitle, marginBottom: 8 }}>No public reports yet</h3>
          <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
            This scholarship already has a catalog page, but Awaited has not published any public reports for it yet.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).map((result) => (
            <ResultCard
              key={result.id}
              result={result}
              expanded={expandedCard === result.id}
              onToggle={() => setExpandedCard(expandedCard === result.id ? null : result.id)}
              onScholarshipClick={() => {}}
              commentText={newComments[result.id] || ""}
              onCommentChange={(value) => setNewComments((current) => ({ ...current, [result.id]: value }))}
              onCommentSubmit={(text, moderation) => onCommentSubmit(result.id, text, moderation)}
              isAdmin={isAdmin}
              onApprove={() => onApprove(result.id)}
              onReject={() => onReject(result.id)}
              onToggleHide={() => onToggleHide(result.id, !result.hidden)}
              onDelete={() => onDelete(result.id)}
              verified={verified}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PolicyPage({ title, intro, sections, onBack, onNavigate }) {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>
        ← Back to results
      </button>
      <div style={{ ...panelStyle, padding: "28px 30px", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#E2E8F0", marginTop: 0, marginBottom: 10 }}>
          {title}
        </h2>
        <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          {intro}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sections.map((section) => (
          <div key={section.heading} style={panelStyle}>
            <h3 style={{ ...panelTitle, fontSize: 16, marginBottom: 10 }}>{section.heading}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item) => (
                <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#38BDF8", fontSize: 13, lineHeight: 1.7 }}>•</span>
                  <p style={{ margin: 0, color: "#CBD5E1", fontSize: 14, lineHeight: 1.7 }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...panelStyle, marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#64748B", marginRight: "auto" }}>Read the rest of the trust pages:</span>
        <FooterLink onClick={() => onNavigate("privacy")}>Privacy</FooterLink>
        <FooterLink onClick={() => onNavigate("community")}>Community Rules</FooterLink>
        <FooterLink onClick={() => onNavigate("disclaimer")}>Disclaimer</FooterLink>
      </div>
    </div>
  );
}

function SiteFooter({ onNavigate }) {
  return (
    <footer style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 28px" }}>
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 12, color: "#64748B" }}>
          Awaited is a community reporting platform. Scholarship outcomes here are user-submitted and not official decisions.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FooterLink onClick={() => onNavigate("privacy")}>Privacy Policy</FooterLink>
          <FooterLink onClick={() => onNavigate("community")}>Community Rules</FooterLink>
          <FooterLink onClick={() => onNavigate("disclaimer")}>Disclaimer</FooterLink>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 999,
        padding: "7px 12px",
        color: "#94A3B8",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function MetadataItem({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#E2E8F0", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function FormField({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}

function TurnstileGate({ onVerify, resetKey }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!turnstileSiteKey || hasStoredHumanTrust() || !containerRef.current) {
      return undefined;
    }

    let isActive = true;

    loadTurnstileScript()
      .then((turnstile) => {
        if (!isActive || !containerRef.current) {
          return;
        }

        containerRef.current.innerHTML = "";
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: turnstileSiteKey,
          theme: "dark",
          callback: (token) => onVerify(token),
          "expired-callback": () => onVerify(""),
          "error-callback": () => onVerify(""),
        });
      })
      .catch(() => onVerify(""));

    return () => {
      isActive = false;
      if (widgetIdRef.current && typeof window !== "undefined" && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [onVerify, resetKey]);

  if (!turnstileSiteKey || hasStoredHumanTrust()) {
    return null;
  }

  return <div ref={containerRef} style={{ minHeight: 68 }} />;
}

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#E2E8F0",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const panelStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "20px 22px",
};

const panelTitle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#E2E8F0",
  marginBottom: 14,
  marginTop: 0,
};

const primaryButtonStyle = {
  padding: "14px 0",
  borderRadius: 12,
  border: "none",
  width: "100%",
  background: "linear-gradient(135deg, #6366F1, #818CF8)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};
