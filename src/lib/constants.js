import scholarshipsDB from './scholarships-db.json';
import { getStatusConfig as deriveStatusConfig } from "./statusSemantics";

// ─── Status visual config ────────────────────────────────────────
export const STATUS_CONFIG = {
  Applied: deriveStatusConfig("Applied"),
  Interview: deriveStatusConfig("Interview"),
  Waitlisted: deriveStatusConfig("Waitlisted"),
  Accepted: deriveStatusConfig("Accepted"),
  Rejected: deriveStatusConfig("Rejected"),
};

export const STATUSES = ["Applied", "Interview", "Waitlisted", "Accepted", "Rejected"];
export const CUSTOM_STATUS_OPTION = "__custom_status__";
export const LEVELS = ["Undergrad", "Masters", "PhD", "Postdoc"];

export function getStatusConfig(status = "") {
  return deriveStatusConfig(status);
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
