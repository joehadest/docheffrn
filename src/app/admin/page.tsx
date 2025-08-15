'use client';
import React, { useState, useEffect } from 'react';
import AdminOrders from '@/components/AdminOrders';
import AdminSettings from '@/components/AdminSettings';
import AdminMenu from '@/components/AdminMenu';

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState<'config' | 'pedidos' | 'menu'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('adminActiveTab') as 'config' | 'pedidos' | 'menu') || 'config';
        }
        return 'config';
    });

    useEffect(() => {
        localStorage.setItem('adminActiveTab', activeTab);
    }, [activeTab]);

    return (
        <main className="min-h-screen bg-[#262525]">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 bg-transparent text-gray-200 hover:text-white ${activeTab === 'config' ? 'border-b-2 border-red-600' : ''}`}
                        >
                            Configurações
                        </button>
                        <button
                            onClick={() => setActiveTab('menu')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 bg-transparent text-gray-200 hover:text-white ${activeTab === 'menu' ? 'border-b-2 border-red-600' : ''}`}
                        >
                            Cardápio
                        </button>
                        <button
                            onClick={() => setActiveTab('pedidos')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 bg-transparent text-gray-200 hover:text-white ${activeTab === 'pedidos' ? 'border-b-2 border-red-600' : ''}`}
                        >
                            Pedidos
                        </button>
                    </div>
                </div>

                {activeTab === 'config' ? <AdminSettings /> :
                    activeTab === 'menu' ? <AdminMenu /> :
                        <AdminOrders />}
            </div>
        </main>
    );
} 