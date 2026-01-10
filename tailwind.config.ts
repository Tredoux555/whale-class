import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'whale-blue': '#4A90E2',
        'whale-dark': '#2C5F7C',
        'whale-light': '#B8E0F0',
        accent: '#FFB84D',
      },
    },
  },
  plugins: [],
}

export default config
