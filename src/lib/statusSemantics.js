export const STATUS_SEMANTICS = {
  applied: "applied",
  interview: "interview",
  waitlisted: "waitlisted",
  accepted: "accepted",
  rejected: "rejected",
  review: "review",
  other: "other",
};

const STATUS_SEMANTIC_CONFIG = {
  [STATUS_SEMANTICS.applied]: { color: "#6B7280", bg: "#F3F4F6", icon: "○" },
  [STATUS_SEMANTICS.interview]: { color: "#D97706", bg: "#FEF3C7", icon: "◎" },
  [STATUS_SEMANTICS.waitlisted]: { color: "#7C3AED", bg: "#EDE9FE", icon: "◑" },
  [STATUS_SEMANTICS.accepted]: { color: "#059669", bg: "#D1FAE5", icon: "●" },
  [STATUS_SEMANTICS.rejected]: { color: "#DC2626", bg: "#FEE2E2", icon: "✕" },
  [STATUS_SEMANTICS.review]: { color: "#2563EB", bg: "#DBEAFE", icon: "◌" },
  [STATUS_SEMANTICS.other]: { color: "#0f766e", bg: "#ccfbf1", icon: "◌" },
};

const STATUS_PATTERNS = [
  { semantic: STATUS_SEMANTICS.accepted, pattern: /(accepted|approved|awarded|selected|winner|granted|admitted|offer)/ },
  { semantic: STATUS_SEMANTICS.rejected, pattern: /(rejected|denied|unsuccessful|declined|not selected|failed)/ },
  { semantic: STATUS_SEMANTICS.interview, pattern: /(interview|shortlist|shortlisted|nominated|nomination|finalist)/ },
  { semantic: STATUS_SEMANTICS.waitlisted, pattern: /(wait|reserve|alternate|holding)/ },
  { semantic: STATUS_SEMANTICS.review, pattern: /(review|screening|processing|assessment|evaluation|checking)/ },
];

export function normalizeStatus(status = "") {
  return String(status).trim();
}

export function getStatusSemantic(status = "") {
  const normalizedStatus = normalizeStatus(status).toLowerCase();

  if (!normalizedStatus) {
    return STATUS_SEMANTICS.other;
  }

  if (normalizedStatus === "applied") {
    return STATUS_SEMANTICS.applied;
  }

  if (normalizedStatus === "interview") {
    return STATUS_SEMANTICS.interview;
  }

  if (normalizedStatus === "waitlisted") {
    return STATUS_SEMANTICS.waitlisted;
  }

  if (normalizedStatus === "accepted") {
    return STATUS_SEMANTICS.accepted;
  }

  if (normalizedStatus === "rejected") {
    return STATUS_SEMANTICS.rejected;
  }

  for (const rule of STATUS_PATTERNS) {
    if (rule.pattern.test(normalizedStatus)) {
      return rule.semantic;
    }
  }

  return STATUS_SEMANTICS.other;
}

export function getStatusConfig(status = "") {
  return STATUS_SEMANTIC_CONFIG[getStatusSemantic(status)] || STATUS_SEMANTIC_CONFIG.other;
}

export function inferMissingTimelineDates(
  status = "",
  decisionDate = "",
  { appliedDate = "", interviewDate = "", finalDecisionDate = "" } = {},
) {
  const semantic = getStatusSemantic(status);

  return {
    appliedDate: appliedDate || (semantic === STATUS_SEMANTICS.applied ? decisionDate : ""),
    interviewDate: interviewDate || (semantic === STATUS_SEMANTICS.interview ? decisionDate : ""),
    finalDecisionDate:
      finalDecisionDate ||
      ([STATUS_SEMANTICS.accepted, STATUS_SEMANTICS.rejected, STATUS_SEMANTICS.waitlisted].includes(semantic)
        ? decisionDate
        : ""),
  };
}
