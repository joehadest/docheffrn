import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import { StoreProvider } from '@/contexts/StoreContext';
import { MenuProvider } from '@/contexts/MenuContext';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
    themeColor: '#ea580c',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
};

export const metadata: Metadata = {
    title: "Do'Cheff - Cardápio Digital",
    description: "Cardápio digital do Do'Cheff",
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: "Do'Cheff"
    }
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#ea580c" />
                <link rel="apple-touch-icon" href="/icon-192x192.png" />
                <link rel="icon" href="/favicon/favicon.ico" type="image/x-icon" />
            </head>
            <body className="bg-[#262525] min-h-screen">
                <MenuProvider>
                    <StoreProvider>
                        <Header />
                        <main className="min-h-screen">
                            {children}
                        </main>
                    </StoreProvider>
                </MenuProvider>
            </body>
        </html>
    );
} 