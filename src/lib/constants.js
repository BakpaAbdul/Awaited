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

// ─── Initial verified scholarship names ──────────────────────────
export const INITIAL_VERIFIED = [
  "Chevening Scholarship",
  "Fulbright",
  "DAAD EPOS",
  "Gates Cambridge",
  "Erasmus Mundus",
  "Rhodes Scholarship",
  "Australia Awards",
  "MEXT Scholarship",
  "Türkiye Burslari",
  "Commonwealth Scholarship",
  "Aga Khan Foundation",
  "Swedish Institute Scholarship",
  "Korean Government Scholarship (KGSP)",
  "Chinese Government Scholarship (CSC)",
  "New Zealand Scholarships",
];

// ─── Seed data (remove once connected to Supabase) ──────────────
export const SEED_RESULTS = [
  { id: 1, scholarship: "Chevening Scholarship", country: "United Kingdom", level: "Masters", field: "Public Policy", status: "Accepted", date: "2026-02-15", nationality: "Nigerian", gpa: "3.7", note: "Interview was about leadership and networking plan. Got the email 3 weeks after interview.", comments: [{ text: "Congrats! How long between application and interview?", time: "2026-02-18" }, { text: "About 2 months for me.", time: "2026-02-19" }], hidden: false, createdAt: "2026-02-15T10:00:00Z" },
  { id: 2, scholarship: "Chevening Scholarship", country: "United Kingdom", level: "Masters", field: "Economics", status: "Rejected", date: "2026-02-20", nationality: "Ghanaian", gpa: "3.5", note: "No interview invitation. Applied for LSE. Second attempt.", comments: [], hidden: false, createdAt: "2026-02-20T08:00:00Z" },
  { id: 3, scholarship: "DAAD EPOS", country: "Germany", level: "Masters", field: "Development Economics", status: "Interview", date: "2026-01-10", nationality: "Kenyan", gpa: "3.4", note: "Got interview invite via email. Panel of 3 professors. Very academic questions.", comments: [{ text: "What kind of academic questions?", time: "2026-01-12" }], hidden: false, createdAt: "2026-01-10T14:00:00Z" },
  { id: 4, scholarship: "Fulbright", country: "United States", level: "PhD", field: "Political Science", status: "Accepted", date: "2025-12-05", nationality: "Colombian", gpa: "3.9", note: "Applied through the Colombian Fulbright commission. Long process — 6 months total.", comments: [], hidden: false, createdAt: "2025-12-05T09:00:00Z" },
  { id: 5, scholarship: "Fulbright", country: "United States", level: "Masters", field: "Computer Science", status: "Waitlisted", date: "2026-01-20", nationality: "Indonesian", gpa: "3.6", note: "Still waiting. Anyone else in the same boat?", comments: [{ text: "Same here, applied for CS too. Fingers crossed.", time: "2026-01-22" }, { text: "I was waitlisted last year and got in eventually in March.", time: "2026-01-23" }], hidden: false, createdAt: "2026-01-20T11:00:00Z" },
  { id: 6, scholarship: "Gates Cambridge", country: "United Kingdom", level: "PhD", field: "Neuroscience", status: "Accepted", date: "2026-03-01", nationality: "Indian", gpa: "3.95", note: "The interview was conversational. They care a lot about your 'why Cambridge' answer.", comments: [], hidden: false, createdAt: "2026-03-01T16:00:00Z" },
  { id: 7, scholarship: "Erasmus Mundus", country: "Europe (Multiple)", level: "Masters", field: "Data Science", status: "Rejected", date: "2026-02-28", nationality: "Pakistani", gpa: "3.3", note: "Second year applying. Didn't make it past the consortium ranking.", comments: [{ text: "Try strengthening the motivation letter — that's where most people lose points.", time: "2026-03-01" }], hidden: false, createdAt: "2026-02-28T12:00:00Z" },
  { id: 8, scholarship: "Rhodes Scholarship", country: "United Kingdom", level: "Masters", field: "Philosophy", status: "Interview", date: "2026-01-15", nationality: "American", gpa: "3.88", note: "State-level interview done. Waiting for national results.", comments: [], hidden: false, createdAt: "2026-01-15T13:00:00Z" },
  { id: 9, scholarship: "Australia Awards", country: "Australia", level: "Masters", field: "Environmental Science", status: "Accepted", date: "2025-11-30", nationality: "Vietnamese", gpa: "3.5", note: "Took almost 8 months from application to final result. Worth the wait!", comments: [], hidden: false, createdAt: "2025-11-30T07:00:00Z" },
  { id: 10, scholarship: "MEXT Scholarship", country: "Japan", level: "PhD", field: "Electrical Engineering", status: "Applied", date: "2026-03-10", nationality: "Bangladeshi", gpa: "3.65", note: "Embassy track. Submitted documents last week. The wait begins.", comments: [{ text: "Embassy track takes forever but it's worth it. Good luck!", time: "2026-03-11" }], hidden: false, createdAt: "2026-03-10T15:00:00Z" },
  { id: 11, scholarship: "Chevening Scholarship", country: "United Kingdom", level: "Masters", field: "International Relations", status: "Waitlisted", date: "2026-02-22", nationality: "Ethiopian", gpa: "3.6", note: "Waitlisted after interview. Anyone know how likely it is to get off the waitlist?", comments: [{ text: "A friend got off the Chevening waitlist last year in April. Don't lose hope.", time: "2026-02-24" }], hidden: false, createdAt: "2026-02-22T10:00:00Z" },
  { id: 12, scholarship: "Türkiye Burslari", country: "Turkey", level: "Undergrad", field: "Medicine", status: "Interview", date: "2026-03-05", nationality: "Somali", gpa: "3.8", note: "Online interview scheduled. Anyone have tips for the Turkey scholarship interview?", comments: [], hidden: false, createdAt: "2026-03-05T09:00:00Z" },
];
