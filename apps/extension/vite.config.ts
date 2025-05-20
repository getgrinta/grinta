import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";
import { resolve } from "node:path";

const target = process.env.TARGET || "chrome";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: "Wave",
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
    webExtension({
      browser: target,
      manifest: generateManifest,
      watchFilePaths: ["package.json", "manifest.json"],
    }),
  ],
  resolve: {
    conditions: ["browser"],
    alias: {
      $lib: resolve(__dirname, "./src/lib"),
      $pages: resolve(__dirname, "./src/pages"),
    },
  },
  define: {
    __BROWSER__: JSON.stringify(target),
    "process.env": {},
  },
});
