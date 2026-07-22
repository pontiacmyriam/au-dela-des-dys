const fs = require("fs");
const path = require("path");

const sitemapPath = path.join(__dirname, "..", "public", "sitemap.xml");
const sitemap = fs.readFileSync(sitemapPath, "utf8");

const requiredPatterns = [
  [/^<\?xml version="1\.0" encoding="UTF-8"\?>\s*/, "la déclaration XML UTF-8"],
  [/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/, "le namespace officiel sitemaps.org"],
  [/<loc>https:\/\/www\.audeladesdys\.fr\/<\/loc>/, "l’URL canonique du site"],
  [/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, "une date lastmod au format ISO"],
  [/<changefreq>weekly<\/changefreq>/, "la fréquence weekly"],
  [/<priority>1\.0<\/priority>/, "la priorité 1.0"],
  [/<\/urlset>\s*$/, "la fermeture de l’élément urlset"],
];

for (const [pattern, description] of requiredPatterns) {
  if (!pattern.test(sitemap)) throw new Error(`Sitemap invalide : ${description} est absent(e) ou incorrect(e).`);
}

const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (locations.length !== 29) throw new Error(`Sitemap invalide : 29 URL attendues, ${locations.length} trouvées.`);
if (new Set(locations).size !== locations.length) throw new Error("Sitemap invalide : des URL sont dupliquées.");

console.log("Sitemap XML valide : 29 URL uniques.");
