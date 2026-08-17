const fs = require("fs");
const path = require("path");

const sitemapPath = path.join(__dirname, "..", "public", "sitemap.xml");
const sitemap = fs.readFileSync(sitemapPath, "utf8");

const requiredPatterns = [
  [/^<\?xml version="1\.0" encoding="UTF-8"\?>\s*/, "la déclaration XML UTF-8"],
  [/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/, "le namespace officiel sitemaps.org"],
  [/<loc>https:\/\/www\.audeladesdys\.fr\/<\/loc>/, "l’URL canonique du site"],
  [/<loc>https:\/\/www\.audeladesdys\.fr\/articles\/<\/loc>/, "le hub Articles"],
  [/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, "une date lastmod au format ISO"],
  [/<\/urlset>\s*$/, "la fermeture de l’élément urlset"],
];

for (const [pattern, description] of requiredPatterns) {
  if (!pattern.test(sitemap)) throw new Error(`Sitemap invalide : ${description} est absent(e) ou incorrect(e).`);
}

const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (locations.length !== 22) throw new Error(`Sitemap invalide : 22 URL SEO attendues, ${locations.length} trouvées.`);
if (new Set(locations).size !== locations.length) throw new Error("Sitemap invalide : des URL sont dupliquées.");

const excluded = [
  "/contact/",
  "/mentions-legales/",
  "/politique-confidentialite/",
  "/cgu/",
  "/cgv/",
  "/politique-cookies/",
  "/remboursement-retractation/",
];
for (const pathname of excluded) {
  if (locations.some((url) => url.endsWith(pathname))) {
    throw new Error(`Sitemap invalide : la page non SEO ${pathname} ne doit pas être soumise à l’indexation.`);
  }
}

const articleSlugs = fs.readdirSync(path.join(__dirname, "..", "public"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => fs.existsSync(path.join(__dirname, "..", "public", name, "index.html")))
  .filter((name) => !["articles", "contact", "mentions-legales", "politique-confidentialite", "cgu", "cgv", "politique-cookies", "remboursement-retractation"].includes(name));

for (const slug of articleSlugs) {
  const expected = `https://www.audeladesdys.fr/${slug}`;
  if (!locations.includes(expected)) throw new Error(`Sitemap invalide : article manquant ${expected}`);
}

console.log(`Sitemap XML valide : ${locations.length} URL SEO uniques, sans pages légales.`);
