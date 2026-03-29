import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const siteUrl = (process.env.VITE_SITE_URL || "https://awaited-orcin.vercel.app").replace(/\/+$/, "");
const scholarshipDbPath = path.join(repoRoot, "src", "lib", "scholarships-db.json");
const outputPath = path.join(repoRoot, "public", "sitemap.xml");

function normalizeScholarshipName(value = "") {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function scholarshipToSlug(name = "") {
  return normalizeScholarshipName(name).replace(/\s+/g, "-");
}

const scholarships = JSON.parse(fs.readFileSync(scholarshipDbPath, "utf8"));

const staticPaths = ["/", "/submit", "/blog", "/forum", "/privacy", "/community", "/disclaimer"];
const scholarshipPaths = scholarships.map((record) => `/scholarships/${scholarshipToSlug(record.name)}`);

const urls = [...new Set([...staticPaths, ...scholarshipPaths])]
  .sort((a, b) => a.localeCompare(b))
  .map(
    (pathname) => `
  <url>
    <loc>${siteUrl}${pathname === "/" ? "" : pathname}</loc>
  </url>`,
  )
  .join("");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>
`;

fs.writeFileSync(outputPath, xml);
