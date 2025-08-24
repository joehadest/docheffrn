'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RestaurantStatus } from '@/types';
import { Category } from '@/types/menu'; // Supondo que você tenha a tipagem da Categoria

// Interface para o que o Contexto vai fornecer
interface MenuContextType {
    isOpen: boolean;
    toggleOpen: () => void;
    status: RestaurantStatus | null;
    loading: boolean;
    error: string | null;
    categories: Category[]; // Adicionamos a lista de categorias aqui
}

// --- CORREÇÃO 1: Exportar o Context ---
export const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(true);
    const [status, setStatus] = useState<RestaurantStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // --- CORREÇÃO 2: Adicionar estado e busca para as categorias ---
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        // Função para buscar as categorias da sua API
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/categories');
                const data = await res.json();
                if (data.success) {
                    setCategories(data.data);
                } else {
                    setError('Falha ao carregar as categorias.');
                }
            } catch (err) {
                setError('Erro de conexão ao buscar categorias.');
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []); // O array vazio [] faz com que isso rode apenas uma vez

    const toggleOpen = () => {
        setIsOpen(prev => !prev);
    };

    // --- CORREÇÃO 3: Fornecer as categorias no 'value' do Provider ---
    const providerValue = { 
        isOpen, 
        toggleOpen, 
        status, 
        loading, 
        error, 
        categories // Disponibilizando para os componentes-filhos
    };

    return (
        <MenuContext.Provider value={providerValue}>
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