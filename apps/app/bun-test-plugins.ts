import { mock } from "bun:test";
import { readFileSync } from "node:fs";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { mockWindows } from "@tauri-apps/api/mocks";
import { plugin } from "bun";
import BunPluginSvelte from "bun-plugin-svelte";
import { compile } from "svelte/compiler";

GlobalRegistrator.register();

mockWindows("main");

plugin(BunPluginSvelte);

plugin({
	name: "svelte loader",
	setup(builder) {
		builder.onLoad({ filter: /\.svelte(\?[^.]+)?$/ }, ({ path }) => {
			try {
				const source = readFileSync(
					path.substring(
						0,
						path.includes("?") ? path.indexOf("?") : path.length,
					),
					"utf-8",
				);

				const result = compile(source, {
					filename: path,
					generate: "client",
					dev: false,
				});

				return {
					contents: result.js.code,
					loader: "js",
				};
			} catch (err) {
				throw new Error(`Failed to compile Svelte component: ${err.message}`);
			}
		});
		builder.module("$env/dynamic/public", () => {
			return {
				exports: {
					env: {
						PUBLIC_API_URL: "http://localhost:1420",
						PUBLIC_ENCRYPTION_KEY: "test",
					},
				},
				loader: "object",
			};
		});
		builder.module("$app/environment", () => {
			return {
				exports: {
					browser: {},
				},
				loader: "object",
			};
		});
		builder.module("$app/navigation", () => {
			return {
				exports: {
					goto: mock((_path: string) => {}),
				},
				loader: "object",
			};
		});
	},
});
