import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#fdfcf8',
          100: '#f9f6ef',
          200: '#f2ead8',
          300: '#e8dbc5',
          400: '#d4c4a8',
          500: '#b8a07a',
        },
        terracotta: {
          50: '#f7f2ec',
          100: '#ebe0d0',
          200: '#d4ba9b',
          300: '#b58e5e',
          400: '#8C6938',
          500: '#5C3A24',
          600: '#492d1c',
          700: '#372214',
          800: '#26170d',
          900: '#150c06',
        },
        navy: {
          50: '#eef2f8',
          100: '#cfdaed',
          200: '#a5b8d8',
          300: '#7591b9',
          400: '#4D6E96',
          500: '#1E3A5F',
          600: '#172c4a',
          700: '#101f35',
          800: '#0a1421',
          900: '#040810',
        },
        royal: {
          gold: '#C4922A',
          'gold-light': '#F5E9C4',
          'gold-dark': '#8B6214',
          bronze: '#A0522D',
        },
        heritage: {
          green: '#1E3A2F',
          'green-light': '#2D5A44',
          ink: '#1A0F00',
          brown: '#705840',
          'brown-light': '#9E7B5A',
        },
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'warm-sm': '0 1px 3px 0 rgba(90, 50, 10, 0.12), 0 1px 2px -1px rgba(90, 50, 10, 0.08)',
        'warm-md': '0 4px 6px -1px rgba(90, 50, 10, 0.12), 0 2px 4px -2px rgba(90, 50, 10, 0.08)',
        'warm-lg': '0 10px 15px -3px rgba(90, 50, 10, 0.12), 0 4px 6px -4px rgba(90, 50, 10, 0.08)',
        'warm-xl': '0 20px 25px -5px rgba(90, 50, 10, 0.14), 0 8px 10px -6px rgba(90, 50, 10, 0.10)',
        'gold': '0 0 0 2px rgba(196, 146, 42, 0.4)',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(196, 146, 42, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(196, 146, 42, 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
