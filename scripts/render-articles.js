const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const outputDir = process.argv[2] || path.join(root, "qa-renders");
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const pages = fs.readdirSync(publicDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(publicDir, entry.name, "index.html")))
  .map((entry) => entry.name)
  .sort();

fs.mkdirSync(outputDir, { recursive: true });
let rendered = 0;

for (const slug of pages) {
  const source = `file:///${path.join(publicDir, slug, "index.html").replace(/\\/g, "/")}`;
  // Edge headless impose une largeur de mise en page minimale proche de 500 px.
  // Cette largeur exerce bien le breakpoint mobile (640 px) sans recadrage artificiel.
  for (const viewport of [{ name: "desktop", size: "1440,1000" }, { name: "mobile", size: "500,844" }]) {
    const screenshot = path.join(outputDir, `${slug}-${viewport.name}.png`);
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "edge-article-"));
    spawnSync(edge, [
      "--headless=old",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-features=RendererCodeIntegrity",
      `--user-data-dir=${profile}`,
      "--hide-scrollbars",
      `--window-size=${viewport.size}`,
      `--screenshot=${screenshot}`,
      source,
    ], { stdio: "ignore", timeout: 30000 });
    fs.rmSync(profile, { recursive: true, force: true });
    if (!fs.existsSync(screenshot)) throw new Error(`Capture absente : ${slug} ${viewport.name}`);
    rendered += 1;
  }
}

console.log(`${rendered} captures générées pour ${pages.length} pages.`);
