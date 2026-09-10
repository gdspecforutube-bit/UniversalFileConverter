const fs = require("fs");
const path = require("path");

const BASE_URL = "https://universal-file-converter-app.vercel.app";
const formats = ["jpg", "png", "webp", "heic", "pdf", "txt", "mp3", "wav", "mp4"];
const lastmod = new Date().toISOString().slice(0, 10);
const xmlEscape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const routes = [""];

for (const from of formats) {
  for (const to of formats) {
    if (from !== to) routes.push(`${from}-to-${to}`);
  }
}

const urls = routes.map((route, index) => {
  const priority = index === 0 ? "1.0" : "0.7";
  const changefreq = index === 0 ? "weekly" : "monthly";
  return [
    "  <url>",
    `    <loc>${xmlEscape(`${BASE_URL}/${route}`)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>"
  ].join("\n");
}).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
fs.writeFileSync(path.join(__dirname, "sitemap.xml"), sitemap, "utf8");
console.log(`Generated ${routes.length} URLs in sitemap.xml`);
