const fs = require("fs");
const path = require("path");
const { converterRouteGroups, converterRoutes } = require("./converter-routes");

const BASE_URL = "https://convertivo.vercel.app";
const sitemapPath = path.join(__dirname, "sitemap.xml");
const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const escapeXml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const formatName = (format) => format.toUpperCase();
const pageUrl = (slug) => `${BASE_URL}/${slug}`;
const previousSitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
const previousRouteSlugs = new Set(
  [...previousSitemap.matchAll(/<loc>https:\/\/convertivo\.vercel\.app\/([a-z0-9]+-to-[a-z0-9]+)<\/loc>/g)]
    .map(([, slug]) => slug)
);
const htmlLink = (route, text = `${formatName(route.from)} to ${formatName(route.to)}`) =>
  `<li><a href="/${escapeHtml(route.slug)}">${escapeHtml(text)}</a></li>`;
const relatedRoutes = (route) => converterRoutes.filter((candidate) => candidate.from === route.from && candidate.slug !== route.slug);

const renderConverterPage = (route) => {
  const from = formatName(route.from);
  const to = formatName(route.to);
  const title = `${from} to ${to} Converter | Convertivo`;
  const description = `Convert ${from} files to ${to} in your browser. Choose a local file and download the converted result.`;
  const url = pageUrl(route.slug);
  const relatedLinks = relatedRoutes(route)
    .map((relatedRoute) => htmlLink(relatedRoute))
    .join("\n        ");
  const relatedSection = relatedLinks
    ? `<section aria-labelledby="related-converters"><h2 id="related-converters">More ${escapeHtml(route.category.toLowerCase())} converters</h2><ul>\n        ${relatedLinks}\n      </ul></section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow">
  <meta property="og:site_name" content="Convertivo">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:image" content="${BASE_URL}/og-image.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${BASE_URL}/og-image.svg">
  <link rel="canonical" href="${escapeHtml(url)}">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main class="page landing-page">
    <header class="site-header">
      <a class="nav-logo" href="/" aria-label="Convertivo home"><strong>Convertivo</strong></a>
      <nav class="header-nav" aria-label="Main navigation">
        <a href="/converters">All converters</a>
        <a href="/?from=${route.from}&amp;to=${route.to}">Open converter</a>
      </nav>
    </header>
    <article class="landing-card">
      <p class="eyebrow">${escapeHtml(route.category)} conversion</p>
      <h1>${from} to ${to} Converter</h1>
      <p>Convert ${from} files to ${to} directly in your browser. Choose a local file, confirm the output format, and download the converted result.</p>
      <p>Your file is processed on your device and is not uploaded to Convertivo.</p>
      <a class="primary-btn landing-cta" href="/?from=${route.from}&amp;to=${route.to}">Start ${from} to ${to} conversion</a>
      ${relatedSection}
      <p><a href="/converters">Browse all converters</a></p>
    </article>
  </main>
</body>
</html>
`;
};

const renderConverterIndex = () => {
  const categories = converterRouteGroups.map(({ category }) => {
    const routes = converterRoutes.filter((route) => route.category === category);
    const links = routes.map((route) => htmlLink(route)).join("\n        ");
    return `<section aria-labelledby="converters-${category.toLowerCase()}">
      <h2 id="converters-${category.toLowerCase()}">${escapeHtml(category)} converters</h2>
      <ul>\n        ${links}\n      </ul>
    </section>`;
  }).join("\n    ");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>All File Converters | Convertivo</title>
  <meta name="description" content="Browse the image, document, audio, and video conversions available in Convertivo.">
  <meta name="robots" content="index, follow">
  <meta property="og:site_name" content="Convertivo">
  <meta property="og:type" content="website">
  <meta property="og:title" content="All File Converters | Convertivo">
  <meta property="og:description" content="Browse the image, document, audio, and video conversions available in Convertivo.">
  <meta property="og:url" content="${BASE_URL}/converters">
  <meta property="og:image" content="${BASE_URL}/og-image.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="All File Converters | Convertivo">
  <meta name="twitter:description" content="Browse the image, document, audio, and video conversions available in Convertivo.">
  <meta name="twitter:image" content="${BASE_URL}/og-image.svg">
  <link rel="canonical" href="${BASE_URL}/converters">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main class="page landing-page">
    <header class="site-header">
      <a class="nav-logo" href="/" aria-label="Convertivo home"><strong>Convertivo</strong></a>
      <nav class="header-nav" aria-label="Main navigation"><a href="/">Home</a></nav>
    </header>
    <article class="landing-card">
      <p class="eyebrow">Convertivo tools</p>
      <h1>All file converters</h1>
      <p>Choose a conversion to open its details and start the browser-based converter.</p>
      ${categories}
    </article>
  </main>
</body>
</html>
`;
};

const currentRouteSlugs = new Set(converterRoutes.map(({ slug }) => slug));
for (const staleSlug of previousRouteSlugs) {
  if (currentRouteSlugs.has(staleSlug)) continue;
  const stalePage = path.join(__dirname, staleSlug, "index.html");
  if (!fs.existsSync(stalePage)) continue;
  fs.unlinkSync(stalePage);
  try {
    fs.rmdirSync(path.dirname(stalePage));
  } catch (error) {
    if (error.code !== "ENOTEMPTY" && error.code !== "ENOENT") throw error;
  }
}

for (const route of converterRoutes) {
  const directory = path.join(__dirname, route.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), renderConverterPage(route), "utf8");
}

const convertersDirectory = path.join(__dirname, "converters");
fs.mkdirSync(convertersDirectory, { recursive: true });
fs.writeFileSync(path.join(convertersDirectory, "index.html"), renderConverterIndex(), "utf8");

const routes = ["", "converters", ...converterRoutes.map(({ slug }) => slug)];
const urls = routes.map((route) => `  <url>\n    <loc>${escapeXml(pageUrl(route))}</loc>\n  </url>`).join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
fs.writeFileSync(sitemapPath, sitemap, "utf8");
console.log(`Generated ${converterRoutes.length} converter pages and ${routes.length} sitemap URLs.`);
