const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content", "articles");
const PUBLIC_DIR = path.join(ROOT, "public");
const SITE_URL = "https://www.audeladesdys.fr";
const SITE_NAME = "Au-delà des Dys";
const BUILD_DATE = new Date().toISOString().slice(0, 10);

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error("Frontmatter absent");
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    data[key] = value;
  }
  return { data, body: source.slice(match[0].length) };
}

function visibleArticleBody(body) {
  return body.split(/\r?\n---\r?\n/)[0].trim();
}

function inlineMarkdown(value) {
  let text = escapeHtml(value);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href);
    return `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });
  return text;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listType = null;

  function flushParagraph() {
    if (!paragraph.length) return;
    const text = paragraph.join(" ").trim();
    if (text.startsWith("**CTA principal :**")) {
      html.push(`<p class="cta-action"><a href="/">${inlineMarkdown(text.replace("**CTA principal :**", "").trim())}</a></p>`);
    } else {
      html.push(`<p>${inlineMarkdown(text)}</p>`);
    }
    paragraph = [];
  }

  function closeList() {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const label = heading[2].replace(/\*\*/g, "");
      const id = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      html.push(`<h${level} id="${id}">${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const wanted = ordered ? "ol" : "ul";
      if (listType !== wanted) {
        closeList();
        listType = wanted;
        html.push(`<${listType}>`);
      }
      html.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
      continue;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  closeList();
  return html.join("\n");
}

function extractFaq(markdown) {
  const start = markdown.indexOf("## Questions fréquentes");
  if (start === -1) return [];
  const tail = markdown.slice(start + "## Questions fréquentes".length);
  const end = tail.search(/\n##\s+/);
  const section = end === -1 ? tail : tail.slice(0, end);
  const matches = [...section.matchAll(/###\s+(.+)\r?\n\r?\n([\s\S]*?)(?=\r?\n###\s+|$)/g)];
  return matches.map((match) => ({
    question: match[1].trim(),
    answer: match[2].replace(/\s+/g, " ").trim(),
  }));
}

function extractDescription(markdown) {
  const cleaned = markdown
    .replace(/^#.+$/gm, "")
    .replace(/^>.+$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 220);
}

function pageTemplate(article, allArticles) {
  const canonical = `${SITE_URL}${article.url}`;
  const faq = extractFaq(article.markdown);
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.h1,
      description: article.metaDescription,
      mainEntityOfPage: canonical,
      image: `${SITE_URL}/logo512.png`,
      datePublished: BUILD_DATE,
      dateModified: BUILD_DATE,
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/logo512.png` },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Articles", item: `${SITE_URL}/articles/` },
        { "@type": "ListItem", position: 3, name: article.h1, item: canonical },
      ],
    },
  ];
  if (faq.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  const related = allArticles
    .filter((candidate) => candidate.url !== article.url)
    .slice(0, 6)
    .map((candidate) => `<li><a href="${candidate.url}">${escapeHtml(candidate.h1)}</a></li>`)
    .join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(article.metaTitle)}</title>
  <meta name="description" content="${escapeHtml(article.metaDescription)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${escapeHtml(article.metaTitle)}" />
  <meta property="og:description" content="${escapeHtml(article.metaDescription)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${SITE_URL}/logo512.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(article.metaTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(article.metaDescription)}" />
  <meta name="twitter:image" content="${SITE_URL}/logo512.png" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="../articles.css" />
  ${schemas.map((schema) => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`).join("\n  ")}
</head>
<body>
  <a class="skip-link" href="#article">Aller au contenu</a>
  <header class="site-header">
    <a class="brand" href="/">Au-delà des Dys</a>
    <nav aria-label="Navigation principale"><a href="/">Application</a><a href="/articles/">Tous les articles</a></nav>
  </header>
  <main id="article" class="article-layout">
    <article class="article-card">${article.html}</article>
    <aside class="related" aria-label="Articles complémentaires">
      <h2>À lire également</h2><ul>${related}</ul>
      <p><a class="button" href="/">Découvrir les activités</a></p>
    </aside>
  </main>
  <footer><p>© ${new Date().getFullYear()} Au-delà des Dys — Informations générales, sans diagnostic médical.</p><p><a href="/articles/">Articles</a> · <a href="/">Application</a></p></footer>
</body>
</html>`;
}

function indexTemplate(articles) {
  const cards = articles.map((article) => `
    <article class="article-preview"><p class="article-id">${escapeHtml(article.articleId || "Guide")}</p><h2><a href="${article.url}">${escapeHtml(article.h1)}</a></h2><p>${escapeHtml(article.metaDescription)}</p><a class="read-more" href="${article.url}">Lire l’article</a></article>`).join("\n");
  const canonical = `${SITE_URL}/articles/`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Articles sur la dyslexie et les troubles Dys",
    description: "Guides pratiques et fiables pour accompagner les enfants Dys.",
    url: canonical,
    mainEntity: { "@type": "ItemList", itemListElement: articles.map((article, index) => ({ "@type": "ListItem", position: index + 1, url: `${SITE_URL}${article.url}`, name: article.h1 })) },
  };
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Conseils dyslexie et troubles Dys | Au-delà des Dys</title><meta name="description" content="Découvrez 20 guides pratiques sur la dyslexie, les apprentissages et l’accompagnement des enfants Dys." /><link rel="canonical" href="${canonical}" /><meta property="og:type" content="website" /><meta property="og:title" content="Conseils dyslexie et troubles Dys" /><meta property="og:description" content="20 guides pratiques et fiables pour accompagner les enfants Dys." /><meta property="og:url" content="${canonical}" /><meta property="og:image" content="${SITE_URL}/logo512.png" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="Conseils dyslexie et troubles Dys" /><meta name="twitter:description" content="20 guides pratiques pour accompagner les enfants Dys." /><meta name="twitter:image" content="${SITE_URL}/logo512.png" /><link rel="stylesheet" href="../articles.css" /><script type="application/ld+json">${JSON.stringify(schema)}</script></head><body><a class="skip-link" href="#articles">Aller au contenu</a><header class="site-header"><a class="brand" href="/">Au-delà des Dys</a><nav><a href="/">Application</a><a href="/articles/" aria-current="page">Articles</a></nav></header><main id="articles" class="index"><section class="index-hero"><p class="eyebrow">Ressources pour les familles</p><h1>Comprendre et accompagner les troubles Dys</h1><p>Des articles approfondis, prudents et directement utiles pour mieux comprendre les difficultés de lecture et accompagner chaque enfant.</p></section><section class="article-grid" aria-label="Liste des articles">${cards}</section></main><footer><p>© ${new Date().getFullYear()} Au-delà des Dys — Informations générales, sans diagnostic médical.</p></footer></body></html>`;
}

const files = fs.readdirSync(CONTENT_DIR).filter((name) => name.endsWith(".md")).sort();
const articles = files.map((filename) => {
  const source = fs.readFileSync(path.join(CONTENT_DIR, filename), "utf8");
  const { data, body } = parseFrontmatter(source);
  const markdown = visibleArticleBody(body);
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (!data.url || !h1Match) throw new Error(`Article incomplet : ${filename}`);
  return {
    filename,
    url: data.url,
    articleId: data.article_id,
    metaTitle: data.meta_title || h1Match[1],
    metaDescription: data.meta_description || extractDescription(markdown),
    h1: h1Match[1],
    markdown,
    html: markdownToHtml(markdown),
  };
}).sort((left, right) => (left.articleId || "").localeCompare(right.articleId || "", "fr", { numeric: true }));

const urls = new Set();
for (const article of articles) {
  if (urls.has(article.url)) throw new Error(`URL dupliquée : ${article.url}`);
  urls.add(article.url);
  const output = path.join(PUBLIC_DIR, article.url.replace(/^\//, ""));
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, "index.html"), pageTemplate(article, articles), "utf8");
}

const articlesDir = path.join(PUBLIC_DIR, "articles");
fs.mkdirSync(articlesDir, { recursive: true });
fs.writeFileSync(path.join(articlesDir, "index.html"), indexTemplate(articles), "utf8");

const sitemapUrls = [
  { url: "/", priority: "1.0", frequency: "weekly" },
  { url: "/articles/", priority: "0.9", frequency: "weekly" },
  ...articles.map((article) => ({ url: article.url, priority: "0.8", frequency: "monthly" })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((item) => `  <url>\n    <loc>${SITE_URL}${item.url}</loc>\n    <lastmod>${BUILD_DATE}</lastmod>\n    <changefreq>${item.frequency}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>`).join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), sitemap, "utf8");

console.log(`${articles.length} articles générés dans public/ et sitemap mis à jour.`);
