import { getDefaultAppData, loadPersistedAppData, normalizeAppData, persistAppData } from "./persistence";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { sanitizeComment, sanitizeScholarshipName, sanitizeSubmission } from "./contentPolicy";
import {
  findMatchingScholarshipName,
  getCanonicalScholarshipName,
  isDatabaseScholarship,
  sortScholarshipNames,
} from "./scholarships";

const RESULTS_TABLE = "scholarship_results";
const COMMENTS_TABLE = "scholarship_comments";
const VERIFIED_TABLE = "verified_scholarships";
const ADMIN_FUNCTION = import.meta.env.VITE_SUPABASE_ADMIN_FUNCTION || "admin-actions";
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
    text: row.text,
    time: row.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
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
    createdAt: row.created_at,
    comments,
  };
}

function withLocalMutation(mutator) {
  const current = loadPersistedAppData();
  const next = normalizeAppData(mutator(current));
  persistAppData(next);
  return next;
}

async function loadSupabaseAppData() {
  const [{ data: resultRows, error: resultsError }, { data: commentRows, error: commentsError }, { data: verifiedRows, error: verifiedError }] =
    await Promise.all([
      supabase.from(RESULTS_TABLE).select("*").order("created_at", { ascending: false }),
      supabase.from(COMMENTS_TABLE).select("*").order("created_at", { ascending: true }),
      supabase.from(VERIFIED_TABLE).select("name").order("name", { ascending: true }),
    ]);

  if (resultsError) throw resultsError;
  if (commentsError) throw commentsError;
  if (verifiedError) throw verifiedError;

  const commentsByResult = new Map();
  (commentRows || []).forEach((row) => {
    const comments = commentsByResult.get(row.result_id) || [];
    comments.push(mapCommentRow(row));
    commentsByResult.set(row.result_id, comments);
  });

  return normalizeAppData({
    results: (resultRows || []).map((row) => mapResultRow(row, commentsByResult.get(row.id) || [])),
    verifiedList: (verifiedRows || []).map((row) => row.name),
  });
}

function formatFallbackMessage(error) {
  const detail = error instanceof Error ? error.message : "Unknown error";
  return `Supabase is unavailable right now. Using browser-local fallback on this device. (${detail})`;
}

async function invokeAdminAction(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke(ADMIN_FUNCTION, {
    body: { action, ...payload },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

async function loadAppData() {
  if (!isSupabaseConfigured) {
    return loadPersistedAppData();
  }

  try {
    return await loadSupabaseAppData();
  } catch (error) {
    console.error("Falling back to browser-local data because Supabase load failed.", error);
    return loadPersistedAppData();
  }
}

async function hydrateAppData() {
  if (!isSupabaseConfigured) {
    return {
      activeMode: "browser-local",
      appData: loadPersistedAppData(),
      syncError: "",
    };
  }

  try {
    return {
      activeMode: "supabase",
      appData: await loadSupabaseAppData(),
      syncError: "",
    };
  } catch (error) {
    console.error("Falling back to browser-local data because Supabase load failed.", error);
    return {
      activeMode: "browser-local",
      appData: loadPersistedAppData(),
      syncError: formatFallbackMessage(error),
    };
  }
}

async function verifyAdminPassword(password) {
  if (!isSupabaseConfigured) {
    return password === LOCAL_ADMIN_PASSWORD;
  }

  const response = await invokeAdminAction("verifyAdminPassword", { adminPassword: password });
  return Boolean(response?.ok);
}

async function submitResult(entry) {
  const sanitizedEntry = sanitizeSubmission(entry);

  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => {
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
            createdAt: new Date().toISOString(),
          },
          ...current.results,
        ],
        customScholarships: nextCustomScholarships,
      };
    });
  }

  const { error } = await supabase.from(RESULTS_TABLE).insert(buildResultPayload(sanitizedEntry));
  if (error) throw error;
  return loadSupabaseAppData();
}

async function addComment(resultId, text) {
  const sanitizedText = sanitizeComment(text);

  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
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
                },
              ],
            }
          : result,
      ),
    }));
  }

  const { error } = await supabase.from(COMMENTS_TABLE).insert({
    result_id: resultId,
    text: sanitizedText,
  });
  if (error) throw error;
  return loadSupabaseAppData();
}

async function setResultHidden(resultId, hidden, adminPassword) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      results: current.results.map((result) => (result.id === resultId ? { ...result, hidden } : result)),
    }));
  }

  await invokeAdminAction("setResultHidden", { adminPassword, resultId, hidden });
  return loadSupabaseAppData();
}

async function deleteResult(resultId, adminPassword) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      results: current.results.filter((result) => result.id !== resultId),
    }));
  }

  await invokeAdminAction("deleteResult", { adminPassword, resultId });
  return loadSupabaseAppData();
}

async function deleteComment(commentId, adminPassword) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      results: current.results.map((result) => ({
        ...result,
        comments: result.comments.filter((comment) => comment.id !== commentId),
      })),
    }));
  }

  await invokeAdminAction("deleteComment", { adminPassword, commentId });
  return loadSupabaseAppData();
}

async function addVerifiedScholarship(name, adminPassword) {
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

  await invokeAdminAction("addVerifiedScholarship", { adminPassword, name: canonicalName });
  return loadSupabaseAppData();
}

async function removeVerifiedScholarship(name, adminPassword) {
  if (!isSupabaseConfigured) {
    return withLocalMutation((current) => ({
      ...current,
      verifiedList: current.verifiedList.filter((item) => item !== name),
    }));
  }

  await invokeAdminAction("removeVerifiedScholarship", { adminPassword, name });
  return loadSupabaseAppData();
}

function subscribeToAppData(onData, onError) {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  let active = true;
  let reloadTimer = null;

  const scheduleReload = () => {
    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }

    reloadTimer = setTimeout(async () => {
      try {
        const nextData = await loadSupabaseAppData();
        if (active) {
          onData(nextData);
        }
      } catch (error) {
        if (active) {
          onError?.(error);
        }
      }
    }, 150);
  };

  const channel = supabase
    .channel("awaited-app-data")
    .on("postgres_changes", { event: "*", schema: "public", table: RESULTS_TABLE }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: COMMENTS_TABLE }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: VERIFIED_TABLE }, scheduleReload)
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
      ? normalizeAppData({ results: [], verifiedList: [], customScholarships: [] })
      : loadPersistedAppData();
  },
  hydrateAppData,
  loadAppData,
  subscribeToAppData,
  verifyAdminPassword,
  submitResult,
  addComment,
  setResultHidden,
  deleteResult,
  deleteComment,
  addVerifiedScholarship,
  removeVerifiedScholarship,
};
