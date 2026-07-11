'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

type MenuHeroProps = {
    isOpen: boolean;
    loading?: boolean;
    onExplore: () => void;
    onInfo?: () => void;
};

export default function MenuHero({ isOpen, loading, onExplore, onInfo }: MenuHeroProps) {
    return (
        <section className="menu-hero relative min-h-[78vh] sm:min-h-[72vh] flex flex-col justify-end overflow-hidden pb-10 pt-8 sm:pb-14 sm:pt-10">
            {/* Banner full-bleed */}
            <div className="absolute inset-0 z-0" aria-hidden>
                <Image
                    src="/hero-banner.jpg"
                    alt=""
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover object-center"
                />
                {/* Gradientes para legibilidade e fusão com o fundo do site */}
                <div className="absolute inset-0 bg-gradient-to-b from-surface/55 via-surface/25 to-surface" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-90" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-3xl px-5 text-center sm:px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="mx-auto mb-5 flex justify-center"
                >
                    <div className="relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-white/20 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] sm:h-24 sm:w-24">
                        <Image
                            src="/logo.jpg"
                            alt="Do'Cheff"
                            fill
                            priority
                            className="object-cover"
                            sizes="96px"
                        />
                    </div>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12, duration: 0.5 }}
                    className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted"
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-ink-faint'}`}
                    />
                    {loading ? 'Carregando…' : isOpen ? 'Aberto agora' : 'Fechado no momento'}
                </motion.p>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                    className="font-display text-[clamp(2.75rem,12vw,5.5rem)] font-extrabold leading-[0.92] tracking-[-0.04em] text-ink drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)]"
                >
                    Do&apos;Cheff
                </motion.h1>

                {/* Faixa Itália — referência da logo */}
                <motion.div
                    initial={{ opacity: 0, scaleX: 0.6 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.32, duration: 0.45 }}
                    className="mx-auto mt-4 flex h-1 w-24 overflow-hidden rounded-full sm:w-28"
                    aria-hidden
                >
                    <span className="flex-1 bg-[#008C45]" />
                    <span className="flex-1 bg-white" />
                    <span className="flex-1 bg-[#CD212A]" />
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.55 }}
                    className="mx-auto mt-4 max-w-md text-pretty text-base text-ink-muted sm:text-lg"
                >
                    Sabores feitos na hora. Peça pelo cardápio e confirme no WhatsApp.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.52, duration: 0.5 }}
                    className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
                >
                    <button
                        type="button"
                        onClick={onExplore}
                        className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-ember-600 px-7 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-ember-500 active:scale-[0.98]"
                    >
                        Ver cardápio
                    </button>
                    {onInfo && (
                        <button
                            type="button"
                            onClick={onInfo}
                            className="inline-flex min-w-[160px] items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-6 py-3.5 text-sm font-semibold text-ink backdrop-blur-sm transition hover:bg-white/[0.1]"
                        >
                            Horários e local
                        </button>
                    )}
                </motion.div>
            </div>
        </section>
    );
}
