module.exports = {
  content: [
    "./frontend/src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        redBanner: "#1a0a0a",
        categoryRed: "#ff4d4f",
        categoryGreen: "#52c41a",
      },
      animation: {
        pulseGlow: "pulse 2s infinite",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,0,0,0.5)" },
          "50%": { boxShadow: "0 0 10px 5px rgba(255,0,0,0.8)" },
        },
      },
    },
  },
  plugins: [],
};
