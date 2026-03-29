import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { appDataStore, DATA_BACKEND_MODE } from "./lib/appDataStore";
import { applyDocumentSeo, getRouteSeo } from "./lib/seo";
import { parseAppRoute, pushAppRoute } from "./lib/router";
import { DATABASE_SCHOLARSHIP_NAMES, findMatchingScholarshipName, findScholarshipNameBySlug, getCanonicalScholarshipName, getScholarshipRecord, getScholarshipRecordBySlug, isDatabaseScholarship, scholarshipToSlug, sortScholarshipNames } from "./lib/scholarships";
import { TRUST_PAGES } from "./lib/trustPages";
import { THEME } from "./lib/theme";
import { LoadingPanel } from "./components/results";
import { FlashBanner, InlineEmptyState, NavBtn, SiteFooter } from "./components/siteChrome";

const FeedPage = lazy(() => import("./pages/FeedPage"));
const SubmitPage = lazy(() => import("./pages/SubmitPage"));
const ScholarshipPage = lazy(() => import("./pages/ScholarshipPage"));
const PolicyPage = lazy(() => import("./pages/PolicyPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const BlogIndexPage = lazy(() => import("./pages/BlogIndexPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const ForumIndexPage = lazy(() => import("./pages/ForumIndexPage"));
const ForumThreadPage = lazy(() => import("./pages/ForumThreadPage"));

const INITIAL_ROUTE =
  typeof window !== "undefined"
    ? parseAppRoute(window.location.pathname)
    : { view: "feed", scholarshipSlug: null, blogSlug: null, forumSlug: null };
const ADMIN_ENTRY_STORAGE_KEY = "awaited:admin-entry:v1";

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
  const [flashMessage, setFlashMessage] = useState("");
  const [adminUser, setAdminUser] = useState(null);
  const [adminEntryUnlocked, setAdminEntryUnlocked] = useState(() => getStoredAdminEntryAccess());

  const isAdmin = Boolean(adminUser);
  const canAccessAdminEntry = isAdmin || adminEntryUnlocked;
  const results = appData.results;
  const blogPosts = appData.blogPosts;
  const forumThreads = appData.forumThreads;
  const manualVerifiedList = appData.verifiedList;
  const customScholarships = appData.customScholarships;
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
    };

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, []);

  useEffect(() => {
    if (!canAccessAdminEntry && (view === "login" || view === "admin")) {
      applyRoute("feed");
    }
  }, [canAccessAdminEntry, view]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  const requestedView = view === "admin" && !isAdmin ? "login" : view;
  const resolvedView =
    !canAccessAdminEntry && (requestedView === "login" || requestedView === "admin")
      ? "feed"
      : requestedView;

  const visibleResults = useMemo(
    () => results.filter((result) => isAdmin || (!result.hidden && result.reviewState === "approved")),
    [results, isAdmin],
  );

  const approvedVisibleResults = useMemo(
    () => results.filter((result) => result.reviewState === "approved" && !result.hidden),
    [results],
  );

  const stats = useMemo(() => {
    const nextStats = { total: approvedVisibleResults.length };
    ["Applied", "Interview", "Waitlisted", "Accepted", "Rejected"].forEach((status) => {
      nextStats[status] = approvedVisibleResults.filter((result) => result.status === status).length;
    });
    return nextStats;
  }, [approvedVisibleResults]);

  const selectedScholarship = useMemo(() => {
    if (resolvedView !== "scholarship") {
      return null;
    }

    return (
      findScholarshipNameBySlug(routeScholarshipSlug, allScholarshipNames) ||
      getScholarshipRecordBySlug(routeScholarshipSlug)?.name ||
      null
    );
  }, [resolvedView, routeScholarshipSlug, allScholarshipNames]);

  const scholarshipData = useMemo(() => {
    if (!selectedScholarship) {
      return null;
    }

    const entries = (isAdmin ? results : visibleResults).filter((result) => result.scholarship === selectedScholarship);
    const statusCounts = {};
    ["Applied", "Interview", "Waitlisted", "Accepted", "Rejected"].forEach((status) => {
      statusCounts[status] = entries.filter(
        (entry) => entry.status === status && entry.reviewState === "approved" && !entry.hidden,
      ).length;
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

  useEffect(() => {
    const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
    applyDocumentSeo(
      getRouteSeo({
        view: resolvedView,
        pathname,
        scholarshipName: selectedScholarship,
        scholarshipRecord: scholarshipData?.record || null,
        scholarshipEntryCount:
          scholarshipData?.entries.filter((entry) => entry.reviewState === "approved" && !entry.hidden).length || 0,
        blogPost: selectedBlogPost,
        forumThread: selectedForumThread,
      }),
    );
  }, [resolvedView, selectedScholarship, scholarshipData, selectedBlogPost, selectedForumThread]);

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
    const nextCount =
      now - hiddenAdminTapRef.current.lastTap <= thresholdMs
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
    let nextScholarshipSlug = null;
    let nextBlogSlug = null;
    let nextForumRouteSlug = null;

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
      nextForumRouteSlug = forumSlug;
      pathname = `/forum/${encodeURIComponent(nextForumRouteSlug)}`;
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
      nextScholarshipSlug = scholarshipToSlug(scholarshipName);
      pathname = `/scholarships/${encodeURIComponent(nextScholarshipSlug)}`;
    }

    setView(nextView);
    setRouteScholarshipSlug(nextScholarshipSlug);
    setRouteBlogSlug(nextBlogSlug);
    setRouteForumSlug(nextForumRouteSlug);
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

  const handleSubmit = async (entry, moderation) => {
    await applyStoreMutation(() => appDataStore.submitResult(entry, moderation, { admin: isAdmin }), {
      onSuccess: (_, meta) => {
        applyRoute("feed");
        showFlash(
          meta.reviewState === "pending"
            ? "Result received and sent to moderation."
            : "Result submitted anonymously.",
        );
      },
    });
  };

  const handleAddComment = async (resultId, text, moderation) => {
    if (!text.trim()) {
      return null;
    }

    return applyStoreMutation(() => appDataStore.addComment(resultId, text.trim(), moderation, { admin: isAdmin }), {
      onSuccess: (_, meta) => {
        showFlash(
          meta.reviewState === "pending"
            ? "Comment received and queued for moderation."
            : "Comment posted anonymously.",
        );
      },
    });
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
          applyRoute(meta.slug ? "forumThread" : "forum", { forumSlug: meta.slug || null });
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
          showFlash(meta.reviewState === "pending" ? "Reply received and queued for moderation." : "Reply posted.");
        },
      },
    );

    return Boolean(result);
  };

  const handleAdminLogin = async ({ email, password }) => {
    const result = await appDataStore.signInAdmin({ email, password });
    setAdminUser(result.admin);
    setAppData(result.appData);
    applyRoute("admin");
    return result;
  };

  const handleAdminLogout = async () => {
    try {
      const result = await appDataStore.signOutAdmin();
      setAdminUser(null);
      setAppData(result.appData);
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
      return;
    }

    await applyStoreMutation(() => appDataStore.addVerifiedScholarship(matchedName));
  };

  const handleSaveBlogPost = async (entry) => {
    const result = await applyStoreMutation(() => appDataStore.saveBlogPost(entry), {
      onSuccess: (nextData) => {
        const updatedPosts = nextData?.blogPosts || [];
        const latestPost = updatedPosts.find((post) => post.title === entry.title) || updatedPosts[0];
        showFlash(entry.id ? "Blog post updated." : "Blog post saved.");
        if (latestPost?.slug) {
          applyRoute("blogPost", { blogSlug: latestPost.slug });
        }
      },
    });

    return Boolean(result);
  };

  const handleDeleteBlogPost = async (postId) => {
    await applyStoreMutation(() => appDataStore.deleteBlogPost(postId), {
      onSuccess: () => showFlash("Blog post deleted."),
    });
  };

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
        minHeight: "100vh",
        background: THEME.pageBackground,
        color: THEME.textPrimary,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap"
        rel="stylesheet"
      />

      <FlashBanner message={flashMessage} />

      <header
        style={{
          padding: "20px 28px",
          borderBottom: `1px solid ${THEME.panelBorderSoft}`,
          background: "rgba(248,250,252,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => applyRoute("feed")}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            cursor: "pointer",
            background: "none",
            border: "none",
            padding: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              fontWeight: 800,
              background: "linear-gradient(135deg, #38BDF8, #818CF8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Awaited
          </span>
          <span
            onClick={handleBetaTap}
            style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase" }}
          >
            Beta
          </span>
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <NavBtn active={resolvedView === "feed"} onClick={() => applyRoute("feed")}>
            Browse
          </NavBtn>
          <NavBtn active={resolvedView === "blog" || resolvedView === "blogPost"} onClick={() => applyRoute("blog")}>
            Blog
          </NavBtn>
          <NavBtn active={resolvedView === "forum" || resolvedView === "forumThread"} onClick={() => applyRoute("forum")}>
            Forum
          </NavBtn>
          <NavBtn active={resolvedView === "submit"} onClick={() => applyRoute("submit")} accent>
            + Submit
          </NavBtn>
          {isAdmin ? (
            <>
              <NavBtn active={resolvedView === "admin"} onClick={() => applyRoute("admin")} admin>
                ⚙ Admin
              </NavBtn>
              <button
                onClick={handleAdminLogout}
                style={{ background: "none", border: "none", color: THEME.textMuted, fontSize: 11, cursor: "pointer", padding: "4px 8px" }}
              >
                Logout
              </button>
            </>
          ) : canAccessAdminEntry ? (
            <button
              onClick={() => applyRoute("login")}
              style={{
                background: THEME.panelBackgroundStrong,
                border: `1px solid ${THEME.panelBorder}`,
                borderRadius: 8,
                color: THEME.textSoft,
                fontSize: 11,
                cursor: "pointer",
                padding: "6px 12px",
              }}
            >
              Admin
            </button>
          ) : null}
        </div>
      </header>

      {isAdmin && resolvedView !== "admin" ? (
        <div
          style={{
            background: THEME.accentSurface,
            borderBottom: `1px solid ${THEME.accentBorder}`,
            padding: "8px 28px",
            fontSize: 12,
            color: THEME.accentText,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366F1" }} />
          Admin session active as {adminUser?.email}. Pending and hidden content is visible in review mode.
        </div>
      ) : null}

      {activeDataMode === "supabase" ? (
        <div
          style={{
            background: "rgba(5,150,105,0.08)",
            borderBottom: "1px solid rgba(5,150,105,0.18)",
            padding: "8px 28px",
            fontSize: 12,
            color: "#047857",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
          Shared backend active — submissions, moderation, and live updates sync across users through Supabase.
        </div>
      ) : null}

      {activeDataMode === "browser-local" && DATA_BACKEND_MODE === "supabase" ? (
        <div
          style={{
            background: "rgba(217,119,6,0.08)",
            borderBottom: "1px solid rgba(217,119,6,0.16)",
            padding: "8px 28px",
            fontSize: 12,
            color: "#b45309",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
          Supabase is configured, but this session is currently using browser-local fallback because the backend could not be reached.
        </div>
      ) : null}

      {activeDataMode === "browser-local" && DATA_BACKEND_MODE === "browser-local" ? (
        <div
          style={{
            background: "rgba(217,119,6,0.08)",
            borderBottom: "1px solid rgba(217,119,6,0.16)",
            padding: "8px 28px",
            fontSize: 12,
            color: "#b45309",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
          Browser-local fallback active — local testing only. Secure auth, moderation queue, and shared routing need Supabase mode.
        </div>
      ) : null}

      {isHydrating ? (
        <div
          style={{
            background: "rgba(56,189,248,0.08)",
            borderBottom: "1px solid rgba(56,189,248,0.16)",
            padding: "8px 28px",
            fontSize: 12,
            color: "#0369a1",
          }}
        >
          Loading shared scholarship data…
        </div>
      ) : null}

      {syncError ? (
        <div
          style={{
            background: "rgba(220,38,38,0.08)",
            borderBottom: "1px solid rgba(220,38,38,0.16)",
            padding: "8px 28px",
            fontSize: 12,
            color: "#b91c1c",
          }}
        >
          {syncError}
        </div>
      ) : null}

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 64px" }}>
        <Suspense fallback={<LoadingPanel message="Loading page…" />}>
          {resolvedView === "login" ? (
            <AuthPage onSubmit={handleAdminLogin} onCancel={() => applyRoute("feed")} />
          ) : null}

          {resolvedView === "admin" && isAdmin ? (
            <AdminPage
              adminUser={adminUser}
              results={results}
              forumThreads={forumThreads}
              blogPosts={blogPosts}
              manualVerifiedList={manualVerifiedList}
              customScholarships={customScholarships}
              verifiedList={verifiedList}
              approvedVisibleResults={approvedVisibleResults}
              isVerifiedScholarship={isVerifiedScholarship}
              onBack={() => applyRoute("feed")}
              onApproveResult={(id) => applyStoreMutation(() => appDataStore.setResultReviewState(id, "approved"))}
              onRejectResult={(id) =>
                applyStoreMutation(() => appDataStore.setResultReviewState(id, "rejected", "Rejected during moderation"))
              }
              onToggleHideResult={(id, hidden) => applyStoreMutation(() => appDataStore.setResultHidden(id, hidden))}
              onDeleteResult={(id) => applyStoreMutation(() => appDataStore.deleteResult(id))}
              onSetCommentReviewState={(id, reviewState, moderationReason = "") =>
                applyStoreMutation(() => appDataStore.setCommentReviewState(id, reviewState, moderationReason))
              }
              onDeleteComment={(id) => applyStoreMutation(() => appDataStore.deleteComment(id))}
              onSetForumThreadReviewState={(id, reviewState, moderationReason = "") =>
                applyStoreMutation(() => appDataStore.setForumThreadReviewState(id, reviewState, moderationReason))
              }
              onDeleteForumThread={(id) => applyStoreMutation(() => appDataStore.deleteForumThread(id))}
              onSetForumReplyReviewState={(id, reviewState, moderationReason = "") =>
                applyStoreMutation(() => appDataStore.setForumReplyReviewState(id, reviewState, moderationReason))
              }
              onDeleteForumReply={(id) => applyStoreMutation(() => appDataStore.deleteForumReply(id))}
              onAddVerifiedScholarship={addManualVerifiedScholarship}
              onRemoveVerifiedScholarship={(name) =>
                applyStoreMutation(() => appDataStore.removeVerifiedScholarship(name))
              }
              onSaveBlogPost={handleSaveBlogPost}
              onDeleteBlogPost={handleDeleteBlogPost}
              onOpenPost={(slug) => applyRoute("blogPost", { blogSlug: slug })}
            />
          ) : null}

          {resolvedView === "feed" ? (
            <FeedPage
              visibleResults={visibleResults}
              isAdmin={isAdmin}
              onNavigate={applyRoute}
              onCommentSubmit={handleAddComment}
              onApproveResult={(id) => applyStoreMutation(() => appDataStore.setResultReviewState(id, "approved"))}
              onRejectResult={(id) =>
                applyStoreMutation(() => appDataStore.setResultReviewState(id, "rejected", "Rejected during moderation"))
              }
              onToggleHideResult={(id, hidden) => applyStoreMutation(() => appDataStore.setResultHidden(id, hidden))}
              onDeleteResult={(id) => applyStoreMutation(() => appDataStore.deleteResult(id))}
              isVerifiedScholarship={isVerifiedScholarship}
              stats={stats}
            />
          ) : null}

          {resolvedView === "blog" ? (
            <BlogIndexPage posts={visibleBlogPosts} onOpenPost={(slug) => applyRoute("blogPost", { blogSlug: slug })} />
          ) : null}

          {resolvedView === "blogPost" && selectedBlogPost ? (
            <BlogPostPage post={selectedBlogPost} onBack={() => applyRoute("blog")} />
          ) : null}

          {resolvedView === "blogPost" && !selectedBlogPost ? (
            <InlineEmptyState
              title="Blog Post Not Found"
              description="That post either does not exist or is not published for the public site."
              actionLabel="Back to blog"
              onAction={() => applyRoute("blog")}
            />
          ) : null}

          {resolvedView === "forum" ? (
            <ForumIndexPage
              threads={visibleForumThreads}
              isAdmin={isAdmin}
              onOpenThread={(slug) => applyRoute("forumThread", { forumSlug: slug })}
              onCreateThread={handleCreateForumThread}
            />
          ) : null}

          {resolvedView === "forumThread" && selectedForumThread ? (
            <ForumThreadPage
              thread={selectedForumThread}
              isAdmin={isAdmin}
              onBack={() => applyRoute("forum")}
              onReplySubmit={handleAddForumReply}
            />
          ) : null}

          {resolvedView === "forumThread" && !selectedForumThread ? (
            <InlineEmptyState
              title="Discussion Not Found"
              description="That thread either does not exist or is still waiting for moderation."
              actionLabel="Back to forum"
              onAction={() => applyRoute("forum")}
            />
          ) : null}

          {resolvedView === "submit" ? (
            <SubmitPage
              onSubmit={handleSubmit}
              onCancel={() => applyRoute("feed")}
              onNavigate={applyRoute}
              verifiedScholarships={verifiedList}
              customScholarships={customScholarships}
            />
          ) : null}

          {TRUST_PAGES[resolvedView] ? (
            <PolicyPage
              title={TRUST_PAGES[resolvedView].title}
              intro={TRUST_PAGES[resolvedView].intro}
              sections={TRUST_PAGES[resolvedView].sections}
              onBack={() => applyRoute("feed")}
              onNavigate={applyRoute}
            />
          ) : null}

          {resolvedView === "scholarship" && selectedScholarship && scholarshipData ? (
            <ScholarshipPage
              data={scholarshipData}
              onBack={() => applyRoute("feed")}
              onCommentSubmit={handleAddComment}
              isAdmin={isAdmin}
              onApprove={(id) => applyStoreMutation(() => appDataStore.setResultReviewState(id, "approved"))}
              onReject={(id) =>
                applyStoreMutation(() => appDataStore.setResultReviewState(id, "rejected", "Rejected during moderation"))
              }
              onToggleHide={(id, hidden) => applyStoreMutation(() => appDataStore.setResultHidden(id, hidden))}
              onDelete={(id) => applyStoreMutation(() => appDataStore.deleteResult(id))}
              verified={isVerifiedScholarship(scholarshipData.name)}
            />
          ) : null}

          {resolvedView === "scholarship" && !selectedScholarship ? (
            <InlineEmptyState
              title="Scholarship Not Found"
              description="The link is valid only if Awaited has seen reports or a verified record for that scholarship name."
              actionLabel="Back to feed"
              onAction={() => applyRoute("feed")}
            />
          ) : null}
        </Suspense>
      </main>

      <SiteFooter onNavigate={applyRoute} />

      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        input::placeholder, textarea::placeholder { color: ${THEME.textSoft}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.28); border-radius: 3px; }
      `}</style>
    </div>
  );
}
