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
export const LEVELS = ["Undergrad", "Masters", "PhD", "Postdoc"];

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
