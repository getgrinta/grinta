import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";
import starlightBlog from "starlight-blog";

// https://astro.build/config
export default defineConfig({
	site: "https://getgrinta.com",
	vite: {
		plugins: [tailwindcss()],
	},
	integrations: [
		starlight({
			title: "Grinta",
			logo: {
				src: "./public/logo.svg",
				replacesTitle: true,
			},
			social: {
				github: "https://github.com/getgrinta/grinta",
				"x.com": "https://x.com/getgrinta",
			},
			sidebar: [
				{
					label: "Guides",
					items: [
						{ label: "Getting Started", slug: "guides" },
						{ label: "Replace system Spotlight", slug: "guides/replace-spotlight" },
						{ label: "Core Concepts", slug: "guides/core-concepts" },
					],
				},
				{
					label: "Core Features",
					items: [
						{ label: "Web and AI Search", slug: "features/search" },
						{ label: "Notes", slug: "features/notes" },
						{ label: "File System Search", slug: "features/file-system" },
						{ label: "Calculator", slug: "features/calculator" },
						{ label: "Natural Language Processing", slug: "features/nlp" },
						{ label: "Shortcuts", slug: "features/shortcuts" },
						{ label: "Clipboard History", slug: "features/clipboard" },
						{ label: "Widgets", slug: "features/widgets" },
					]
				},
				{
					label: "Grinta Pro",
					items: [
						{ label: "Notes AI", slug: "pro/notes" },
					]
				},
				{
					label: "Recipes",
					items: [
						{ label: "Notes in Obsidian", slug: "recipes/obsidian" },
						{ label: "Running Shell Commands", slug: "recipes/shell-commands" },
						{ label: "Speech to Text", slug: "recipes/speech-to-text" },
					]
				}
			],
			customCss: ["./src/tailwind.css"],
			head: [
				{
					tag: "script",
					content: `
						window.op = window.op||function(...args){(window.op.q=window.op.q||[]).push(args);};
						window.op('init', {
							clientId: '11152ed2-ba79-480c-a020-028c574cb89f',
							trackScreenViews: true,
							trackOutgoingLinks: true,
							trackAttributes: true,
						});
					`
				},
				{
					tag: "script",
					attrs: {
						defer: true,
						async: true,
						src: "https://openpanel.dev/op1.js",
					},
				},
				{
					tag: "script",
					attrs: {
						defer: true,
						src: "https://unpkg.com/tailwindcss-intersect@2.x.x/dist/observer.min.js",
					},
				},
			],
			components: {
				ThemeProvider: "./src/components/theme.astro",
				ThemeSelect: "./src/components/theme-select.astro",
			},
			plugins: [starlightBlog({ title: "Changelog" })],
		}),
		svelte(),
	],
});
