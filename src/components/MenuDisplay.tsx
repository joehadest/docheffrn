'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenu } from '@/contexts/MenuContext';
import ItemModal from './ItemModal';
import Cart from './Cart';
import { MenuItem } from '@/types/menu';
import Image from 'next/image';
import { FaExclamationCircle, FaWhatsapp, FaShare } from 'react-icons/fa';
import { useCart } from '../contexts/CartContext';
import { CartItem } from '../types/cart';
import PastaModal from './PastaModal';
import { isRestaurantOpen as checkRestaurantOpen } from '../utils/timeUtils';
import type { BusinessHoursConfig } from '../utils/timeUtils';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } };
const categoryVariants = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } } };

export default function MenuDisplay() {
    // Seus states existentes
    const { isOpen, toggleOpen } = useMenu();
    const { items: cartItems, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [categories, setCategories] = useState<{ _id?: string; value: string; label: string; }[]>([]);
    const [isRestaurantOpen, setIsRestaurantOpen] = useState(true);
    const [showCategoriesModal, setShowCategoriesModal] = useState(false);
    const [selectedPasta, setSelectedPasta] = useState<MenuItem | null>(null);
    const allPizzas = menuItems.filter(item => item.category === 'pizzas');

    // --- LÓGICA DE SCROLL SPY ---
    const categoryRefs = useRef<Record<string, HTMLElement>>({});
    const categoriesContainerRef = useRef<HTMLDivElement>(null);
    const isClickScrolling = useRef(false);

    // --- CORREÇÃO 1: useEffect com array de dependências vazio ---
    // Busca os dados apenas uma vez quando o componente é montado.
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                // Busca categorias
                const catRes = await fetch('/api/categories');
                const catData = await catRes.json();
                if (catData.success) {
                    const sorted = (catData.data || []).slice().sort((a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0));
                    setCategories(sorted);
                    if (sorted.length > 0 && !selectedCategory) {
                        setSelectedCategory(sorted[0].value);
                    }
                } else {
                    throw new Error('Falha ao carregar categorias');
                }

                // Busca itens do menu
                const menuRes = await fetch('/api/menu');
                const menuData = await menuRes.json();
                if (menuData.success) {
                    setMenuItems(menuData.data);
                } else {
                    throw new Error('Falha ao carregar o cardápio');
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao conectar com o servidor');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Array vazio garante que rode apenas uma vez.

    // Scroll Spy com Intersection Observer
    useEffect(() => {
        if (categories.length === 0) return;
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -60% 0px',
            threshold: 0,
        };
        const handleIntersect: IntersectionObserverCallback = (entries) => {
            if (isClickScrolling.current) return;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setSelectedCategory(entry.target.id.replace('category-', ''));
                }
            });
        };
        const observer = new IntersectionObserver(handleIntersect, observerOptions);
        const refs = categoryRefs.current;
        Object.values(refs).forEach(ref => { if (ref) observer.observe(ref); });
        return () => {
            Object.values(refs).forEach(ref => { if (ref) observer.unobserve(ref); });
        };
    }, [categories]);

    // Scroll suave ao clicar na categoria
    const handleCategoryClick = (categoryValue: string) => {
        isClickScrolling.current = true;
        setSelectedCategory(categoryValue);
        const element = document.getElementById(`category-${categoryValue}`);
        if (element) {
            const offset = 120;
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top: elementPosition, behavior: 'smooth' });
        }
        setTimeout(() => { isClickScrolling.current = false; }, 1000);
    };

    // Scroll horizontal da barra de categorias
    useEffect(() => {
        if (!selectedCategory || !categoriesContainerRef.current) return;
        const btn = categoriesContainerRef.current.querySelector(`[data-category="${selectedCategory}"]`);
        if (btn) {
            btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [selectedCategory]);

    // O resto de suas funções (handleAddToCart, etc.)
    const handleAddToCart = (item: MenuItem, quantity: number, observation: string, size?: string, border?: string, extras?: string[]) => {
      addToCart(item, quantity, observation, size, border, extras);
      setSelectedItem(null);
    };
    const handlePastaClick = (item: MenuItem) => { setSelectedPasta(item); };
    const handlePastaClose = () => { setSelectedPasta(null); };
    const handlePastaAddToCart = (quantity: number, observation: string, size?: 'P' | 'G') => {
        if (selectedPasta) {
            addToCart(selectedPasta, quantity, observation, size);
            setSelectedPasta(null);
        }
    };
    const handleCategorySelect = (category: string) => {
        handleCategoryClick(category);
        setShowCategoriesModal(false);
    };


    if (loading) return <div>Carregando...</div>;
    if (error) return <div>Erro: {error}</div>;

    return (
        <div className="min-h-screen bg-[#262525] p-4">
            <div className="sticky top-0 z-10 bg-[#262525] pb-4 mb-6">
                <div className="max-w-7xl mx-auto px-0 sm:px-4">
                    <motion.div
                        ref={categoriesContainerRef}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-red-600 scrollbar-track-gray-800 w-full px-4 sm:px-0 categories-container"
                    >
                        {/* --- CORREÇÃO 2: Ícone do Hambúrguer Restaurado --- */}
                        <motion.button
                            variants={categoryVariants}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowCategoriesModal(true)}
                            className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors flex-shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </motion.button>
                        
                        {categories.map(category => (
                            <motion.button
                                key={category.value}
                                variants={categoryVariants}
                                onClick={() => handleCategoryClick(category.value)}
                                data-category={category.value}
                                className={`px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 category-button relative ${selectedCategory === category.value
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                                    : 'bg-[#262525] text-gray-200 hover:bg-gray-800'
                                    }`}
                            >
                                {category.label}
                                {selectedCategory === category.value && (
                                    <motion.div layoutId="activeCategory" className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
                                )}
                            </motion.button>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Container do cardápio */}
            <div className="max-w-7xl mx-auto px-4 py-4">
                <motion.div className="space-y-8">
                    {categories.map(category => (
                        <div
                            key={category.value}
                            id={`category-${category.value}`}
                            ref={(el) => { if (el) categoryRefs.current[category.value] = el; }}
                            className="space-y-4 pt-20 -mt-20"
                        >
                            <h2 className="text-2xl font-bold text-red-600 capitalize">{category.label}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {menuItems
                                    .filter(item => item.category === category.value)
                                    .map((item) => (
                                        <motion.div
                                            key={item._id}
                                            variants={itemVariants}
                                            className="bg-[#262525] rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-800"
                                        >
                                            <div className="relative h-48">
                                                <Image
                                                    src={item.image || '/placeholder.jpg'}
                                                    alt={item.name}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <h3 className="text-xl font-semibold text-white mb-2">{item.name}</h3>
                                                <p className="text-gray-300 mb-4">{item.description}</p>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-red-500 font-bold text-lg">R$ {item.price.toFixed(2)}</span>
                                                    <motion.button
                                                        onClick={() => {
                                                            if (!isRestaurantOpen) return;
                                                            if (item.category === 'massas') {
                                                                handlePastaClick(item);
                                                            } else {
                                                                setSelectedItem(item);
                                                            }
                                                        }}
                                                        disabled={!isRestaurantOpen}
                                                        className={`px-4 py-2 rounded-lg transition-colors duration-300 ${isRestaurantOpen
                                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        {isRestaurantOpen ? 'Adicionar' : 'Fechado'}
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
            
            {/* Seus Modais, incluindo o de categorias que agora será aberto pelo botão */}
            <AnimatePresence>
                {showCategoriesModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                        onClick={() => setShowCategoriesModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#262525] rounded-xl p-6 shadow-lg max-w-md w-full relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                className="absolute top-2 right-2 text-gray-400 hover:text-white"
                                onClick={() => setShowCategoriesModal(false)}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <h2 className="text-xl font-bold text-red-600 mb-4">Categorias</h2>
                            <div className="flex flex-col gap-3">
                                {categories.map(category => (
                                    <button
                                        key={category.value}
                                        className={`px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 category-button relative ${selectedCategory === category.value
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                                            : 'bg-[#262525] text-gray-200 hover:bg-gray-800'
                                            }`}
                                        onClick={() => handleCategorySelect(category.value)}
                                    >
                                        {category.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedItem && (
                    <ItemModal
                        item={selectedItem}
                        onClose={() => setSelectedItem(null)}
                        onAddToCart={(quantity, observation, size, border, extras) => {
                            handleAddToCart(selectedItem!, quantity, observation, size, border, extras);
                        }}
                        allPizzas={allPizzas}
                    />
                )}
            </AnimatePresence>
            
            {/* ... resto dos seus modais e botão de carrinho ... */}

        </div>
    );
}