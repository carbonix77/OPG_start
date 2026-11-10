import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Dev-only sink for a cinematic WebM. The directory is gitignored. */
function localRecording(): Plugin {
  return {
    name: "local-recording",
    configureServer(server) {
      server.middlewares.use("/__local-recording", (req, res) => {
        if (req.method === "GET") {
          const file = path.join(repoRoot, "private-assets", "review", "cinematic-preview.webm");
          if (!fs.existsSync(file)) {
            res.statusCode = 404;
            res.end("no local recording");
            return;
          }
          res.setHeader("content-type", "video/webm");
          fs.createReadStream(file).pipe(res);
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("POST only");
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          const body = Buffer.concat(chunks);
          if (body.length === 0 || body.length > 20_000_000) {
            res.statusCode = 400;
            res.end("empty or too large");
            return;
          }
          const dir = path.join(repoRoot, "private-assets", "review");
          fs.mkdirSync(dir, { recursive: true });
          const file = path.join(dir, "cinematic-preview.webm");
          fs.writeFileSync(file, body);
          res.setHeader("content-type", "text/plain");
          res.end(`Wrote ${body.length} bytes to private-assets/review/cinematic-preview.webm`);
        });
      });
    },
  };
}

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "..");

export default defineConfig({
  plugins: [react(), localRecording()],
  define: {
    __REPO_ROOT__: JSON.stringify(repoRoot.replace(/\\/g, "/")),
  },
  server: {
    port: 5173,
    fs: {
      allow: [repoRoot],
    },
  },
});
