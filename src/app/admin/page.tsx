'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import AdminOrders from '@/components/AdminOrders';
import AdminSettings from '@/components/AdminSettings';
import AdminMenu from '@/components/AdminMenu';

export default function AdminPanel() {
    // Detecta tab ativa pela query string de forma reativa
    const searchParams = useSearchParams();
    const tab = searchParams ? searchParams.get('tab') : null;
    const activeTab: 'config' | 'menu' | 'pedidos' =
        tab === 'menu' ? 'menu'
        : tab === 'pedidos' ? 'pedidos'
        : 'config';

    return (
        <main className="min-h-screen bg-[#262525]">
            <div className="max-w-7xl mx-auto px-4 py-8 rounded-2xl bg-[#262525]/80 shadow-lg">
                {/* Renderiza conteúdo conforme tab */}
                {activeTab === 'config' && <AdminSettings />}
                {activeTab === 'menu' && <AdminMenu />}
                {activeTab === 'pedidos' && <AdminOrders />}
            </div>
        </main>
    );
} 