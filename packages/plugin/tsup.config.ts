import { defineConfig } from "tsup";
import dotenv from "dotenv";

export default defineConfig({
  target: "esnext",
  outDir: "dist",
  dts: true,
  platform: "browser",
  clean: true,
  entry: ["src/index.ts"],
  format: "esm",
  env: dotenv.config().parsed,
});
