import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
// @ts-check
import { defineConfig } from "astro/config";
import starlightBlog from "starlight-blog";

// https://astro.build/config
export default defineConfig({
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
					items: [{ label: "Getting Started", slug: "guides" }],
				},
			],
			customCss: ["./src/tailwind.css"],
			head: [
				{
					tag: "script",
					content: "document.documentElement.dataset.theme = 'dark'",
				},
				{
					tag: "script",
					attrs: {
						defer: true,
						src: "https://unpkg.com/tailwindcss-intersect@2.x.x/dist/observer.min.js",
					},
				},
			],
			plugins: [starlightBlog({ title: "Changelog" })],
		}),
		tailwind({ applyBaseStyles: false }),
		svelte(),
	],
});
