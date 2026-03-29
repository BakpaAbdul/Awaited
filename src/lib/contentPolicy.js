import { LEVELS, STATUSES } from "./constants";

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/i;

function cleanText(value = "") {
  return value.replace(/\r\n/g, "\n").trim();
}

function ensureRequired(value, label) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }
}

function ensureMaxLength(value, maxLength, label) {
  if (value && value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
}

function ensureNoLinks(value, label) {
  if (value && URL_PATTERN.test(value)) {
    throw new Error(`${label} cannot include links right now.`);
  }
}

function ensureDateValue(value, label, { required = false } = {}) {
  if (!value) {
    if (required) {
      throw new Error(`${label} is required.`);
    }
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
}

function compareDates(left, right) {
  return new Date(`${left}T00:00:00Z`).getTime() - new Date(`${right}T00:00:00Z`).getTime();
}

function addError(errors, field, message) {
  if (!errors[field]) {
    errors[field] = message;
  }
}

function validateRequired(errors, field, value, label) {
  if (!value) {
    addError(errors, field, `${label} is required.`);
  }
}

function validateMaxLength(errors, field, value, maxLength, label) {
  if (value && value.length > maxLength) {
    addError(errors, field, `${label} must be ${maxLength} characters or fewer.`);
  }
}

function validateNoLinks(errors, field, value, label) {
  if (value && URL_PATTERN.test(value)) {
    addError(errors, field, `${label} cannot include links right now.`);
  }
}

function validateDate(errors, field, value, label, { required = false } = {}) {
  if (!value) {
    if (required) {
      addError(errors, field, `${label} is required.`);
    }
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    addError(errors, field, `${label} must be a valid date.`);
  }
}

export function sanitizeScholarshipName(name) {
  const sanitized = cleanText(name);

  ensureRequired(sanitized, "Scholarship name");
  ensureMaxLength(sanitized, 160, "Scholarship name");

  return sanitized;
}

export function sanitizeSubmission(entry = {}) {
  const sanitized = {
    scholarship: sanitizeScholarshipName(entry.scholarship),
    cycleYear: cleanText(entry.cycleYear),
    country: cleanText(entry.country),
    level: cleanText(entry.level),
    field: cleanText(entry.field),
    university: cleanText(entry.university),
    program: cleanText(entry.program),
    applicationRound: cleanText(entry.applicationRound),
    status: cleanText(entry.status),
    date: cleanText(entry.date) || new Date().toISOString().split("T")[0],
    appliedDate: cleanText(entry.appliedDate),
    interviewDate: cleanText(entry.interviewDate),
    finalDecisionDate: cleanText(entry.finalDecisionDate),
    nationality: cleanText(entry.nationality),
    gpa: cleanText(entry.gpa),
    note: cleanText(entry.note),
  };

  ensureRequired(sanitized.scholarship, "Scholarship name");
  ensureRequired(sanitized.country, "Country");
  ensureRequired(sanitized.status, "Status");

  if (sanitized.level && !LEVELS.includes(sanitized.level)) {
    throw new Error("Study level is invalid.");
  }

  if (!STATUSES.includes(sanitized.status)) {
    throw new Error("Status is invalid.");
  }

  ensureMaxLength(sanitized.scholarship, 160, "Scholarship name");
  ensureMaxLength(sanitized.cycleYear, 32, "Cycle year");
  ensureMaxLength(sanitized.country, 120, "Country");
  ensureMaxLength(sanitized.field, 160, "Field of study");
  ensureMaxLength(sanitized.university, 160, "University");
  ensureMaxLength(sanitized.program, 160, "Program");
  ensureMaxLength(sanitized.applicationRound, 80, "Application round");
  ensureMaxLength(sanitized.nationality, 120, "Nationality");
  ensureMaxLength(sanitized.gpa, 32, "GPA");
  ensureMaxLength(sanitized.note, 1200, "Notes");
  ensureNoLinks(sanitized.university, "University");
  ensureNoLinks(sanitized.program, "Program");
  ensureNoLinks(sanitized.applicationRound, "Application round");
  ensureNoLinks(sanitized.note, "Notes");

  ensureDateValue(sanitized.date, "Latest update date", { required: true });
  ensureDateValue(sanitized.appliedDate, "Applied date");
  ensureDateValue(sanitized.interviewDate, "Interview date");
  ensureDateValue(sanitized.finalDecisionDate, "Final decision date");

  if (sanitized.status === "Applied" && !sanitized.appliedDate) {
    sanitized.appliedDate = sanitized.date;
  }

  if (sanitized.status === "Interview" && !sanitized.interviewDate) {
    sanitized.interviewDate = sanitized.date;
  }

  if (["Accepted", "Rejected", "Waitlisted"].includes(sanitized.status) && !sanitized.finalDecisionDate) {
    sanitized.finalDecisionDate = sanitized.date;
  }

  if (sanitized.appliedDate && sanitized.interviewDate && compareDates(sanitized.interviewDate, sanitized.appliedDate) < 0) {
    throw new Error("Interview date cannot be earlier than applied date.");
  }

  if (sanitized.appliedDate && sanitized.finalDecisionDate && compareDates(sanitized.finalDecisionDate, sanitized.appliedDate) < 0) {
    throw new Error("Final decision date cannot be earlier than applied date.");
  }

  if (sanitized.interviewDate && sanitized.finalDecisionDate && compareDates(sanitized.finalDecisionDate, sanitized.interviewDate) < 0) {
    throw new Error("Final decision date cannot be earlier than interview date.");
  }

  return sanitized;
}

export function validateSubmissionDraft(entry = {}, { requiresCaptcha = false, captchaToken = "" } = {}) {
  const errors = {};
  const normalized = {
    scholarship: cleanText(entry.scholarship),
    cycleYear: cleanText(entry.cycleYear),
    country: cleanText(entry.country),
    level: cleanText(entry.level),
    field: cleanText(entry.field),
    university: cleanText(entry.university),
    program: cleanText(entry.program),
    applicationRound: cleanText(entry.applicationRound),
    status: cleanText(entry.status),
    date: cleanText(entry.date),
    appliedDate: cleanText(entry.appliedDate),
    interviewDate: cleanText(entry.interviewDate),
    finalDecisionDate: cleanText(entry.finalDecisionDate),
    nationality: cleanText(entry.nationality),
    gpa: cleanText(entry.gpa),
    note: cleanText(entry.note),
  };

  validateRequired(errors, "scholarship", normalized.scholarship, "Scholarship name");
  validateRequired(errors, "country", normalized.country, "Country");
  validateRequired(errors, "status", normalized.status, "Status");
  validateDate(errors, "date", normalized.date, "Latest update date", { required: true });

  if (normalized.level && !LEVELS.includes(normalized.level)) {
    addError(errors, "level", "Study level is invalid.");
  }

  if (normalized.status && !STATUSES.includes(normalized.status)) {
    addError(errors, "status", "Status is invalid.");
  }

  validateMaxLength(errors, "scholarship", normalized.scholarship, 160, "Scholarship name");
  validateMaxLength(errors, "cycleYear", normalized.cycleYear, 32, "Cycle year");
  validateMaxLength(errors, "country", normalized.country, 120, "Country");
  validateMaxLength(errors, "field", normalized.field, 160, "Field of study");
  validateMaxLength(errors, "university", normalized.university, 160, "University");
  validateMaxLength(errors, "program", normalized.program, 160, "Program");
  validateMaxLength(errors, "applicationRound", normalized.applicationRound, 80, "Application round");
  validateMaxLength(errors, "nationality", normalized.nationality, 120, "Nationality");
  validateMaxLength(errors, "gpa", normalized.gpa, 32, "GPA");
  validateMaxLength(errors, "note", normalized.note, 1200, "Notes");

  validateNoLinks(errors, "university", normalized.university, "University");
  validateNoLinks(errors, "program", normalized.program, "Program");
  validateNoLinks(errors, "applicationRound", normalized.applicationRound, "Application round");
  validateNoLinks(errors, "note", normalized.note, "Notes");

  validateDate(errors, "appliedDate", normalized.appliedDate, "Applied date");
  validateDate(errors, "interviewDate", normalized.interviewDate, "Interview date");
  validateDate(errors, "finalDecisionDate", normalized.finalDecisionDate, "Final decision date");

  if (
    normalized.appliedDate &&
    normalized.interviewDate &&
    compareDates(normalized.interviewDate, normalized.appliedDate) < 0
  ) {
    addError(errors, "interviewDate", "Interview date cannot be earlier than applied date.");
  }

  if (
    normalized.appliedDate &&
    normalized.finalDecisionDate &&
    compareDates(normalized.finalDecisionDate, normalized.appliedDate) < 0
  ) {
    addError(errors, "finalDecisionDate", "Final decision date cannot be earlier than applied date.");
  }

  if (
    normalized.interviewDate &&
    normalized.finalDecisionDate &&
    compareDates(normalized.finalDecisionDate, normalized.interviewDate) < 0
  ) {
    addError(errors, "finalDecisionDate", "Final decision date cannot be earlier than interview date.");
  }

  if (requiresCaptcha && !captchaToken) {
    addError(errors, "captchaToken", "Complete human verification to submit.");
  }

  return errors;
}

export function sanitizeComment(text) {
  const sanitized = cleanText(text);

  ensureRequired(sanitized, "Comment");
  ensureMaxLength(sanitized, 400, "Comment");
  ensureNoLinks(sanitized, "Comment");

  return sanitized;
}

export function sanitizeForumThread(entry = {}) {
  const sanitized = {
    title: cleanText(entry.title),
    body: cleanText(entry.body),
  };

  ensureRequired(sanitized.title, "Thread title");
  ensureRequired(sanitized.body, "Thread body");
  ensureMaxLength(sanitized.title, 160, "Thread title");
  ensureMaxLength(sanitized.body, 2400, "Thread body");
  ensureNoLinks(sanitized.body, "Thread body");

  return sanitized;
}

export function validateForumThreadDraft(entry = {}, { requiresCaptcha = false, captchaToken = "" } = {}) {
  const errors = {};
  const title = cleanText(entry.title);
  const body = cleanText(entry.body);

  validateRequired(errors, "title", title, "Thread title");
  validateRequired(errors, "body", body, "Thread body");
  validateMaxLength(errors, "title", title, 160, "Thread title");
  validateMaxLength(errors, "body", body, 2400, "Thread body");
  validateNoLinks(errors, "body", body, "Thread body");

  if (requiresCaptcha && !captchaToken) {
    addError(errors, "captchaToken", "Complete human verification to create a thread.");
  }

  return errors;
}

export function sanitizeForumReply(text) {
  const sanitized = cleanText(text);

  ensureRequired(sanitized, "Reply");
  ensureMaxLength(sanitized, 1200, "Reply");
  ensureNoLinks(sanitized, "Reply");

  return sanitized;
}

export function validateForumReplyDraft(text, { requiresCaptcha = false, captchaToken = "" } = {}) {
  const errors = {};
  const sanitized = cleanText(text);

  validateRequired(errors, "reply", sanitized, "Reply");
  validateMaxLength(errors, "reply", sanitized, 1200, "Reply");
  validateNoLinks(errors, "reply", sanitized, "Reply");

  if (requiresCaptcha && !captchaToken) {
    addError(errors, "captchaToken", "Complete human verification to post a reply.");
  }

  return errors;
}

export function sanitizeBlogPost(entry = {}) {
  const sanitized = {
    title: cleanText(entry.title),
    excerpt: cleanText(entry.excerpt),
    content: cleanText(entry.content),
  };

  ensureRequired(sanitized.title, "Post title");
  ensureRequired(sanitized.content, "Post content");
  ensureMaxLength(sanitized.title, 180, "Post title");
  ensureMaxLength(sanitized.excerpt, 280, "Excerpt");

  return sanitized;
}
