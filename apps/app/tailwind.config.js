/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"], // Standard SvelteKit content paths
  theme: {
    extend: {}, // Keep empty unless specific theme extensions are needed
  },
  plugins: [], // Keep empty unless specific plugins are needed
  safelist: [
    // Background Colors
    "bg-blue-500",
    "bg-red-500",
    "bg-green-600",
    "bg-gray-200",
    "bg-blue-800",
    "bg-blue-600",
    "bg-orange-500",
    "bg-purple-500",
    "bg-sky-600",
    "bg-black",
    // Text Colors
    "text-white",
    "text-black",
    // Shadow Colors (corresponding to backgrounds)
    "shadow-blue-500/50",
    "shadow-red-500/50",
    "shadow-green-600/50",
    // No specific shadow needed for gray-200 usually
    "shadow-blue-800/50",
    "shadow-orange-500/50",
    "shadow-purple-500/50",
    "shadow-sky-600/50",
    // No specific shadow needed for black usually
  ],
};
