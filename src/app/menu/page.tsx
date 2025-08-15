'use client';
import React from 'react';
import MenuDisplay from '@/components/MenuDisplay';
import { MenuProvider } from '@/contexts/MenuContext';
import { CartProvider } from '@/contexts/CartContext';

export default function MenuPage() {
    return (
        <CartProvider>
            <MenuProvider>
                <main className="min-h-screen bg-[#262525]">
                    <div className="max-w-7xl mx-auto px-4 py-8">
                        <MenuDisplay />
                    </div>
                </main>
            </MenuProvider>
        </CartProvider>
    );
} 