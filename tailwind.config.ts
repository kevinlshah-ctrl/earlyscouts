import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FFFAF6',
        charcoal: '#1A1A2E',
        'scout-green': '#2D6A4F',
        'scout-green-dark': '#1E4D38',
        peach: '#F2945C',
        sky: '#6BB3D9',
        lavender: '#A78BCA',
        honey: '#E8B84B',
        mint: '#7ECAB0',
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #1A1A2E 0%, #0F172A 100%)',
      },
    },
  },
  plugins: [],
}
export default config
