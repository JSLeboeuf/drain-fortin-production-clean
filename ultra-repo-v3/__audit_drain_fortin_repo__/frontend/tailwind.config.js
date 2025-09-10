/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Palette Drain Fortin officielle
        'drain': {
          'blue': {
            50: '#e6f4ff',
            100: '#bae3ff',
            200: '#7cc4ff',
            300: '#47a8ff',
            400: '#1a91ff',
            500: '#0080f0', // Bleu principal Drain Fortin
            600: '#0066cc',
            700: '#004d99',
            800: '#003366',
            900: '#001a33',
          },
          'orange': {
            50: '#fff4e6',
            100: '#ffe2b3',
            200: '#ffc266',
            300: '#ffa31a',
            400: '#ff8c00',
            500: '#ff7700', // Orange accent Drain Fortin
            600: '#e65100',
            700: '#b33e00',
            800: '#802b00',
            900: '#4d1a00',
          },
          'green': {
            50: '#e6fff4',
            100: '#b3ffd9',
            200: '#66ffb3',
            300: '#1aff8c',
            400: '#00e673',
            500: '#00b359', // Vert succès Drain Fortin
            600: '#008040',
            700: '#005930',
            800: '#003320',
            900: '#001a10',
          },
          'steel': {
            50: '#f5f7fa',
            100: '#e9ecf1',
            200: '#d4dae3',
            300: '#a8b5c6',
            400: '#7a8ca3',
            500: '#546479', // Gris acier professionnel
            600: '#3d4755',
            700: '#2c3340',
            800: '#1a1f2a',
            900: '#0d1015',
          },
        },
        // Priorities avec couleurs Drain Fortin
        'priority': {
          'p1': '#ff3333', // Rouge urgence
          'p2': '#ff7700', // Orange haute priorité
          'p3': '#ffaa00', // Jaune priorité normale
          'p4': '#00b359', // Vert priorité basse
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
}