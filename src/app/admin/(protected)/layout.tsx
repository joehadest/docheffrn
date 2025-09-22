"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaTimes, FaUtensils, FaCog, FaClipboardList, FaSignOutAlt } from 'react-icons/fa';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	const [sidebarOpen, setSidebarOpen] = React.useState(false);
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();

	React.useEffect(() => {
		if (sidebarOpen) {
			setSidebarOpen(false);
		}
	}, [pathname, searchParams]);

	const navItems = [
		{ key: 'config', label: 'Configurações', icon: <FaCog />, href: '/admin?tab=config' },
		{ key: 'menu', label: 'Cardápio', icon: <FaUtensils />, href: '/admin?tab=menu' },
		{ key: 'pedidos', label: 'Pedidos', icon: <FaClipboardList />, href: '/admin?tab=pedidos' },
	];
  
	const [activeTab, setActiveTab] = React.useState<'config' | 'menu' | 'pedidos'>('config');
  
	React.useEffect(() => {
		const tab = searchParams?.get('tab');
		setActiveTab(tab === 'menu' ? 'menu' : tab === 'pedidos' ? 'pedidos' : 'config');
	}, [searchParams]);

	const sidebarVariants = {
		open: { x: 0 },
		closed: { x: '-100%' },
	};

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
							className="fixed inset-0 z-40 bg-black/60 lg:hidden"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setSidebarOpen(false)}
						/>
					</>
				)}
			</AnimatePresence>

			{/* Conteúdo principal */}
			<div className="flex-1 min-h-screen">
				<header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-800/60 bg-[#1F1F1F]">
					<button
						className="text-2xl text-red-500 focus:outline-none"
						onClick={() => setSidebarOpen(true)}
						aria-label="Abrir menu"
					>
						<FaBars />
					</button>
					<h1 className="text-lg font-bold text-white">Do'Cheff</h1>
					<div className="w-8" />
				</header>
				<main className="p-4 lg:p-8">
					{children}
				</main>
			</div>
		</div>
	);
}
