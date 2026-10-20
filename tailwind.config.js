/**
 * Warm Minimalist Editorial — Tailwind v3 theme (PostCSS pipeline).
 * Colours are rgb triplets so alpha modifiers (bg-primary/10) keep working.
 * Values mirror the CSS variables in src/index.css, which remain the single
 * source of truth for arbitrary-value usage like bg-[var(--bg-card)].
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', '"Times New Roman"', 'serif'],
      },
      colors: {
        ink: { DEFAULT: '26 26 26', soft: '92 92 92', faint: '154 154 154' },
        'on-dark': '250 247 242',
        primary: { DEFAULT: '45 95 74', deep: '35 74 58', tint: '232 240 236' },
        gilded: { DEFAULT: '217 119 6', deep: '180 83 9', tint: '254 243 199' },
        blush: { DEFAULT: '190 18 60', deep: '159 18 57', tint: '255 228 230' },
        verdant: { DEFAULT: '5 150 105', deep: '4 120 87', tint: '209 250 229' },
        lagoon: { DEFAULT: '14 116 144', deep: '21 94 117', tint: '224 242 247' },
        plum: { DEFAULT: '124 92 138', deep: '93 70 104', tint: '241 234 242' },
        sienna: { DEFAULT: '194 65 12', deep: '154 52 18', tint: '253 235 217' },
        income: { DEFAULT: '5 150 105', deep: '4 120 87', tint: '209 250 229' },
        expense: { DEFAULT: '190 18 60', deep: '159 18 57', tint: '255 228 230' },
        // Warm surfaces & borders (mirror --bg-* / --border-* tokens)
        bg: {
          app: '250 247 242',
          card: '255 255 255',
          subtle: '245 240 232',
          hover: '237 231 219',
        },
        border: {
          subtle: '232 224 208',
          default: '212 201 181',
          focus: '45 95 74',
        },
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
