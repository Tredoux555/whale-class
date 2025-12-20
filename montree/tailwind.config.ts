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
        // Montessori-inspired color palette
        montessori: {
          brown: '#8B4513',
          pink: '#F5B7B1',
          blue: '#AED6F1',
          green: '#A9DFBF',
          beige: '#F5E6D3',
          cream: '#FFF8E7',
        },
      },
    },
  },
  plugins: [],
}
export default config

