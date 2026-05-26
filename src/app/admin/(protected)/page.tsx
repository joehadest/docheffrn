'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminMenu from '@/components/AdminMenu';
import AdminOrders from '@/components/AdminOrders';
import AdminSettings from '@/components/AdminSettings';
import { FaUtensils, FaClipboardList, FaCog, FaSignOutAlt } from 'react-icons/fa';

type AdminTab = 'menu' | 'orders' | 'settings';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('menu');

  const handleLogout = () => {
    router.push('/admin/logout');
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'menu', label: 'Cardápio', icon: <FaUtensils /> },
    { id: 'orders', label: 'Pedidos', icon: <FaClipboardList /> },
    { id: 'settings', label: 'Configurações', icon: <FaCog /> },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-white/[0.06]">
        {/* linha de acento vermelha */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-700/50 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Marca */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-red-700/20 border border-red-700/30 flex items-center justify-center">
              <span className="text-red-400 text-xs font-bold">DC</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-white leading-none">Do Cheff</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Painel Admin</p>
            </div>
          </div>

          {/* Tabs de navegação */}
          <nav className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.05]" aria-label="Navegação do painel">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  activeTab === tab.id
                    ? 'bg-red-700/80 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
                }`}
              >
                <span className="opacity-80">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-300 border border-white/[0.06] hover:border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.05] transition-all shrink-0"
            title="Sair do painel"
          >
            <FaSignOutAlt size={11} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        {activeTab === 'menu' && <AdminMenu />}
        {activeTab === 'orders' && <AdminOrders />}
        {activeTab === 'settings' && <AdminSettings />}
      </main>
    </div>
  );
}
