'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MenuDisplay from '@/components/MenuDisplay';
import RecentOrders from '@/components/RecentOrders';
import { MenuProvider } from '@/contexts/MenuContext';
import { CartProvider } from '@/contexts/CartContext';
import { motion } from 'framer-motion';

function HomeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams?.get('tab') ?? null;
    const [activeTab, setActiveTab] = useState<'menu' | 'orders'>(tabParam === 'orders' ? 'orders' : 'menu');
    const [hasNotification, setHasNotification] = useState(false);

    useEffect(() => {
        setActiveTab(tabParam === 'orders' ? 'orders' : 'menu');
    }, [tabParam]);

    useEffect(() => {
        const checkNotifications = () => {
            const notifyOrders = JSON.parse(localStorage.getItem('notifyOrders') || '[]');
            setHasNotification(notifyOrders.length > 0);
        };
        checkNotifications();
        const interval = setInterval(checkNotifications, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('docheff-tab-state', { detail: { tab: activeTab, hasNotification } }));
    }, [activeTab, hasNotification]);

    const goMenu = () => {
        setActiveTab('menu');
        router.replace('/', { scroll: false });
    };

    const goOrders = () => {
        setActiveTab('orders');
        setHasNotification(false);
        router.replace('/?tab=orders', { scroll: false });
    };

    useEffect(() => {
        const onMenu = () => goMenu();
        const onOrders = () => goOrders();
        window.addEventListener('docheff-tab-menu', onMenu);
        window.addEventListener('docheff-tab-orders', onOrders);
        return () => {
            window.removeEventListener('docheff-tab-menu', onMenu);
            window.removeEventListener('docheff-tab-orders', onOrders);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen">
            {activeTab === 'menu' ? (
                <MenuDisplay showHero />
            ) : (
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
                    <div className="mb-6 flex items-end justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">Acompanhamento</p>
                            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Seus pedidos</h1>
                            <p className="mt-1 text-sm text-ink-muted">Status em tempo real pelo seu telefone</p>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            type="button"
                            onClick={goMenu}
                            className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/[0.08]"
                        >
                            Cardápio
                        </motion.button>
                    </div>
                    <RecentOrders />
                </div>
            )}
        </div>
    );
}

export default function Home() {
    return (
        <CartProvider>
            <MenuProvider>
                <Suspense fallback={<div className="min-h-[50vh]" />}>
                    <HomeContent />
                </Suspense>
            </MenuProvider>
        </CartProvider>
    );
}
