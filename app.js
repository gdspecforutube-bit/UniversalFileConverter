(() => {
  "use strict";
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const $ = (selector) => document.querySelector(selector);
  const input = $("#file-input");
  const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";
  const GOOGLE_DEVELOPER_KEY = "YOUR_GOOGLE_DEVELOPER_KEY";
  const DROPBOX_APP_KEY = "YOUR_DROPBOX_APP_KEY";
  // Set to false while credentials are being configured to disable cloud buttons.
  const CLOUD_BUTTONS_ENABLED = true;
  const ADSENSE_ENABLED = false;
  const GOOGLE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
  let configuredGoogleClientId = localStorage.getItem("googleDriveClientId") || GOOGLE_CLIENT_ID;
  let configuredDropboxAppKey = localStorage.getItem("dropboxAppKey") || DROPBOX_APP_KEY;
  let googleTokenClient = null, googleAccessToken = "";
  document.documentElement.dataset.adsense = ADSENSE_ENABLED ? "enabled" : "placeholder";
  const imageInputs = ["jpg","jpeg","png","webp","heic","avif","svg","bmp","gif","ico","tif","tiff"];
  const audioInputs = ["mp3","wav","aac","ogg","m4a","flac"];
  const documentInputs = ["pdf","docx","txt"];
  const supportedInputs = [...imageInputs, ...documentInputs, ...audioInputs, "webm"];
  const mimeByExtension = { pdf: ["application/pdf"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], webp: ["image/webp"], heic: ["image/heic","image/heif"], avif: ["image/avif"], svg: ["image/svg+xml","image/svg"], bmp: ["image/bmp"], gif: ["image/gif"], ico: ["image/x-icon","image/vnd.microsoft.icon"], tif: ["image/tiff"], tiff: ["image/tiff"], txt: ["text/plain"], mp3: ["audio/mpeg","audio/mp3"], wav: ["audio/wav","audio/x-wav"], aac: ["audio/aac","audio/x-aac"], ogg: ["audio/ogg"], m4a: ["audio/mp4","audio/x-m4a"], flac: ["audio/flac","audio/x-flac"], webm: ["video/webm","audio/webm"] };
  const targetFormats = {
    image: [["png","PNG (.png)"],["jpg","JPG (.jpg)"],["webp","WEBP (.webp)"],["avif","AVIF (.avif)"],["svg","SVG (.svg)"]],
    audio: [["mp3","MP3 (.mp3)"],["wav","WAV (.wav)"],["ogg","OGG (.ogg)"],["m4a","M4A (.m4a)"],["flac","FLAC (.flac)"]],
    document: [["docx","Word (.docx)"],["pdf","PDF (.pdf)"],["txt","TXT (.txt)"],["png","PNG (.png)"],["jpg","JPG (.jpg)"]]
  };
  const toolPresets = {
    image: { title: "Image Converter", subtitle: "Convert images to the format you need.", accept: "image/*,.jpg,.jpeg,.png,.webp,.heic,.avif,.svg", categories: { image: targetFormats.image } },
    document: { title: "Document Converter", subtitle: "Convert documents locally and securely.", accept: ".pdf,.docx,.xlsx,.pptx,.txt", categories: { document: targetFormats.document.filter(([value]) => ["docx", "pdf", "txt"].includes(value)), image: targetFormats.document.filter(([value]) => ["png", "jpg"].includes(value)) } },
    audio: { title: "Audio Converter", subtitle: "Reduce audio file size or change format.", accept: "audio/*,.mp3,.wav,.aac,.flac,.ogg,.m4a", categories: { audio: targetFormats.audio } },
    video: { title: "Video Converter", subtitle: "Convert video files locally in your browser.", accept: "video/*,.mp4,.webm,.mov,.avi,.mkv", categories: { video: [["mp4", "MP4 (.mp4)"], ["webm", "WEBM (.webm)"], ["mov", "MOV (.mov)"], ["avi", "AVI (.avi)"], ["mkv", "MKV (.mkv)"]] } },
    compress: { title: "Compress Files", subtitle: "Reduce file size without uploading your files.", accept: ".pdf,.png,.jpg,.jpeg", categories: { image: targetFormats.image, document: [["pdf", "PDF (.pdf)"]] } },
    pdf: { title: "Merge PDF", subtitle: "Combine documents locally into one PDF.", accept: ".pdf,.docx,.xlsx,.pptx,.txt", categories: { document: [["pdf", "PDF (.pdf)"]] } },
    archive: { title: "Archive Converter", subtitle: "Convert archive files locally and securely.", accept: ".zip,.rar,.7z,.tar.gz", categories: { archive: [["zip", "ZIP (.zip)"], ["rar", "RAR (.rar)"], ["7z", "7Z (.7z)"], ["tar.gz", "TAR.GZ (.tar.gz)"]] } },
    font: { title: "Font Converter", subtitle: "Convert font files in your browser.", accept: ".ttf,.otf,.woff,.woff2", categories: { font: [["ttf", "TTF (.ttf)"], ["otf", "OTF (.otf)"], ["woff", "WOFF (.woff)"], ["woff2", "WOFF2 (.woff2)"]] } }
  };
  let file = null, files = [], outputBlob = null, outputName = "", compressMode = false, preferredTarget = "";
  const ext = (name) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  const groupFor = (name) => documentInputs.includes(ext(name)) ? "document" : audioInputs.includes(ext(name)) || ext(name) === "webm" ? "audio" : "image";
  const normalizedExt = (name) => ext(name) === "jpeg" ? "jpg" : ext(name);
  const size = (value) => value < 1024 ? `${value} B` : value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(1)} MB`;
  const setProgress = (value, message) => { $("#progress-bar").style.width = `${value}%`; $("#progress-value").textContent = `${value}%`; $("#progress-message").textContent = message; };
  const showToast = (message) => { const toast = $("#toast"); toast.textContent = message; toast.hidden = false; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.hidden = true; }, 4200); };
  const validationWorker = new Worker(URL.createObjectURL(new Blob([`onmessage=async({data})=>{const b=new Uint8Array(data.buffer),e=data.extension;const ascii=new TextDecoder().decode(b.slice(0,512)).trimStart().toLowerCase();let ok=false;if(e==="pdf")ok=ascii.startsWith("%pdf-");else if(e==="docx")ok=b[0]===80&&b[1]===75;else if(["jpg","jpeg"].includes(e))ok=b[0]===255&&b[1]===216&&b[2]===255;else if(e==="png")ok=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71;else if(e==="gif")ok=ascii.startsWith("gif8");else if(e==="webp")ok=ascii.startsWith("riff")&&ascii.slice(8,12)==="webp";else if(e==="bmp")ok=b[0]===66&&b[1]===77;else if(["tif","tiff"].includes(e))ok=(b[0]===73&&b[1]===73&&b[2]===42)||(b[0]===77&&b[1]===77&&b[3]===42);else if(e==="ico")ok=b[0]===0&&b[1]===0&&b[2]===1&&b[3]===0;else if(["heic","avif"].includes(e))ok=ascii.includes("ftyp")&&/(heic|heix|hevc|avif|avis)/.test(ascii);else if(e==="wav")ok=ascii.startsWith("riff")&&ascii.slice(8,12)==="wave";else if(e==="webm")ok=b[0]===26&&b[1]===69&&b[2]===223&&b[3]===163;else if(e==="ogg")ok=ascii.startsWith("oggs");else if(e==="mp3")ok=ascii.startsWith("id3")||(b[0]===255&&(b[1]&224)===224);else if(e==="aac")ok=(b[0]===255&&(b[1]&246)===240);else if(e==="m4a")ok=ascii.includes("ftyp")&&/(m4a|mp4)/.test(ascii);else if(e==="flac")ok=ascii.startsWith("flac");else if(e==="svg")ok=ascii.includes("<svg")&&!/<script|on[a-z]+\\s*=|javascript:/i.test(ascii);else if(e==="txt")ok=!b.includes(0);postMessage(ok)}`], { type: "application/javascript" })));
  const validateFile = async (candidate) => new Promise((resolve) => { const worker = validationWorker; const done = (event) => { worker.removeEventListener("message", done); resolve(event.data === true); }; worker.addEventListener("message", done); candidate.slice(0, 4096).arrayBuffer().then((buffer) => worker.postMessage({ extension: ext(candidate.name), buffer }, [buffer])); });
  const showStep = (step) => { ["upload","convert","result"].forEach((name) => { const view = $(`#step-${name}`); const active = name === step; view.hidden = !active; view.classList.toggle("active", active); }); $$(".step-indicator span").forEach((node, index) => node.classList.toggle("active", index === ["upload","convert","result"].indexOf(step))); };
  function populateFormats() {
    const sourceExt = normalizedExt(file.name);
    const sourceGroup = groupFor(file.name);
    const optionsByCategory = sourceGroup === "image" || sourceGroup === "document"
      ? { document: targetFormats.document.filter(([value]) => ["docx", "pdf", "txt"].includes(value)), image: targetFormats.image }
      : { audio: targetFormats.audio };
    renderFormats(Object.entries(optionsByCategory).map(([category, entries]) => [category, entries.filter(([value]) => value !== sourceExt)]).filter(([, entries]) => entries.length));
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
    files = valid;
    file = files[0];
    $("#file-name").textContent = file.name;
    $("#file-meta").textContent = `${files.length > 1 ? `${files.length} files · ` : ""}${size(file.size)} · ${groupFor(file.name)} file`;
    populateFormats();
    showStep("convert");
  }
  function reset() { file = null; files = []; outputBlob = null; outputName = ""; input.value = ""; $("#success-card").hidden = true; $("#download-btn").hidden = true; $("#download-btn").removeAttribute("href"); $("#progress-bar").style.width = "0%"; $("#progress-value").textContent = "0%"; $("#result-title").textContent = "Converting your file..."; setProgress(0, "Preparing your conversion..."); showStep("upload"); }
  function setMode(mode) {
    compressMode = mode === "compress";
    $("#upload-title").textContent = compressMode ? "Compress your file" : "Upload your file";
    $(".step-description").textContent = compressMode ? "Reduce image file size directly in your browser." : "Drop any supported file below, or browse your device to get started.";
  }
  async function sourceBlob() {
    if (ext(file.name) === "svg") {
      const markup = await file.text();
      if (/<script\b|on[a-z]+\s*=|javascript:/i.test(markup)) throw new Error("SVG contains active content and was rejected for safety.");
      return new Blob([markup], { type: "image/svg+xml" });
    }
    if (ext(file.name) !== "heic") return file;
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
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The selected image format could not be generated.")), type, quality));
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
    if (target === "svg") {
      const dataUrl = canvas.toDataURL("image/png");
      return new Blob([`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image x="0" y="0" width="100%" height="100%" xlink:href="${dataUrl}" href="${dataUrl}"/></svg>`], { type: "image/svg+xml" });
    }
    const mime = target === "jpg" ? "image/jpeg" : target === "png" ? "image/png" : target === "webp" ? "image/webp" : target === "avif" ? "image/avif" : "image/png";
    return canvasBlob(canvas, mime, Number($("#quality-range").value) / 100);
  }
  async function pdfBlob() {
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
  async function mediaBlob(target) {
    const mime = { mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac", ogg: "audio/ogg", m4a: "audio/mp4", flac: "audio/flac", webm: "video/webm" }[target] || file.type || "application/octet-stream";
    return new Blob([await file.arrayBuffer()], { type: mime });
  }
  async function convert() {
    const target=$("#format-trigger").dataset.value; showStep("result"); $("#result-title").textContent = "Converting your file..."; $("#success-card").hidden = true; $("#download-btn").hidden = true; setProgress(12,"Reading source file...");
    $("#conversion-spinner").hidden = false;
    try { await new Promise((resolve) => setTimeout(resolve,180)); const outputs = [];
      for (const currentFile of files) {
        file = currentFile;
        setProgress(48, `Converting ${currentFile.name}...`);
        const sourceGroup = groupFor(file.name);
        const blob = sourceGroup === "image" ? (target === "pdf" ? await pdfBlob() : await imageBlob(target)) : sourceGroup === "document" && ext(file.name) === "pdf" ? (target === "txt" ? await pdfTextBlob() : await pdfImageBlob(target)) : sourceGroup === "audio" ? await mediaBlob(target) : new Blob([await file.arrayBuffer()], { type: "text/plain" });
        outputs.push({ blob, name: `${file.name.replace(/\.[^.]+$/,"")}.${target}` });
      }
      let blob = outputs[0].blob;
      outputName = outputs[0].name;
      if (outputs.length > 1) {
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
  ["dragover","dragenter"].forEach((name)=>$("#drop-zone").addEventListener(name,(event)=>{event.preventDefault();$("#drop-zone").classList.add("dragging")})); $("#drop-zone").addEventListener("dragleave",()=>$("#drop-zone").classList.remove("dragging")); $("#drop-zone").addEventListener("drop",(event)=>{event.preventDefault();$("#drop-zone").classList.remove("dragging");selectFile(event.dataTransfer.files)});
  $("#change-file").addEventListener("click",reset); $("#convert-btn").addEventListener("click",convert); $("#another-btn").addEventListener("click",reset);
  $("#quality-range").addEventListener("input",(event)=>$("#quality-value").textContent = `${event.target.value}%`);
  $("#format-trigger").addEventListener("click", () => { const menu = $("#format-menu"); const open = !menu.classList.contains("open"); menu.classList.toggle("open", open); $("#format-trigger").setAttribute("aria-expanded", String(open)); });
  const goConvert = () => { $("#tools-panel").hidden = true; setMode("convert"); reset(); document.querySelector(".converter-card").scrollIntoView({ behavior: "smooth", block: "start" }); };
  $("#convert-nav").addEventListener("click", goConvert);
  $("#compress-nav").addEventListener("click", () => { $("#tools-panel").hidden = true; setMode("compress"); document.querySelector(".converter-card").scrollIntoView({ behavior: "smooth", block: "start" }); });
  $("#tools-nav").addEventListener("click", () => { const panel = $("#tools-panel"); panel.hidden = !panel.hidden; $("#tools-nav").setAttribute("aria-expanded", String(!panel.hidden)); });
  const routeMenuItem = (button) => {
    const route = button.dataset.tool;
    const preset = toolPresets[route];
    if (!preset) return;
    $("#tools-panel").hidden = true;
    $("#tools-nav").setAttribute("aria-expanded", "false");
    preferredTarget = route === "pdf" || route === "document" ? "pdf" : route === "audio" ? "wav" : route === "image" ? "png" : "";
    setMode(route === "compress" ? "compress" : "convert");
    reset();
    $("#upload-title").textContent = preset.title;
    document.querySelector("#step-upload .step-description").textContent = preset.subtitle;
    input.accept = preset.accept;
    renderFormats(Object.entries(preset.categories));
    document.querySelector(".converter-card").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  $$("#tools-panel [data-tool]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); routeMenuItem(link); }));
  $$("footer [data-tool]").forEach((button) => button.addEventListener("click", () => { setMode("compress"); reset(); document.querySelector(".converter-card").scrollIntoView({ behavior: "smooth", block: "start" }); }));
  $("#api-nav").addEventListener("click", () => $("#developer-docs").scrollIntoView({ behavior: "smooth", block: "start" }));
  const showCloudConfig = (provider, message) => {
    $("#cloud-config-title").textContent = `${provider} import setup`;
    $("#cloud-config-message").textContent = message;
    $("#google-client-id").value = configuredGoogleClientId.startsWith("YOUR_") ? "" : configuredGoogleClientId;
    $("#dropbox-app-key").value = configuredDropboxAppKey.startsWith("YOUR_") ? "" : configuredDropboxAppKey;
    $("#cloud-config-modal").showModal();
  };
  const closeCloudConfig = () => {
    const modal = $("#cloud-config-modal");
    if (modal.open) modal.close();
    $("#cloud-config-message").textContent = "";
  };
  const openLocalFilePicker = () => { closeCloudConfig(); input.click(); };
  $("#close-cloud-config").addEventListener("click", closeCloudConfig);
  $("#cloud-config-dismiss").addEventListener("click", closeCloudConfig);
  $("#cloud-config-local").addEventListener("click", openLocalFilePicker);
  $("#cloud-config-save").addEventListener("click", () => {
    configuredGoogleClientId = $("#google-client-id").value.trim() || GOOGLE_CLIENT_ID;
    configuredDropboxAppKey = $("#dropbox-app-key").value.trim() || DROPBOX_APP_KEY;
    googleTokenClient = null;
    googleAccessToken = "";
    if (pickerConfigured(configuredGoogleClientId)) localStorage.setItem("googleDriveClientId", configuredGoogleClientId);
    else localStorage.removeItem("googleDriveClientId");
    if (pickerConfigured(configuredDropboxAppKey)) localStorage.setItem("dropboxAppKey", configuredDropboxAppKey);
    else localStorage.removeItem("dropboxAppKey");
    closeCloudConfig();
  });
  $("#cloud-config-modal").addEventListener("click", (event) => { if (event.target === $("#cloud-config-modal")) closeCloudConfig(); });
  $("#cloud-config-modal").addEventListener("cancel", (event) => { event.preventDefault(); closeCloudConfig(); });
  const pickerConfigured = (value) => value && !value.startsWith("YOUR_");
  const loadGooglePicker = () => new Promise((resolve, reject) => {
    if (!window.gapi) { reject(new Error("Google API client could not be loaded.")); return; }
    window.gapi.load("picker", { callback: resolve, onerror: () => reject(new Error("Google Drive Picker could not be loaded.")) });
  });
  const importGoogleDriveFile = async (document) => {
    const response = await fetch(document.downloadUrl, { headers: { Authorization: `Bearer ${googleAccessToken}` } });
    if (!response.ok) throw new Error("Google Drive file could not be downloaded.");
    const blob = await response.blob();
    await selectFile([new File([blob], document.name, { type: blob.type || document.mimeType || "application/octet-stream" })]);
  };
  const openGoogleDrivePicker = async () => {
    if (!pickerConfigured(configuredGoogleClientId) || !pickerConfigured(GOOGLE_DEVELOPER_KEY)) { showCloudConfig("Google Drive", "Google Drive import requires a configured OAuth client ID and developer key. You can continue by choosing a file from your device."); return; }
    if (!window.google?.accounts?.oauth2) { showCloudConfig("Google Drive", "The Google Drive picker could not be loaded. You can continue by choosing a file from your device."); return; }
    try {
      await loadGooglePicker();
      if (!googleTokenClient) googleTokenClient = window.google.accounts.oauth2.initTokenClient({ client_id: configuredGoogleClientId, scope: GOOGLE_SCOPE, callback: (response) => { googleAccessToken = response.access_token; } });
      await new Promise((resolve, reject) => {
        googleTokenClient.callback = (response) => response.error ? reject(new Error("Google Drive authorization was not granted.")) : (googleAccessToken = response.access_token, resolve());
        googleTokenClient.requestAccessToken({ prompt: googleAccessToken ? "" : "consent" });
      });
      const picker = new window.google.picker.PickerBuilder().setDeveloperKey(GOOGLE_DEVELOPER_KEY).setOAuthToken(googleAccessToken).setCallback(async (data) => {
        if (data.action !== window.google.picker.Action.PICKED) return;
        try { await importGoogleDriveFile(data.docs[0]); } catch (error) { showCloudConfig("Google Drive", error.message); }
      }).addView(window.google.picker.ViewId.DOCS).build();
      picker.setVisible(true);
    } catch (error) { showCloudConfig("Google Drive", error.message); }
  };
  const openDropboxChooser = () => {
    if (!pickerConfigured(configuredDropboxAppKey)) { showCloudConfig("Dropbox", "Dropbox import requires a configured app key. You can continue by choosing a file from your device."); return; }
    if (!window.Dropbox?.choose) { showCloudConfig("Dropbox", "The Dropbox chooser could not be loaded. You can continue by choosing a file from your device."); return; }
    window.Dropbox.choose({ success: async (files) => {
      const selected = files[0];
      try {
        const response = await fetch(selected.link);
        if (!response.ok) throw new Error("Dropbox file could not be downloaded.");
        const blob = await response.blob();
        await selectFile([new File([blob], selected.name, { type: blob.type || "application/octet-stream" })]);
      } catch (error) { showCloudConfig("Dropbox", error.message); }
    }, cancel: () => {}, linkType: "direct", multiselect: false });
  };
  $("#drive-btn").addEventListener("click", openGoogleDrivePicker);
  $("#dropbox-btn").addEventListener("click", openDropboxChooser);
  [$("#drive-btn"), $("#dropbox-btn")].forEach((button) => {
    button.disabled = !CLOUD_BUTTONS_ENABLED;
    button.setAttribute("aria-disabled", String(!CLOUD_BUTTONS_ENABLED));
    if (!CLOUD_BUTTONS_ENABLED) button.title = "Cloud imports are disabled until API credentials are configured.";
  });
  const bindPolicyModal = (linkSelector, modalSelector, closeSelector) => {
    const modal = $(modalSelector);
    $(linkSelector).addEventListener("click", (event) => { event.preventDefault(); modal.showModal(); });
    $(closeSelector).addEventListener("click", () => modal.close());
    modal.addEventListener("click", (event) => { if (event.target === modal) modal.close(); });
  };
  bindPolicyModal("#privacy-link", "#privacy-modal", "#close-privacy");
  bindPolicyModal("#terms-link", "#terms-modal", "#close-terms");
  const setFooterPreset = (event, title, accept) => {
    event.preventDefault();
    setMode("convert");
    reset();
    $("#upload-title").textContent = title;
    input.accept = accept;
    $("#drop-zone").scrollIntoView({ behavior: "smooth", block: "center" });
  };
  $("#image-converter-link").addEventListener("click", (event) => setFooterPreset(event, "Image Converter", "image/*"));
  $("#pdf-converter-link").addEventListener("click", (event) => setFooterPreset(event, "PDF Converter", ".pdf,application/pdf"));
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
  const cookieConsent = $("#cookie-consent");
  const cookieConsentValue = localStorage.getItem("cookieConsent");
  if (!cookieConsentValue) cookieConsent.hidden = false;
  else cookieConsent.hidden = true;
  const saveCookieConsent = (value) => { localStorage.setItem("cookieConsent", value); cookieConsent.classList.add("hidden"); cookieConsent.hidden = true; };
  $("#accept-all-cookies").addEventListener("click", () => saveCookieConsent("all"));
  $("#accept-essential-cookies").addEventListener("click", () => saveCookieConsent("essential"));
  $("#cookie-settings-btn").addEventListener("click", () => {
    const panel = $("#cookie-preferences-panel");
    panel.hidden = !panel.hidden;
    $("#cookie-settings-btn").setAttribute("aria-expanded", String(!panel.hidden));
  });
  $("#save-cookie-preferences").addEventListener("click", () => saveCookieConsent(JSON.stringify({ analytics: $("#analytics-consent").checked, marketing: $("#marketing-consent").checked })));
  $$("a[data-route]").forEach((link) => link.addEventListener("click", () => history.pushState({}, "", link.getAttribute("href"))));
  window.addEventListener("popstate", () => { const route = location.hash.slice(1); const link = $(`[data-route="${route}"]`); if (link) routeMenuItem(link); });
  const initialRoute = location.hash.slice(1);
  const initialRouteLink = $(`#tools-panel [data-route="${initialRoute}"]`);
  if (initialRouteLink) routeMenuItem(initialRouteLink);
})();
