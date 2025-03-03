import starlightPlugin from "@astrojs/starlight-tailwind";
import daisyui from "daisyui";
import tailwindIntersect from "tailwindcss-intersect";
import tailwindMotion from "tailwindcss-motion";

const accent = {
	200: "#b6c7f8",
	600: "#4057e5",
	900: "#1e2b68",
	950: "#172046",
};
const gray = {
	100: "#f6f6f6",
	200: "#eeeeee",
	300: "#c2c2c2",
	400: "#8b8b8b",
	500: "#585858",
	700: "#383838",
	800: "#272727",
	900: "#181818",
};

/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	daisyui: {
		themes: [
			{
				grinta: {
					primary: "#425AE8",
					secondary: "#BACDFD",
					accent: "#9ccfd8",
					neutral: "#ff00ff",
					"base-100": "#0c0c0e",
					info: "#425AE8",
					success: "#9ccfd8",
					warning: "#fef9c3",
					error: "#fb7185",
				},
			},
		],
	},
	theme: {
		extend: {
			colors: {
				accent,
				gray,
			},
		},
	},
	plugins: [starlightPlugin(), daisyui, tailwindMotion, tailwindIntersect],
};
