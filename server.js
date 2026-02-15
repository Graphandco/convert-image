const express = require("express");
const fs = require("fs").promises;
const multer = require("multer");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const ico = require("sharp-ico");

const app = express();
const PORT = process.env.PORT || 3008;

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

      const base = path.basename(
         req.file.originalname,
         path.extname(req.file.originalname)
      );
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

      let pipeline = sharp(req.file.buffer);

      if (validMaxWidth) {
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
