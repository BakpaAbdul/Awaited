export function parseAppRoute(pathname) {
  if (!pathname || pathname === "/") {
    return { view: "feed", scholarshipSlug: null, blogSlug: null, forumSlug: null };
  }

  if (pathname === "/submit") {
    return { view: "submit", scholarshipSlug: null, blogSlug: null, forumSlug: null };
  }

  if (pathname === "/blog") {
    return { view: "blog", scholarshipSlug: null, blogSlug: null, forumSlug: null };
  }

  if (pathname.startsWith("/blog/")) {
    const blogSlug = decodeURIComponent(pathname.slice("/blog/".length)).trim();
    return { view: "blogPost", scholarshipSlug: null, blogSlug, forumSlug: null };
  }

  if (pathname === "/forum") {
    return { view: "forum", scholarshipSlug: null, blogSlug: null, forumSlug: null };
  }

  if (pathname.startsWith("/forum/")) {
    const forumSlug = decodeURIComponent(pathname.slice("/forum/".length)).trim();
    return { view: "forumThread", scholarshipSlug: null, blogSlug: null, forumSlug };
  }

  if (pathname === "/privacy") {
    return { view: "privacy", scholarshipSlug: null, blogSlug: null, forumSlug: null };
  }

  if (pathname === "/community") {
    return { view: "community", scholarshipSlug: null, blogSlug: null, forumSlug: null };
  }

  if (pathname === "/disclaimer") {
    return { view: "disclaimer", scholarshipSlug: null, blogSlug: null, forumSlug: null };
  }

  if (pathname === "/admin") {
    return { view: "admin", scholarshipSlug: null, blogSlug: null, forumSlug: null };
  }

  if (pathname === "/admin/login") {
    return { view: "login", scholarshipSlug: null, blogSlug: null, forumSlug: null };
  }

  if (pathname.startsWith("/scholarships/")) {
    const scholarshipSlug = decodeURIComponent(pathname.slice("/scholarships/".length)).trim();
    return { view: "scholarship", scholarshipSlug, blogSlug: null, forumSlug: null };
  }

  return { view: "feed", scholarshipSlug: null, blogSlug: null, forumSlug: null };
}

export function pushAppRoute(pathname) {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== pathname) {
    window.history.pushState({}, "", pathname);
  }
}
