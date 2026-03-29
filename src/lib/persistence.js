import { SEED_RESULTS } from "./constants";
import {
  getCanonicalScholarshipName,
  isDatabaseScholarship,
  sortScholarshipNames,
} from "./scholarships";

const STORAGE_KEY = "awaited:app-data:v1";

export const PERSISTENCE_MODE = "browser-local";

function normalizeComments(comments = []) {
  return comments
    .filter((comment) => comment && typeof comment.text === "string")
    .map((comment) => ({
      text: comment.text,
      time: comment.time || new Date().toISOString().split("T")[0],
    }));
}

function normalizeResults(results = []) {
  return results
    .filter((result) => result && typeof result.scholarship === "string")
    .map((result) => ({
      ...result,
      scholarship: getCanonicalScholarshipName(result.scholarship),
      comments: normalizeComments(result.comments),
      hidden: Boolean(result.hidden),
      createdAt: result.createdAt || new Date().toISOString(),
    }));
}

export function normalizeAppData(appData = {}) {
  const results = normalizeResults(Array.isArray(appData.results) ? appData.results : SEED_RESULTS);
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
    verifiedList: manualVerified,
    customScholarships: customScholarships.filter((name) => !manualVerified.includes(name)),
  };
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
