'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenu } from '@/contexts/MenuContext';
import ItemModal from './ItemModal';
import Cart from './Cart';
import { MenuItem, Category } from '@/types/menu'; // Importa a interface Category
import Image from 'next/image';
import { FaWhatsapp, FaStar, FaDotCircle } from 'react-icons/fa';
import { useCart } from '../contexts/CartContext';
import PastaModal from './PastaModal';
import { isRestaurantOpen as checkRestaurantOpen } from '../utils/timeUtils';
import type { BusinessHoursConfig } from '../utils/timeUtils';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100
        }
    }
};

export default function MenuDisplay() {
    const [allowHalfAndHalf, setAllowHalfAndHalf] = useState(true);
    const categoriesContainerRef = useRef<HTMLDivElement>(null);
    const { isOpen } = useMenu();
    const { items: cartItems, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('destaques');
    const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [finalOrderData, setFinalOrderData] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]); // Usa a interface importada
    const [deliveryFees, setDeliveryFees] = useState<{ neighborhood: string; fee: number }[]>([]);
    const [isRestaurantOpen, setIsRestaurantOpen] = useState(true);
    const [selectedPasta, setSelectedPasta] = useState<MenuItem | null>(null);
    const categoryElementsRef = useRef<{ [key: string]: HTMLElement | null }>({});

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [menuRes, catRes, settingsRes] = await Promise.all([
                    fetch('/api/menu'),
                    fetch('/api/categories'),
                    fetch('/api/settings')
                ]);

                const menuData = await menuRes.json();
                if (menuData.success) setMenuItems(menuData.data);
                else setError('Erro ao carregar o cardápio');

                const catData = await catRes.json();
                if (catData.success) {
                    const sorted = (catData.data || []).slice().sort((a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0));
                    setCategories(sorted);
                } else setError(prev => (prev ? prev + ' ' : '') + 'Falha ao buscar categorias.');

                const settingsData = await settingsRes.json();
                if (settingsData.success && settingsData.data) {
                    setDeliveryFees(settingsData.data.deliveryFees || []);
                    setAllowHalfAndHalf(settingsData.data.allowHalfAndHalf === true);
                    if (settingsData.data.businessHours) {
                        setIsRestaurantOpen(checkRestaurantOpen(settingsData.data.businessHours as BusinessHoursConfig));
                    } else {
                        setIsRestaurantOpen(false);
                    }
                }

            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                setError('Erro ao conectar com o servidor');
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const categoryId = entry.target.id.replace('category-', '');
                        setSelectedCategory(categoryId);
                        return;
                    }
                }
            },
            { rootMargin: "-40% 0px -60% 0px", threshold: 0 }
        );

        const currentElements = categoryElementsRef.current;
        Object.values(currentElements).forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => {
            Object.values(currentElements).forEach((el) => {
                if (el) observer.unobserve(el);
            });
        };
    }, [menuItems, categories]);


    useEffect(() => {
        if (selectedCategory && categoriesContainerRef.current) {
            const activeButton = categoriesContainerRef.current.querySelector(`[data-category-value='${selectedCategory}']`);
            if (activeButton) {
                activeButton.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest',
                });
            }
        }
    }, [selectedCategory]);

    const handleFinalizeOrder = (pedidoData: any) => {
        setFinalOrderData(pedidoData);
        setShowWhatsAppModal(true);
        setIsCartOpen(false);
    };

    const handleSendToWhatsappAndSave = async () => {
        if (!finalOrderData) return;
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalOrderData),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Não foi possível registrar o pedido.');
            }
            const { cliente, tipoEntrega, endereco, formaPagamento, troco, itens, total, observacoes } = finalOrderData;
            const deliveryFee = tipoEntrega === 'entrega' ? endereco.deliveryFee : 0;
            const subtotal = total - deliveryFee;
            const header = `*Novo Pedido - Do'Cheff*`;
            const customerInfo = `\n\n*Cliente:*\nNome: ${cliente.nome}\nTelefone: ${cliente.telefone}`;
            const addressInfo = tipoEntrega === 'entrega'
                ? `\n\n*Entrega:*\nRua: ${endereco.address.street}, N°: ${endereco.address.number}\nBairro: ${endereco.address.neighborhood}\nReferencia: ${endereco.address.referencePoint || 'N/A'}`
                : `\n\n*Entrega:*\nRetirada no Local`;
            const paymentInfo = `\n\n*Pagamento:*\nForma: ${formaPagamento}${formaPagamento === 'dinheiro' && troco ? `\nTroco para: R$ ${troco}` : ''}`;
            const itemsInfo = itens.map((item: any) => {
                let itemText = `- ${item.quantidade}x ${item.nome}`;
                if (item.size) itemText += ` (${item.size})`;
                if (item.observacao) itemText += `\n  Obs: ${item.observacao}`;
                return itemText;
            }).join('\n');
            const generalObs = observacoes ? `\n\n*Observacoes Gerais:*\n${observacoes}` : '';
            const totals = `\n\n*Valores:*\nSubtotal: R$ ${subtotal.toFixed(2)}\nTaxa de Entrega: R$ ${deliveryFee.toFixed(2)}\n*Total: R$ ${total.toFixed(2)}*`;
            const footer = formaPagamento === 'pix' ? `\n\n*Chave PIX para pagamento:*\n8498729126 (Celular)` : '';
            const message = `${header}\n${customerInfo}\n${addressInfo}\n\n*Itens do Pedido:*\n${itemsInfo}${generalObs}\n${paymentInfo}\n${totals}${footer}`;
            const whatsappUrl = `https://wa.me/558498729126?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
            clearCart();
            setShowWhatsAppModal(false);
            setOrderSuccessId(data.pedidoId);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Ocorreu um erro.");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const anyOpen = !!selectedItem || isCartOpen || !!selectedPasta;
        if (anyOpen) document.body.classList.add('modal-open');
        else document.body.classList.remove('modal-open');
        return () => { document.body.classList.remove('modal-open'); };
    }, [selectedItem, isCartOpen, selectedPasta]);

    const allPizzas = menuItems.filter(item => item.category === 'pizzas');

    const handleCategoryClick = (categoryValue: string) => {
        const element = document.getElementById(`category-${categoryValue}`);
        if (element) {
            const offset = 140;
            const elementPosition = element.offsetTop - offset;
            window.scrollTo({
                top: Math.max(0, elementPosition),
                behavior: 'smooth'
            });
        }
    };

    const handleAddToCart = (item: MenuItem, quantity: number, observation: string, size?: string, border?: string, extras?: string[]) => {
        addToCart(item, quantity, observation, size, border, extras);
        setSelectedItem(null);
    };

    const handlePastaClick = (item: MenuItem) => setSelectedPasta(item);
    const handlePastaClose = () => setSelectedPasta(null);

    const handlePastaAddToCart = (quantity: number, observation: string, size?: 'P' | 'G') => {
        if (selectedPasta) {
            addToCart(selectedPasta, quantity, observation, size);
            setSelectedPasta(null);
        }
    };

    const featuredItems = menuItems.filter(item => item.destaque);


    if (loading) return <div className="text-center py-10">Carregando cardápio...</div>;
    if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-[#262525]">
            <div className="sticky top-0 z-20 bg-gradient-to-b from-[#262525] via-[#262525] to-transparent pb-4 pt-2" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div ref={categoriesContainerRef} className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
                        <motion.button
                            data-category-value="destaques"
                            onClick={() => handleCategoryClick('destaques')}
                            className={`relative px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 text-sm font-semibold transition-colors flex items-center gap-2 ${selectedCategory === 'destaques' ? 'text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                        >
                            <span className="relative z-10 flex items-center gap-2"><FaStar className="text-yellow-400" /> Destaques</span>
                            {selectedCategory === 'destaques' && (
                                <motion.div
                                    layoutId="activeCategoryHighlight"
                                    className="absolute inset-0 bg-red-600 rounded-full"
                                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                />
                            )}
                        </motion.button>

                        {categories.map(category => (
                            <motion.button
                                key={category.value}
                                data-category-value={category.value}
                                onClick={() => handleCategoryClick(category.value)}
                                className={`relative px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 text-sm font-semibold transition-colors flex items-center gap-2 ${selectedCategory === category.value ? 'text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {category.icon || <FaDotCircle />}
                                    {category.label}
                                </span>
                                {selectedCategory === category.value && (
                                    <motion.div
                                        layoutId="activeCategoryHighlight"
                                        className="absolute inset-0 bg-red-600 rounded-full"
                                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                    />
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-4">
                <motion.div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-red-600 mb-2">Do'Cheff</h1>
                    <p className="text-gray-400">Escolha seus itens favoritos</p>
                    {!isRestaurantOpen && (
                        <div className="mt-4 p-3 bg-red-900/20 border border-red-600/50 rounded-lg max-w-md mx-auto text-red-400 text-sm">
                            Estabelecimento Fechado. Pedidos não serão aceitos.
                        </div>
                    )}
                </motion.div>

                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-12">
                    <div
                        id="category-destaques"
                        ref={(el) => { categoryElementsRef.current['destaques'] = el; }}
                        className="space-y-4 pt-2"
                    >
                        <h2 className="text-2xl font-bold text-red-500 flex items-center gap-2"><FaStar className="text-yellow-400" /> Destaques da Casa</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {featuredItems.map(item => (
                                <motion.div
                                    key={item._id}
                                    variants={itemVariants}
                                    className="bg-[#2a2a2a] rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
                                    onClick={() => isRestaurantOpen && (item.category === 'massas' ? handlePastaClick(item) : setSelectedItem(item))}
                                >
                                    <div className="relative aspect-square overflow-hidden">
                                        <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs sm:text-sm font-bold">R$ {item.price.toFixed(2)}</div>
                                        {!isRestaurantOpen && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">Fechado</div>}
                                    </div>
                                    <div className="p-3 sm:p-4">
                                        <h3 className="font-bold text-white text-sm sm:text-base mb-2 sm:mb-3 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">{item.name}</h3>
                                        <button className={`w-full py-2 px-4 rounded-lg text-xs sm:text-sm font-medium ${isRestaurantOpen ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>
                                            {isRestaurantOpen ? 'Adicionar' : 'Indisponível'}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {categories.map((category) => (
                        <div
                            key={category.value}
                            id={`category-${category.value}`}
                            ref={(el) => { categoryElementsRef.current[category.value] = el; }}
                            className="space-y-4 pt-2"
                        >
                            <h2 className="text-2xl font-bold text-red-600 capitalize flex items-center gap-2">
                                {category.icon || <FaDotCircle />} {category.label}
                            </h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                {menuItems.filter(item => item.category === category.value).map(item => (
                                    <motion.div
                                        key={item._id}
                                        variants={itemVariants}
                                        className="bg-[#2a2a2a] rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
                                        onClick={() => isRestaurantOpen && (item.category === 'massas' ? handlePastaClick(item) : setSelectedItem(item))}
                                    >
                                        <div className="relative aspect-square overflow-hidden">
                                            <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs sm:text-sm font-bold">R$ {item.price.toFixed(2)}</div>
                                            {!isRestaurantOpen && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">Fechado</div>}
                                        </div>
                                        <div className="p-3 sm:p-4">
                                            <h3 className="font-bold text-white text-sm sm:text-base mb-2 sm:mb-3 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">{item.name}</h3>
                                            <button className={`w-full py-2 px-4 rounded-lg text-xs sm:text-sm font-medium ${isRestaurantOpen ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>
                                                {isRestaurantOpen ? 'Adicionar' : 'Indisponível'}
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </motion.div>

                <AnimatePresence>
                    {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} onAddToCart={(quantity, observation, size, border, extras) => handleAddToCart(selectedItem!, quantity, observation, size, border, extras)} allPizzas={allPizzas} allowHalfAndHalf={allowHalfAndHalf} categories={categories} />}
                    {selectedPasta && <PastaModal item={selectedPasta} onClose={handlePastaClose} onAddToCart={handlePastaAddToCart} />}
                    {isCartOpen && <Cart items={cartItems} onUpdateQuantity={updateQuantity} onRemoveItem={removeFromCart} onClose={() => setIsCartOpen(false)} onFinalize={handleFinalizeOrder} />}
                </AnimatePresence>

                <AnimatePresence>
                    {showWhatsAppModal && finalOrderData && (
                        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <motion.div className="bg-[#262525] rounded-xl shadow-xl p-6 max-w-md w-full mx-4 text-center" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                                <h2 className="text-xl font-bold text-red-500 mb-4">Quase lá! Finalize seu Pedido</h2>
                                <p className="text-gray-300 mb-4 text-sm">Seu pedido será enviado para o nosso WhatsApp para confirmação.</p>
                                <div className="bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-xs p-3 rounded-lg mb-6">
                                    Atenção: Seu pedido só será confirmado e enviado para o estabelecimento após ser enviado pelo WhatsApp.
                                </div>
                                <div className="flex justify-center gap-4">
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSendToWhatsappAndSave} disabled={isSubmitting} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center gap-2 font-semibold disabled:opacity-50">
                                        {isSubmitting ? 'Enviando...' : <><FaWhatsapp /> Enviar para WhatsApp</>}
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowWhatsAppModal(false)} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                                        Cancelar
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {cartItems.length > 0 && (
                        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={() => setIsCartOpen(true)} className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span className="font-bold text-lg">{cartItems.reduce((total, item) => total + item.quantity, 0)}</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}