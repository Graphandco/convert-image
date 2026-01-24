# Convert Image — WebP / AVIF

Interface web légère pour convertir et redimensionner des images en **WebP** ou **AVIF**, à héberger sur un VPS (Docker).

## Fonctionnalités

-  **Upload** : JPG, PNG, WebP, AVIF (glisser-déposer ou clic)
-  **Format de sortie** : WebP ou AVIF
-  **Qualité** : 1–100 %
-  **Redimensionnement** : largeur max (px), facultatif — proportion conservée, pas d’agrandissement
-  **Téléchargement** : fichier converti en pièce jointe

Les conversions sont faites en mémoire (pas de stockage persistant).  
Limite : **50 Mo** par fichier.

---

## Lancer le container

```bash
cd convert-image
docker compose up -d --build
```

L’app est disponible sur **http://localhost:3008**.

---

## Déploiement sur un VPS Debian

1. **Prérequis** : Docker et Docker Compose sur le VPS.

2. **Lancer l’app** :

   ```bash
   cd convert-image
   docker compose up -d --build
   ```

3. **Reverse proxy Caddy** avec HTTPS. Exemple de bloc Caddyfile :

   ```caddy
   convert.example.com {
       request_body {
           max_size 50MB
       }
       reverse_proxy 127.0.0.1:3008
   }
   ```

   Remplace `convert.example.com` par ton domaine. Caddy gère HTTPS automatiquement.  
   `request_body { max_size 50MB }` autorise les uploads jusqu’à 50 Mo (aligné avec la limite de l’app).

---

## Développement dans Docker

```bash
cd convert-image
docker compose -f docker-compose.dev.yml up --build
```

-  Le code est monté en volume : tes modifications dans `public/` (HTML, CSS, JS) et `server.js` sont prises en compte sans rebuild.
-  **Live reload** : ouvre **http://localhost:3008**. La page se rafraîchit quand tu modifies le front, et le serveur redémarre si tu changes `server.js`.

---

## Développement local (sans Docker)

```bash
npm install
npm run dev
```

-  **`npm run dev`** : serveur (interne 3009) + **Browser Sync** (3008) avec **live reload**. Ouvre http://localhost:3008.
-  **`npm start`** : serveur seul sur **http://localhost:3008**, sans live reload.

---

## Stack

-  **Node.js 20** (slim)
-  **Express** — serveur HTTP
-  **Multer** — upload
-  **Sharp** — conversion WebP/AVIF et redimensionnement
