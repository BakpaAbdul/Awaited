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
  ensureRequired(sanitized.cycleYear, "Cycle year");
  ensureRequired(sanitized.country, "Country");
  ensureRequired(sanitized.field, "Field of study");

  if (!LEVELS.includes(sanitized.level)) {
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

export function sanitizeForumReply(text) {
  const sanitized = cleanText(text);

  ensureRequired(sanitized, "Reply");
  ensureMaxLength(sanitized, 1200, "Reply");
  ensureNoLinks(sanitized, "Reply");

  return sanitized;
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
