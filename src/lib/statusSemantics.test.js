import { describe, expect, it } from "vitest";
import { getStatusSemantic, inferMissingTimelineDates } from "./statusSemantics";

describe("statusSemantics", () => {
  it("treats shortlisted statuses as interview-like", () => {
    expect(getStatusSemantic("Shortlisted")).toBe("interview");
    expect(inferMissingTimelineDates("Shortlisted", "2026-03-10").interviewDate).toBe("2026-03-10");
  });

  it("treats offered statuses as final-decision-like", () => {
    expect(getStatusSemantic("Offered")).toBe("accepted");
    expect(inferMissingTimelineDates("Offered", "2026-03-10").finalDecisionDate).toBe("2026-03-10");
  });
});
