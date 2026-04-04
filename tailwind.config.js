/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:              '#0f1117',
          card:            '#1a1d2e',
          border:          '#2a2d3e',
          accent:          '#3b82f6',
          'accent-hover':  '#2563eb',
          muted:           '#6b7280',
          text:            '#e5e7eb',
        },
      },
    },
  },
  plugins: [],
};
