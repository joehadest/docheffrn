'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from '../types/menu';

interface PastaModalProps {
    item: MenuItem;
    onClose: () => void;
    onAddToCart: (quantity: number, observation: string, size?: 'P' | 'G') => void;
}

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const panelVariants = {
    hidden: { opacity: 0, y: '100%' },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', damping: 28, stiffness: 320 },
    },
    exit: { opacity: 0, y: '40%', transition: { duration: 0.22 } },
};

const panelVariantsDesktop = {
    hidden: { opacity: 0, scale: 0.96, y: 16 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', damping: 26, stiffness: 340 },
    },
    exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.18 } },
};

export default function PastaModal({ item, onClose, onAddToCart }: PastaModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [observation, setObservation] = useState('');
    const [selectedSize, setSelectedSize] = useState<'P' | 'G'>('P');
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        setQuantity(1);
        setObservation('');
        setSelectedSize('P');
    }, [item]);

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 640px)');
        const sync = () => setIsDesktop(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const unitPrice = item.sizes ? item.sizes[selectedSize] || item.price : item.price;
    const total = unitPrice * quantity;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddToCart(quantity, observation, selectedSize);
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-md sm:items-center sm:p-4"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={onClose}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pasta-modal-title"
            >
                <motion.div
                    className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-surface-raised shadow-2xl sm:max-h-[92vh] sm:max-w-lg sm:rounded-3xl"
                    variants={isDesktop ? panelVariantsDesktop : panelVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={(e) => e.stopPropagation()}
                    role="document"
                >
                    <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
                        <span className="h-1 w-10 rounded-full bg-white/20" />
                    </div>

                    <div className="relative h-44 shrink-0 overflow-hidden sm:h-52">
                        {item.image ? (
                            <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="(max-width: 640px) 100vw, 512px"
                                className="object-cover"
                                unoptimized={item.image.startsWith('http')}
                                priority
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-surface-overlay text-5xl opacity-40">
                                🍝
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface-raised via-surface-raised/40 to-black/20" />

                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
                            aria-label="Fechar"
                            style={{ top: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="absolute bottom-3 left-4 right-14">
                            <h2 id="pasta-modal-title" className="font-display text-xl font-bold leading-tight text-ink sm:text-2xl">
                                {item.name}
                            </h2>
                            {item.description && (
                                <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{item.description}</p>
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                            <section>
                                <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-faint">
                                    Tamanho
                                </h3>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {(['P', 'G'] as const).map((size) => {
                                        const selected = selectedSize === size;
                                        const price = item.sizes?.[size];
                                        return (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => setSelectedSize(size)}
                                                className={`relative rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.98] ${
                                                    selected
                                                        ? 'border-ember-500/70 bg-ember-950/50 text-ink'
                                                        : 'border-white/10 bg-white/[0.03] text-ink-muted hover:border-white/20'
                                                }`}
                                            >
                                                {selected && (
                                                    <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-ember-600">
                                                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </span>
                                                )}
                                                <div className="pr-5 text-sm font-semibold">
                                                    {size === 'P' ? 'Pequena' : 'Grande'}
                                                </div>
                                                <div className={`mt-1 text-xs ${selected ? 'text-ember-300' : 'text-ink-faint'}`}>
                                                    R$ {(price ?? item.price).toFixed(2)}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section>
                                <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-faint">
                                    Observação
                                </h3>
                                <textarea
                                    value={observation}
                                    onChange={(e) => setObservation(e.target.value)}
                                    placeholder="Ex: Sem cebola, mais queijo…"
                                    className="form-input min-h-[88px] resize-none"
                                    rows={3}
                                />
                            </section>
                        </div>

                        <div
                            className="shrink-0 border-t border-white/[0.08] bg-surface-raised/95 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-4"
                            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
                        >
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] p-1">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-ink"
                                        aria-label="Diminuir quantidade"
                                    >
                                        −
                                    </button>
                                    <span className="min-w-[1.75rem] text-center text-base font-bold text-ink">{quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-ember-600 text-lg font-bold text-white"
                                        aria-label="Aumentar quantidade"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Total</p>
                                    <p className="font-display text-xl font-bold text-ember-400 sm:text-2xl">
                                        R$ {total.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className="w-full rounded-2xl bg-ember-600 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-ember-500"
                            >
                                Adicionar ao carrinho
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
