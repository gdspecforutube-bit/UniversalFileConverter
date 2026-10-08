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
    .map((relatedRoute) => `<a href="/${escapeHtml(relatedRoute.slug)}">${escapeHtml(`${formatName(relatedRoute.from)} to ${formatName(relatedRoute.to)}`)}</a>`)
    .join("\n        ");
  const relatedSection = relatedLinks
    ? `<section class="related-converters" aria-labelledby="related-converters-title">
        <h2 id="related-converters-title">More ${escapeHtml(route.category.toLowerCase())} converters</h2>
        <nav class="related-converter-links" aria-label="Related converters">\n        ${relatedLinks}
        </nav>
      </section>`
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
  <main class="page landing-page converter-landing">
    <header class="site-header">
      <a class="nav-logo" href="/" aria-label="Convertivo home">
        <span class="brand-mark" aria-hidden="true">⇄</span>
        <strong>Convertivo</strong>
      </a>
      <nav class="header-nav" aria-label="Main navigation">
        <a href="/converters">All converters</a>
      </nav>
    </header>
    <section class="converter-hero" aria-labelledby="converter-title">
      <p class="eyebrow">${escapeHtml(route.category)} converter</p>
      <h1 id="converter-title">${from} to ${to} Converter</h1>
      <p class="converter-lead">Convert ${from} files to ${to} quickly and privately in your browser.</p>
      <a class="primary-btn converter-cta" href="/?from=${route.from}&amp;to=${route.to}">
        Convert ${from} to ${to}
        <span aria-hidden="true">→</span>
      </a>
      <p class="converter-privacy">Choose a file, convert it, and download the result. Your files stay on your device.</p>
    </section>
    <section class="converter-details" aria-label="About this converter">
      <p>Convertivo processes your ${from} file locally in your browser and creates a ${to} download. No software installation is needed.</p>
      ${relatedSection}
      <a class="all-converters-link" href="/converters">Browse all converters <span aria-hidden="true">→</span></a>
    </section>
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
  <main class="page landing-page converter-landing converter-directory">
    <header class="site-header">
      <a class="nav-logo" href="/" aria-label="Convertivo home">
        <span class="brand-mark" aria-hidden="true">⇄</span>
        <strong>Convertivo</strong>
      </a>
      <nav class="header-nav" aria-label="Main navigation"><a href="/">Home</a></nav>
    </header>
    <article class="converter-directory-content">
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
