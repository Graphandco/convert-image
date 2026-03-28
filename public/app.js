const zone = document.getElementById("zone");
const fileInput = document.getElementById("file");
const zoneText = document.getElementById("zoneText");
const filenameEl = document.getElementById("filename");
const format = document.getElementById("format");
const quality = document.getElementById("quality");
const qualityVal = document.getElementById("qualityVal");
const maxWidth = document.getElementById("maxWidth");
const ratioSelect = document.getElementById("ratio");
const ratioCustom = document.getElementById("ratioCustom");
const ratioW = document.getElementById("ratioW");
const ratioH = document.getElementById("ratioH");
const convertBtn = document.getElementById("convert");
const msg = document.getElementById("msg");
const dropOverlay = document.getElementById("dropOverlay");
const metaBlock = document.getElementById("metaBlock");
const metaBody = document.getElementById("metaBody");
const metaResultActions = document.getElementById("metaResultActions");
const downloadAllBtn = document.getElementById("downloadAll");
const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const helpModalClose = document.getElementById("helpModalClose");
const limitModal = document.getElementById("limitModal");
const limitModalClose = document.getElementById("limitModalClose");
const convertLoader = document.getElementById("convertLoader");

/** Limite cumulée des fichiers sources avant conversion (octets) */
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

function getTotalFileSize(files) {
   return Array.from(files).reduce((sum, f) => sum + f.size, 0);
}

/**
 * @param {HTMLElement} overlay - .modal-overlay
 * @param {{ focusSelector?: string }} [options]
 */
function openModal(overlay, options = {}) {
   const { focusSelector = ".modal-close" } = options;
   overlay.classList.add("is-open");
   overlay.setAttribute("aria-hidden", "false");
   const focusEl = overlay.querySelector(focusSelector);
   if (focusEl) focusEl.focus();
}

/**
 * @param {HTMLElement} overlay
 * @param {HTMLElement | null} [focusReturn]
 */
function closeModal(overlay, focusReturn = null) {
   overlay.classList.remove("is-open");
   overlay.setAttribute("aria-hidden", "true");
   if (focusReturn && typeof focusReturn.focus === "function") {
      focusReturn.focus();
   }
}

function bindModalBackdropClose(overlay, onClose) {
   overlay.addEventListener("click", (e) => {
      if (e.target === overlay) onClose();
   });
}

function setConvertLoading(on) {
   if (!convertLoader) return;
   convertLoader.hidden = !on;
   convertLoader.setAttribute("aria-hidden", on ? "false" : "true");
}

const IMG_REG = /\.(jpe?g|png|webp|avif)$/i;
let sourceMeta = [];
let lastConvertedResults = [];

function handleDropFiles(fileList) {
   if (!fileList?.length) return;
   const valid = Array.from(fileList).filter((f) => IMG_REG.test(f.name));
   if (!valid.length) return;
   const dt = new DataTransfer();
   valid.forEach((f) => dt.items.add(f));
   fileInput.files = dt.files;
   updateZone();
}

function removeFileAtIndex(index) {
   const files = Array.from(fileInput.files || []);
   if (index < 0 || index >= files.length) return;
   const dt = new DataTransfer();
   files.forEach((f, j) => {
      if (j !== index) dt.items.add(f);
   });
   fileInput.files = dt.files;
   updateZone();
}

function formatBytes(n) {
   if (n < 1024) return n + " o";
   if (n < 1024 * 1024) return (n / 1024).toFixed(1).replace(".", ",") + " Ko";
   return (n / (1024 * 1024)).toFixed(1).replace(".", ",") + " Mo";
}

function formatLabel(name) {
   const ext = (name || "").split(".").pop().toLowerCase();
   const map = {
      jpg: "JPEG",
      jpeg: "JPEG",
      png: "PNG",
      webp: "WebP",
      avif: "AVIF",
   };
   return map[ext] || ext.toUpperCase();
}

function triggerDownload(blob, name) {
   const a = document.createElement("a");
   a.href = URL.createObjectURL(blob);
   a.download = name;
   a.style.display = "none";
   document.body.appendChild(a);
   a.click();
   a.remove();
   URL.revokeObjectURL(a.href);
}

function getImageDimensions(blob) {
   return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
         URL.revokeObjectURL(url);
         resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
         URL.revokeObjectURL(url);
         resolve(null);
      };
      img.src = url;
   });
}

function showMsg(text, type) {
   msg.textContent = text;
   msg.className = "msg " + (type === "error" ? "error" : "success");
   msg.style.display = "block";
}
function clearMsg() {
   msg.className = "msg";
   msg.style.display = "none";
}

quality.addEventListener("input", () => {
   qualityVal.textContent = quality.value;
});

ratioSelect.addEventListener("change", () => {
   ratioCustom.hidden = ratioSelect.value !== "custom";
});

function openHelpModal() {
   openModal(helpModal);
}

function closeHelpModal() {
   closeModal(helpModal, helpBtn);
}

function openLimitModal() {
   openModal(limitModal);
}

function closeLimitModal() {
   closeModal(limitModal, convertBtn);
}

helpBtn.addEventListener("click", openHelpModal);
helpModalClose.addEventListener("click", closeHelpModal);
bindModalBackdropClose(helpModal, closeHelpModal);

limitModalClose.addEventListener("click", closeLimitModal);
bindModalBackdropClose(limitModal, closeLimitModal);

document.addEventListener("keydown", (e) => {
   if (e.key !== "Escape") return;
   if (limitModal.classList.contains("is-open")) {
      closeLimitModal();
      return;
   }
   if (helpModal.classList.contains("is-open")) {
      closeHelpModal();
   }
});

zone.addEventListener("click", () => fileInput.click());
zone.addEventListener("dragover", (e) => {
   e.preventDefault();
   zone.classList.add("dragover");
});
zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
zone.addEventListener("drop", (e) => {
   e.preventDefault();
   zone.classList.remove("dragover");
   handleDropFiles(e.dataTransfer?.files);
});
zone.addEventListener("keydown", (e) => {
   if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
   }
});
fileInput.addEventListener("change", updateZone);

document.addEventListener("dragover", (e) => {
   if (!e.dataTransfer?.types?.includes("Files")) return;
   e.preventDefault();
   e.dataTransfer.dropEffect = "copy";
   zone.classList.remove("dragover");
   dropOverlay.classList.add("active");
   dropOverlay.setAttribute("aria-hidden", "false");
});
document.addEventListener("drop", (e) => {
   dropOverlay.classList.remove("active");
   dropOverlay.setAttribute("aria-hidden", "true");
   if (!e.dataTransfer?.types?.includes("Files")) return;
   e.preventDefault();
   handleDropFiles(e.dataTransfer.files);
});
document.addEventListener("dragleave", (e) => {
   if (e.relatedTarget != null && document.body.contains(e.relatedTarget))
      return;
   dropOverlay.classList.remove("active");
   dropOverlay.setAttribute("aria-hidden", "true");
});

async function updateZone() {
   const files = Array.from(fileInput.files || []);
   metaBlock.classList.remove("has-converted");
   metaResultActions.hidden = true;
   lastConvertedResults = [];
   sourceMeta = [];

   if (!files.length) {
      zone.classList.remove("has-file");
      zoneText.hidden = false;
      filenameEl.hidden = true;
      convertBtn.disabled = true;
      metaBlock.hidden = true;
      metaBody.innerHTML = "";
      clearMsg();
      return;
   }

   zone.classList.add("has-file");
   zoneText.hidden = true;
   filenameEl.textContent =
      files.length === 1 ? files[0].name : `${files.length} fichiers`;
   filenameEl.hidden = false;
   convertBtn.disabled = false;
   metaBlock.hidden = false;
   clearMsg();

   metaBody.innerHTML = "";
   files.forEach((f, i) => {
      sourceMeta.push({
         dims: "…",
         poids: formatBytes(f.size),
         format: formatLabel(f.name),
      });
      const tr = document.createElement("tr");
      const dimsTd = document.createElement("td");
      dimsTd.className = "meta-dims";
      dimsTd.textContent = "…";
      const poidsTd = document.createElement("td");
      poidsTd.textContent = sourceMeta[i].poids;
      const formatTd = document.createElement("td");
      const formatInner = document.createElement("div");
      formatInner.className = "meta-format-inner";
      formatInner.textContent = sourceMeta[i].format;
      formatTd.appendChild(formatInner);

      const removeTd = document.createElement("td");
      removeTd.className = "meta-actions-cell";
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "meta-remove";
      removeBtn.title = "Retirer ce fichier";
      removeBtn.setAttribute("aria-label", `Retirer ${f.name}`);
      removeBtn.innerHTML = `<svg class="meta-remove-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none"><path stroke="currentColor" stroke-width="2.25" stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>`;
      removeBtn.addEventListener("click", () => removeFileAtIndex(i));
      removeTd.appendChild(removeBtn);

      tr.append(dimsTd, poidsTd, formatTd, removeTd);
      metaBody.appendChild(tr);

      getImageDimensions(f).then((dims) => {
         sourceMeta[i].dims = dims ? `${dims.width} × ${dims.height}` : "—";
         dimsTd.textContent = sourceMeta[i].dims;
      });
   });
}

downloadAllBtn.addEventListener("click", () => {
   lastConvertedResults.forEach(({ blob, name }, i) => {
      setTimeout(() => triggerDownload(blob, name), i * 150);
   });
});

convertBtn.addEventListener("click", async () => {
   const files = Array.from(fileInput.files || []);
   if (!files.length) return;
   if (getTotalFileSize(files) > MAX_TOTAL_BYTES) {
      openLimitModal();
      return;
   }
   clearMsg();
   metaBlock.classList.remove("has-converted");
   metaResultActions.hidden = true;
   lastConvertedResults = [];
   convertBtn.disabled = true;
   convertBtn.textContent = "Conversion…";
   setConvertLoading(true);

   const outFormat = format.value;
   const q = quality.value;
   const mw = maxWidth.value.trim();
   let ratioWidth = null;
   let ratioHeight = null;
   const ratioVal = ratioSelect.value;
   if (ratioVal === "custom" && ratioW.value && ratioH.value) {
      const rw = parseInt(ratioW.value, 10);
      const rh = parseInt(ratioH.value, 10);
      if (rw > 0 && rh > 0) {
         ratioWidth = rw;
         ratioHeight = rh;
      }
   } else if (ratioVal && ratioVal !== "custom") {
      const [rw, rh] = ratioVal.split(":").map((n) => parseInt(n, 10));
      if (rw > 0 && rh > 0) {
         ratioWidth = rw;
         ratioHeight = rh;
      }
   }
   const results = [];

   try {
      await Promise.all(
         files.map(async (f) => {
            const form = new FormData();
            form.append("image", f);
            form.append("format", outFormat);
            form.append("quality", q);
            if (mw) form.append("maxWidth", mw);
            if (ratioWidth != null && ratioHeight != null) {
               form.append("ratioWidth", ratioWidth);
               form.append("ratioHeight", ratioHeight);
            }
            const r = await fetch("/api/convert", {
               method: "POST",
               body: form,
            });
            const blob = await r.blob();
            if (!r.ok) {
               const text = await blob.text();
               let j = {};
               try {
                  j = JSON.parse(text);
               } catch (_) {}
               throw new Error(j.error || text || `Erreur ${r.status}`);
            }
            const dims = await getImageDimensions(blob);
            const name = f.name.replace(/\.[^.]+$/, "") + "." + outFormat;
            results.push({ blob, name, dims, size: blob.size });
         })
      );

      metaBlock.classList.add("has-converted");
      const fmtLabels = {
         webp: "WebP",
         avif: "AVIF",
         jpg: "JPG",
         png: "PNG",
         ico: "ICO",
      };
      const fmtLabel = fmtLabels[outFormat] || outFormat.toUpperCase();
      const rows = metaBody.querySelectorAll("tr");

      if (results.length > 1) metaResultActions.hidden = false;

      results.forEach((r, i) => {
         const tr = rows[i];
         const dimsTd = tr.cells[0];
         const poidsTd = tr.cells[1];
         const formatTd = tr.cells[2];
         const removeTd = tr.cells[3];
         const src = sourceMeta[i] || {};
         const convDims = r.dims ? `${r.dims.width} × ${r.dims.height}` : "—";
         const convPoids = formatBytes(r.size);

         dimsTd.innerHTML = `${src.dims} <span class="meta-converted">→ ${convDims}</span>`;
         poidsTd.innerHTML = `${src.poids} <span class="meta-converted">→ ${convPoids}</span>`;

         const formatText = document.createElement("span");
         formatText.className = "meta-format-text";
         formatText.innerHTML = `${src.format} <span class="meta-converted">→ ${fmtLabel}</span>`;

         const downloadBtn = document.createElement("button");
         downloadBtn.type = "button";
         downloadBtn.className = "meta-download";
         downloadBtn.title = "Télécharger";
         downloadBtn.innerHTML = `<svg class="meta-download-icon" viewBox="0 0 640 640" aria-hidden="true"><path fill="currentColor" d="M352 96C352 78.3 337.7 64 320 64C302.3 64 288 78.3 288 96L288 306.7L246.6 265.3C234.1 252.8 213.8 252.8 201.3 265.3C188.8 277.8 188.8 298.1 201.3 310.6L297.3 406.6C309.8 419.1 330.1 419.1 342.6 406.6L438.6 310.6C451.1 298.1 451.1 277.8 438.6 265.3C426.1 252.8 405.8 252.8 393.3 265.3L352 306.7L352 96zM160 384C124.7 384 96 412.7 96 448L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 448C544 412.7 515.3 384 480 384L433.1 384L376.5 440.6C345.3 471.8 294.6 471.8 263.4 440.6L206.9 384L160 384zM464 440C477.3 440 488 450.7 488 464C488 477.3 477.3 488 464 488C450.7 488 440 477.3 440 464C440 450.7 450.7 440 464 440z"/></svg>`;
         downloadBtn.addEventListener("click", () =>
            triggerDownload(r.blob, r.name)
         );

         const formatInner = document.createElement("div");
         formatInner.className = "meta-format-inner";
         formatInner.appendChild(formatText);
         formatInner.appendChild(downloadBtn);
         formatTd.innerHTML = "";
         formatTd.appendChild(formatInner);

         if (removeTd) removeTd.innerHTML = "";

         lastConvertedResults.push({ blob: r.blob, name: r.name });
      });

      if (results.length === 1)
         triggerDownload(results[0].blob, results[0].name);

      showMsg(
         results.length === 1
            ? "Fichier converti."
            : `${results.length} fichiers convertis.`,
         "success"
      );
   } catch (e) {
      showMsg(e.message || "Erreur lors de la conversion.", "error");
   } finally {
      setConvertLoading(false);
      convertBtn.disabled = false;
      convertBtn.textContent = "Convertir";
   }
});
