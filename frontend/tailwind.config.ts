import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  plugins: [
    // Only apply `hover:` on pointers that can actually hover. Touch browsers
    // emulate :hover on tap and never clear it, which latches hover styles on
    // cards and buttons until the user taps elsewhere.
    plugin(({ addVariant }) => {
      addVariant('hover', '@media (hover: hover) and (pointer: fine) { &:hover }')
    }),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      // Semantic tokens defined in globals.css for light and .dark. Use these
      // instead of raw palette colors so both themes stay consistent.
      colors: {
        background: token('background'),
        foreground: token('foreground'),
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
        },
        secondary: {
          DEFAULT: token('secondary'),
          foreground: token('secondary-foreground'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
        },
        card: {
          DEFAULT: token('card'),
          foreground: token('card-foreground'),
        },
        destructive: {
          DEFAULT: token('destructive'),
          foreground: token('destructive-foreground'),
        },
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'dialog-in': 'dialog-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        shimmer: 'shimmer 2s infinite linear',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'dialog-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      screens: {
        'vsm': '380px',
        '3xl': '2000px',
        '4xl': '2400px',
      },
    },
  },
}
export default config
