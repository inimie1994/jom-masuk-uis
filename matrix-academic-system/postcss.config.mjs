export default {
  plugins: {
    // The child project uses @tailwindcss/vite plugin in vite.config.js
    // Creating this file prevents Vite from loading the parent's PostCSS config.
  }
}
