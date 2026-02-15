import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0a0a0f',
        surface: '#141419',
        'surface-hover': '#1c1c24',
        'border-subtle': '#2a2a35',
        'border-focus': '#e0c866',
        'text-primary': '#f8fafc',
        'text-secondary': '#8a8a9a',
        'text-tertiary': '#5a5a6a',
        accent: '#e0c866',
        'accent-hover': '#f0d876',
        'accent-secondary': '#c4a84d',
        success: '#4ade80',
        error: '#f87171',
        'code-bg': '#0d0d14',
      },
      fontFamily: {
        heading: ['var(--font-syne)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      keyframes: {
        'gold-glow': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(224, 200, 102, 0.2), 0 0 20px rgba(224, 200, 102, 0.1)',
          },
          '50%': {
            boxShadow: '0 0 10px rgba(224, 200, 102, 0.4), 0 0 40px rgba(224, 200, 102, 0.2)',
          },
        },
        'gold-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'gold-glow': 'gold-glow 2s ease-in-out infinite',
        'gold-pulse': 'gold-pulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
