import { defineConfig } from "tsup";
import dotenv from "dotenv";

export default defineConfig({
  target: "node23",
  outDir: "dist",
  dts: true,
  platform: "node",
  clean: true,
  entry: ["src/index.ts"],
  format: "esm",
  env: dotenv.config().parsed,
});
