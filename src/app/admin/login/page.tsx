"use client";
import React, { useState } from 'react';
export const dynamic = 'force-dynamic';
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (data.success) {
                router.push('/admin');
            } else {
                setError(data.message || 'Senha incorreta');
            }
        } catch (error) {
            setError('Erro ao conectar com o servidor');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#262525] via-[#1a1a1a] to-[#0f0f0f] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
                <div className="absolute top-0 left-0 w-72 h-72 bg-red-500 rounded-full mix-blend-multiply filter blur-2xl animate-pulse"></div>
                <div className="absolute top-0 right-0 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-2xl animate-pulse animation-delay-2000"></div>
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-red-600 rounded-full mix-blend-multiply filter blur-2xl animate-pulse animation-delay-4000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative max-w-md w-full z-10"
            >
                <div
                    className="bubble-card p-8 backdrop-blur-sm"
                    onMouseMove={(e) => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                        e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
                    }}
                >
                    <span className="bubble-glow" />
                    <span className="bubble-press-overlay" />
                    <span className="bubble-border-gradient" />
                    <div className="bubble-content space-y-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.15 }}
                            className="text-center"
                        >
                            <div className="flex justify-center mb-6 relative">
                                <div className="relative">
                                    <Image
                                        src="/logo.jpg"
                                        alt="Logo Do'Cheff"
                                        width={88}
                                        height={88}
                                        className="rounded-full bg-white shadow-xl border-4 border-white"
                                        priority
                                    />
                                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-[#1a1a1a]">
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                                Painel Administrativo
                            </h1>
                            <p className="text-gray-400 text-sm">
                                Acesse o painel de controle do Do'Cheff
                            </p>
                        </motion.div>

                        <motion.form
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.25 }}
                            className="space-y-6"
                            onSubmit={handleSubmit}
                            aria-labelledby="login-title"
                        >
                            <div className="space-y-4">
                                <div className="relative">
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                        Senha de Acesso
                                    </label>
                                    <div className="relative group">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isLoading}
                                            className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-800/30 disabled:cursor-not-allowed backdrop-blur-sm"
                                            placeholder="Digite sua senha"
                                            aria-required="true"
                                            aria-invalid={!!error}
                                            aria-describedby="password-help"
                                            ref={passwordInputRef}
                                        />
                                        <p id="password-help" className="sr-only">Digite a senha administrativa para acessar o painel.</p>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                        >
                                            {showPassword ? (
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-red-500/10 border border-red-500/30 rounded-lg p-3"
                                    role="alert"
                                    aria-live="assertive"
                                >
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-red-400 text-sm">{error}</span>
                                    </div>
                                </motion.div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:from-red-800 disabled:to-red-900 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-red-900/20"
                                aria-busy={isLoading}
                                aria-label={isLoading ? 'Verificando credenciais' : 'Entrar no painel'}
                            >
                                {isLoading ? (
                                    <div className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Verificando...
                                    </div>
                                ) : (
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        Acessar Painel
                                    </div>
                                )}
                            </motion.button>
                        </motion.form>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.45 }}
                            className="text-center"
                        >
                            <p className="text-xs text-gray-500 tracking-wide">
                                Sistema de gerenciamento Do'Cheff
                            </p>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}