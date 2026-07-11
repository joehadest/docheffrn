'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { isRestaurantOpen } from '../utils/timeUtils';
import type { BusinessHoursConfig } from '../utils/timeUtils';

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [pixKey, setPixKey] = useState('84987291269');
    const [showInfo, setShowInfo] = useState(false);
    const [portalReady, setPortalReady] = useState(false);
    const [businessHours, setBusinessHours] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu');
    const [hasOrderNotification, setHasOrderNotification] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const isHome = pathname === '/' || pathname === '';

    const checkOpenStatus = useCallback(() => {
        return isRestaurantOpen(businessHours as BusinessHoursConfig);
    }, [businessHours]);

    useEffect(() => {
        if (showInfo) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
    }, [showInfo]);

    useEffect(() => {
        setPortalReady(true);
    }, []);

    useEffect(() => {
        async function fetchSettings() {
            setLoading(true);
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success && data.data) {
                    if (data.data.businessHours) setBusinessHours(data.data.businessHours);
                    if (data.data.pixKey) setPixKey(data.data.pixKey);
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
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-surface/80 backdrop-blur-xl">
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
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:bg-white/[0.08] hover:text-ink"
                        aria-label="Informações do restaurante"
                    >
                        Info
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

            {portalReady &&
                createPortal(
                    <AnimatePresence>
                        {showInfo && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm sm:items-center sm:py-10"
                                onClick={() => setShowInfo(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98, y: 12 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98, y: 12 }}
                                    transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                                    role="dialog"
                                    aria-modal="true"
                                    aria-label="Informações do restaurante"
                                    className="my-0 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-raised text-ink shadow-2xl sm:my-auto sm:max-w-lg"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6 sm:py-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h2 className="font-display text-lg font-bold text-ink">Do&apos;Cheff</h2>
                                                <p className="text-sm text-ink-muted">Informações do restaurante</p>
                                            </div>
                                            <button
                                                className="rounded-xl p-2 text-ink-muted transition hover:bg-white/5 hover:text-ink"
                                                onClick={() => setShowInfo(false)}
                                                aria-label="Fechar informações"
                                            >
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6">
                                        {[
                                            {
                                                title: 'Horário de Funcionamento',
                                                body: (
                                                    <>
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-ink-muted">Quarta a Segunda</span>
                                                            <span className="font-medium text-ink">18h–23h</span>
                                                        </div>
                                                        <div className="mt-1 flex justify-between gap-4">
                                                            <span className="text-ink-muted">Terça</span>
                                                            <span className="font-medium text-ember-400">Fechado</span>
                                                        </div>
                                                    </>
                                                ),
                                            },
                                            {
                                                title: 'Endereço',
                                                body: (
                                                    <>
                                                        <p className="text-ink">Rua Maria Luiza Dantas</p>
                                                        <p className="text-ink-muted">Alto Rodrigues — RN</p>
                                                    </>
                                                ),
                                            },
                                            {
                                                title: 'Contato',
                                                body: (
                                                    <p className="font-medium text-ink">
                                                        +55{' '}
                                                        {pixKey.length === 11
                                                            ? pixKey.replace(/(\d{2})(\d{5})(\d{4})/, '$1 $2-$3')
                                                            : pixKey}
                                                    </p>
                                                ),
                                            },
                                            {
                                                title: 'Pagamento',
                                                body: <p className="text-ink-muted">Cartão, PIX e dinheiro</p>,
                                            },
                                            {
                                                title: 'Instagram',
                                                body: <p className="font-medium text-ink">@docheff__</p>,
                                            },
                                            {
                                                title: 'CNPJ',
                                                body: <p className="font-mono text-sm text-ink">53.378.172/0001-60</p>,
                                            },
                                        ].map((block) => (
                                            <div
                                                key={block.title}
                                                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                                            >
                                                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
                                                    {block.title}
                                                </h3>
                                                <div className="text-sm">{block.body}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-4 sm:px-6">
                                        <span className="text-xs text-ink-faint">Desenvolvido por WebPulse</span>
                                        <button
                                            onClick={() => setShowInfo(false)}
                                            className="rounded-full bg-ember-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-ember-500"
                                        >
                                            Fechar
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </header>
    );
}
