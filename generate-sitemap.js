const fs = require("fs");

const groups = [
  ["jpg", "png", "webp", "heic", "gif", "svg"],
  ["pdf", "txt"],
  ["mp3", "wav", "mp4"]
];
const formats = groups.flat();
const base = "https://universal-file-converter-app.vercel.app/";
const xmlEscape = (value) => value.replace(/&/g, "&amp;");
const urls = [base, `${base}png-to-jpg`, `${base}pdf-to-word`, `${base}mp4-to-mp3`];
for (const from of formats) {
  for (const to of formats) {
    if (from !== to) urls.push(`${base}?from=${from}&to=${to}`);
  }
}
const body = urls.map((url, index) => `  <url>\n    <loc>${xmlEscape(url)}</loc>\n    <lastmod>2026-09-10</lastmod>\n    <changefreq>${index === 0 ? "weekly" : "monthly"}</changefreq>\n    <priority>${index === 0 ? "1.0" : "0.7"}</priority>\n  </url>`).join("\n");
fs.writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
