import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "..");

export default defineConfig({
  plugins: [react()],
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
