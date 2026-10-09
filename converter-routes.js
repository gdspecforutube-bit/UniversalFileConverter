const converterRouteGroups = [
  {
    category: "Image",
    sources: ["jpg", "png", "webp", "avif", "svg", "bmp", "gif", "ico", "heic"],
    targets: ["jpg", "png", "webp", "pdf"]
  },
  {
    category: "Document",
    sources: ["pdf"],
    targets: ["jpg", "png", "webp", "txt"]
  },
  {
    category: "Audio",
    sources: ["mp3", "wav", "aac", "ogg", "m4a", "flac"],
    targets: ["mp3", "wav"]
  },
  {
    category: "Video",
    sources: ["mp4", "webm"],
    targets: ["mp3", "wav"]
  }
];

const converterRoutes = converterRouteGroups.flatMap(({ category, sources, targets }) =>
  sources.flatMap((from) =>
    targets
      .filter((to) => to !== from)
      .map((to) => ({ category, from, to, slug: `${from}-to-${to}` }))
  )
);

if (typeof module !== "undefined" && module.exports) {
  module.exports = { converterRouteGroups, converterRoutes };
}

if (typeof window !== "undefined") {
  window.CONVERTER_ROUTES = converterRoutes;
}
