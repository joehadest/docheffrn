'use client';
import React, { useState, useEffect } from 'react';
import MenuDisplay from '@/components/MenuDisplay';
import RecentOrders from '@/components/RecentOrders';
import { MenuProvider } from '@/contexts/MenuContext';
import { CartProvider } from '@/contexts/CartContext';
import { FaExclamationCircle } from 'react-icons/fa';

export default function Home() {
    const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu');
    const [hasNotification, setHasNotification] = useState(false);

    useEffect(() => {
        const checkNotifications = () => {
            const notifyOrders = JSON.parse(localStorage.getItem('notifyOrders') || '[]');
            if (notifyOrders.length > 0) {
                setHasNotification(true);
            }
        };

        checkNotifications();
        const interval = setInterval(checkNotifications, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <CartProvider>
            <MenuProvider>
                <main className="min-h-screen bg-[#262525]">
                    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
                        <div className="flex justify-center mb-5 sm:mb-8">
                            <div className="inline-flex rounded-2xl border border-gray-800/70 p-1 bg-[#262525]/40 backdrop-blur-md">
                                <button
                                    onClick={() => setActiveTab('menu')}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 bg-transparent ${activeTab === 'menu' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-200 hover:text-white'}`}
                                >
                                    Cardápio
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('orders');
                                        setHasNotification(false);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 bg-transparent flex items-center gap-1 ${activeTab === 'orders' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-200 hover:text-white'}`}
                                >
                                    Pedidos
                                    {hasNotification && (
                                        <FaExclamationCircle className="text-yellow-300 text-[10px]" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {activeTab === 'menu' ? <MenuDisplay /> : <RecentOrders />}
                    </div>
                </main>
            </MenuProvider>
        </CartProvider>
    );
} 