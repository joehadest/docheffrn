'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { isRestaurantOpen } from '../utils/timeUtils';
import type { BusinessHoursConfig } from '../utils/timeUtils';
import RestaurantInfo from './RestaurantInfo';
import { DEFAULT_WHATSAPP_NUMBER } from '@/utils/whatsapp';
import { FaRegCompass, FaArrowUpRightFromSquare } from 'react-icons/fa6';

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [whatsappNumber, setWhatsAppNumber] = useState(DEFAULT_WHATSAPP_NUMBER);
    const [showInfo, setShowInfo] = useState(false);
    const [businessHours, setBusinessHours] = useState<BusinessHoursConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu');
    const [hasOrderNotification, setHasOrderNotification] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const isHome = pathname === '/' || pathname === '';

    const closeInfo = useCallback(() => setShowInfo(false), []);

    const checkOpenStatus = useCallback(() => {
        return isRestaurantOpen(businessHours as BusinessHoursConfig);
    }, [businessHours]);

    useEffect(() => {
        async function fetchSettings() {
            setLoading(true);
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success && data.data) {
                    if (data.data.businessHours) setBusinessHours(data.data.businessHours);
                    if (data.data.whatsappNumber) setWhatsAppNumber(data.data.whatsappNumber);
                }
            } catch {
                setBusinessHours(null);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    useEffect(() => {
        setIsOpen(checkOpenStatus());
        const interval = setInterval(() => setIsOpen(checkOpenStatus()), 60000);
        return () => clearInterval(interval);
    }, [businessHours, checkOpenStatus]);

    // Expõe abertura do modal de info para o hero via evento custom
    useEffect(() => {
        const openInfo = () => setShowInfo(true);
        const onTabState = (e: Event) => {
            const detail = (e as CustomEvent).detail as { tab?: 'menu' | 'orders'; hasNotification?: boolean };
            if (detail?.tab) setActiveTab(detail.tab);
            if (typeof detail?.hasNotification === 'boolean') setHasOrderNotification(detail.hasNotification);
        };
        window.addEventListener('docheff-open-info', openInfo);
        window.addEventListener('docheff-tab-state', onTabState);
        return () => {
            window.removeEventListener('docheff-open-info', openInfo);
            window.removeEventListener('docheff-tab-state', onTabState);
        };
    }, []);

    return (
        <header data-public-header className="public-site-header border-b border-white/[0.06] bg-surface/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
                <motion.button
                    type="button"
                    onClick={() => {
                        if (isHome) window.dispatchEvent(new Event('docheff-tab-menu'));
                        else router.push('/');
                    }}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5"
                >
                    <Image
                        src="/logo.jpg"
                        alt="Do'Cheff"
                        width={40}
                        height={40}
                        className="h-9 w-9 rounded-full object-cover ring-1 ring-white/15 sm:h-10 sm:w-10"
                        priority
                    />
                    <span className="font-display text-base font-bold tracking-tight text-ink sm:text-lg">
                        Do&apos;Cheff
                    </span>
                </motion.button>

                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 sm:gap-2"
                >
                    <div className="relative mr-1 hidden rounded-full border border-white/10 bg-white/[0.03] p-0.5 sm:inline-flex">
                        <button
                            type="button"
                            onClick={() => {
                                if (isHome) window.dispatchEvent(new Event('docheff-tab-menu'));
                                else router.push('/');
                            }}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                isHome && activeTab === 'menu' ? 'bg-ember-600 text-white' : 'text-ink-muted hover:text-ink'
                            }`}
                        >
                            Cardápio
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (isHome) window.dispatchEvent(new Event('docheff-tab-orders'));
                                else router.push('/?tab=orders');
                            }}
                            className={`relative rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                isHome && activeTab === 'orders' ? 'bg-ember-600 text-white' : 'text-ink-muted hover:text-ink'
                            }`}
                        >
                            Pedidos
                            {hasOrderNotification && (
                                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                            )}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (isHome) window.dispatchEvent(new Event('docheff-tab-orders'));
                            else router.push('/?tab=orders');
                        }}
                        className="relative rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:bg-white/[0.08] hover:text-ink sm:hidden"
                    >
                        Pedidos
                        {hasOrderNotification && (
                            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowInfo(true)}
                        aria-haspopup="dialog"
                        aria-expanded={showInfo}
                        className="storefront-info-trigger"
                        aria-label="Informações do restaurante"
                    >
                        <span className="storefront-info-trigger-icon"><FaRegCompass aria-hidden="true" /></span>
                        <span className="storefront-info-trigger-label">Sobre a casa</span>
                        <FaArrowUpRightFromSquare className="storefront-info-trigger-arrow" aria-hidden="true" />
                    </button>
                    <div
                        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold sm:px-3 ${
                            isOpen
                                ? 'border-emerald-500/25 bg-emerald-950/40 text-emerald-300'
                                : 'border-white/10 bg-white/[0.04] text-ink-muted'
                        }`}
                    >
                        <span className="relative flex h-2 w-2">
                            {isOpen && (
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                            )}
                            <span
                                className={`relative inline-flex h-2 w-2 rounded-full ${isOpen ? 'bg-emerald-400' : 'bg-ink-faint'}`}
                            />
                        </span>
                        <span className="hidden sm:inline">{loading ? '…' : isOpen ? 'Aberto' : 'Fechado'}</span>
                    </div>
                </motion.div>
            </div>

            <RestaurantInfo open={showInfo} onClose={closeInfo} hours={businessHours} whatsappNumber={whatsappNumber} isOpen={isOpen} loading={loading} />
        </header>
    );
}
