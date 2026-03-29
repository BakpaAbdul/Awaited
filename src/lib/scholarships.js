import scholarshipDatabase from "./scholarships-db.json";

const LEGACY_ALIASES = {
  Fulbright: "Fulbright Scholarship",
  "DAAD EPOS": "DAAD EPOS Scholarship",
  "Gates Cambridge": "Gates Cambridge Scholarship",
  "Erasmus Mundus": "Erasmus Mundus Joint Masters",
  "Australia Awards": "Australia Awards Scholarship",
  "MEXT Scholarship": "MEXT Scholarship (Monbukagakusho)",
  "Türkiye Burslari": "Türkiye Bursları (Turkey Scholarships)",
  "Korean Government Scholarship (KGSP)": "Korean Government Scholarship (KGSP/GKS)",
  "Swedish Institute Scholarship": "Swedish Institute Scholarship (SISS)",
  "New Zealand Scholarships": "New Zealand Scholarships (Manaaki)",
  "Aga Khan Foundation": "Aga Khan Foundation Scholarship",
  "Chevening": "Chevening Scholarship",
  Rhodes: "Rhodes Scholarship",
  Commonwealth: "Commonwealth Scholarship",
  KGSP: "Korean Government Scholarship (KGSP/GKS)",
  GKS: "Korean Government Scholarship (KGSP/GKS)",
  CSC: "Chinese Government Scholarship (CSC)",
  MEXT: "MEXT Scholarship (Monbukagakusho)",
};

export function normalizeScholarshipName(value = "") {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function scholarshipToSlug(name = "") {
  return normalizeScholarshipName(name).replace(/\s+/g, "-");
}

export function sortScholarshipNames(names = []) {
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

export const DATABASE_SCHOLARSHIPS = [...scholarshipDatabase].sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
);

export const DATABASE_SCHOLARSHIP_NAMES = DATABASE_SCHOLARSHIPS.map((record) => record.name);

const databaseByName = new Map(DATABASE_SCHOLARSHIPS.map((record) => [record.name, record]));
const databaseLookup = new Map();

function addLookupEntry(alias, record) {
  const key = normalizeScholarshipName(alias);
  if (key) {
    databaseLookup.set(key, record);
  }
}

DATABASE_SCHOLARSHIPS.forEach((record) => {
  addLookupEntry(record.id, record);
  addLookupEntry(record.name, record);
});

Object.entries(LEGACY_ALIASES).forEach(([alias, canonicalName]) => {
  const record = databaseByName.get(canonicalName);
  if (record) {
    addLookupEntry(alias, record);
  }
});

export function getScholarshipRecord(name) {
  if (!name?.trim()) {
    return null;
  }

  return databaseLookup.get(normalizeScholarshipName(name)) || null;
}

export function getScholarshipRecordBySlug(slug) {
  if (!slug?.trim()) {
    return null;
  }

  return DATABASE_SCHOLARSHIPS.find((record) => scholarshipToSlug(record.name) === slug) || null;
}

export function getCanonicalScholarshipName(name) {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return "";
  }

  return getScholarshipRecord(trimmedName)?.name || trimmedName;
}

export function isDatabaseScholarship(name) {
  return Boolean(getScholarshipRecord(name));
}

export function findMatchingScholarshipName(name, candidateNames = []) {
  const lookupName = normalizeScholarshipName(name);

  if (!lookupName) {
    return null;
  }

  return candidateNames.find((candidate) => normalizeScholarshipName(candidate) === lookupName) || null;
}

export function removeScholarshipName(names = [], targetName) {
  const lookupName = normalizeScholarshipName(targetName);
  return sortScholarshipNames(names.filter((name) => normalizeScholarshipName(name) !== lookupName));
}

export function findScholarshipNameBySlug(slug, candidateNames = []) {
  if (!slug?.trim()) {
    return null;
  }

  return candidateNames.find((candidate) => scholarshipToSlug(candidate) === slug) || null;
}

export function buildScholarshipSuggestions(
  query,
  { verifiedScholarships = [], customScholarships = [] } = {},
) {
  const normalizedQuery = normalizeScholarshipName(query);

  if (!normalizedQuery) {
    return [];
  }

  const candidates = [
    ...DATABASE_SCHOLARSHIPS.map((record) => ({
      name: record.name,
      source: "database",
      subtitle: record.country,
    })),
    ...sortScholarshipNames(verifiedScholarships.filter((name) => !isDatabaseScholarship(name))).map((name) => ({
      name,
      source: "verified",
      subtitle: "Manually verified",
    })),
    ...sortScholarshipNames(customScholarships.filter((name) => !findMatchingScholarshipName(name, verifiedScholarships))).map((name) => ({
      name,
      source: "community",
      subtitle: "Community-added",
    })),
  ];

  const seen = new Set();

  return candidates
    .filter((candidate) => normalizeScholarshipName(candidate.name).includes(normalizedQuery))
    .filter((candidate) => {
      const key = normalizeScholarshipName(candidate.name);
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 6);
}
