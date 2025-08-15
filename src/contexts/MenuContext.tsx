'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { RestaurantStatus } from '@/types';

interface MenuContextType {
    isOpen: boolean;
    toggleOpen: () => void;
    status: RestaurantStatus | null;
    loading: boolean;
    error: string | null;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(true);
    const [status, setStatus] = useState<RestaurantStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const toggleOpen = () => {
        setIsOpen(prev => !prev);
    };

    return (
        <MenuContext.Provider value={{ isOpen, toggleOpen, status, loading, error }}>
            {children}
        </MenuContext.Provider>
    );
}

export function useMenu() {
    const context = useContext(MenuContext);
    if (context === undefined) {
        throw new Error('useMenu deve ser usado dentro de um MenuProvider');
    }
    return context;
} 