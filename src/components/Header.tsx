'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenu } from '@/contexts/MenuContext';
import Image from 'next/image';
import { FaExclamationCircle } from 'react-icons/fa';
import { isRestaurantOpen } from '../utils/timeUtils';
import type { BusinessHoursConfig } from '../utils/timeUtils';

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [pixKey, setPixKey] = useState('84987291269'); // (84) 98729-1269
    const [showInfo, setShowInfo] = useState(false);
    const [portalReady, setPortalReady] = useState(false);
    const [businessHours, setBusinessHours] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const diasSemana = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Função para verificar se está aberto
    const checkOpenStatus = useCallback(() => {
        if (!businessHours) return false;
        return isRestaurantOpen(businessHours as BusinessHoursConfig);
    }, [businessHours]);

    // Controlar scroll da página quando modal estiver aberto
    useEffect(() => {
        if (showInfo) {
            // Salvar a posição atual do scroll
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
        } else {
            // Restaurar o scroll
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
    }, [showInfo]);

    // Garante que o modal seja renderizado no <body> (Portal),
    // evitando que ele fique “preso” ao layout do Header.
    useEffect(() => {
        setPortalReady(true);
    }, []);

    // Buscar configurações do backend
    useEffect(() => {
        async function fetchSettings() {
            setLoading(true);
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success && data.data) {
                    if (data.data.businessHours) {
                        setBusinessHours(data.data.businessHours);
                    }
                    if (data.data.pixKey) {
                        setPixKey(data.data.pixKey);
                    }
                }
            } catch (err) {
                setBusinessHours(null);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    // Atualizar status a cada minuto
    useEffect(() => {
        if (!businessHours) return;
        setIsOpen(checkOpenStatus());
        const interval = setInterval(() => {
            setIsOpen(checkOpenStatus());
        }, 60000);
        return () => clearInterval(interval);
    }, [businessHours, checkOpenStatus]);

    return (
        <header className="relative z-40 bg-[#262525]/85 backdrop-blur-md border-b border-gray-800/60">
            <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <Image
                        src="/logo.jpg"
                        alt="Logo Do'Cheff"
                        width={64}
                        height={64}
                        className="rounded-full bg-white shadow ring-2 ring-white/10"
                        priority
                    />
                    <div className="hidden sm:block leading-tight">
                        <div className="font-extrabold tracking-tight text-white text-lg">Do&apos;Cheff</div>
                        <div className="text-xs text-gray-400">Cardápio digital</div>
                    </div>
                    <button
                        className="ml-1 sm:ml-2 bg-red-600/90 text-white p-2 rounded-full shadow hover:bg-red-700 transition-colors flex items-center justify-center ring-1 ring-red-400/20"
                        onClick={() => setShowInfo(true)}
                        aria-label="Informações do restaurante"
                    >
                        <FaExclamationCircle className="w-5 h-5" />
                    </button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4"
                >
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-sm ${isOpen
                            ? 'bg-red-600/90 hover:bg-red-700 text-white border-red-400/20'
                            : 'bg-gray-800/80 hover:bg-gray-800 text-white border-gray-700/60'
                            }`}
                        disabled={loading}
                    >
                        <span className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOpen ? 'bg-red-500' : 'bg-gray-500'} opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${isOpen ? 'bg-red-600' : 'bg-gray-600'}`}></span>
                        </span>
                        <span className="text-sm font-semibold">{loading ? 'Carregando...' : isOpen ? 'Aberto' : 'Fechado'}</span>
                    </motion.button>
                </motion.div>
            </div>

            {/* Modal de informações do restaurante (Portal no <body>) */}
            {portalReady && createPortal(
                <AnimatePresence>
                    {showInfo && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 sm:py-10 overflow-y-auto"
                            onClick={() => setShowInfo(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: 12 }}
                                transition={{
                                    type: "spring",
                                    damping: 26,
                                    stiffness: 340
                                }}
                                role="dialog"
                                aria-modal="true"
                                aria-label="Informações do restaurante"
                                className="my-0 sm:my-auto w-full max-w-md sm:max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-[#1f1f1f] text-gray-200 border border-gray-800/60 shadow-2xl flex flex-col"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Header do Modal */}
                                <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-800/60">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-gray-800/60 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-base sm:text-lg font-bold text-white leading-tight">Do&apos;Cheff</h2>
                                                <p className="text-sm text-gray-400">Informações do restaurante</p>
                                            </div>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="shrink-0 rounded-xl p-2 text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-gray-800/60 transition-colors focus:outline-none"
                                            onClick={() => setShowInfo(false)}
                                            aria-label="Fechar informações"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Conteúdo do Modal */}
                                <div className="px-5 py-5 sm:px-6 sm:py-6 space-y-4 overflow-y-auto flex-1">
                                    {/* Horário de Funcionamento */}
                                    <div className="rounded-2xl p-4 border border-gray-800/60 bg-white/3">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 bg-white/5 border border-gray-800/60 rounded-xl flex items-center justify-center">
                                                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="font-semibold text-white">Horário de Funcionamento</h3>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between items-center gap-4">
                                                <span className="text-gray-400">Quarta a Segunda:</span>
                                                <span className="text-white font-medium text-right">18h00 às 23h00</span>
                                            </div>
                                            <div className="flex justify-between items-center gap-4">
                                                <span className="text-gray-400">Terça:</span>
                                                <span className="text-red-400 font-medium text-right">Fechado</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Endereço */}
                                    <div className="rounded-2xl p-4 border border-gray-800/60 bg-white/3">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 bg-white/5 border border-gray-800/60 rounded-xl flex items-center justify-center">
                                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="font-semibold text-white">Endereço</h3>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p className="text-white">Rua Maria Luiza Dantas</p>
                                            <p className="text-gray-400">Alto Rodrigues - RN</p>
                                        </div>
                                    </div>

                                    {/* Contato */}
                                    <div className="rounded-2xl p-4 border border-gray-800/60 bg-white/3">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 bg-white/5 border border-gray-800/60 rounded-xl flex items-center justify-center">
                                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                            </div>
                                            <h3 className="font-semibold text-white">Contato</h3>
                                        </div>
                                        <div className="text-sm">
                                            <p className="text-gray-400">Telefone/WhatsApp:</p>
                                            <p className="text-white font-medium break-words">+55 {pixKey.length === 11 ? pixKey.replace(/(\d{2})(\d{5})(\d{4})/, '$1 $2-$3') : pixKey}</p>
                                        </div>
                                    </div>

                                    {/* Formas de Pagamento */}
                                    <div className="rounded-2xl p-4 border border-gray-800/60 bg-white/3">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 bg-white/5 border border-gray-800/60 rounded-xl flex items-center justify-center">
                                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                            </div>
                                            <h3 className="font-semibold text-white">Formas de Pagamento</h3>
                                        </div>
                                        <div className="text-sm text-gray-300">
                                            Aceitamos cartões de crédito/débito, PIX e dinheiro
                                        </div>
                                    </div>

                                    {/* Redes Sociais */}
                                    <div className="rounded-2xl p-4 border border-gray-800/60 bg-white/3">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 bg-white/5 border border-gray-800/60 rounded-xl flex items-center justify-center">
                                                <svg className="w-4 h-4 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                                </svg>
                                            </div>
                                            <h3 className="font-semibold text-white">Redes Sociais</h3>
                                        </div>
                                        <div className="text-sm">
                                            <p className="text-gray-400">Instagram:</p>
                                            <p className="text-white font-medium">@docheff__</p>
                                        </div>
                                    </div>

                                    {/* CNPJ */}
                                    <div className="rounded-2xl p-4 border border-gray-800/60 bg-white/3">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 bg-white/5 border border-gray-800/60 rounded-xl flex items-center justify-center">
                                                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <h3 className="font-semibold text-white">CNPJ</h3>
                                        </div>
                                        <div className="text-sm">
                                            <p className="text-white font-mono">53.378.172/0001-60</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer do Modal */}
                                <div className="px-5 py-4 sm:px-6 border-t border-gray-800/60">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-gray-500">Desenvolvido por WebPulse</span>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowInfo(false)}
                                            className="text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/7 border border-gray-800/60 rounded-xl px-3 py-2 transition-colors"
                                        >
                                            Fechar
                                        </motion.button>
                                    </div>
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