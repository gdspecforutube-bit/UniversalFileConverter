(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const input = $("#file-input");
  const SITE_ORIGIN = "https://convertivo.vercel.app";
  const scriptPromises = new Map();
  const loadScript = (src) => {
    if (scriptPromises.has(src)) return scriptPromises.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = () => {
        scriptPromises.delete(src);
        reject(new Error(`Could not load conversion library: ${src}`));
      };
      document.head.append(script);
    });
    scriptPromises.set(src, promise);
    return promise;
  };
  const ensurePdfJs = async () => {
    if (!window.pdfjsLib) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  };
  const imageInputs = ["jpg","jpeg","png","webp","heic","avif","svg","bmp","gif","ico"];
  const audioInputs = ["mp3","wav","aac","ogg","m4a","flac"];
  const videoInputs = ["mp4","webm"];
  const documentInputs = ["pdf"];
  const supportedInputs = [...imageInputs, ...documentInputs, ...audioInputs, ...videoInputs];
  const mimeByExtension = { pdf: ["application/pdf"], png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], webp: ["image/webp"], heic: ["image/heic","image/heif"], avif: ["image/avif"], svg: ["image/svg+xml","image/svg"], bmp: ["image/bmp"], gif: ["image/gif"], ico: ["image/x-icon","image/vnd.microsoft.icon"], mp3: ["audio/mpeg","audio/mp3"], wav: ["audio/wav","audio/x-wav"], aac: ["audio/aac","audio/x-aac"], ogg: ["audio/ogg"], m4a: ["audio/mp4","audio/x-m4a"], flac: ["audio/flac","audio/x-flac"], mp4: ["video/mp4"], webm: ["video/webm","audio/webm"] };
  let file = null, files = [], outputBlob = null, outputName = "", preferredTarget = "";
  let routeFrom = "", routeTo = "";
  const converterRoutes = window.CONVERTER_ROUTES;
  const validRoutePairs = new Set(converterRoutes.map(({ from, to }) => `${from}-to-${to}`));
  const formatName = (value) => value.toUpperCase();
  const routesForFile = (selectedFile) => {
    const source = normalizedExt(selectedFile.name);
    return converterRoutes.filter((route) => route.from === source);
  };
  const updateRouteMetadata = () => {
    const hasPair = routeFrom && routeTo;
    const pairLabel = hasPair ? `${formatName(routeFrom)} to ${formatName(routeTo)}` : "";
    const title = hasPair ? `${pairLabel} Converter | Convertivo` : "Convert Files in Your Browser | Convertivo";
    const description = hasPair ? `Convert ${formatName(routeFrom)} to ${formatName(routeTo)} in your browser. Your selected file is processed on your device.` : "Convert supported image, PDF, audio and video files in your browser. Choose a file, select an available format and download the result.";
    document.title = title;
    $('meta[name="description"]').setAttribute("content", description);
    $('meta[property="og:title"]').setAttribute("content", title);
    $('meta[property="og:description"]').setAttribute("content", description);
    $('meta[name="twitter:title"]').setAttribute("content", title);
    $('meta[name="twitter:description"]').setAttribute("content", description);
    const routeUrl = hasPair ? `${SITE_ORIGIN}/${routeFrom}-to-${routeTo}` : `${SITE_ORIGIN}/`;
    $('link[rel="canonical"]').setAttribute("href", routeUrl);
    $('meta[property="og:url"]').setAttribute("content", routeUrl);
    const schema = JSON.parse($("#structured-data").textContent);
    schema["@graph"][0].name = hasPair ? `${pairLabel} Converter — Convertivo` : "Convertivo";
    schema["@graph"][0].url = routeUrl;
    schema["@graph"][0].description = description;
    schema["@graph"][0].operatingSystem = "Any";
    schema["@graph"][0].applicationCategory = "UtilitiesApplication";
    schema["@graph"][0].featureList = hasPair ? [`${formatName(routeFrom)} to ${formatName(routeTo)} conversion`, "100% browser-based processing", "No registration required"] : schema["@graph"][0].featureList;
    $("#structured-data").textContent = JSON.stringify(schema);
    const badge = $("#format-pair-badge");
    badge.hidden = !hasPair;
    badge.textContent = hasPair ? `${formatName(routeFrom)} ➜ ${formatName(routeTo)}` : "";
  };
  const applyUrlRoute = () => {
    const params = new URLSearchParams(location.search);
    const pathPair = location.pathname.match(/\/([a-z0-9]+)-to-([a-z0-9]+)\/?$/i);
    const from = (params.get("from") || pathPair?.[1] || "").toLowerCase();
    const to = (params.get("to") || pathPair?.[2] || "").toLowerCase();
    const validPair = validRoutePairs.has(`${from}-to-${to}`);
    routeFrom = validPair ? from : "";
    routeTo = validPair ? to : "";
    preferredTarget = routeTo;
    if (routeFrom) input.accept = `.${routeFrom}`;
    updateRouteMetadata();
  };
  const ext = (name) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  const groupFor = (name) => documentInputs.includes(ext(name)) ? "document" : videoInputs.includes(ext(name)) ? "video" : audioInputs.includes(ext(name)) ? "audio" : "image";
  const normalizedExt = (name) => ext(name) === "jpeg" ? "jpg" : ext(name);
  const size = (value) => value < 1024 ? `${value} B` : value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(1)} MB`;
  const setProgress = (value, message) => { $("#progress-bar").style.width = `${value}%`; $("#progress-value").textContent = `${value}%`; $("#progress-message").textContent = message; };
  const showToast = (message) => { const toast = $("#toast"); toast.textContent = message; toast.hidden = false; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.hidden = true; }, 4200); };
  const validationWorker = new Worker(URL.createObjectURL(new Blob([`onmessage=async({data})=>{const b=new Uint8Array(data.buffer),e=data.extension;const ascii=new TextDecoder().decode(b.slice(0,512)).trimStart().toLowerCase();let ok=false;if(e==="pdf")ok=ascii.startsWith("%pdf-");else if(e==="docx")ok=b[0]===80&&b[1]===75;else if(["jpg","jpeg"].includes(e))ok=b[0]===255&&b[1]===216&&b[2]===255;else if(e==="png")ok=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71;else if(e==="gif")ok=ascii.startsWith("gif8");else if(e==="webp")ok=ascii.startsWith("riff")&&ascii.slice(8,12)==="webp";else if(e==="bmp")ok=b[0]===66&&b[1]===77;else if(["tif","tiff"].includes(e))ok=(b[0]===73&&b[1]===73&&b[2]===42)||(b[0]===77&&b[1]===77&&b[3]===42);else if(e==="ico")ok=b[0]===0&&b[1]===0&&b[2]===1&&b[3]===0;else if(["heic","avif"].includes(e))ok=ascii.includes("ftyp")&&/(heic|heix|hevc|avif|avis)/.test(ascii);else if(e==="wav")ok=ascii.startsWith("riff")&&ascii.slice(8,12)==="wave";else if(e==="webm")ok=b[0]===26&&b[1]===69&&b[2]===223&&b[3]===163;else if(e==="ogg")ok=ascii.startsWith("oggs");else if(e==="mp3")ok=ascii.startsWith("id3")||(b[0]===255&&(b[1]&224)===224);else if(e==="aac")ok=(b[0]===255&&(b[1]&246)===240);else if(e==="m4a")ok=ascii.includes("ftyp")&&/(m4a|mp4)/.test(ascii);else if(e==="flac")ok=ascii.startsWith("flac");else if(e==="svg")ok=ascii.includes("<svg")&&!/<script|on[a-z]+\\s*=|javascript:/i.test(ascii);else if(e==="txt")ok=!b.includes(0);postMessage(ok)}`], { type: "application/javascript" })));
  const validateFile = async (candidate) => new Promise((resolve) => { const worker = validationWorker; const done = (event) => { worker.removeEventListener("message", done); resolve(event.data === true); }; worker.addEventListener("message", done); candidate.slice(0, 4096).arrayBuffer().then((buffer) => worker.postMessage({ extension: ext(candidate.name), buffer }, [buffer])); });
  const showStep = (step) => { ["upload","convert","result"].forEach((name) => { const view = $(`#step-${name}`); const active = name === step; view.hidden = !active; view.classList.toggle("active", active); }); $$(".step-indicator span").forEach((node, index) => node.classList.toggle("active", index === ["upload","convert","result"].indexOf(step))); };
  function populateFormats() {
    const commonTargets = files
      .map((selectedFile) => new Set(routesForFile(selectedFile).map(({ to }) => to)))
      .reduce((common, targets) => new Set([...common].filter((target) => targets.has(target))));
    const optionsByCategory = {};
    for (const target of commonTargets) {
      const category = ["pdf", "txt"].includes(target) ? "document" : ["mp3", "wav"].includes(target) ? "audio" : "image";
      (optionsByCategory[category] ||= []).push([target, `${formatName(target)} (.${target})`]);
    }
    const rendered = Object.entries(optionsByCategory);
    renderFormats(rendered);
    renderTargetPicker(rendered);
    const targetOption = rendered.flatMap(([, entries]) => entries).find(([value]) => value === preferredTarget);
    if (targetOption) setCustomFormat(targetOption[0], targetOption[1]);
  }
  function renderFormats(categoryEntries) {
    const menu = $("#format-menu");
    menu.replaceChildren();
    categoryEntries.forEach(([category, entries]) => {
      const heading = document.createElement("div");
      heading.className = "custom-dropdown-heading";
      heading.textContent = category === "document" ? "DOCUMENTS" : category === "image" ? "IMAGES" : category.toUpperCase();
      menu.append(heading);
      entries.forEach(([value, text]) => {
        const option = document.createElement("button");
        option.className = "custom-dropdown-option";
        option.type = "button";
        option.role = "option";
        option.dataset.value = value;
        option.textContent = text;
        option.addEventListener("click", () => setCustomFormat(value, text));
        menu.append(option);
      });
    });
    setCustomFormat(categoryEntries[0]?.[1]?.[0]?.[0] || "", categoryEntries[0]?.[1]?.[0]?.[1] || "");
  }
  function renderTargetPicker(categoryEntries) {
    const options = $("#target-format-options");
    const categories = $("#target-format-categories");
    options.replaceChildren();
    categories.replaceChildren();
    const categoryNames = { document: "Documents", image: "Images", audio: "Audio", video: "Video" };
    categoryEntries.forEach(([category, entries], index) => {
      const categoryButton = document.createElement("button");
      categoryButton.type = "button";
      categoryButton.className = "target-format-category";
      categoryButton.textContent = categoryNames[category] || category;
      categoryButton.dataset.category = category;
      categoryButton.addEventListener("click", () => {
        $$(".target-format-category").forEach((item) => item.classList.toggle("active", item === categoryButton));
        $$(".target-format-option").forEach((item) => { item.hidden = item.dataset.category !== category; });
      });
      categories.append(categoryButton);
      entries.forEach(([value, text]) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "target-format-option";
        option.role = "option";
        option.dataset.category = category;
        option.dataset.value = value;
        option.setAttribute("aria-selected", String(value === preferredTarget));
        option.textContent = value === "jpg" ? "JPEG" : text.replace(/\s*\([^)]*\)/, "");
        option.addEventListener("click", () => {
          setCustomFormat(value, text);
          $("#target-format-modal").close();
          convert();
        });
        options.append(option);
      });
      if (index === 0) categoryButton.click();
    });
    const preferredOption = $(".target-format-option[aria-selected='true']");
    if (preferredOption) {
      const preferredCategory = $(`.target-format-category[data-category="${preferredOption.dataset.category}"]`);
      preferredCategory?.click();
    }
    $("#target-format-search").value = "";
    $("#target-format-source").textContent = `Detected ${formatName(normalizedExt(file.name))} file: ${file.name}`;
  }
  const openTargetPicker = () => $("#target-format-modal").showModal();
  function setCustomFormat(value, text) {
    const trigger = $("#format-trigger");
    trigger.dataset.value = value;
    trigger.textContent = text;
    $$(".custom-dropdown-option").forEach((option) => option.setAttribute("aria-selected", String(option.dataset.value === value)));
    $("#format-menu").classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }
  async function selectFile(selection) {
    const selected = [...(selection || [])].filter((nextFile) => supportedInputs.includes(ext(nextFile.name)) && (!nextFile.type || mimeByExtension[ext(nextFile.name)]?.includes(nextFile.type)));
    if (!selected.length) {
      showToast("Please choose a supported file type.");
      return;
    }
    const valid = [];
    for (const candidate of selected) if (await validateFile(candidate)) valid.push(candidate);
    if (!valid.length) { showToast("The selected file could not be validated."); return; }
    const commonTargets = valid
      .map((candidate) => new Set(routesForFile(candidate).map(({ to }) => to)))
      .reduce((common, targets) => new Set([...common].filter((target) => targets.has(target))));
    if (!commonTargets.size) {
      showToast("The selected files do not share a supported output format. Convert them separately.");
      return;
    }
    files = valid;
    file = files[0];
    $("#file-name").textContent = file.name;
    $("#file-meta").textContent = `${files.length > 1 ? `${files.length} files · ` : ""}${size(file.size)} · ${groupFor(file.name)} file`;
    populateFormats();
    showStep("convert");
    openTargetPicker();
  }
  function reset() { file = null; files = []; outputBlob = null; outputName = ""; input.value = ""; $("#success-card").hidden = true; $("#download-btn").hidden = true; $("#download-btn").removeAttribute("href"); $("#progress-bar").style.width = "0%"; $("#progress-value").textContent = "0%"; $("#result-title").textContent = "Converting your file..."; setProgress(0, "Preparing your conversion..."); showStep("upload"); }
  async function sourceBlob() {
    if (ext(file.name) === "svg") {
      const markup = await file.text();
      if (/<script\b|on[a-z]+\s*=|javascript:/i.test(markup)) throw new Error("SVG contains active content and was rejected for safety.");
      return new Blob([markup], { type: "image/svg+xml" });
    }
    if (ext(file.name) !== "heic") return file;
    if (!window.heic2any) await loadScript("https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js");
    const decoded = await heic2any({ blob: file, toType: "image/jpeg" });
    return Array.isArray(decoded) ? decoded[0] : decoded;
  }
  async function loadImage() {
    const blob = await sourceBlob();
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error("Image could not be read.")); });
      return { image, blob };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function canvasBlob(canvas, type, quality = .92) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The selected image format could not be generated."));
      } else if (blob.type !== type) {
        reject(new Error(`Your browser cannot create ${type.replace("image/", "").toUpperCase()} files.`));
      } else {
        resolve(blob);
      }
    }, type, quality));
  }
  async function imageBlob(target) {
    const { image } = await loadImage();
    const scale = Number($("#resize-width").value) > 0 ? Number($("#resize-width").value) / image.naturalWidth : (Number($("#resize-height").value) > 0 ? Number($("#resize-height").value) / image.naturalHeight : 1);
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (["jpg", "jpeg"].includes(target)) { context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.drawImage(image, 0, 0);
    const mime = target === "jpg" ? "image/jpeg" : target === "png" ? "image/png" : target === "webp" ? "image/webp" : target === "avif" ? "image/avif" : "image/png";
    return canvasBlob(canvas, mime, Number($("#quality-range").value) / 100);
  }
  async function pdfBlob() {
    if (!window.PDFLib) await loadScript("https://unpkg.com/pdf-lib/dist/pdf-lib.min.js");
    const { image } = await loadImage();
    const canvas = window.document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
    const pngBytes = await (await canvasBlob(canvas, "image/png")).arrayBuffer();
    const pdf = await PDFLib.PDFDocument.create();
    const embedded = await pdf.embedPng(pngBytes);
    const page = pdf.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    return new Blob([await pdf.save()], { type: "application/pdf" });
  }
  async function pdfImageBlob(target) {
    await ensurePdfJs();
    const pdfDocument = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    const mime = target === "jpg" ? "image/jpeg" : `image/${target}`;
    return canvasBlob(canvas, mime, Number($("#quality-range").value) / 100);
  }
  async function pdfTextBlob() {
    await ensurePdfJs();
    const pdfDocument = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const lastPage = $("#page-range").value === "first" ? 1 : pdfDocument.numPages;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= lastPage; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(" "));
    }
    return new Blob([pages.join("\n\n")], { type: "text/plain" });
  }
  let ffmpegInstance = null;
  async function transcodeMedia(target) {
    if (!window.FFmpegWASM) await loadScript("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js");
    if (!window.FFmpegUtil) await loadScript("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/umd/index.js");
    if (!window.FFmpegWASM || !window.FFmpegUtil) throw new Error("Media conversion is unavailable in this browser.");
    if (!ffmpegInstance) {
      ffmpegInstance = new window.FFmpegWASM.FFmpeg();
      ffmpegInstance.on("progress", ({ progress }) => setProgress(20 + Math.round(progress * 65), "Transcoding media in your browser..."));
      const core = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpegInstance.load({ coreURL: `${core}/ffmpeg-core.js`, wasmURL: `${core}/ffmpeg-core.wasm` });
    }
    const inputName = `input.${ext(file.name)}`;
    const outputNameForTarget = `output.${target}`;
    await ffmpegInstance.writeFile(inputName, await window.FFmpegUtil.fetchFile(file));
    await ffmpegInstance.exec(["-i", inputName, ...(target === "mp3" ? ["-vn", "-codec:a", "libmp3lame"] : ["-vn", "-codec:a", "pcm_s16le"]), outputNameForTarget]);
    const data = await ffmpegInstance.readFile(outputNameForTarget);
    return new Blob([data], { type: target === "mp3" ? "audio/mpeg" : "audio/wav" });
  }
  async function mediaBlob(target) {
    if (!["mp3", "wav"].includes(target)) throw new Error(`Conversion to ${formatName(target)} is not supported.`);
    return transcodeMedia(target);
  }
  async function convert() {
    const target=$("#format-trigger").dataset.value; showStep("result"); $("#result-title").textContent = "Converting your file..."; $("#success-card").hidden = true; $("#download-btn").hidden = true; setProgress(12,"Reading source file...");
    $("#conversion-spinner").hidden = false;
    try {
      if (!files.every((selectedFile) => routesForFile(selectedFile).some((route) => route.to === target))) {
        throw new Error(`Conversion to ${formatName(target)} is not supported for every selected file.`);
      }
      await new Promise((resolve) => setTimeout(resolve,180));
      const outputs = [];
      for (const currentFile of files) {
        file = currentFile;
        setProgress(48, `Converting ${currentFile.name}...`);
        const sourceGroup = groupFor(file.name);
        let blob;
        if (sourceGroup === "image") {
          blob = target === "pdf" ? await pdfBlob() : await imageBlob(target);
        } else if (sourceGroup === "document" && ext(file.name) === "pdf") {
          blob = target === "txt" ? await pdfTextBlob() : await pdfImageBlob(target);
        } else if (sourceGroup === "audio" || sourceGroup === "video") {
          blob = await mediaBlob(target);
        } else {
          throw new Error(`Conversion from ${formatName(normalizedExt(file.name))} is not supported.`);
        }
        outputs.push({ blob, name: `${file.name.replace(/\.[^.]+$/,"")}.${target}` });
      }
      let blob = outputs[0].blob;
      outputName = outputs[0].name;
      if (outputs.length > 1) {
        if (!window.JSZip) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
        const zip = new JSZip();
        outputs.forEach((output) => zip.file(output.name, output.blob));
        blob = await zip.generateAsync({ type: "blob" });
        outputName = "converted-files.zip";
      }
      outputBlob=blob; const url = URL.createObjectURL(blob); const download = $("#download-btn"); download.href = url; download.download = outputName; download.hidden = false; setProgress(100,"Your file is ready to download."); $("#result-title").textContent="Conversion Complete!"; $("#output-name").textContent=outputName; $("#success-card").hidden=false;
    } catch(error) { outputBlob = null; $("#result-title").textContent="Conversion could not be completed"; setProgress(100,error.message); showToast(error.message); } finally { $("#conversion-spinner").hidden = true; }
  }
  function $$(selector){return [...document.querySelectorAll(selector)]}
  $("#browse-btn").addEventListener("click",()=>input.click()); input.addEventListener("change",(event)=>selectFile(event.target.files)); $("#drop-zone").addEventListener("click",(event)=>{if(event.target.tagName!=="BUTTON")input.click()}); $("#drop-zone").addEventListener("keydown",(event)=>{if(event.key==="Enter"||event.key===" ")input.click()});
  $$("[data-pair-route]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    const pair = link.dataset.pairRoute.split("-to-");
    history.pushState({}, "", `/${link.dataset.pairRoute}`);
    routeFrom = pair[0];
    routeTo = pair[1];
    preferredTarget = routeTo;
    input.accept = `.${routeFrom}`;
    updateRouteMetadata();
  }));
  let dragDepth = 0;
  ["dragover","dragenter"].forEach((name)=>document.addEventListener(name,(event)=>{if (!event.dataTransfer?.types.includes("Files")) return; event.preventDefault(); dragDepth += 1; document.body.classList.add("dragging-window"); $("#drop-zone").classList.add("dragging");}));
  document.addEventListener("dragleave",(event)=>{if (!event.dataTransfer?.types.includes("Files")) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) { document.body.classList.remove("dragging-window"); $("#drop-zone").classList.remove("dragging"); }});
  document.addEventListener("drop",(event)=>{if (!event.dataTransfer?.types.includes("Files")) return; event.preventDefault(); dragDepth = 0; document.body.classList.remove("dragging-window"); $("#drop-zone").classList.remove("dragging"); if (event.target.closest("#drop-zone")) selectFile(event.dataTransfer.files);});
  $("#change-file").addEventListener("click",reset); $("#convert-btn").addEventListener("click",convert); $("#another-btn").addEventListener("click",reset);
  $("#quality-range").addEventListener("input",(event)=>$("#quality-value").textContent = `${event.target.value}%`);
  $("#format-trigger").addEventListener("click", () => { const menu = $("#format-menu"); const open = !menu.classList.contains("open"); menu.classList.toggle("open", open); $("#format-trigger").setAttribute("aria-expanded", String(open)); });
  $("#target-format-search").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    $$(".target-format-option").forEach((option) => { option.hidden = query ? !option.textContent.toLowerCase().includes(query) : option.dataset.category !== $(".target-format-category.active")?.dataset.category; });
  });
  $("#close-target-format").addEventListener("click", () => $("#target-format-modal").close());
  $("#target-format-modal").addEventListener("click", (event) => { if (event.target === $("#target-format-modal")) $("#target-format-modal").close(); });
  const bindPolicyModal = (linkSelector, modalSelector, closeSelector) => {
    const modal = $(modalSelector);
    $(linkSelector).addEventListener("click", (event) => { event.preventDefault(); modal.showModal(); });
    $(closeSelector).addEventListener("click", () => modal.close());
    modal.addEventListener("click", (event) => { if (event.target === modal) modal.close(); });
  };
  bindPolicyModal("#privacy-link", "#privacy-modal", "#close-privacy");
  bindPolicyModal("#terms-link", "#terms-modal", "#close-terms");
  const bindModal = (link, modal, close) => { $(link).addEventListener("click", (event) => { event.preventDefault(); $(modal).showModal(); }); $(close).addEventListener("click", () => $(modal).close()); $(modal).addEventListener("click", (event) => { if (event.target === $(modal)) $(modal).close(); }); };
  bindModal("#impressum-link", "#impressum-modal", "#close-impressum");
  const impressum = {
    title: "Legal Notice / Impressum",
    responsible: "Zonixx",
    contact: "Email: gdspecforutube@gmail.com",
    note: "This is currently a purely private, free, and non-commercial open-source project with no advertising intent. This information will be updated later."
  };
  $("#impressum-link").addEventListener("click", () => {
    $("#impressum-title").textContent = impressum.title;
    $("#impressum-responsible").textContent = impressum.responsible;
    $("#impressum-contact").textContent = impressum.contact;
    $("#impressum-note").textContent = impressum.note;
  });
  applyUrlRoute();
})();
