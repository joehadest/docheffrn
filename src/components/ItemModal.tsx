'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from '../types/menu';
import { calculatePizzaPrice } from '../utils/priceCalculator';

interface ItemModalProps {
    item: MenuItem;
    onClose: () => void;
    onAddToCart: (
        item: MenuItem,
        quantity: number,
        unitPrice: number,
        observation: string,
        size?: string,
        border?: string,
        extras?: string[],
        flavors?: string[]
    ) => void;
    allPizzas?: MenuItem[];
    categories?: { value?: string; name?: string; allowHalfAndHalf?: boolean }[];
    allowHalfAndHalf?: boolean;
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

function OptionChip({
    selected,
    title,
    subtitle,
    onClick,
}: {
    selected: boolean;
    title: string;
    subtitle?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.98] ${
                selected
                    ? 'border-ember-500/70 bg-ember-950/50 text-ink shadow-[0_0_0_1px_rgba(196,30,30,0.25)]'
                    : 'border-white/10 bg-white/[0.03] text-ink-muted hover:border-white/20 hover:bg-white/[0.06] hover:text-ink'
            }`}
        >
            {selected && (
                <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-ember-600">
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </span>
            )}
            <div className={`pr-5 text-sm font-semibold leading-tight ${selected ? 'text-ink' : ''}`}>{title}</div>
            {subtitle && <div className={`mt-1 text-xs ${selected ? 'text-ember-300' : 'text-ink-faint'}`}>{subtitle}</div>}
        </button>
    );
}

export default function ItemModal({
    item,
    onClose,
    onAddToCart,
    allPizzas,
    categories = [],
}: ItemModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [observation, setObservation] = useState('');
    const defaultSize = item.sizes ? Object.keys(item.sizes)[0] : 'P';
    const [selectedSize, setSelectedSize] = useState<string>(defaultSize);
    const [selectedBorder, setSelectedBorder] = useState<string>('');
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    const [isHalf, setIsHalf] = useState(false);
    const [half1, setHalf1] = useState<MenuItem | null>(item);
    const [half2, setHalf2] = useState<MenuItem | null>(null);
    const [error, setError] = useState('');
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        setHalf1(item);
        setHalf2(null);
        setIsHalf(false);
        setQuantity(1);
        setObservation('');
        setSelectedBorder('');
        setSelectedExtras([]);
        setSelectedSize(item.sizes ? Object.keys(item.sizes)[0] : 'P');
        setError('');
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

    const itemCategory = categories.find((c) => c.value === item.category || c.name === item.category);
    const canHalf = Boolean(itemCategory?.allowHalfAndHalf && allPizzas?.length);
    const halfIncomplete = isHalf && (!half1 || !half2);

    const unitPrice = calculatePizzaPrice(
        item,
        selectedSize,
        selectedBorder,
        selectedExtras,
        isHalf && half1 && half2 ? `Meio a meio: ${half1.name} / ${half2.name}` : undefined,
        allPizzas
    );
    const total = unitPrice * quantity;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (halfIncomplete) {
            setError('Selecione os dois sabores para meio a meio.');
            return;
        }
        setError('');

        if (isHalf && half1 && half2) {
            const description = `Meio a meio: ${half1.name} / ${half2.name}`;
            onAddToCart(
                item,
                quantity,
                unitPrice,
                observation ? `${description} - ${observation}` : description,
                selectedSize,
                selectedBorder,
                selectedExtras,
                [half1.name, half2.name]
            );
        } else {
            onAddToCart(item, quantity, unitPrice, observation, selectedSize, selectedBorder, selectedExtras);
        }
    };

    const toggleExtra = (extra: string) => {
        setSelectedExtras((prev) => (prev.includes(extra) ? prev.filter((e) => e !== extra) : [...prev, extra]));
    };

    const sizeCount = item.sizes ? Object.keys(item.sizes).length : 0;

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
                aria-labelledby="item-modal-title"
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
                    {/* Handle mobile */}
                    <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
                        <span className="h-1 w-10 rounded-full bg-white/20" />
                    </div>

                    {/* Hero imagem */}
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
                                🍽️
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
                            <h2 id="item-modal-title" className="font-display text-xl font-bold leading-tight text-ink sm:text-2xl">
                                {item.name}
                            </h2>
                            {item.description && (
                                <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{item.description}</p>
                            )}
                        </div>
                    </div>

                    {/* Conteúdo scrollável */}
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                            {/* Tamanhos */}
                            {item.sizes && sizeCount > 0 && (
                                <section>
                                    <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-faint">
                                        Tamanho
                                    </h3>
                                    <div
                                        className={`grid gap-2.5 ${
                                            sizeCount === 1 ? 'grid-cols-1' : sizeCount === 2 ? 'grid-cols-2' : 'grid-cols-3'
                                        }`}
                                    >
                                        {Object.entries(item.sizes).map(([sizeKey, price]) => (
                                            <OptionChip
                                                key={sizeKey}
                                                selected={selectedSize === sizeKey}
                                                title={sizeKey}
                                                subtitle={`R$ ${price.toFixed(2)}`}
                                                onClick={() => setSelectedSize(sizeKey)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Meio a meio */}
                            {canHalf && (
                                <section
                                    className={`rounded-2xl border p-3.5 transition-colors ${
                                        isHalf
                                            ? 'border-ember-600/40 bg-ember-950/30'
                                            : 'border-white/10 bg-white/[0.02]'
                                    }`}
                                >
                                    <label className="flex cursor-pointer items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={isHalf}
                                            onChange={(e) => {
                                                setIsHalf(e.target.checked);
                                                setError('');
                                            }}
                                            className="form-checkbox"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-ink">Meio a meio</p>
                                            <p className="text-xs text-ink-muted">Dois sabores na mesma pizza</p>
                                        </div>
                                        {isHalf && (
                                            <span className="rounded-full bg-ember-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                                ATIVO
                                            </span>
                                        )}
                                    </label>

                                    <AnimatePresence>
                                        {isHalf && allPizzas && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-3 grid gap-3 overflow-hidden sm:grid-cols-2"
                                            >
                                                <div>
                                                    <label className="form-label">1º sabor</label>
                                                    <select
                                                        className="form-input"
                                                        value={half1?.name || ''}
                                                        onChange={(e) => {
                                                            setHalf1(allPizzas.find((p) => p.name === e.target.value) || null);
                                                            setError('');
                                                        }}
                                                    >
                                                        {allPizzas.map((pizza) => (
                                                            <option key={pizza._id} value={pizza.name}>
                                                                {pizza.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="form-label">2º sabor</label>
                                                    <select
                                                        className="form-input"
                                                        value={half2?.name || ''}
                                                        onChange={(e) => {
                                                            setHalf2(allPizzas.find((p) => p.name === e.target.value) || null);
                                                            setError('');
                                                        }}
                                                    >
                                                        <option value="">Selecione…</option>
                                                        {allPizzas
                                                            .filter((p) => p.name !== half1?.name)
                                                            .map((pizza) => (
                                                                <option key={pizza._id} value={pizza.name}>
                                                                    {pizza.name}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                                {half1 && half2 && (
                                                    <p className="rounded-xl border border-ember-700/40 bg-ember-950/40 px-3 py-2 text-center text-xs text-ember-200 sm:col-span-2">
                                                        {half1.name} + {half2.name}
                                                    </p>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </section>
                            )}

                            {/* Bordas */}
                            {item.category === 'pizzas' &&
                                item.borderOptions &&
                                Object.keys(item.borderOptions).length > 0 && (
                                    <section>
                                        <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-faint">
                                            Borda
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <OptionChip
                                                selected={selectedBorder === ''}
                                                title="Sem borda"
                                                subtitle="R$ 0,00"
                                                onClick={() => setSelectedBorder('')}
                                            />
                                            {Object.entries(item.borderOptions).map(([borderKey, price]) => (
                                                <OptionChip
                                                    key={borderKey}
                                                    selected={selectedBorder === borderKey}
                                                    title={borderKey}
                                                    subtitle={`+ R$ ${price.toFixed(2)}`}
                                                    onClick={() => setSelectedBorder(borderKey)}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                            {/* Extras */}
                            {item.category === 'pizzas' &&
                                item.extraOptions &&
                                Object.keys(item.extraOptions).length > 0 && (
                                    <section>
                                        <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-faint">
                                            Extras
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {Object.entries(item.extraOptions).map(([extraKey, price]) => (
                                                <OptionChip
                                                    key={extraKey}
                                                    selected={selectedExtras.includes(extraKey)}
                                                    title={extraKey}
                                                    subtitle={`+ R$ ${price.toFixed(2)}`}
                                                    onClick={() => toggleExtra(extraKey)}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                            {/* Observação */}
                            <section>
                                <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-faint">
                                    Observação
                                </h3>
                                <textarea
                                    value={observation}
                                    onChange={(e) => setObservation(e.target.value)}
                                    placeholder="Ex: Sem cebola, bem passada…"
                                    className="form-input min-h-[88px] resize-none"
                                    rows={3}
                                />
                            </section>

                            <AnimatePresence>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="rounded-xl border border-ember-800/50 bg-ember-950/50 px-3 py-2 text-center text-xs text-ember-200"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer sticky */}
                        <div
                            className="shrink-0 border-t border-white/[0.08] bg-surface-raised/95 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-4"
                            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
                        >
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] p-1">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-ink transition hover:bg-white/15"
                                        aria-label="Diminuir quantidade"
                                    >
                                        −
                                    </button>
                                    <span className="min-w-[1.75rem] text-center text-base font-bold text-ink">{quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-ember-600 text-lg font-bold text-white transition hover:bg-ember-500"
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
                                whileTap={halfIncomplete ? {} : { scale: 0.98 }}
                                type="submit"
                                disabled={halfIncomplete}
                                className={`w-full rounded-2xl py-3.5 text-sm font-bold transition ${
                                    halfIncomplete
                                        ? 'cursor-not-allowed bg-white/10 text-ink-faint'
                                        : 'bg-ember-600 text-white shadow-glow hover:bg-ember-500'
                                }`}
                            >
                                {halfIncomplete ? 'Selecione os dois sabores' : 'Adicionar ao carrinho'}
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
