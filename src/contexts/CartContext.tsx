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

        // ========== INÍCIO DA ALTERAÇÃO ==========
        // A lógica de cálculo de preço foi melhorada para ser mais robusta.
        let price = item.price;
        if ((item.category === 'pizzas' || item.category === 'massas') && size && item.sizes) {
            const sizeKey = size as keyof typeof item.sizes;
            price = item.sizes[sizeKey] || price;

            if (item.category === 'pizzas') {
                if (observation && observation.includes('Meio a meio:')) {
                    const meioAMeioText = observation.split('Meio a meio:')[1];
                    const cleanMeioAMeioText = meioAMeioText.split(' - ')[0];
                    const [sabor1, sabor2] = cleanMeioAMeioText.split('/').map(s => s.trim());
                    const pizzas = menuItems.filter((p: MenuItem) => p.category === 'pizzas');
                    const pizza1 = pizzas.find((p: MenuItem) => p.name === sabor1);
                    const pizza2 = pizzas.find((p: MenuItem) => p.name === sabor2);

                    if (pizza1 && pizza2) {
                        const price1 = pizza1.sizes ? (pizza1.sizes[sizeKey] || pizza1.price) : pizza1.price;
                        const price2 = pizza2.sizes ? (pizza2.sizes[sizeKey] || pizza2.price) : pizza2.price;
                        price = Math.max(price1, price2);
                    }
                }

                if (border && item.borderOptions && item.borderOptions[border]) {
                    price += item.borderOptions[border];
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
            // Garante que o preço unitário está correto
            updatedItems[existingItemIndex].price = price;
            setItems(updatedItems);
        } else {
            // Gera um ID único para o item no carrinho para diferenciar variações
            const uniqueId = `${item._id}-${size || ''}-${border || ''}-${(extras || []).join('-')}-${observation || ''}`;
            const newItem: CartItem = {
                _id: uniqueId,
                item,
                quantity,
                observation,
                size,
                border,
                extras,
                name: item.name,
                price // Preço unitário já calculado
            };
            setItems([...items, newItem]);
        }
        // ========== FIM DA ALTERAÇÃO ==========
    };

    const removeFromCart = (itemId: string) => {
        // Agora remove pelo ID único do item no carrinho
        setItems(prevItems => prevItems.filter(item => item._id !== itemId));
    };

    const updateQuantity = (itemId: string, quantity: number) => {
        setItems(prevItems =>
            prevItems.map(item =>
                // Atualiza pelo ID único do item no carrinho
                item._id === itemId
                    ? { ...item, quantity: Math.max(0, quantity) } // Evita quantidade negativa
                    : item
            ).filter(item => item.quantity > 0) // Remove o item se a quantidade for 0
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