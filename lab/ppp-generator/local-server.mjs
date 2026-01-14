// Petit serveur statique autonome (Node natif) pour lancer l'app sans python -m http.server.
// Usage : node local-server.js

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;

const PORT = process.env.PORT || 4173;

const mime = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".json": "application/json"
};

const server = http.createServer(async (req, res) => {
    try {
        const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
        let filePath = path.join(root, decodeURIComponent(urlPath));
        const fileStat = await stat(filePath).catch(() => null);

        if (fileStat && fileStat.isDirectory()) {
            filePath = path.join(filePath, "index.html");
        }

        const data = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
        res.end(data);
    } catch (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
    }
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Serveur statique lancé sur ${url}`);
    // Ouvre le navigateur par défaut selon la plateforme.
    const opener =
        process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
            ? "start"
            : "xdg-open";
    spawn(opener, [url], { stdio: "ignore", shell: true });
});
