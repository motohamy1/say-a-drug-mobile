/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0a1416",
        // Deep teal colors
        "deep-teal": "#0d1f24",
        "teal-dark": "#101f22",
        "teal-medium": "#1a2f35",
        // Turquoise/Cyan accents
        turquoise: "#2dd4bf",
        cyan: "#22d3ee",
        "cyan-bright": "#67e8f9",
        // Warm gold for medicine highlights
        gold: "#ffd33d",
        "gold-warm": "#fbbf24",
        "gold-light": "#fcd34d",
        // Neutral tones
        charcoal: "#374151",
        "gray-dark": "#1f2937",
        "gray-muted": "#6b7280",
        // Medicine card
        "medicine-bg": "#1a252a",
        "medicine-card": "#0f1a1d",
      },
      boxShadow: {
        "glow-cyan": "0 0 20px rgba(34, 211, 238, 0.3)",
        "glow-gold": "0 0 20px rgba(255, 211, 61, 0.3)",
        "bubble": "0 4px 12px rgba(0, 0, 0, 0.4)",
        "card": "0 8px 32px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
