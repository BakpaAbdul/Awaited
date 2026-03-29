const VISITOR_ID_KEY = "awaited:visitor-id:v1";

function createVisitorId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getClientFingerprint() {
  if (typeof window === "undefined" || !window.localStorage) {
    return "server-render";
  }

  const existing = window.localStorage.getItem(VISITOR_ID_KEY);
  if (existing) {
    return existing;
  }

  const nextId = createVisitorId();
  window.localStorage.setItem(VISITOR_ID_KEY, nextId);
  return nextId;
}
