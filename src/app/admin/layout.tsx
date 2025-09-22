"use client";
import React from 'react';
import Link from 'next/link';
// Importe o useSearchParams
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaTimes, FaUtensils, FaCog, FaClipboardList, FaSignOutAlt } from 'react-icons/fa';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  // Obtenha os searchParams de forma reativa
  const searchParams = useSearchParams();

  // Efeito para fechar o sidebar ao mudar de rota
  React.useEffect(() => {
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [pathname, searchParams]); // Adicione searchParams aqui também

  const navItems = [
    { key: 'config', label: 'Configurações', icon: <FaCog />, href: '/admin?tab=config' },
    { key: 'menu', label: 'Cardápio', icon: <FaUtensils />, href: '/admin?tab=menu' },
    { key: 'pedidos', label: 'Pedidos', icon: <FaClipboardList />, href: '/admin?tab=pedidos' },
  ];
  
  const [activeTab, setActiveTab] = React.useState<'config' | 'menu' | 'pedidos'>('config');
  
  // Efeito que agora reage às mudanças nos parâmetros da URL
  React.useEffect(() => {
    const tab = searchParams?.get('tab');
    setActiveTab(tab === 'menu' ? 'menu' : tab === 'pedidos' ? 'pedidos' : 'config');
  }, [searchParams]); // A dependência agora é searchParams

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' },
  };

  // Componente de conteúdo do Sidebar (sem alterações na estrutura interna)
  const SidebarContent = () => (
    <>
      <div className="h-20 px-6 flex items-center gap-3 border-b border-gray-800/60">
        <Image src="/logo.jpg" alt="Logo" width={48} height={48} className="rounded-full object-cover" />
        <div>
          <h1 className="text-lg font-bold text-white">Do'Cheff</h1>
          <p className="text-xs uppercase tracking-wide text-gray-400">Painel Admin</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-2 px-4 relative">
          {navItems.map(item => {
            const isActive = activeTab === item.key;
            return (
              <li key={item.key} className="relative">
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors relative z-10 ${
                    isActive ? 'text-white' : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <span className={`text-lg transition-colors ${isActive ? 'text-white' : 'text-red-500'}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute inset-0 bg-red-600 rounded-lg z-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-800/60">
        <button
          onClick={() => {
            setSidebarOpen(false);
            router.push('/admin/logout');
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold bg-red-700 hover:bg-red-800 transition-colors"
        >
          <FaSignOutAlt /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#1a1a1a] text-gray-200">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-60 bg-[#1F1F1F] border-r border-gray-800/50">
        <SidebarContent />
      </aside>

      {/* Sidebar Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.aside
              key="mobile-sidebar"
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-[#1F1F1F] border-r border-gray-800 flex flex-col lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          </>
        )}
      </AnimatePresence>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-[#1F1F1F] border-b border-gray-800/50 flex items-center px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-md hover:bg-gray-800 text-gray-300" aria-label="Abrir menu">
            <FaBars />
          </button>
          <h2 className="ml-4 text-lg font-semibold text-white">
            {navItems.find(n => n.key === activeTab)?.label || 'Painel'}
          </h2>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}