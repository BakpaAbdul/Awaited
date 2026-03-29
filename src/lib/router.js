export function parseAppRoute(pathname) {
  if (!pathname || pathname === "/") {
    return { view: "feed", scholarshipSlug: null };
  }

  if (pathname === "/submit") {
    return { view: "submit", scholarshipSlug: null };
  }

  if (pathname === "/admin") {
    return { view: "admin", scholarshipSlug: null };
  }

  if (pathname === "/admin/login") {
    return { view: "login", scholarshipSlug: null };
  }

  if (pathname.startsWith("/scholarships/")) {
    const scholarshipSlug = decodeURIComponent(pathname.slice("/scholarships/".length)).trim();
    return { view: "scholarship", scholarshipSlug };
  }

  return { view: "feed", scholarshipSlug: null };
}

export function pushAppRoute(pathname) {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== pathname) {
    window.history.pushState({}, "", pathname);
  }
}
