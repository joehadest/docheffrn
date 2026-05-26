"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const passwordInputRef = React.useRef<HTMLInputElement | null>(null);
    const router = useRouter();

    React.useEffect(() => { passwordInputRef.current?.focus(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (data.success) {
                router.push('/admin');
            } else {
                setError(data.message || 'Senha incorreta');
            }
        } catch {
            setError('Erro ao conectar com o servidor');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] py-12 px-4 relative overflow-hidden">

            {/* Orbs de fundo */}
            <div aria-hidden className="pointer-events-none select-none absolute inset-0">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-red-700/20 blur-[120px]" />
                <div className="absolute -bottom-40 -right-20 w-[420px] h-[420px] rounded-full bg-orange-700/15 blur-[100px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-red-900/10 blur-[80px]" />
            </div>

            {/* Grade sutil */}
            <div
                aria-hidden
                className="pointer-events-none select-none absolute inset-0 opacity-[0.025]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.16, 0.77, 0.3, 1] }}
                className="relative w-full max-w-sm z-10"
            >
                <div
                    className="relative rounded-2xl border border-white/[0.07] bg-[#181818]/90 backdrop-blur-md shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]"
                    onMouseMove={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
                    }}
                >
                    {/* Linha de acento no topo */}
                    <div className="absolute top-0 inset-x-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-red-600 to-transparent" />

                    {/* Glow interativo */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500"
                        style={{
                            background: 'radial-gradient(320px circle at var(--mx,50%) var(--my,50%), rgba(239,68,68,0.07), transparent 70%)',
                        }}
                    />

                    <div className="relative z-10 px-8 py-10 space-y-8">

                        {/* Cabeçalho */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.93 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="flex flex-col items-center gap-5"
                        >
                            {/* Logo com anel animado */}
                            <div className="relative">
                                <span className="absolute inset-0 rounded-full animate-ping bg-red-600/20" style={{ animationDuration: '2.8s' }} />
                                <span className="absolute -inset-1.5 rounded-full border border-red-600/25" />
                                <Image
                                    src="/logo.jpg"
                                    alt="Logo Do'Cheff"
                                    width={84}
                                    height={84}
                                    className="relative rounded-full border-2 border-white/10 shadow-2xl shadow-red-950/50"
                                    priority
                                />
                                <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center ring-2 ring-[#181818] shadow-lg">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            </div>

                            <div className="text-center space-y-1.5">
                                <h1 id="login-title" className="text-2xl font-bold text-white tracking-tight">
                                    Painel Administrativo
                                </h1>
                                <p className="text-gray-500 text-sm">
                                    Do&apos;Cheff — Acesso restrito
                                </p>
                            </div>

                            {/* Badge de acesso restrito */}
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-900/40 text-red-400 text-xs font-medium tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Área restrita
                            </span>
                        </motion.div>

                        {/* Formulário */}
                        <motion.form
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.22 }}
                            className="space-y-5"
                            onSubmit={handleSubmit}
                            aria-labelledby="login-title"
                        >
                            <div>
                                <label htmlFor="password" className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                                    Senha de Acesso
                                </label>
                                <div className="relative">
                                    {/* Ícone de cadeado à esquerda */}
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                                        disabled={isLoading}
                                        className="w-full pl-10 pr-11 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/70 focus:border-red-600/40 hover:border-white/[0.14] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                        placeholder="••••••••"
                                        aria-required="true"
                                        aria-invalid={!!error}
                                        aria-describedby="password-help"
                                        ref={passwordInputRef}
                                    />
                                    <p id="password-help" className="sr-only">Digite a senha administrativa para acessar o painel.</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    >
                                        {showPassword ? (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2.5 bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3"
                                    role="alert"
                                    aria-live="assertive"
                                >
                                    <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-red-300 text-sm">{error}</span>
                                </motion.div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.015 }}
                                whileTap={{ scale: 0.975 }}
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center items-center gap-2.5 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-red-700 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#181818] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_4px_24px_-4px_rgba(220,38,38,0.5)] hover:shadow-[0_4px_32px_-4px_rgba(220,38,38,0.65)] overflow-hidden"
                                aria-busy={isLoading}
                                aria-label={isLoading ? 'Verificando credenciais' : 'Entrar no painel'}
                            >
                                {/* Shimmer no hover */}
                                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Verificando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        Acessar Painel
                                    </>
                                )}
                            </motion.button>
                        </motion.form>

                        {/* Rodapé */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="flex items-center gap-3"
                        >
                            <span className="flex-1 h-px bg-white/[0.06]" />
                            <p className="text-[11px] text-gray-600 tracking-wide whitespace-nowrap">
                                Do&apos;Cheff — Sistema de gestão
                            </p>
                            <span className="flex-1 h-px bg-white/[0.06]" />
                        </motion.div>

                    </div>
                </div>
            </motion.div>
        </div>
    );
}