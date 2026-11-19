import type { Config } from 'tailwindcss';
export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { midnight: '#111827', violet: '#8B5CF6', sky: '#38BDF8', mint: '#34D399', gold: '#FBBF24', cloud: '#F1F5F9', slate2: '#1E293B', pink: '#F472B6', surface: 'var(--surface)' },
    fontFamily: { sans: ['"Inter Variable"', 'system-ui', 'sans-serif'], display: ['"Manrope Variable"', '"Inter Variable"', 'sans-serif'], urdu: ['"Noto Nastaliq Urdu"', 'serif'] },
  } },
  plugins: [],
} satisfies Config;
