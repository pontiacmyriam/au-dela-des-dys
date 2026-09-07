const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sitemapPath = path.join(root, "public", "sitemap.xml");
const contentDir = path.join(root, "content", "articles");
const sitemap = fs.readFileSync(sitemapPath, "utf8");

const requiredPatterns = [
  [/^<\?xml version="1\.0" encoding="UTF-8"\?>\s*/, "la déclaration XML UTF-8"],
  [/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/, "le namespace officiel sitemaps.org"],
  [/<loc>https:\/\/www\.audeladesdys\.fr\/<\/loc>/, "l’URL canonique du site"],
  [/<\/urlset>\s*$/, "la fermeture de l’élément urlset"],
];

for (const [pattern, description] of requiredPatterns) {
  if (!pattern.test(sitemap)) throw new Error(`Sitemap invalide : ${description} est absent(e) ou incorrect(e).`);
}

const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const articleCount = fs.readdirSync(contentDir).filter((name) => name.endsWith(".md")).length;
const expectedLocations = articleCount + 2; // accueil + index /articles/
if (locations.length !== expectedLocations) {
  throw new Error(`Sitemap invalide : ${expectedLocations} URL SEO attendues pour ${articleCount} articles, ${locations.length} trouvées.`);
}
if (new Set(locations).size !== locations.length) throw new Error("Sitemap invalide : des URL sont dupliquées.");

const excludedUtilityPaths = [
  "/contact/",
  "/mentions-legales/",
  "/politique-confidentialite/",
  "/cgu/",
  "/cgv/",
  "/politique-cookies/",
  "/remboursement-retractation/",
];
for (const pathname of excludedUtilityPaths) {
  if (locations.includes(`https://www.audeladesdys.fr${pathname}`)) {
    throw new Error(`Sitemap invalide : la page utilitaire ${pathname} ne doit pas être incluse.`);
  }
}

const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
for (const date of lastmods) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Sitemap invalide : lastmod incorrect (${date}).`);
}

console.log(`Sitemap XML valide : ${locations.length} URL uniques pour ${articleCount} articles, ${lastmods.length} date(s) lastmod explicite(s).`);
