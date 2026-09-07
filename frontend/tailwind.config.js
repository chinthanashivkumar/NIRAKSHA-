/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#050A12',
          surface: '#091321',
          elevated: '#0D1929',
          card: '#0A1526',
          border: 'rgba(148, 163, 184, 0.14)',
          borderStrong: 'rgba(148, 163, 184, 0.25)',
          muted: '#8EA1B8',
          dim: '#475569',
        },
        brand: {
          blue: '#2684FF',
          electric: '#4DA3FF',
          glow: 'rgba(38, 132, 255, 0.25)',
        },
        risk: {
          low: '#22c55e',
          moderate: '#f59e0b',
          high: '#f97316',
          critical: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'topo-pattern': `radial-gradient(circle at 50% 50%, rgba(38, 132, 255, 0.08) 0%, transparent 70%)`,
      }
    },
  },
  plugins: [],
}
