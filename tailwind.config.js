/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Shared accent used across the drills (amber) and the app shell.
        accent: "#e3a542",
      },
    },
  },
  plugins: [],
};
