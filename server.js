const express = require("express");
const fs = require("fs").promises;
const multer = require("multer");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const ico = require("sharp-ico");

const app = express();
const PORT = process.env.PORT || 3008;

/**
 * Nettoie le nom de fichier pour éviter les erreurs (Cloudflare, headers HTTP).
 * Gère : espaces, accents, apostrophes, caractères spéciaux, unicode.
 */
function sanitizeFilename(name) {
   return (
      name
         .normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "")
         .replace(/[^a-zA-Z0-9._-]+/g, "-")
         .replace(/-+/g, "-")
         .replace(/^-|-$/g, "")
   ) || "image";
}

const upload = multer({
   storage: multer.memoryStorage(),
   limits: { fileSize: 50 * 1024 * 1024 },
   fileFilter: (_, file, cb) => {
      const allowed = /\.(jpe?g|png|webp|avif)$/i.test(file.originalname);
      if (allowed) cb(null, true);
      else
         cb(new Error("Format non supporté. Utilisez JPG, PNG, WebP ou AVIF."));
   },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/convert", upload.single("image"), async (req, res) => {
   try {
      if (!req.file) {
         return res.status(400).json({ error: "Aucune image fournie." });
      }

      const format = (req.body.format || "webp").toLowerCase();
      if (!["webp", "avif", "jpg", "png", "ico"].includes(format)) {
         return res
            .status(400)
            .json({
               error: "Format invalide. Choisissez webp, avif, jpg, png ou ico.",
            });
      }

      let quality = parseInt(req.body.quality, 10);
      if (Number.isNaN(quality) || quality < 1 || quality > 100) quality = 80;

      const maxWidth = req.body.maxWidth
         ? parseInt(req.body.maxWidth, 10)
         : null;
      const validMaxWidth =
         Number.isInteger(maxWidth) && maxWidth > 0 && maxWidth <= 8000;

      const ratioWidth = req.body.ratioWidth
         ? parseInt(req.body.ratioWidth, 10)
         : null;
      const ratioHeight = req.body.ratioHeight
         ? parseInt(req.body.ratioHeight, 10)
         : null;
      const validRatio =
         Number.isInteger(ratioWidth) &&
         Number.isInteger(ratioHeight) &&
         ratioWidth > 0 &&
         ratioHeight > 0;

      const rawBase = path.basename(
         req.file.originalname,
         path.extname(req.file.originalname)
      );
      const base = sanitizeFilename(rawBase);
      const ext = format === "ico" ? "ico" : format;
      const outName = `${base}.${ext}`;

      if (format === "ico") {
         let pipeline = sharp(req.file.buffer);
         if (validMaxWidth) {
            pipeline = pipeline.resize(maxWidth, maxWidth, {
               fit: "inside",
               withoutEnlargement: true,
            });
         }
         const tmpPath = path.join(
            os.tmpdir(),
            `convert-ico-${Date.now()}-${Math.random()
               .toString(36)
               .slice(2)}.ico`
         );
         await ico.sharpsToIco([pipeline], tmpPath, {
            sizes: [256, 128, 64, 48, 32, 24, 16],
         });
         const buffer = await fs.readFile(tmpPath);
         await fs.unlink(tmpPath).catch(() => {});
         res.setHeader("Content-Type", "image/x-icon");
         res.setHeader(
            "Content-Disposition",
            `attachment; filename="${outName}"`
         );
         return res.send(buffer);
      }

      const meta = await sharp(req.file.buffer).metadata();
      const w = meta.width || 1;
      const h = meta.height || 1;

      let pipeline = sharp(req.file.buffer);

      if (validRatio) {
         const r = ratioWidth / ratioHeight;
         let cropW, cropH;
         if (w / h > r) {
            cropH = h;
            cropW = Math.round(h * r);
         } else {
            cropW = w;
            cropH = Math.round(w / r);
         }

         let finalW = cropW;
         let finalH = cropH;
         if (validMaxWidth) {
            const maxDim = Math.max(cropW, cropH);
            if (maxDim > maxWidth) {
               const scale = maxWidth / maxDim;
               finalW = Math.round(cropW * scale);
               finalH = Math.round(cropH * scale);
            }
         }

         pipeline = pipeline.resize(finalW, finalH, {
            fit: "cover",
            position: "center",
         });
      } else if (validMaxWidth) {
         pipeline = pipeline.resize(maxWidth, maxWidth, {
            fit: "inside",
            withoutEnlargement: true,
         });
      }

      if (format === "webp") {
         pipeline = pipeline.webp({ quality });
      } else if (format === "avif") {
         pipeline = pipeline.avif({ quality });
      } else if (format === "jpg") {
         pipeline = pipeline.jpeg({ quality });
      } else {
         const compressionLevel = Math.round(9 - ((quality - 5) / 95) * 9);
         pipeline = pipeline.png({
            compressionLevel: Math.max(0, Math.min(9, compressionLevel)),
         });
      }

      const buffer = await pipeline.toBuffer();

      const mime = {
         webp: "image/webp",
         avif: "image/avif",
         jpg: "image/jpeg",
         png: "image/png",
      }[format];
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `attachment; filename="${outName}"`);
      res.send(buffer);
   } catch (err) {
      console.error(err);
      const msg = err.message || "Erreur lors de la conversion.";
      res.status(500).json({ error: msg });
   }
});

app.use((err, _req, res, _next) => {
   if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
         return res
            .status(400)
            .json({ error: "Fichier trop volumineux (max 50 Mo)." });
      }
   }
   console.error(err);
   res.status(500).json({ error: err.message || "Erreur serveur." });
});

app.listen(PORT, "0.0.0.0", () => {
   console.log(`Convert-image écoute sur http://0.0.0.0:${PORT}`);
});
