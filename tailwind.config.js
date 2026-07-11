/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                surface: {
                    DEFAULT: '#141210',
                    raised: '#1c1916',
                    overlay: '#24201c',
                },
                ink: {
                    DEFAULT: '#f4f0ea',
                    muted: '#a39a8f',
                    faint: '#6e665c',
                },
                ember: {
                    50: '#fef2f1',
                    100: '#fde3e1',
                    200: '#fbcbc6',
                    300: '#f6a49c',
                    400: '#ee6f63',
                    500: '#e23d28',
                    600: '#c41e1e',
                    700: '#a41818',
                    800: '#881818',
                    900: '#711a1a',
                },
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                orange: {
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                },
                yellow: {
                    400: '#fde047',
                    500: '#facc15',
                    600: '#eab308',
                },
            },
            fontFamily: {
                display: ['var(--font-display)', 'system-ui', 'sans-serif'],
                sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                glow: '0 0 40px -8px rgba(196, 30, 30, 0.45)',
                card: '0 12px 40px -16px rgba(0, 0, 0, 0.65)',
            },
            backgroundImage: {
                'hero-mesh':
                    'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(196, 30, 30, 0.28), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(234, 88, 12, 0.12), transparent 50%), radial-gradient(ellipse 40% 30% at 10% 80%, rgba(255, 255, 255, 0.04), transparent 50%)',
            },
            keyframes: {
                'fade-up': {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                },
            },
            animation: {
                'fade-up': 'fade-up 0.6s ease-out both',
                shimmer: 'shimmer 2.5s linear infinite',
            },
        },
    },
    plugins: [],
};
