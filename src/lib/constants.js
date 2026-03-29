import scholarshipsDB from './scholarships-db.json';

// ─── Status visual config ────────────────────────────────────────
export const STATUS_CONFIG = {
  Applied:    { color: "#6B7280", bg: "#F3F4F6", icon: "○" },
  Interview:  { color: "#D97706", bg: "#FEF3C7", icon: "◎" },
  Waitlisted: { color: "#7C3AED", bg: "#EDE9FE", icon: "◑" },
  Accepted:   { color: "#059669", bg: "#D1FAE5", icon: "●" },
  Rejected:   { color: "#DC2626", bg: "#FEE2E2", icon: "✕" },
};

export const STATUSES = ["Applied", "Interview", "Waitlisted", "Accepted", "Rejected"];
export const CUSTOM_STATUS_OPTION = "__custom_status__";
export const LEVELS = ["Undergrad", "Masters", "PhD", "Postdoc"];

export function getStatusConfig(status = "") {
  if (STATUS_CONFIG[status]) {
    return STATUS_CONFIG[status];
  }

  const normalizedStatus = status.trim().toLowerCase();

  if (/(accepted|approved|awarded|selected|winner|granted|admitted|offer)/i.test(normalizedStatus)) {
    return { color: "#059669", bg: "#D1FAE5", icon: "●" };
  }

  if (/(rejected|denied|unsuccessful|declined|not selected|failed)/i.test(normalizedStatus)) {
    return { color: "#DC2626", bg: "#FEE2E2", icon: "✕" };
  }

  if (/(interview|shortlist|shortlisted|nominated|nomination|finalist)/i.test(normalizedStatus)) {
    return { color: "#D97706", bg: "#FEF3C7", icon: "◎" };
  }

  if (/(wait|reserve|alternate|holding)/i.test(normalizedStatus)) {
    return { color: "#7C3AED", bg: "#EDE9FE", icon: "◑" };
  }

  if (/(review|screening|processing|assessment|evaluation|checking)/i.test(normalizedStatus)) {
    return { color: "#2563EB", bg: "#DBEAFE", icon: "◌" };
  }

  return {
    color: "#0f766e",
    bg: "#ccfbf1",
    icon: "◌",
  };
}

export function getDisplayStatuses(statuses = []) {
  const normalizedStatuses = [...new Set(statuses.filter(Boolean))];
  const customStatuses = normalizedStatuses
    .filter((status) => !STATUSES.includes(status))
    .sort((left, right) => left.localeCompare(right));

  return [...STATUSES.filter((status) => normalizedStatuses.includes(status)), ...customStatuses];
}

// ─── Scholarship database ────────────────────────────────────────
export const SCHOLARSHIPS_DB = scholarshipsDB;

// Extract the verified names list from the database
export const INITIAL_VERIFIED = scholarshipsDB.map(s => s.name);

// Helper: look up full scholarship info by name
export function getScholarshipByName(name) {
  return scholarshipsDB.find(s => s.name === name) || null;
}

// Helper: search scholarships by partial name
export function searchScholarships(query) {
  if (!query) return [];
  const q = query.toLowerCase();
  return scholarshipsDB.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.country.toLowerCase().includes(q) ||
    s.funder.toLowerCase().includes(q)
  );
}

// Shared and fallback environments now start clean. Awaited should not ship
// placeholder community reports by default.
export const SEED_RESULTS = [];
