// src/app/layout.tsx

import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import React from 'react';
import AppShellClient from '@/components/AppShellClient';

const display = Bricolage_Grotesque({
    subsets: ['latin'],
    variable: '--font-display',
    display: 'swap',
});

const sans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

export const viewport: Viewport = {
    themeColor: '#c41e1e',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
};

export const metadata: Metadata = {
    title: "Do'Cheff - Cardápio Digital",
    description: "Cardápio digital do Do'Cheff — pizzas, massas e muito mais em Alto Rodrigues.",
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: "Do'Cheff",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className={`${display.variable} ${sans.variable}`}>
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#c41e1e" />
                <link rel="apple-touch-icon" href="/icon-192x192.png" />
                <link rel="icon" href="/favicon/favicon.ico" type="image/x-icon" />
            </head>
            <body className="font-sans bg-surface min-h-screen text-ink antialiased">
                <AppShellClient>{children}</AppShellClient>
            </body>
        </html>
    );
}
