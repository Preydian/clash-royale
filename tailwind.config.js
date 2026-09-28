/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Replaces Tailwind's default palette so only the app's tokens exist.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      paper: token('paper'),
      sheet: token('sheet'),
      ink: {
        DEFAULT: token('ink'),
        soft: token('ink-soft'),
        faint: token('ink-faint'),
      },
      rule: token('rule'),
      cobalt: token('cobalt'),
      vermilion: token('vermilion'),
      gold: token('gold'),
    },
    fontFamily: {
      display: ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
      sans: ['Archivo', 'system-ui', 'sans-serif'],
      mono: ['"Spline Sans Mono"', 'ui-monospace', 'monospace'],
    },
    extend: {},
  },
  plugins: [],
};
