'use client';
import React from 'react';
import MenuDisplay from '@/components/MenuDisplay';
import { MenuProvider } from '@/contexts/MenuContext';
import { CartProvider } from '@/contexts/CartContext';

export default function MenuPage() {
    return (
        <CartProvider>
            <MenuProvider>
                <MenuDisplay showHero />
            </MenuProvider>
        </CartProvider>
    );
}
