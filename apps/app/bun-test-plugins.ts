import { afterEach, beforeEach, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { plugin } from "bun";
import { compile } from "svelte/compiler";

beforeEach(async () => {
	await GlobalRegistrator.register();
});

afterEach(async () => {
	await GlobalRegistrator.unregister();
});

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
					env: {},
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
					goto: mock((path: string) => {}),
				},
				loader: "object",
			};
		});
		builder.module("runed", () => {
			return {
				exports: {
					useEventListener: mock(() => {}),
				},
				loader: "object",
			};
		});
	},
});
