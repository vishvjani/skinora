/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        skinora: {
          bg: '#F7F3ED',         // Warm oat porcelain
          card: '#FFFFFF',       // Clean crisp white
          tint: '#EDE6DB',        // Soft almond section tint
          tintSoft: '#F2EBE0',   // Lighter almond
          line: '#E4DACB',        // Warm taupe hairline border
          tagBg: '#F1EAE0',      // Soft tag background
          brand: '#3F4A3D',       // Deep botanical green (signature)
          brandDark: '#2C352B',  // Deepened botanical for hover
          brandSoft: '#5C6B57',  // Lighter sage
          sage: '#E8EAE3',        // Pale sage tint for brand surfaces
          clay: '#B5755A',        // Terracotta secondary accent
          gold: '#B08D57',        // Refined brushed brass
          ink: '#241F1A',         // Deep espresso text
          ink2: '#6B5D50',        // Warm taupe body text
          muted: '#9B8B7A',       // Muted warm grey
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        cinzel: ['"Cinzel"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        editorial: '-0.02em',
        luxury: '0.26em',
        regal: '0.36em',
      },
      boxShadow: {
        'soft': '0 2px 24px -8px rgba(36, 31, 26, 0.12)',
        'card': '0 10px 40px -18px rgba(36, 31, 26, 0.22)',
        'hover': '0 20px 50px -20px rgba(36, 31, 26, 0.28)',
        'drawer': '-16px 0 40px rgba(36, 31, 26, 0.16)',
        'inset': 'inset 0 1px 0 0 rgba(255,255,255,0.6)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        drawLine: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.6s ease-out both',
        fadeInUp: 'fadeInUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        marquee: 'marquee 32s linear infinite',
        float: 'float 6s ease-in-out infinite',
        scaleIn: 'scaleIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
