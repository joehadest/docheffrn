'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MenuItem } from '../types/menu';
import { CartItem, CartContextType } from '../types/cart';
import { menuItems } from '../data/menu';

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    const addToCart = (item: MenuItem, quantity: number, observation?: string, size?: string, border?: string, extras?: string[]) => {
        const existingItemIndex = items.findIndex(
            cartItem => cartItem.item._id === item._id &&
                cartItem.size === size &&
                cartItem.border === border &&
                JSON.stringify(cartItem.extras) === JSON.stringify(extras) &&
                cartItem.observation === observation
        );

        let price = item.price;
        if ((item.category === 'pizzas' || item.category === 'massas') && size && item.sizes) {
            const sizeKey = size as keyof typeof item.sizes;
            price = item.sizes[sizeKey] || price;

            if (item.category === 'pizzas') {
            if (observation && observation.includes('Meio a meio:')) {
                const meioAMeioText = observation.split('Meio a meio:')[1];
                // Remove observações adicionais após o slash (como "- Sem cebola")
                const cleanMeioAMeioText = meioAMeioText.split(' - ')[0];
                const [sabor1, sabor2] = cleanMeioAMeioText.split('/').map(s => s.trim());
                const pizzas = menuItems.filter((p: MenuItem) => p.category === 'pizzas');
                const pizza1 = pizzas.find((p: MenuItem) => p.name === sabor1);
                const pizza2 = pizzas.find((p: MenuItem) => p.name === sabor2);

                if (pizza1 && pizza2) {
                    const price1 = pizza1.sizes ? pizza1.sizes[sizeKey] || pizza1.price : pizza1.price;
                    const price2 = pizza2.sizes ? pizza2.sizes[sizeKey] || pizza2.price : pizza2.price;
                    price = Math.max(price1, price2);
                }
            }

            if (border && item.borderOptions) {
                const borderPrice = sizeKey === 'G' ? 8.00 : 4.00;
                price += borderPrice;
            }
            if (extras && item.extraOptions) {
                extras.forEach(extra => {
                    const extraPrice = item.extraOptions![extra];
                    if (extraPrice) {
                        price += extraPrice;
                    }
                });
                }
            }
        }

        if (existingItemIndex > -1) {
            const updatedItems = [...items];
            updatedItems[existingItemIndex].quantity += quantity;
            setItems(updatedItems);
        } else {
            const newItem: CartItem = {
                _id: item._id,
                item,
                quantity,
                observation,
                size,
                border,
                extras,
                name: item.name,
                price
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
                item._id === itemId
                    ? { ...item, quantity }
                    : item
            )
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