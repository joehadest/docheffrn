// src/contexts/CartContext.tsx

'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MenuItem } from '../types/menu';
import { CartItem, CartContextType } from '../types/cart';

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    const addToCart = (item: MenuItem, quantity: number, unitPrice: number, observation?: string, size?: string, border?: string, extras?: string[], flavors?: string[]) => {
        const existingItemIndex = items.findIndex(
            cartItem => cartItem.item._id === item._id &&
                cartItem.size === size &&
                cartItem.border === border &&
                JSON.stringify(cartItem.extras?.sort()) === JSON.stringify(extras?.sort()) &&
                JSON.stringify(cartItem.flavors?.sort()) === JSON.stringify(flavors?.sort()) &&
                cartItem.observation === observation
        );

        if (existingItemIndex > -1) {
            const updatedItems = [...items];
            updatedItems[existingItemIndex].quantity += quantity;
            setItems(updatedItems);
        } else {
            const newItem: CartItem = {
                _id: `${item._id}-${Date.now()}`,
                item,
                quantity,
                observation,
                size,
                border,
                extras,
                flavors,
                name: item.name,
                price: unitPrice
            };
            setItems([...items, newItem]);
        }
    };

    const removeFromCart = (itemId: string) => {
        setItems(prevItems => prevItems.filter(item => item._id !== itemId));
    };

    const updateQuantity = (itemId: string, quantity: number) => {
        setItems(prevItems =>
            prevItems.map(item =>
                item._id === itemId && quantity > 0
                    ? { ...item, quantity }
                    : item
            ).filter(item => item.quantity > 0)
        );
    };

    const clearCart = () => {
        setItems([]);
    };

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}