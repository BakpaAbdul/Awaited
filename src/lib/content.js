export function normalizeContentText(value = "") {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function contentToSlug(value = "") {
  return normalizeContentText(value).replace(/\s+/g, "-");
}

export function buildExcerpt(content = "", maxLength = 180) {
  const flattened = String(content)
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .trim();

  if (!flattened) {
    return "";
  }

  if (flattened.length <= maxLength) {
    return flattened;
  }

  return `${flattened.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}
