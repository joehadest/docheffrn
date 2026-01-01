'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenu } from '@/contexts/MenuContext';
import ItemModal from './ItemModal';
import Cart from './Cart';
import { MenuItem, Category } from '@/types/menu';
import Image from 'next/image';
import { FaWhatsapp, FaStar, FaDotCircle } from 'react-icons/fa';
import { useCart } from '@/contexts/CartContext';
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
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const categoriesContainerRef = useRef<HTMLDivElement>(null);
    const stickyBarRef = useRef<HTMLDivElement>(null);
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
    const [categories, setCategories] = useState<Category[]>([]);
    const [deliveryFees, setDeliveryFees] = useState<{ neighborhood: string; fee: number }[]>([]);
    const [isRestaurantOpen, setIsRestaurantOpen] = useState(true);
    const [selectedPasta, setSelectedPasta] = useState<MenuItem | null>(null);
    const categoryElementsRef = useRef<{ [key: string]: HTMLElement | null }>({});

    const isClickScrolling = useRef(false);
    const [stickyOffset, setStickyOffset] = useState<number>(0);

    // Calcula dinamicamente a altura/offset da barra de categorias sticky,
    // considerando safe-area/topo e variações de toolbar móvel
    useEffect(() => {
        const computeStickyOffset = () => {
            const h = stickyBarRef.current?.getBoundingClientRect().height ?? 0;
            // margem extra para respirar abaixo da barra
            setStickyOffset(Math.max(0, Math.ceil(h)));
        };

        computeStickyOffset();
        window.addEventListener('resize', computeStickyOffset);
        // Em dispositivos móveis, visualViewport altera com a barra/teclado
        const vv = (window as any).visualViewport as VisualViewport | undefined;
        vv?.addEventListener('resize', computeStickyOffset);
        // Importante: evitar recalcular em 'scroll' do visualViewport no iOS para não causar re-render em cada frame

        return () => {
            window.removeEventListener('resize', computeStickyOffset);
            vv?.removeEventListener('resize', computeStickyOffset);
        };
    }, []);

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

    // Fonte da seleção para controlar animações horizontais
    const lastSelectionSource = useRef<'click' | 'observer'>('observer');
    // Seleção de categoria baseada em scrollY com offset da barra sticky (mais estável que IO em iOS)
    useEffect(() => {
        let rafId = 0;
        const ids = ['destaques', ...categories.map(c => c.value)];

        const updateActiveByScroll = () => {
            rafId = 0;
            if (isClickScrolling.current) return;

            const y = window.scrollY + stickyOffset + 12; // compensa a barra sticky
            let activeId = ids[0];
            for (const id of ids) {
                const el = categoryElementsRef.current[id];
                if (!el) continue;
                if (el.offsetTop <= y) {
                    activeId = id;
                } else {
                    break;
                }
            }
            if (activeId !== selectedCategory) {
                lastSelectionSource.current = 'observer';
                setSelectedCategory(activeId);
            }
        };

        const onScroll = () => {
            if (rafId) return;
            rafId = requestAnimationFrame(updateActiveByScroll);
        };
        const onResize = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(updateActiveByScroll);
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
        // Atualiza uma vez ao montar/alterar dependências
        updateActiveByScroll();

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [categories, stickyOffset, selectedCategory]);

    // Rolagem horizontal controlada da barra de categorias (sem afetar o scroll vertical da página)
    useEffect(() => {
        const container = categoriesContainerRef.current;
        if (!selectedCategory || !container) return;

        const activeButton = container.querySelector(`[data-category-value='${selectedCategory}']`) as HTMLElement | null;
        if (!activeButton) return;

        // Só anima se o botão estiver fora de vista (para evitar jitter)
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        const leftIn = buttonRect.left - containerRect.left;
        const rightIn = leftIn + buttonRect.width;
        const margin = 16; // margem de conforto visual
        const fullyVisible = leftIn >= margin && rightIn <= containerRect.width - margin;
        if (fullyVisible) return;

        // Calcula o alvo de scrollLeft para centralizar aproximadamente o botão ativo
        const currentLeft = container.scrollLeft;
        const buttonOffsetLeft = buttonRect.left - containerRect.left + currentLeft;
        const targetLeft = buttonOffsetLeft - (containerRect.width - buttonRect.width) / 2;

        // Anima suavemente apenas o eixo horizontal
        const start = performance.now();
        const duration = 240; // ms
        const from = currentLeft;
        const to = Math.max(0, targetLeft);

        let rafId = 0;
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = easeOutCubic(p);
            container.scrollLeft = from + (to - from) * eased;
            if (p < 1) rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [selectedCategory]);

    const handleFinalizeOrder = (pedidoData: any) => {
        setFinalOrderData(pedidoData);
        setShowWhatsAppModal(true);
        setIsCartOpen(false);
    };

    const handleSendToWhatsappAndSave = async () => {
        if (!finalOrderData || isSubmitting) return;
        setIsSubmitting(true);
        try {
            // Monta a mensagem primeiro e tenta abrir o WhatsApp imediatamente (evita bloqueio de pop-up)
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
            const footer = formaPagamento === 'pix' ? `\n\n*Chave PIX para pagamento:*\n84987291269 (Celular)` : '';
            const message = `${header}\n${customerInfo}\n${addressInfo}\n\n*Itens do Pedido:*\n${itemsInfo}${generalObs}\n${paymentInfo}\n${totals}${footer}`;
            const whatsappUrl = `https://wa.me/558498729126?text=${encodeURIComponent(message)}`;

            // IMPORTANTE: Salvar o pedido ANTES de abrir o WhatsApp
            // Isso garante que o pedido seja registrado mesmo se o WhatsApp falhar
            const saveResponse = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalOrderData),
            });

            const saveData = await saveResponse.json();

            if (!saveData.success) {
                // Se houver erro ao salvar, mostra mensagem de erro visual
                setSuccessMessage(saveData.message || 'Erro ao salvar pedido. Por favor, tente novamente.');
                setShowSuccessMessage(true);
                setTimeout(() => {
                    setShowSuccessMessage(false);
                }, 5000);
                setIsSubmitting(false);
                return;
            }

            // Pedido salvo com sucesso
            if (saveData.pedidoId) {
                setOrderSuccessId(saveData.pedidoId);
                
                // Mostrar mensagem de sucesso
                setSuccessMessage('Pedido salvo com sucesso! Agora envie pelo WhatsApp para confirmar.');
                setShowSuccessMessage(true);
                
                // Disparar evento para atualizar lista de pedidos
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('pedido-salvo'));
                }
                
                // Esconder mensagem após 5 segundos
                setTimeout(() => {
                    setShowSuccessMessage(false);
                }, 5000);
            }

            // Agora tenta abrir o WhatsApp
            try {
                // Primeiro, tenta abrir em nova aba
                const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                
                // Se pop-up foi bloqueado, tenta redirecionar diretamente
                if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                    // Verifica se está em dispositivo móvel
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    
                    if (isMobile) {
                        // Em mobile, tenta abrir diretamente
                        window.location.href = whatsappUrl;
                    } else {
                        // Em desktop, tenta copiar a mensagem e abrir WhatsApp silenciosamente
                        // Sem mostrar alerts desnecessários
                        navigator.clipboard.writeText(message).catch(() => {
                            // Se falhar ao copiar, apenas abre o WhatsApp
                        });
                        window.open('https://wa.me/558498729126', '_blank');
                    }
                }
            } catch (error) {
                // Pedido já foi salvo, então apenas informa o usuário
                // Erro silencioso - não precisa logar
            }

            clearCart();
            setShowWhatsAppModal(false);
        } catch (error) {
            // Mostra erro visual em vez de alert
            setSuccessMessage(error instanceof Error ? error.message : 'Ocorreu um erro. Por favor, tente novamente.');
            setShowSuccessMessage(true);
            setTimeout(() => {
                setShowSuccessMessage(false);
            }, 5000);
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
        isClickScrolling.current = true;
        lastSelectionSource.current = 'click';
        setSelectedCategory(categoryValue);

        const element = document.getElementById(`category-${categoryValue}`);
        if (element) {
            const offset = stickyOffset + 8; // 8px de folga abaixo da barra
            const elementPosition = element.offsetTop - offset;
            window.scrollTo({
                top: Math.max(0, elementPosition),
                behavior: 'smooth'
            });

            setTimeout(() => {
                isClickScrolling.current = false;
                // Após a rolagem por clique, futuras mudanças voltam a ser marcadas como provenientes do observer
                lastSelectionSource.current = 'observer';
            }, 1000);
        }
    };

    const handleAddToCart = (item: MenuItem, quantity: number, unitPrice: number, observation: string, size?: string, border?: string, extras?: string[]) => {
        addToCart(item, quantity, unitPrice, observation, size, border, extras);
        setSelectedItem(null);
        setIsCartOpen(true);
    };

    const handlePastaClick = (item: MenuItem) => setSelectedPasta(item);
    const handlePastaClose = () => setSelectedPasta(null);

    const handlePastaAddToCart = (quantity: number, observation: string, size?: 'P' | 'G') => {
        if (selectedPasta) {
            const unitPrice = selectedPasta.sizes?.[size || 'P'] || selectedPasta.price;
            addToCart(selectedPasta, quantity, unitPrice, observation, size);
            setSelectedPasta(null);
            setIsCartOpen(true);
        }
    };

    const featuredItems = menuItems.filter(item => item.destaque);

    if (loading) return <div className="text-center py-10">Carregando cardápio...</div>;
    if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-[#262525]">
            {/* Barra de categorias sticky com safe-area e z-index elevado */}
            <div ref={stickyBarRef} className="sticky top-0 z-40 bg-gradient-to-b from-[#262525] via-[#262525] to-transparent pb-4 pt-2" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div ref={categoriesContainerRef} className="categories-container flex gap-2 sm:gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
                        <motion.button
                            data-category-value="destaques"
                            onClick={() => handleCategoryClick('destaques')}
                            className={`relative px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 text-sm font-semibold transition-colors flex items-center gap-2 ${selectedCategory === 'destaques' ? 'text-white' : 'text-gray-300 bg-[#2a2a2a] hover:bg-gray-700'}`}
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
                                className={`relative px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 text-sm font-semibold transition-colors flex items-center gap-2 ${selectedCategory === category.value ? 'text-white' : 'text-gray-300 bg-[#2a2a2a] hover:bg-gray-700'}`}
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
                        style={{ scrollMarginTop: `${stickyOffset + 8}px` }}
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
                            style={{ scrollMarginTop: `${stickyOffset + 8}px` }}
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
                    {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} onAddToCart={(item, quantity, unitPrice, observation, size, border, extras) => handleAddToCart(item, quantity, unitPrice, observation, size, border, extras)} allPizzas={allPizzas} allowHalfAndHalf={allowHalfAndHalf} categories={categories} />}
                    {selectedPasta && <PastaModal item={selectedPasta} onClose={handlePastaClose} onAddToCart={handlePastaAddToCart} />}
                    {isCartOpen && <Cart items={cartItems} onUpdateQuantity={updateQuantity} onRemoveItem={removeFromCart} onClose={() => setIsCartOpen(false)} onFinalize={handleFinalizeOrder} />}
                </AnimatePresence>

                <AnimatePresence>
                    {showWhatsAppModal && finalOrderData && (
                        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <motion.div className="bg-[#262525] rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4 text-center border-2 border-red-500/20" initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }} transition={{ type: "spring", damping: 20 }}>
                                <div className="mb-6">
                                    <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 rounded-full mb-4">
                                        <FaWhatsapp className="text-4xl text-green-500" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-red-500 mb-3">Quase lá! Finalize seu Pedido</h2>
                                    <p className="text-gray-300 mb-6 text-base">Seu pedido será enviado para o nosso WhatsApp para confirmação.</p>
                                </div>
                                
                                <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-2 border-yellow-500/60 text-yellow-100 text-base font-semibold p-5 rounded-xl mb-8 shadow-lg animate-pulse">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">⚠️</span>
                                        <div className="text-left">
                                            <p className="text-lg font-bold mb-1">ATENÇÃO IMPORTANTE!</p>
                                            <p className="text-sm leading-relaxed">
                                                Seu pedido <span className="font-bold text-yellow-300">SÓ SERÁ CONFIRMADO</span> e enviado para o estabelecimento <span className="font-bold text-yellow-300">APÓS SER ENVIADO PELO WHATSAPP</span>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row justify-center gap-4">
                                    <motion.button 
                                        whileHover={{ scale: 1.05 }} 
                                        whileTap={{ scale: 0.95 }} 
                                        onClick={handleSendToWhatsappAndSave} 
                                        disabled={isSubmitting} 
                                        className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-green-800 flex items-center justify-center gap-3 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="animate-spin">⏳</span>
                                                <span>Enviando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaWhatsapp className="text-2xl" />
                                                <span>Enviar para WhatsApp</span>
                                            </>
                                        )}
                                    </motion.button>
                                    <motion.button 
                                        whileHover={{ scale: 1.05 }} 
                                        whileTap={{ scale: 0.95 }} 
                                        onClick={() => setShowWhatsAppModal(false)} 
                                        className="bg-gray-700 text-white px-6 py-4 rounded-xl hover:bg-gray-600 font-semibold text-base transition-all"
                                    >
                                        Cancelar
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                 {/* Mensagem de Sucesso/Erro */}
                 <AnimatePresence>
                     {showSuccessMessage && (
                         <motion.div
                             initial={{ opacity: 0, y: -50, scale: 0.8 }}
                             animate={{ opacity: 1, y: 0, scale: 1 }}
                             exit={{ opacity: 0, y: -20, scale: 0.9 }}
                             transition={{ type: "spring", stiffness: 300, damping: 25 }}
                             className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] max-w-md w-full mx-4"
                         >
                             <div className={`${successMessage.includes('Erro') || successMessage.includes('erro') ? 'bg-gradient-to-r from-red-600 to-red-700 border-red-400/50' : 'bg-gradient-to-r from-green-600 to-green-700 border-green-400/50'} text-white p-6 rounded-2xl shadow-2xl border-2 backdrop-blur-sm`}>
                                 <div className="flex items-center gap-4">
                                     <div className="flex-shrink-0">
                                         <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                             {successMessage.includes('Erro') || successMessage.includes('erro') ? (
                                                 <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                                 </svg>
                                             ) : (
                                                 <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                 </svg>
                                             )}
                                         </div>
                                     </div>
                                     <div className="flex-1">
                                         <h3 className="text-xl font-bold mb-1">
                                             {successMessage.includes('Erro') || successMessage.includes('erro') ? 'Erro!' : 'Pedido Salvo!'}
                                         </h3>
                                         <p className={`${successMessage.includes('Erro') || successMessage.includes('erro') ? 'text-red-100' : 'text-green-100'} text-sm leading-relaxed`}>{successMessage}</p>
                                     </div>
                                     <button
                                         onClick={() => setShowSuccessMessage(false)}
                                         className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
                                     >
                                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                         </svg>
                                     </button>
                                 </div>
                             </div>
                         </motion.div>
                     )}
                 </AnimatePresence>

                <AnimatePresence>
                    {cartItems.length > 0 && (
                        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={() => setIsCartOpen(true)} className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span className="font-bold text-lg">{cartItems.reduce((total, item) => total + item.quantity, 0)}</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}