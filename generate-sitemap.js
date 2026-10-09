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
  `<li data-converter-item><a href="/${escapeHtml(route.slug)}">${escapeHtml(text)}</a></li>`;
const relatedRoutes = (route) => converterRoutes.filter((candidate) => candidate.from === route.from && candidate.slug !== route.slug);
const conversionDescription = (route) => {
  const from = formatName(route.from);
  const to = formatName(route.to);
  if (route.category === "Document") {
    return route.to === "txt"
      ? "Extract selectable text from every page of a PDF into a plain text file."
      : `Convert every PDF page to a separate ${to} image, or choose the first page only.`;
  }
  if (route.category === "Audio") return `Transcode ${from} audio to ${to} in your browser.`;
  if (route.category === "Video") return `Extract the audio track from ${from} and save it as ${to}.`;
  if (route.to === "pdf") return `Place this ${from} image on a page in a PDF document.`;
  if (route.to === "jpg") return `Convert this ${from} image to JPG. Transparent areas are filled with white.`;
  return `Convert this ${from} image to ${to}.`;
};

const renderConverterPage = (route) => {
  const from = formatName(route.from);
  const to = formatName(route.to);
  const title = `${from} to ${to} Converter | Convertivo`;
  const conversionSummary = conversionDescription(route);
  const description = `${conversionSummary} Choose a local file and download the result.`;
  const url = pageUrl(route.slug);
  const relatedLinks = relatedRoutes(route)
    .map((relatedRoute) => `<a href="/${escapeHtml(relatedRoute.slug)}"><span>${escapeHtml(`${formatName(relatedRoute.from)} → ${formatName(relatedRoute.to)}`)}</span><span aria-hidden="true">↗</span></a>`)
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
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/">Home</a><span aria-hidden="true">/</span><a href="/converters">All converters</a><span aria-hidden="true">/</span><span aria-current="page">${from} to ${to}</span>
    </nav>
    <section class="converter-hero" aria-labelledby="converter-title">
      <p class="eyebrow">${escapeHtml(route.category)} converter</p>
      <h1 id="converter-title">${from} to ${to} Converter</h1>
      <p class="converter-lead">${escapeHtml(conversionSummary)}</p>
      <section class="converter-tool-panel" aria-label="Start ${from} to ${to} conversion">
        <p class="tool-panel-prompt">Choose a local ${from} file</p>
        <a class="primary-btn converter-cta" href="/?from=${route.from}&amp;to=${route.to}">Convert ${from} to ${to}</a>
        <p class="converter-privacy">Your file is processed in your browser and is not uploaded to Convertivo.</p>
      </section>
    </section>
    <section class="converter-details" aria-label="About this converter">
      <section class="converter-process" aria-labelledby="how-it-works-title">
        <h2 id="how-it-works-title">How it works</h2>
        <ol>
          <li>Choose a ${from} file from your device.</li>
          <li>Convert it in your browser.</li>
          <li>Download the ${to} result.</li>
        </ol>
      </section>
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
  <meta name="description" content="Find available image, PDF, audio, and video conversions in Convertivo. Search formats and choose a tool.">
  <meta name="robots" content="index, follow">
  <meta property="og:site_name" content="Convertivo">
  <meta property="og:type" content="website">
  <meta property="og:title" content="All File Converters | Convertivo">
  <meta property="og:description" content="Find available image, PDF, audio, and video conversions in Convertivo. Search formats and choose a tool.">
  <meta property="og:url" content="${BASE_URL}/converters">
  <meta property="og:image" content="${BASE_URL}/og-image.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="All File Converters | Convertivo">
  <meta name="twitter:description" content="Find available image, PDF, audio, and video conversions in Convertivo. Search formats and choose a tool.">
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
      <nav class="header-nav" aria-label="Main navigation"><a href="/converters">All converters</a></nav>
    </header>
    <article class="converter-directory-content">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">All converters</span></nav>
      <p class="eyebrow">Convertivo tools</p>
      <h1>All file converters</h1>
      <p>Search supported formats, then choose a converter to get started.</p>
      <label class="converter-search" for="converter-search">Search converters
        <input id="converter-search" type="search" placeholder="Try JPG to PNG" autocomplete="off">
      </label>
      <p id="converter-search-status" class="converter-search-status" role="status" aria-live="polite">${converterRoutes.length} converters</p>
      ${categories}
    </article>
  </main>
  <script>
    const search = document.querySelector("#converter-search");
    const items = [...document.querySelectorAll("[data-converter-item]")];
    const sections = [...document.querySelectorAll(".converter-directory-content section")];
    const status = document.querySelector("#converter-search-status");
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      for (const item of items) {
        const matches = item.textContent.toLowerCase().includes(query);
        item.hidden = !matches;
        if (matches) visible += 1;
      }
      for (const section of sections) section.hidden = !section.querySelector("[data-converter-item]:not([hidden])");
      status.textContent = query ? \`\${visible} \${visible === 1 ? "converter" : "converters"} found\` : \`\${visible} converters\`;
    });
  </script>
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
