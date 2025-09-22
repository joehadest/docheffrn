"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaTimes, FaUtensils, FaCog, FaClipboardList, FaSignOutAlt } from 'react-icons/fa';

// Layout principal do painel admin
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Fechar sidebar ao mudar rota em mobile
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const navItems = [
    { key: 'config', label: 'Configurações', icon: <FaCog />, href: '/admin?tab=config' },
    { key: 'menu', label: 'Cardápio', icon: <FaUtensils />, href: '/admin?tab=menu' },
    { key: 'pedidos', label: 'Pedidos', icon: <FaClipboardList />, href: '/admin?tab=pedidos' },
  ];

  // Extrair tab ativa da query string de forma reativa
  const searchParams = useSearchParams();
  const tab = searchParams ? searchParams.get('tab') : null;
  const activeTab: 'config' | 'menu' | 'pedidos' =
    tab === 'menu' ? 'menu'
    : tab === 'pedidos' ? 'pedidos'
    : 'config';

  return (
    <div className="min-h-screen flex bg-[#121212] text-gray-200">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-gradient-to-b from-[#1d1d1d] to-[#141414] border-r border-gray-800/60">
        <div className="h-20 px-6 flex items-center gap-3 border-b border-gray-800/60">
          <Image src="/logo.jpg" alt="Logo" width={48} height={48} className="rounded-full object-cover" />
          <div>
            <h1 className="text-lg font-bold text-white">Do'Cheff</h1>
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Painel Admin</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 scrollbar-thin scrollbar-thumb-red-600/30 scrollbar-track-transparent">
          <ul className="space-y-1 px-4">
            {navItems.map(item => {
              const isActive = activeTab === item.key;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border ${isActive
                      ? 'bg-red-600/90 border-red-500 text-white shadow-lg shadow-red-600/25'
                      : 'bg-[#1e1e1e] border-transparent hover:border-gray-700 hover:bg-[#242424] text-gray-300'} `}
                  >
                    <span className={`text-base ${isActive ? 'text-white' : 'text-red-500 group-hover:text-red-400'}`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-800/60">
          <button
            onClick={() => router.push('/admin/logout')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-700 transition-colors"
          >
            <FaSignOutAlt /> Sair
          </button>
        </div>
      </aside>

      {/* Sidebar Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="mobileSidebar"
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="fixed inset-y-0 left-0 z-40 w-64 bg-[#181818] border-r border-gray-800/60 flex flex-col lg:hidden shadow-xl"
          >
            <div className="h-16 px-4 flex items-center justify-between border-b border-gray-800/60">
              <div className="flex items-center gap-3">
                <Image src="/logo.jpg" alt="Logo" width={44} height={44} className="rounded-full object-cover" />
                <span className="font-semibold">Do'Cheff</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md hover:bg-gray-700/40 text-gray-300"
                aria-label="Fechar menu"
              >
                <FaTimes />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-3">
                {navItems.map(item => {
                  const isActive = activeTab === item.key;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={`group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border ${isActive
                          ? 'bg-red-600/90 border-red-500 text-white shadow-lg shadow-red-600/25'
                          : 'bg-[#1e1e1e] border-transparent hover:border-gray-700 hover:bg-[#242424] text-gray-300'} `}
                      >
                        <span className={`text-base ${isActive ? 'text-white' : 'text-red-500 group-hover:text-red-400'}`}>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="p-4 border-t border-gray-800/60">
              <button
                onClick={() => router.push('/admin/logout')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-700 transition-colors"
              >
                <FaSignOutAlt /> Sair
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar somente mobile (desktop não precisa do header Cardápio/Online) */}
        <header className="h-14 bg-[#181818] border-b border-gray-800/60 flex items-center px-4 gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md bg-[#242424] hover:bg-[#2d2d2d] text-gray-300"
            aria-label="Abrir menu"
          >
            <FaBars />
          </button>
          <h2 className="text-base font-semibold tracking-wide text-white">
            {navItems.find(n => n.key === activeTab)?.label || 'Painel'}
          </h2>
        </header>

        {/* Área de conteúdo scrollável */}
        <main className="flex-1 bg-[#121212]">
          <div className="mx-auto max-w-7xl p-6 md:p-8 lg:p-10 rounded-2xl bg-[#232222]/80 shadow-lg">
            {children}
          </div>
        </main>
        <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-800/60 bg-[#181818]">
          Do'Cheff Admin · {new Date().getFullYear()} · Desenvolvido por WebPulse
        </footer>
      </div>
    </div>
  );
}
