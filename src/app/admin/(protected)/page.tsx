'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminMenu from '@/components/AdminMenu';
import AdminOrders from '@/components/AdminOrders';
import AdminSettings from '@/components/AdminSettings';
import AdminFinanceiro from '@/components/AdminFinanceiro';
import AdminMesas from '@/components/AdminMesas';
import Link from 'next/link';
import Image from 'next/image';
import { MotionConfig } from 'framer-motion';
import { FaUtensils, FaClipboardList, FaCog, FaSignOutAlt, FaMoneyBillWave, FaChair } from 'react-icons/fa';

type AdminTab = 'menu' | 'orders' | 'mesas' | 'financeiro' | 'settings';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('menu');

  const handleLogout = () => {
    router.push('/admin/logout');
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'menu', label: 'Cardápio', icon: <FaUtensils /> },
    { id: 'orders', label: 'Pedidos', icon: <FaClipboardList /> },
    { id: 'mesas', label: 'Mesas', icon: <FaChair /> },
    { id: 'financeiro', label: 'Financeiro', icon: <FaMoneyBillWave /> },
    { id: 'settings', label: 'Configurações', icon: <FaCog /> },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="admin-shell">
        <a href="#admin-content" className="admin-skip">Pular para o conteúdo</a>
        <aside className="admin-sidebar">
          <div className="admin-brand"><Image src="/logo.jpg" alt="" width={48} height={48} className="admin-brand-logo" /><div><strong>Do’Cheff</strong><small>Painel administrativo</small></div></div>
          <div className="admin-mobile-brand"><div className="admin-mobile-brand-identity"><Image src="/logo.jpg" alt="" width={44} height={44} className="admin-brand-logo" /><strong>Do’Cheff <span className="text-xs text-gray-400">/ gestão</span></strong></div><button onClick={handleLogout} aria-label="Sair do painel">Sair <FaSignOutAlt className="inline ml-1" /></button></div>
          <p className="admin-nav-label">Seu restaurante</p>
          <nav className="admin-nav" aria-label="Navegação do painel">
            {tabs.map(tab => <button key={tab.id} type="button" aria-label={tab.label} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => setActiveTab(tab.id)}><span aria-hidden="true">{tab.icon}</span><span className={tab.id === 'settings' ? 'admin-nav-long' : undefined}>{tab.label}</span>{tab.id === 'settings' && <span className="admin-nav-short" aria-hidden="true">Ajustes</span>}</button>)}
          </nav>
          <div className="admin-sidebar-footer"><Link href="/" target="_blank" rel="noopener noreferrer"><FaUtensils aria-hidden="true" /> Ver cardápio público ↗</Link><button type="button" onClick={handleLogout}><FaSignOutAlt aria-hidden="true" /> Sair do painel</button></div>
        </aside>
        <div className="admin-workspace">
          <header className="admin-topbar"><p>Administração <span className="mx-2">/</span> <strong>{tabs.find(tab => tab.id === activeTab)?.label}</strong></p><span className="admin-topbar-badge"><Image src="/logo.jpg" alt="" width={32} height={32} className="admin-brand-logo" />Do’Cheff · Gestão</span></header>
          <main id="admin-content" tabIndex={-1}>
            {activeTab === 'menu' && <AdminMenu />}
            {activeTab === 'orders' && <AdminOrders />}
            {activeTab === 'mesas' && <AdminMesas />}
            {activeTab === 'financeiro' && <AdminFinanceiro />}
            {activeTab === 'settings' && <AdminSettings />}
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
