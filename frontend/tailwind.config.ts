import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          DEFAULT: '#533afd',
          hover: '#4434d4',
          deep: '#2e2b8c',
          light: '#b9b9f9',
          mid: '#665efd',
        },
        navy: {
          DEFAULT: '#061b31',
          dark: '#0d253d',
        },
        brand: {
          dark: '#1c1e54',
        },
        slate: {
          DEFAULT: '#64748d',
          dark: '#273951',
        },
        ruby: '#ea2261',
        magenta: {
          DEFAULT: '#f96bee',
          light: '#ffd7ef',
        },
        success: {
          DEFAULT: '#15be53',
          text: '#108c3d',
        },
        lemon: '#9b6829',
        border: {
          DEFAULT: '#e5edf5',
          purple: '#b9b9f9',
          soft: '#d6d9fc',
        },
      },
      fontFamily: {
        primary: ['Sohne', 'SF Pro Display', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['Source Code Pro', 'SFMono-Regular', 'ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        pill: '100px',
      },
      boxShadow: {
        subtle: 'rgba(23,23,23,0.06) 0px 3px 6px 0px',
        'ambient-card': 'rgba(23,23,23,0.08) 0px 15px 35px 0px',
        card: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px',
      },
      fontSize: {
        'mono-label': ['12px', { fontWeight: '500', letterSpacing: '0.5px' }],
        'mono-data': ['13px', { fontWeight: '400' }],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
