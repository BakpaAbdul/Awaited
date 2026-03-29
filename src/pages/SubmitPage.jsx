import { useEffect, useMemo, useState } from "react";
import { CUSTOM_STATUS_OPTION, LEVELS, STATUSES } from "../lib/constants";
import { buildScholarshipSuggestions, findMatchingScholarshipName, isDatabaseScholarship } from "../lib/scholarships";
import { hasStoredHumanTrust } from "../lib/humanVerification";
import { primaryButtonStyle, THEME } from "../lib/theme";
import { validateSubmissionDraft } from "../lib/contentPolicy";
import { turnstileSiteKey } from "../lib/supabaseClient";
import { FormField, getInputStateStyle, TurnstileGate } from "../components/formControls";
import { TrustNotice } from "../components/siteChrome";

function shouldShowError(field, errors, touched, submitCount) {
  return Boolean(errors[field]) && (touched[field] || submitCount > 0);
}

export default function SubmitPage({
  onSubmit,
  onCancel,
  onNavigate,
  verifiedScholarships,
  customScholarships,
}) {
  const [form, setForm] = useState({
    scholarship: "",
    cycleYear: String(new Date().getFullYear()),
    country: "",
    level: "",
    field: "",
    university: "",
    program: "",
    applicationRound: "",
    status: "",
    date: new Date().toISOString().split("T")[0],
    appliedDate: "",
    interviewDate: "",
    finalDecisionDate: "",
    nationality: "",
    gpa: "",
    note: "",
  });
  const [suggestions, setSuggestions] = useState([]);
  const [touched, setTouched] = useState({});
  const [honeypot, setHoneypot] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [useCustomStatus, setUseCustomStatus] = useState(false);
  const requiresCaptcha = turnstileSiteKey && !hasStoredHumanTrust();

  const errors = useMemo(
    () => validateSubmissionDraft(form, { requiresCaptcha, captchaToken }),
    [form, requiresCaptcha, captchaToken],
  );

  const trimmedScholarship = form.scholarship.trim();
  const exactKnownMatch = findMatchingScholarshipName(trimmedScholarship, [
    ...verifiedScholarships,
    ...customScholarships,
  ]);
  const exactDatabaseMatch = isDatabaseScholarship(trimmedScholarship);
  const canSubmit = Object.keys(errors).length === 0;

  useEffect(() => {
    if (trimmedScholarship) {
      setSuggestions(buildScholarshipSuggestions(trimmedScholarship, { verifiedScholarships, customScholarships }));
    } else {
      setSuggestions([]);
    }
  }, [trimmedScholarship, verifiedScholarships, customScholarships]);

  const updateField = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleStatusSelect = (event) => {
    const value = event.target.value;
    setTouched((current) => ({ ...current, status: true }));

    if (value === CUSTOM_STATUS_OPTION) {
      setUseCustomStatus(true);
      setForm((current) => ({ ...current, status: "" }));
      return;
    }

    setUseCustomStatus(false);
    setForm((current) => ({ ...current, status: value }));
  };

  const markTouched = (key) => () => {
    setTouched((current) => ({ ...current, [key]: true }));
  };

  const handleSubmit = async () => {
    setSubmitCount((current) => current + 1);

    if (!canSubmit) {
      return;
    }

    await onSubmit(form, {
      honeypot,
      captchaToken,
    });
    setCaptchaToken("");
    setCaptchaResetKey((value) => value + 1);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <button
        onClick={onCancel}
        style={{ background: "none", border: "none", color: THEME.textMuted, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}
      >
        ← Back to results
      </button>
      <div
        style={{
          background: "rgba(255,255,255,0.9)",
          border: `1px solid ${THEME.panelBorder}`,
          borderRadius: 16,
          padding: 32,
          boxShadow: THEME.panelShadow,
          backdropFilter: "blur(10px)",
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 4,
            color: THEME.textPrimary,
          }}
        >
          Submit Your Result
        </h2>
        <p style={{ color: THEME.textMuted, fontSize: 13, marginBottom: 28 }}>
          Anonymous results now go through throttling and moderation. Known scholarships can publish immediately; risky
          or unknown reports can land in the review queue first.
        </p>
        <TrustNotice compact onNavigate={onNavigate} />
        <div style={{ fontSize: 12, color: THEME.textSoft, marginBottom: 18 }}>
          Required: scholarship name, country, status, and latest update date. Everything else is optional.
        </div>

        {submitCount > 0 && !canSubmit ? (
          <div
            role="alert"
            style={{
              border: "1px solid rgba(220,38,38,0.18)",
              background: "rgba(254,242,242,0.9)",
              color: "#b91c1c",
              padding: "12px 14px",
              borderRadius: 12,
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            Fix the highlighted fields before submitting.
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <FormField
            label="Scholarship Name"
            required
            error={shouldShowError("scholarship", errors, touched, submitCount) ? errors.scholarship : ""}
            hint={
              trimmedScholarship && exactDatabaseMatch
                ? "Matched to the imported scholarship database."
                : trimmedScholarship && !exactDatabaseMatch && exactKnownMatch
                  ? "Matched to a known community or manually verified scholarship name."
                  : trimmedScholarship && suggestions.length === 0
                    ? "Unknown scholarships are still accepted, but they usually enter the moderation queue first."
                    : ""
            }
          >
            {({ fieldId, errorId, hintId }) => (
              <div style={{ position: "relative" }}>
                <input
                  id={fieldId}
                  value={form.scholarship}
                  onChange={updateField("scholarship")}
                  onBlur={markTouched("scholarship")}
                  placeholder="e.g. Chevening, Fulbright, DAAD..."
                  aria-invalid={shouldShowError("scholarship", errors, touched, submitCount)}
                  aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
                  style={getInputStateStyle(shouldShowError("scholarship", errors, touched, submitCount))}
                />
                {suggestions.length > 0 ? (
                  <div
                    role="listbox"
                    aria-label="Scholarship suggestions"
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      background: THEME.panelBackgroundStrong,
                      border: `1px solid ${THEME.panelBorder}`,
                      borderRadius: 8,
                      marginTop: 4,
                      overflow: "hidden",
                      boxShadow: THEME.panelShadow,
                    }}
                  >
                    {suggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.source}-${suggestion.name}`}
                        type="button"
                        onClick={() => {
                          setForm((current) => ({ ...current, scholarship: suggestion.name }));
                          setTouched((current) => ({ ...current, scholarship: true }));
                          setSuggestions([]);
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 14px",
                          fontSize: 13,
                          color: THEME.textPrimary,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          background: "transparent",
                          border: "none",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <span style={{ color: suggestion.source === "community" ? "#D97706" : "#059669", fontSize: 11 }}>
                            {suggestion.source === "community" ? "⊕" : "✓"}
                          </span>
                          <span>{suggestion.name}</span>
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: THEME.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                          }}
                        >
                          {suggestion.source}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </FormField>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <FormField
              label="Country"
              required
              style={{ flex: "1 1 220px" }}
              error={shouldShowError("country", errors, touched, submitCount) ? errors.country : ""}
            >
              {({ fieldId, errorId }) => (
                <input
                  id={fieldId}
                  value={form.country}
                  onChange={updateField("country")}
                  onBlur={markTouched("country")}
                  placeholder="e.g. United Kingdom"
                  aria-invalid={shouldShowError("country", errors, touched, submitCount)}
                  aria-describedby={errorId}
                  style={getInputStateStyle(shouldShowError("country", errors, touched, submitCount))}
                />
              )}
            </FormField>
            <FormField
              label="Status"
              required
              style={{ flex: "1 1 220px" }}
              error={shouldShowError("status", errors, touched, submitCount) ? errors.status : ""}
            >
              {({ fieldId, errorId }) => (
                <select
                  id={fieldId}
                  value={useCustomStatus ? CUSTOM_STATUS_OPTION : form.status}
                  onChange={handleStatusSelect}
                  onBlur={markTouched("status")}
                  aria-invalid={shouldShowError("status", errors, touched, submitCount)}
                  aria-describedby={errorId}
                  style={getInputStateStyle(shouldShowError("status", errors, touched, submitCount))}
                >
                  <option value="" style={{ background: THEME.panelBackgroundStrong, color: THEME.textPrimary }}>
                    Select status
                  </option>
                  {STATUSES.map((status) => (
                    <option key={status} value={status} style={{ background: THEME.panelBackgroundStrong, color: THEME.textPrimary }}>
                      {status}
                    </option>
                  ))}
                  <option value={CUSTOM_STATUS_OPTION} style={{ background: THEME.panelBackgroundStrong, color: THEME.textPrimary }}>
                    Other / custom status
                  </option>
                </select>
              )}
            </FormField>
          </div>

          {useCustomStatus ? (
            <FormField
              label="Custom Status"
              required
              error={shouldShowError("status", errors, touched, submitCount) ? errors.status : ""}
              hint="Use this for statuses like Shortlisted, Nominated, Under Review, or any scholarship-specific update."
            >
              {({ fieldId, errorId, hintId }) => (
                <input
                  id={fieldId}
                  value={form.status}
                  onChange={updateField("status")}
                  onBlur={markTouched("status")}
                  placeholder="Type your custom status"
                  aria-invalid={shouldShowError("status", errors, touched, submitCount)}
                  aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
                  style={getInputStateStyle(shouldShowError("status", errors, touched, submitCount))}
                />
              )}
            </FormField>
          ) : null}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <FormField
              label="Latest Update Date"
              required
              style={{ flex: "1 1 220px" }}
              error={shouldShowError("date", errors, touched, submitCount) ? errors.date : ""}
            >
              {({ fieldId, errorId }) => (
                <input
                  id={fieldId}
                  type="date"
                  value={form.date}
                  onChange={updateField("date")}
                  onBlur={markTouched("date")}
                  aria-invalid={shouldShowError("date", errors, touched, submitCount)}
                  aria-describedby={errorId}
                  style={getInputStateStyle(shouldShowError("date", errors, touched, submitCount))}
                />
              )}
            </FormField>
            <FormField
              label="Cycle Year"
              style={{ flex: "1 1 220px" }}
              error={shouldShowError("cycleYear", errors, touched, submitCount) ? errors.cycleYear : ""}
            >
              {({ fieldId, errorId }) => (
                <input
                  id={fieldId}
                  value={form.cycleYear}
                  onChange={updateField("cycleYear")}
                  onBlur={markTouched("cycleYear")}
                  placeholder="e.g. 2026 or 2026/27"
                  aria-invalid={shouldShowError("cycleYear", errors, touched, submitCount)}
                  aria-describedby={errorId}
                  style={getInputStateStyle(shouldShowError("cycleYear", errors, touched, submitCount))}
                />
              )}
            </FormField>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <FormField
              label="Study Level"
              style={{ flex: "1 1 220px" }}
              error={shouldShowError("level", errors, touched, submitCount) ? errors.level : ""}
            >
              {({ fieldId, errorId }) => (
                <select
                  id={fieldId}
                  value={form.level}
                  onChange={updateField("level")}
                  onBlur={markTouched("level")}
                  aria-invalid={shouldShowError("level", errors, touched, submitCount)}
                  aria-describedby={errorId}
                  style={getInputStateStyle(shouldShowError("level", errors, touched, submitCount))}
                >
                  <option value="" style={{ background: THEME.panelBackgroundStrong, color: THEME.textPrimary }}>
                    Optional
                  </option>
                  {LEVELS.map((level) => (
                    <option key={level} value={level} style={{ background: THEME.panelBackgroundStrong, color: THEME.textPrimary }}>
                      {level}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField
              label="Field of Study"
              style={{ flex: "1 1 220px" }}
              error={shouldShowError("field", errors, touched, submitCount) ? errors.field : ""}
            >
              {({ fieldId, errorId }) => (
                <input
                  id={fieldId}
                  value={form.field}
                  onChange={updateField("field")}
                  onBlur={markTouched("field")}
                  placeholder="e.g. Economics, Engineering..."
                  aria-invalid={shouldShowError("field", errors, touched, submitCount)}
                  aria-describedby={errorId}
                  style={getInputStateStyle(shouldShowError("field", errors, touched, submitCount))}
                />
              )}
            </FormField>
          </div>

          <div style={{ borderTop: `1px solid ${THEME.panelBorderSoft}`, paddingTop: 14, marginTop: 2 }}>
            <button
              type="button"
              onClick={() => setShowMoreDetails((current) => !current)}
              aria-expanded={showMoreDetails}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: THEME.accentText,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {showMoreDetails ? "Hide extra details" : "Add more details"}
            </button>
            <div style={{ color: THEME.textSoft, fontSize: 12, marginTop: 6 }}>
              Optional timeline, profile, and application-context fields for people who want to be more specific.
            </div>
          </div>

          {showMoreDetails ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <FormField
                  label="University / Host Institution"
                  style={{ flex: "1 1 240px" }}
                  error={shouldShowError("university", errors, touched, submitCount) ? errors.university : ""}
                >
                  {({ fieldId, errorId }) => (
                    <input
                      id={fieldId}
                      value={form.university}
                      onChange={updateField("university")}
                      onBlur={markTouched("university")}
                      placeholder="e.g. University of Oxford"
                      aria-invalid={shouldShowError("university", errors, touched, submitCount)}
                      aria-describedby={errorId}
                      style={getInputStateStyle(shouldShowError("university", errors, touched, submitCount))}
                    />
                  )}
                </FormField>
                <FormField
                  label="Application Round"
                  style={{ flex: "1 1 240px" }}
                  error={shouldShowError("applicationRound", errors, touched, submitCount) ? errors.applicationRound : ""}
                >
                  {({ fieldId, errorId }) => (
                    <input
                      id={fieldId}
                      value={form.applicationRound}
                      onChange={updateField("applicationRound")}
                      onBlur={markTouched("applicationRound")}
                      placeholder="e.g. Round 1, Embassy track"
                      aria-invalid={shouldShowError("applicationRound", errors, touched, submitCount)}
                      aria-describedby={errorId}
                      style={getInputStateStyle(shouldShowError("applicationRound", errors, touched, submitCount))}
                    />
                  )}
                </FormField>
              </div>

              <FormField
                label="Program / Degree"
                error={shouldShowError("program", errors, touched, submitCount) ? errors.program : ""}
              >
                {({ fieldId, errorId }) => (
                  <input
                    id={fieldId}
                    value={form.program}
                    onChange={updateField("program")}
                    onBlur={markTouched("program")}
                    placeholder="e.g. MSc Economics for Development"
                    aria-invalid={shouldShowError("program", errors, touched, submitCount)}
                    aria-describedby={errorId}
                    style={getInputStateStyle(shouldShowError("program", errors, touched, submitCount))}
                  />
                )}
              </FormField>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <FormField
                  label="Applied Date"
                  error={shouldShowError("appliedDate", errors, touched, submitCount) ? errors.appliedDate : ""}
                >
                  {({ fieldId, errorId }) => (
                    <input
                      id={fieldId}
                      type="date"
                      value={form.appliedDate}
                      onChange={updateField("appliedDate")}
                      onBlur={markTouched("appliedDate")}
                      aria-invalid={shouldShowError("appliedDate", errors, touched, submitCount)}
                      aria-describedby={errorId}
                      style={getInputStateStyle(shouldShowError("appliedDate", errors, touched, submitCount))}
                    />
                  )}
                </FormField>
                <FormField
                  label="Interview Date"
                  error={shouldShowError("interviewDate", errors, touched, submitCount) ? errors.interviewDate : ""}
                >
                  {({ fieldId, errorId }) => (
                    <input
                      id={fieldId}
                      type="date"
                      value={form.interviewDate}
                      onChange={updateField("interviewDate")}
                      onBlur={markTouched("interviewDate")}
                      aria-invalid={shouldShowError("interviewDate", errors, touched, submitCount)}
                      aria-describedby={errorId}
                      style={getInputStateStyle(shouldShowError("interviewDate", errors, touched, submitCount))}
                    />
                  )}
                </FormField>
                <FormField
                  label="Final Decision Date"
                  error={
                    shouldShowError("finalDecisionDate", errors, touched, submitCount) ? errors.finalDecisionDate : ""
                  }
                >
                  {({ fieldId, errorId }) => (
                    <input
                      id={fieldId}
                      type="date"
                      value={form.finalDecisionDate}
                      onChange={updateField("finalDecisionDate")}
                      onBlur={markTouched("finalDecisionDate")}
                      aria-invalid={shouldShowError("finalDecisionDate", errors, touched, submitCount)}
                      aria-describedby={errorId}
                      style={getInputStateStyle(shouldShowError("finalDecisionDate", errors, touched, submitCount))}
                    />
                  )}
                </FormField>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <FormField
                  label="Nationality"
                  style={{ flex: "1 1 220px" }}
                  error={shouldShowError("nationality", errors, touched, submitCount) ? errors.nationality : ""}
                >
                  {({ fieldId, errorId }) => (
                    <input
                      id={fieldId}
                      value={form.nationality}
                      onChange={updateField("nationality")}
                      onBlur={markTouched("nationality")}
                      placeholder="Optional"
                      aria-invalid={shouldShowError("nationality", errors, touched, submitCount)}
                      aria-describedby={errorId}
                      style={getInputStateStyle(shouldShowError("nationality", errors, touched, submitCount))}
                    />
                  )}
                </FormField>
                <FormField
                  label="GPA"
                  style={{ flex: "1 1 220px" }}
                  error={shouldShowError("gpa", errors, touched, submitCount) ? errors.gpa : ""}
                >
                  {({ fieldId, errorId }) => (
                    <input
                      id={fieldId}
                      value={form.gpa}
                      onChange={updateField("gpa")}
                      onBlur={markTouched("gpa")}
                      placeholder="Optional"
                      aria-invalid={shouldShowError("gpa", errors, touched, submitCount)}
                      aria-describedby={errorId}
                      style={getInputStateStyle(shouldShowError("gpa", errors, touched, submitCount))}
                    />
                  )}
                </FormField>
              </div>

              <FormField label="Notes / Tips" error={shouldShowError("note", errors, touched, submitCount) ? errors.note : ""}>
                {({ fieldId, errorId }) => (
                  <textarea
                    id={fieldId}
                    value={form.note}
                    onChange={updateField("note")}
                    onBlur={markTouched("note")}
                    placeholder="Share your experience, timeline, tips for others..."
                    rows={3}
                    aria-invalid={shouldShowError("note", errors, touched, submitCount)}
                    aria-describedby={errorId}
                    style={{ ...getInputStateStyle(shouldShowError("note", errors, touched, submitCount)), resize: "vertical" }}
                  />
                )}
              </FormField>
            </div>
          ) : null}

          <input
            type="text"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
            aria-hidden="true"
          />
          {requiresCaptcha ? (
            <div>
              <TurnstileGate resetKey={captchaResetKey} onVerify={setCaptchaToken} />
              {shouldShowError("captchaToken", errors, touched, submitCount) ? (
                <div role="alert" style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
                  {errors.captchaToken}
                </div>
              ) : null}
            </div>
          ) : null}

          <button onClick={handleSubmit} disabled={!canSubmit} style={{ ...primaryButtonStyle, opacity: canSubmit ? 1 : 0.7 }}>
            Submit Anonymously
          </button>
        </div>
      </div>
    </div>
  );
}
