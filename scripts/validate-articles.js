const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const contentDir = path.join(root, "content", "articles");
const publicDir = path.join(root, "public");
const files = fs.readdirSync(contentDir).filter((name) => name.endsWith(".md"));

if (files.length !== 20) throw new Error(`20 articles Markdown attendus, ${files.length} trouvés.`);

const urls = new Map();
for (const file of files) {
  const source = fs.readFileSync(path.join(contentDir, file), "utf8");
  const url = source.match(/^url:\s*["']?([^\r\n"']+)/m)?.[1]?.trim();
  const title = source.match(/^meta_title:\s*["']?([^\r\n]+)/m)?.[1]?.replace(/["']$/, "").trim();
  const description = source.match(/^meta_description:\s*["']?([^\r\n]+)/m)?.[1]?.replace(/["']$/, "").trim();
  if (!url || !title || !description || !/^#\s+.+$/m.test(source)) throw new Error(`Métadonnées ou H1 manquants : ${file}`);
  if (urls.has(url)) throw new Error(`URL dupliquée : ${url}`);
  urls.set(url, file);
  const page = path.join(publicDir, url.replace(/^\//, ""), "index.html");
  if (!fs.existsSync(page)) throw new Error(`Page générée absente : ${url}`);
  const html = fs.readFileSync(page, "utf8");
  for (const requirement of ['<link rel="canonical"', 'property="og:title"', 'name="twitter:card"', '"@type":"Article"', '"@type":"FAQPage"', '"@type":"BreadcrumbList"']) {
    if (!html.includes(requirement)) throw new Error(`${requirement} absent de ${url}`);
  }
}

const knownPaths = new Set(["/", "/articles/", ...urls.keys()]);
const broken = [];
for (const [url] of urls) {
  const html = fs.readFileSync(path.join(publicDir, url.replace(/^\//, ""), "index.html"), "utf8");
  for (const match of html.matchAll(/href="(\/[^"]*)"/g)) {
    const target = match[1].split("#")[0].split("?")[0];
    if (target && !knownPaths.has(target) && !fs.existsSync(path.join(publicDir, target.replace(/^\//, "")))) broken.push(`${url} -> ${target}`);
  }
}
if (broken.length) throw new Error(`Liens internes invalides :\n${broken.join("\n")}`);
if (!fs.existsSync(path.join(publicDir, "articles", "index.html"))) throw new Error("Index des articles absent.");

console.log("Articles valides : 20 pages, SEO, données structurées et liens internes contrôlés.");
