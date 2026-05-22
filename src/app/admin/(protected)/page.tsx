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
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-[#141414]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Do Cheff — Admin</h1>
            <p className="text-xs text-gray-500">Gerencie cardápio, pedidos e configurações</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Navegação do painel">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white'
                    : 'bg-[#2a2a2a] text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[#2a2a2a] text-gray-300 hover:bg-gray-700 ml-auto sm:ml-0"
              title="Sair do painel"
            >
              <FaSignOutAlt />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </nav>
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
