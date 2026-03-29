import { describe, expect, it } from "vitest";
import { validateSubmissionDraft } from "./contentPolicy";

describe("validateSubmissionDraft", () => {
  it("flags missing required submission fields", () => {
    const errors = validateSubmissionDraft({});

    expect(errors.scholarship).toBeTruthy();
    expect(errors.country).toBeTruthy();
    expect(errors.status).toBeTruthy();
    expect(errors.date).toBeTruthy();
  });

  it("flags impossible date order", () => {
    const errors = validateSubmissionDraft({
      scholarship: "Chevening Scholarship",
      country: "United Kingdom",
      status: "Interview",
      date: "2026-03-10",
      appliedDate: "2026-03-15",
      interviewDate: "2026-03-10",
    });

    expect(errors.interviewDate).toContain("earlier than applied date");
  });

  it("allows a custom status label", () => {
    const errors = validateSubmissionDraft({
      scholarship: "Chevening Scholarship",
      country: "United Kingdom",
      status: "Shortlisted",
      date: "2026-03-10",
    });

    expect(errors.status).toBeUndefined();
  });
});
