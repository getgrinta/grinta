import type { Config } from "tailwindcss";
import TailwindMotion from "tailwindcss-motion";

const config: Config = {
	content: ["./src/**/*.{html,js,svelte,ts}"],
	plugins: [TailwindMotion],
};

export default config;
