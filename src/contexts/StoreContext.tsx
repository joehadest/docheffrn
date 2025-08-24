'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface StoreContextType {
    isOpen: boolean;
    toggleStatus: () => void;
    allowHalfAndHalf: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(true);
    const [allowHalfAndHalf, setAllowHalfAndHalf] = useState(false);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success && data.data) {
                    setAllowHalfAndHalf(data.data.allowHalfAndHalf || false);
                }
            } catch (err) {
                // erro silencioso
            }
        }
        fetchSettings();
    }, []);

    useEffect(() => {
        // Carrega o estado inicial do cookie
        const storedStatus = Cookies.get('storeStatus');
        if (storedStatus) {
            setIsOpen(storedStatus === 'open');
        }
    }, []);

    const toggleStatus = () => {
        const newStatus = !isOpen;
        setIsOpen(newStatus);
        // O status será salvo junto com as outras alterações no painel
    };

    return (
    <StoreContext.Provider value={{ isOpen, toggleStatus, allowHalfAndHalf }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
} 