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

function MenuSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="mb-8 text-center">
                <div className="h-10 w-52 mx-auto rounded-xl bg-white/10 animate-pulse" />
                <div className="h-4 w-64 mx-auto rounded-lg bg-white/5 mt-3 animate-pulse" />
            </div>
            <div className="sticky top-[72px] z-30 rounded-2xl border border-gray-800/60 bg-[#262525]/70 backdrop-blur-md px-3 py-3">
                <div className="flex gap-2 overflow-hidden">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="h-9 w-24 rounded-full bg-white/10 animate-pulse" />
                    ))}
                </div>
            </div>
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-800/60 bg-white/5 overflow-hidden">
                        <div className="aspect-square bg-white/10 animate-pulse" />
                        <div className="p-3 sm:p-4 space-y-3">
                            <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                            <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse" />
                            <div className="h-9 w-full bg-white/10 rounded-xl animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

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
    const [pixKey, setPixKey] = useState('84987291269'); // (84) 98729-1269
    const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string | null>(null);
    const [lastWhatsAppMessage, setLastWhatsAppMessage] = useState<string | null>(null);
    const [whatsAppOpenWasBlocked, setWhatsAppOpenWasBlocked] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
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
                    setPixKey(settingsData.data.pixKey || '84987291269');
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

    const handleCopyWhatsAppMessage = async () => {
        if (!lastWhatsAppMessage) return;
        try {
            await navigator.clipboard.writeText(lastWhatsAppMessage);
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2500);
        } catch {
            setCopyStatus('error');
            setTimeout(() => setCopyStatus('idle'), 2500);
        }
    };

    const handleSendToWhatsappAndSave = async () => {
        if (!finalOrderData || isSubmitting) return;
        setIsSubmitting(true);
        setWhatsAppOpenWasBlocked(false);
        setCopyStatus('idle');

        try {
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
            const footer = formaPagamento === 'pix' ? `\n\n*Chave PIX para pagamento:*\n${pixKey} (Celular)` : '';
            const message = `${header}\n${customerInfo}\n${addressInfo}\n\n*Itens do Pedido:*\n${itemsInfo}${generalObs}\n${paymentInfo}\n${totals}${footer}`;
            // Extrai apenas os números da chave PIX para o número do WhatsApp (remove formatação)
            const whatsappNumber = pixKey.replace(/\D/g, '');
            const whatsappUrl = `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(message)}`;
            setLastWhatsAppUrl(whatsappUrl);
            setLastWhatsAppMessage(message);

            // IMPORTANTE: Salvar o pedido ANTES de abrir o WhatsApp
            // Isso garante que o pedido seja registrado mesmo se o WhatsApp falhar
            const saveResponse = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalOrderData),
            });

            let saveData: { success?: boolean; message?: string; pedidoId?: string };
            try {
                saveData = await saveResponse.json();
            } catch {
                saveData = { success: false, message: 'Resposta inválida do servidor.' };
            }

            if (!saveResponse.ok || !saveData.success) {
                setSuccessMessage(saveData.message || 'Erro ao salvar pedido. Por favor, tente novamente.');
                setShowSuccessMessage(true);
                setTimeout(() => {
                    setShowSuccessMessage(false);
                }, 5000);
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

            /* Após salvar: abrir WhatsApp (sem aba placeholder antes — evita abrir/fechar em falha e 403). */
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            let openedWhatsApp = false;

            if (isMobile) {
                const w = window.open(whatsappUrl, '_blank');
                if (w) {
                    openedWhatsApp = true;
                } else {
                    window.location.assign(whatsappUrl);
                    openedWhatsApp = true;
                }
            } else {
                try {
                    const w = window.open(whatsappUrl, '_blank');
                    if (w && !w.closed) openedWhatsApp = true;
                } catch {
                    /* ignore */
                }
                if (!openedWhatsApp) {
                    setWhatsAppOpenWasBlocked(true);
                }
            }

            clearCart();
            if (openedWhatsApp) {
                setShowWhatsAppModal(false);
            }
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
        const anyOpen = !!selectedItem || isCartOpen || !!selectedPasta || showWhatsAppModal;
        if (anyOpen) document.body.classList.add('modal-open');
        else document.body.classList.remove('modal-open');
        return () => { document.body.classList.remove('modal-open'); };
    }, [selectedItem, isCartOpen, selectedPasta, showWhatsAppModal]);

    useEffect(() => {
        if (showWhatsAppModal) {
            document.body.classList.add('whatsapp-checkout-open');
        } else {
            document.body.classList.remove('whatsapp-checkout-open');
        }
        return () => {
            document.body.classList.remove('whatsapp-checkout-open');
        };
    }, [showWhatsAppModal]);

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

    if (loading) return <MenuSkeleton />;
    if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-[#262525]">
            {/* Barra de categorias sticky com safe-area e z-index elevado */}
            <div ref={stickyBarRef} className="sticky top-0 z-40 bg-gradient-to-b from-[#262525] via-[#262525] to-transparent pb-3 pt-2" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div ref={categoriesContainerRef} className="categories-container flex gap-2 sm:gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
                        <motion.button
                            data-category-value="destaques"
                            onClick={() => handleCategoryClick('destaques')}
                            className={`relative px-3.5 py-2 rounded-full whitespace-nowrap flex-shrink-0 text-sm font-semibold transition-colors flex items-center gap-2 border ${selectedCategory === 'destaques' ? 'text-white border-red-500/20' : 'text-gray-200 bg-[#2a2a2a]/60 hover:bg-[#2a2a2a] border-gray-800/60'}`}
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
                                className={`relative px-3.5 py-2 rounded-full whitespace-nowrap flex-shrink-0 text-sm font-semibold transition-colors flex items-center gap-2 border ${selectedCategory === category.value ? 'text-white border-red-500/20' : 'text-gray-200 bg-[#2a2a2a]/60 hover:bg-[#2a2a2a] border-gray-800/60'}`}
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
                {!isRestaurantOpen && (
                    <div className="mb-8 sm:mb-10">
                        <div className="p-4 bg-red-900/20 border border-red-600/40 rounded-2xl max-w-md mx-auto text-red-200 text-sm text-center">
                            <div className="font-semibold mb-1">Estabelecimento fechado</div>
                            <div className="text-red-200/80">Pedidos não serão aceitos no momento.</div>
                        </div>
                    </div>
                )}

                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-12">
                    <div
                        id="category-destaques"
                        ref={(el) => { categoryElementsRef.current['destaques'] = el; }}
                        className="space-y-4 pt-2"
                        style={{ scrollMarginTop: `${stickyOffset + 8}px` }}
                    >
                        <div className="flex items-end justify-between gap-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <FaStar className="text-yellow-400" /> Destaques
                            </h2>
                            <div className="text-xs text-gray-400 hidden sm:block">
                                Toque no item para ver detalhes
                            </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                            {featuredItems.map(item => (
                                <motion.div
                                    key={item._id}
                                    variants={itemVariants}
                                    className="rounded-2xl border border-gray-800/60 bg-[#2a2a2a]/70 hover:bg-[#2a2a2a] shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
                                    onClick={() => isRestaurantOpen && (item.category === 'massas' ? handlePastaClick(item) : setSelectedItem(item))}
                                >
                                    <div className="relative aspect-square overflow-hidden bg-[#1a1a1a]">
                                        {item.image ? (
                                            <Image src={item.image} alt={item.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized={item.image.startsWith('http')} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                                        )}
                                        <div className="absolute top-2 left-2 bg-black/55 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-xs sm:text-sm font-bold border border-white/10">
                                            R$ {item.price.toFixed(2)}
                                        </div>
                                        {!isRestaurantOpen && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">Fechado</div>}
                                    </div>
                                    <div className="p-3 sm:p-4">
                                        <h3 className="font-bold text-white text-sm sm:text-base mb-2 sm:mb-3 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">{item.name}</h3>
                                        <button className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold ${isRestaurantOpen ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-800 text-gray-400 cursor-not-allowed'} transition-colors`}>
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
                            <h2 className="text-2xl font-bold text-white capitalize flex items-center gap-2">
                                {category.icon || <FaDotCircle />} {category.label}
                            </h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                                {menuItems.filter(item => item.category === category.value).map(item => (
                                    <motion.div
                                        key={item._id}
                                        variants={itemVariants}
                                        className="rounded-2xl border border-gray-800/60 bg-[#2a2a2a]/70 hover:bg-[#2a2a2a] shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
                                        onClick={() => isRestaurantOpen && (item.category === 'massas' ? handlePastaClick(item) : setSelectedItem(item))}
                                    >
                                        <div className="relative aspect-square overflow-hidden bg-[#1a1a1a]">
                                            {item.image ? (
                                                <Image src={item.image} alt={item.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized={item.image.startsWith('http')} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                                            )}
                                            <div className="absolute top-2 left-2 bg-black/55 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-xs sm:text-sm font-bold border border-white/10">
                                                R$ {item.price.toFixed(2)}
                                            </div>
                                            {!isRestaurantOpen && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">Fechado</div>}
                                        </div>
                                        <div className="p-3 sm:p-4">
                                            <h3 className="font-bold text-white text-sm sm:text-base mb-2 sm:mb-3 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">{item.name}</h3>
                                            <button className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold ${isRestaurantOpen ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-800 text-gray-400 cursor-not-allowed'} transition-colors`}>
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
                        <motion.div
                            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 backdrop-blur-md sm:items-center sm:p-4"
                            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            role="presentation"
                            onClick={() => !isSubmitting && setShowWhatsAppModal(false)}
                        >
                            <motion.div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="whatsapp-checkout-title"
                                className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-red-500/25 border-b-0 bg-[#262525] shadow-2xl sm:mx-4 sm:max-h-[min(90dvh,640px)] sm:rounded-2xl sm:border-b"
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 24, opacity: 0 }}
                                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                                onClick={e => e.stopPropagation()}
                                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                            >
                                <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" aria-hidden />

                                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-2 pt-4 text-center sm:px-8 sm:pb-4 sm:pt-6">
                                    <div className="mb-4 sm:mb-6">
                                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15 ring-1 ring-green-500/30 sm:mb-4 sm:h-20 sm:w-20 sm:rounded-full sm:bg-red-500/20 sm:ring-0">
                                            <FaWhatsapp className="text-3xl text-green-400 sm:text-4xl sm:text-green-500" />
                                        </div>
                                        <h2 id="whatsapp-checkout-title" className="text-balance text-xl font-bold leading-tight text-red-500 sm:text-3xl sm:mb-3">
                                            Quase lá! Finalize seu pedido
                                        </h2>
                                        <p className="mt-2 text-pretty text-sm text-gray-300 sm:text-base">
                                            Seu pedido será enviado ao nosso WhatsApp para confirmação.
                                        </p>
                                    </div>

                                    <div className="mb-5 rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-950/55 to-orange-950/40 p-4 text-left text-amber-50 shadow-lg ring-1 ring-amber-500/20 sm:mb-8 sm:p-5">
                                        <div className="flex gap-3">
                                            <span className="shrink-0 text-xl leading-none sm:text-2xl" aria-hidden>⚠️</span>
                                            <div className="min-w-0 space-y-1.5">
                                                <p className="text-sm font-bold text-amber-100 sm:text-base">Atenção</p>
                                                <p className="text-xs leading-relaxed text-amber-100/90 sm:text-sm">
                                                    O pedido <span className="font-semibold text-amber-200">só é confirmado</span> no estabelecimento <span className="font-semibold text-amber-200">depois de enviar a mensagem pelo WhatsApp</span>.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {(whatsAppOpenWasBlocked || copyStatus !== 'idle') && lastWhatsAppUrl && lastWhatsAppMessage && (
                                        <div className="mb-5 rounded-xl border border-gray-700/80 bg-[#2a2a2a] p-3 text-left sm:mb-6 sm:p-4">
                                            <p className="mb-3 text-xs text-gray-400 sm:text-sm">
                                                Se o WhatsApp não abriu sozinho, use uma das opções:
                                            </p>
                                            <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    type="button"
                                                    onClick={handleCopyWhatsAppMessage}
                                                    className="w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700 sm:flex-1"
                                                >
                                                    {copyStatus === 'copied' ? 'Mensagem copiada!' : copyStatus === 'error' ? 'Falha ao copiar' : 'Copiar mensagem'}
                                                </motion.button>
                                                <a
                                                    href={lastWhatsAppUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex w-full items-center justify-center rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-800 sm:flex-1"
                                                >
                                                    Abrir WhatsApp
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0 border-t border-gray-800/90 bg-[#262525]/95 px-4 py-3 backdrop-blur-sm sm:px-8 sm:pb-6 sm:pt-4">
                                    <div className="mx-auto flex w-full max-w-md flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-4">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleSendToWhatsappAndSave}
                                            disabled={isSubmitting}
                                            className="order-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-5 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:from-green-700 hover:to-green-800 disabled:cursor-not-allowed disabled:opacity-50 sm:order-none sm:flex-1 sm:py-4 sm:text-lg"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="inline-block animate-spin">⏳</span>
                                                    <span>Enviando…</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaWhatsapp className="text-xl sm:text-2xl" />
                                                    <span>Enviar para WhatsApp</span>
                                                </>
                                            )}
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="button"
                                            onClick={() => !isSubmitting && setShowWhatsAppModal(false)}
                                            disabled={isSubmitting}
                                            className="order-2 w-full rounded-xl bg-gray-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-600 disabled:opacity-50 sm:order-none sm:w-auto sm:min-w-[8rem] sm:py-4 sm:text-base"
                                        >
                                            Cancelar
                                        </motion.button>
                                    </div>
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
                             className="fixed top-6 left-1/2 z-[110] mx-4 max-w-md -translate-x-1/2 transform"
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