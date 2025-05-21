import { defineConfig } from "tsup";

export default defineConfig({
  target: "esnext",
  outDir: "dist",
  dts: true,
  platform: "browser",
  clean: true,
  entry: ["src/index.ts"],
  format: "esm",
});
