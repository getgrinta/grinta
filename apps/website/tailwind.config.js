/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx}", // add any relevant folders
  ],
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["night"], // sets "night" as the theme
  },
};
