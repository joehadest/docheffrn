"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../admin.css';
import Link from 'next/link';
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
        <main className="admin-theme admin-login">
            <section className="admin-login-story" aria-label="Do’Cheff, gestão do restaurante">
                <div className="admin-brand"><span className="admin-brand-mark">DC</span><div><strong>Do’Cheff</strong><small>Gestão do restaurante</small></div></div>
                <div><p className="admin-eyebrow">Tudo pronto para o atendimento</p><h2>Mais organização.<br />Mais tempo para<br /><span>o que importa.</span></h2><p>Cardápio, pedidos, mesas e financeiro em um só lugar.</p></div>
                <p className="text-xs text-gray-400">Do’Cheff · Painel administrativo</p>
            </section>
            <div className="admin-login-form">
                <div className="w-full max-w-sm">
                    <Image src="/logo.jpg" alt="Do’Cheff" width={64} height={64} className="rounded-2xl mb-8" priority />
                    <p className="admin-eyebrow">Acesso administrativo</p>
                    <h1 id="login-title" className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
                    <p className="admin-description mb-8">Entre para gerenciar seu restaurante.</p>
                    <form onSubmit={handleSubmit} aria-labelledby="login-title" className="space-y-5">
                        <div><label htmlFor="password" className="form-label">Senha de acesso</label><div className="relative"><input id="password" name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={event => { setPassword(event.target.value); setError(''); }} disabled={isLoading} className="form-input pr-20" placeholder="Digite sua senha" aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} ref={passwordInputRef} /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1 text-xs text-gray-300 min-h-9 px-2">{showPassword ? 'Ocultar' : 'Mostrar'}</button></div></div>
                        {error && <p id="login-error" role="alert" className="text-sm text-red-300 bg-red-950/30 border border-red-800 p-3 rounded-xl">{error}</p>}
                        <button type="submit" className="form-button-primary w-full" disabled={isLoading} aria-busy={isLoading}>{isLoading ? 'Verificando acesso…' : 'Entrar no painel →'}</button>
                    </form>
                    <p className="text-xs text-gray-400 mt-6">Acesso exclusivo à equipe Do’Cheff.</p>
                    <Link href="/" className="inline-block mt-8 text-sm text-gray-300 hover:text-white">← Voltar ao cardápio</Link>
                </div>
            </div>
        </main>
    );
}
