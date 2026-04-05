/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:              'var(--brand-bg)',
          card:            'var(--brand-card)',
          border:          'var(--brand-border)',
          accent:          'var(--brand-accent)',
          'accent-hover':  'var(--brand-accent-hover)',
          muted:           'var(--brand-muted)',
          text:            'var(--brand-text)',
        },
      },
    },
  },
  plugins: [],
};
