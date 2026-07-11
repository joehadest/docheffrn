'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenu } from '@/contexts/MenuContext';
import ItemModal from './ItemModal';
import Cart from './Cart';
import MenuHero from './MenuHero';
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
            staggerChildren: 0.06
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 120,
            damping: 18
        }
    }
};

function MenuItemCard({
    item,
    isOpen,
    onClick,
}: {
    item: MenuItem;
    isOpen: boolean;
    onClick: () => void;
}) {
    return (
        <motion.article
            variants={itemVariants}
            className="menu-item-card group cursor-pointer"
            onClick={() => isOpen && onClick()}
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-surface-overlay sm:aspect-square">
                {item.image ? (
                    <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized={item.image.startsWith('http')}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl opacity-40">🍽️</div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md sm:text-sm">
                    R$ {item.price.toFixed(2)}
                </div>
                {item.destaque && (
                    <div className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/90 text-surface shadow">
                        <FaStar className="text-[10px]" />
                    </div>
                )}
                {!isOpen && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                        Fechado
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-2.5 p-3 sm:p-4">
                <h3 className="line-clamp-2 min-h-[2.5rem] font-display text-sm font-bold leading-snug text-ink sm:min-h-[3rem] sm:text-base">
                    {item.name}
                </h3>
                <button
                    type="button"
                    className={`w-full rounded-xl py-2.5 text-xs font-bold transition sm:text-sm ${
                        isOpen
                            ? 'bg-ember-600 text-white hover:bg-ember-500'
                            : 'cursor-not-allowed bg-white/5 text-ink-faint'
                    }`}
                >
                    {isOpen ? 'Adicionar' : 'Indisponível'}
                </button>
            </div>
        </motion.article>
    );
}

function MenuSkeleton({ showHero }: { showHero?: boolean }) {
    return (
        <div>
            {showHero && (
                <div className="flex min-h-[60vh] flex-col items-center justify-end px-5 pb-12">
                    <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
                    <div className="mt-5 h-14 w-56 animate-pulse rounded-2xl bg-white/10 sm:h-20 sm:w-80" />
                    <div className="mt-4 h-4 w-64 animate-pulse rounded-lg bg-white/5" />
                    <div className="mt-8 h-12 w-48 animate-pulse rounded-full bg-white/10" />
                </div>
            )}
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
                <div className="flex gap-2 overflow-hidden pb-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-white/10" />
                    ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                            <div className="aspect-[4/3] animate-pulse bg-white/10 sm:aspect-square" />
                            <div className="space-y-3 p-3 sm:p-4">
                                <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                                <div className="h-9 w-full animate-pulse rounded-xl bg-white/10" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function MenuDisplay({ showHero = false }: { showHero?: boolean }) {
    const [allowHalfAndHalf, setAllowHalfAndHalf] = useState(true);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const categoriesContainerRef = useRef<HTMLDivElement>(null);
    const stickyBarRef = useRef<HTMLDivElement>(null);
    const [catFade, setCatFade] = useState({ left: false, right: true });
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

    // Fade nas bordas da barra de categorias (indica scroll horizontal)
    useEffect(() => {
        const el = categoriesContainerRef.current;
        if (!el) return;

        const updateFade = () => {
            const maxScroll = el.scrollWidth - el.clientWidth;
            const left = el.scrollLeft > 8;
            const right = maxScroll > 8 && el.scrollLeft < maxScroll - 8;
            setCatFade({ left, right });
        };

        updateFade();
        el.addEventListener('scroll', updateFade, { passive: true });
        window.addEventListener('resize', updateFade);
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateFade) : null;
        ro?.observe(el);

        return () => {
            el.removeEventListener('scroll', updateFade);
            window.removeEventListener('resize', updateFade);
            ro?.disconnect();
        };
    }, [categories, loading]);

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
                    fetch('/api/menu', { cache: 'no-store' }),
                    fetch('/api/categories', { cache: 'no-store' }),
                    fetch('/api/settings', { cache: 'no-store' })
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
                    setIsRestaurantOpen(checkRestaurantOpen(settingsData.data.businessHours as BusinessHoursConfig));
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
            const deliveryFee = tipoEntrega === 'entrega' ? (endereco?.deliveryFee ?? 0) : 0;
            const subtotal = total - deliveryFee;

            const formatPayment = (fp: string) =>
                fp === 'pix' ? 'PIX' : fp === 'cartao' ? 'Cartao' : fp === 'dinheiro' ? 'Dinheiro' : fp;

            const money = (n: number) =>
                Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const divider = '--------------------';

            // Sem emojis: alguns aparelhos quebram o encoding no wa.me
            const lines: string[] = [
                `*NOVO PEDIDO - Do'Cheff*`,
                divider,
                `*Cliente*`,
                `Nome: ${cliente.nome}`,
                `Telefone: ${cliente.telefone}`,
                divider,
            ];

            if (tipoEntrega === 'entrega' && endereco?.address) {
                lines.push(
                    `*Endereco de Entrega*`,
                    `${endereco.address.street}, N. ${endereco.address.number}${endereco.address.complement ? ` - ${endereco.address.complement}` : ''}`,
                    `Bairro: ${endereco.address.neighborhood}`,
                );
                if (endereco.address.referencePoint) {
                    lines.push(`Referencia: ${endereco.address.referencePoint}`);
                }
            } else {
                lines.push(`*Entrega*`, `Retirada no Local`);
            }

            lines.push(divider, `*Itens do Pedido*`, '');

            itens.forEach((item: any, index: number) => {
                lines.push(
                    `${index + 1}) ${item.quantidade}x *${item.nome}*${item.size ? ` (${item.size})` : ''}`
                );
                if (item.border) lines.push(`   Borda: ${item.border}`);
                if (item.extras && item.extras.length > 0) lines.push(`   Extras: ${item.extras.join(', ')}`);
                if (item.observacao) lines.push(`   Obs: ${item.observacao}`);
                lines.push(`   Valor: R$ ${money(item.preco * item.quantidade)}`, '');
            });

            if (observacoes) {
                lines.push(divider, `*Observacoes Gerais*`, observacoes, '');
            }

            lines.push(
                divider,
                `*Pagamento*`,
                `Forma: ${formatPayment(formaPagamento)}`,
            );
            if (formaPagamento === 'dinheiro' && troco) {
                lines.push(`Troco para: R$ ${troco}`);
            }
            if (formaPagamento === 'pix') {
                lines.push(`Chave PIX: ${pixKey}`);
            }

            lines.push(
                divider,
                `*Resumo*`,
                `Subtotal: R$ ${money(subtotal)}`,
            );
            if (tipoEntrega === 'entrega') {
                lines.push(`Taxa de Entrega: R$ ${money(deliveryFee)}`);
            } else {
                lines.push(`Taxa de Entrega: Gratis (retirada)`);
            }
            lines.push(`*TOTAL: R$ ${money(total)}*`);

            const message = lines.join('\n');
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

        const hideChrome = !!selectedItem || !!selectedPasta || isCartOpen;
        if (hideChrome) document.body.classList.add('item-modal-open');
        else document.body.classList.remove('item-modal-open');

        return () => {
            document.body.classList.remove('modal-open');
            document.body.classList.remove('item-modal-open');
        };
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

    if (loading) return <MenuSkeleton showHero={showHero} />;
    if (error) return <div className="px-4 py-16 text-center text-ember-400">{error}</div>;

    const openItem = (item: MenuItem) => {
        if (item.category === 'massas') handlePastaClick(item);
        else setSelectedItem(item);
    };

    return (
        <div className="pb-28">
            {showHero && (
                <MenuHero
                    isOpen={isRestaurantOpen}
                    loading={false}
                    onExplore={() => handleCategoryClick('destaques')}
                    onInfo={() => window.dispatchEvent(new Event('docheff-open-info'))}
                />
            )}

            {/* Barra de categorias sticky */}
            <div
                ref={stickyBarRef}
                className="sticky top-[52px] z-30 border-b border-white/[0.06] bg-surface pt-3.5 pb-3.5 sm:top-[56px] sm:pt-4 sm:pb-4"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                    <div
                        className={`categories-rail ${catFade.left ? 'show-left-fade' : ''} ${catFade.right ? 'show-right-fade' : ''}`}
                    >
                        <div
                            ref={categoriesContainerRef}
                            className="categories-container flex gap-2.5 overflow-x-auto px-0.5 py-0.5 no-scrollbar sm:gap-3"
                        >
                            <motion.button
                                data-category-value="destaques"
                                onClick={() => handleCategoryClick('destaques')}
                                className={`category-pill ${selectedCategory === 'destaques' ? 'is-active' : ''}`}
                            >
                                <span className="relative z-10">
                                    <span className="pill-icon"><FaStar className="text-amber-400 text-[12px]" /></span>
                                    Destaques
                                </span>
                                {selectedCategory === 'destaques' && (
                                    <motion.div
                                        layoutId="activeCategoryHighlight"
                                        className="absolute inset-0 rounded-full bg-ember-600"
                                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                                    />
                                )}
                            </motion.button>

                            {categories.map((category) => (
                                <motion.button
                                    key={category.value}
                                    data-category-value={category.value}
                                    onClick={() => handleCategoryClick(category.value)}
                                    className={`category-pill ${selectedCategory === category.value ? 'is-active' : ''}`}
                                >
                                    <span className="relative z-10">
                                        <span className="pill-icon">
                                            {category.icon || <FaDotCircle className="text-[10px]" />}
                                        </span>
                                        {category.label}
                                    </span>
                                    {selectedCategory === category.value && (
                                        <motion.div
                                            layoutId="activeCategoryHighlight"
                                            className="absolute inset-0 rounded-full bg-ember-600"
                                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                                        />
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
                {!isRestaurantOpen && (
                    <div className="mb-8 rounded-2xl border border-ember-600/30 bg-ember-950/40 px-4 py-3.5 text-center text-sm text-ember-200">
                        <span className="font-semibold">Estabelecimento fechado.</span>{' '}
                        <span className="text-ember-200/80">Pedidos não serão aceitos no momento.</span>
                    </div>
                )}

                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-12 sm:space-y-14">
                    <section
                        id="category-destaques"
                        ref={(el) => { categoryElementsRef.current['destaques'] = el; }}
                        className="space-y-5"
                        style={{ scrollMarginTop: `${stickyOffset + 8}px` }}
                    >
                        <div className="flex items-end justify-between gap-4">
                            <h2 className="menu-section-title flex items-center gap-2 text-2xl sm:text-3xl">
                                <FaStar className="text-amber-400 text-lg" /> Destaques
                            </h2>
                            <p className="hidden text-xs text-ink-faint sm:block">Toque para ver detalhes</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                            {featuredItems.map((item) => (
                                <MenuItemCard
                                    key={item._id}
                                    item={item}
                                    isOpen={isRestaurantOpen}
                                    onClick={() => openItem(item)}
                                />
                            ))}
                        </div>
                    </section>

                    {categories.map((category) => (
                        <section
                            key={category.value}
                            id={`category-${category.value}`}
                            ref={(el) => { categoryElementsRef.current[category.value] = el; }}
                            className="space-y-5"
                            style={{ scrollMarginTop: `${stickyOffset + 8}px` }}
                        >
                            <h2 className="menu-section-title flex items-center gap-2 text-2xl capitalize sm:text-3xl">
                                <span className="text-lg opacity-80">{category.icon || <FaDotCircle />}</span>
                                {category.label}
                            </h2>
                            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                                {menuItems
                                    .filter((item) => item.category === category.value)
                                    .map((item) => (
                                        <MenuItemCard
                                            key={item._id}
                                            item={item}
                                            isOpen={isRestaurantOpen}
                                            onClick={() => openItem(item)}
                                        />
                                    ))}
                            </div>
                        </section>
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
                                className="relative flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-surface-raised shadow-2xl sm:max-h-[min(92dvh,680px)] sm:rounded-3xl"
                                initial={{ y: '100%', opacity: 0.9 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: '40%', opacity: 0 }}
                                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" aria-hidden />

                                {/* Top bar */}
                                <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-2 sm:px-6 sm:pt-5">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366] ring-1 ring-[#25D366]/30">
                                            <FaWhatsapp className="text-lg" />
                                        </span>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">Passo final</p>
                                            <p className="text-xs text-ink-muted">Confirmação via WhatsApp</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => !isSubmitting && setShowWhatsAppModal(false)}
                                        disabled={isSubmitting}
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-ink-muted transition hover:bg-white/10 hover:text-ink disabled:opacity-40"
                                        aria-label="Fechar"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                                    {/* Hero copy */}
                                    <div className="mb-5 text-center sm:mb-6">
                                        <motion.div
                                            initial={{ scale: 0.85, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.05 }}
                                            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#25D366]/25 to-[#128C7E]/15 shadow-[0_0_40px_-8px_rgba(37,211,102,0.45)] ring-1 ring-[#25D366]/35 sm:h-20 sm:w-20 sm:rounded-3xl"
                                        >
                                            <FaWhatsapp className="text-4xl text-[#25D366] sm:text-5xl" />
                                        </motion.div>
                                        <h2
                                            id="whatsapp-checkout-title"
                                            className="font-display text-balance text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl"
                                        >
                                            Quase lá!
                                        </h2>
                                        <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-ink-muted sm:text-base">
                                            Envie o pedido no WhatsApp para confirmarmos no estabelecimento.
                                        </p>
                                    </div>

                                    {/* Mini resumo do pedido */}
                                    {finalOrderData?.itens && (
                                        <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5 sm:p-4">
                                            <div className="mb-2.5 flex items-center justify-between gap-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                                                    Seu pedido
                                                </p>
                                                <p className="font-display text-sm font-bold text-ember-400">
                                                    R$ {Number(finalOrderData.total || 0).toFixed(2)}
                                                </p>
                                            </div>
                                            <ul className="space-y-1.5">
                                                {finalOrderData.itens.slice(0, 3).map((item: any, idx: number) => (
                                                    <li key={idx} className="flex justify-between gap-3 text-sm">
                                                        <span className="truncate text-ink-muted">
                                                            {item.quantidade}× {item.nome}
                                                            {item.size ? ` (${item.size})` : ''}
                                                        </span>
                                                        <span className="shrink-0 text-ink">
                                                            R$ {(item.preco * item.quantidade).toFixed(2)}
                                                        </span>
                                                    </li>
                                                ))}
                                                {finalOrderData.itens.length > 3 && (
                                                    <li className="text-xs text-ink-faint">
                                                        + {finalOrderData.itens.length - 3} item(s)
                                                    </li>
                                                )}
                                            </ul>
                                            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3 text-[11px] text-ink-muted">
                                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                                                    {finalOrderData.tipoEntrega === 'retirada' ? 'Retirada' : 'Entrega'}
                                                </span>
                                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 capitalize">
                                                    {finalOrderData.formaPagamento === 'pix'
                                                        ? 'PIX'
                                                        : finalOrderData.formaPagamento === 'cartao'
                                                          ? 'Cartão'
                                                          : finalOrderData.formaPagamento === 'dinheiro'
                                                            ? 'Dinheiro'
                                                            : finalOrderData.formaPagamento}
                                                </span>
                                                {finalOrderData.cliente?.nome && (
                                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 truncate max-w-[10rem]">
                                                        {finalOrderData.cliente.nome}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Aviso suave */}
                                    <div className="mb-4 rounded-2xl border border-[#25D366]/25 bg-[#25D366]/[0.07] p-3.5 text-left sm:p-4">
                                        <div className="flex gap-3">
                                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/20 text-sm text-[#25D366]">
                                                1
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-ink">Como funciona</p>
                                                <p className="mt-1 text-xs leading-relaxed text-ink-muted sm:text-sm">
                                                    O pedido é salvo aqui e a confirmação no balcão acontece
                                                    <span className="font-semibold text-[#25D366]"> após você enviar a mensagem no WhatsApp</span>.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fallback se popup bloqueado */}
                                    <AnimatePresence>
                                        {(whatsAppOpenWasBlocked || copyStatus !== 'idle') && lastWhatsAppUrl && lastWhatsAppMessage && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="mb-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-left sm:p-4"
                                            >
                                                <p className="mb-3 text-xs text-ink-muted sm:text-sm">
                                                    O WhatsApp não abriu sozinho. Use uma das opções:
                                                </p>
                                                <div className="flex flex-col gap-2.5 sm:flex-row">
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyWhatsAppMessage}
                                                        className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white/[0.1] sm:flex-1"
                                                    >
                                                        {copyStatus === 'copied'
                                                            ? 'Mensagem copiada!'
                                                            : copyStatus === 'error'
                                                              ? 'Falha ao copiar'
                                                              : 'Copiar mensagem'}
                                                    </button>
                                                    <a
                                                        href={lastWhatsAppUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#20bd5a] sm:flex-1"
                                                    >
                                                        <FaWhatsapp />
                                                        Abrir WhatsApp
                                                    </a>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Footer sticky */}
                                <div
                                    className="shrink-0 border-t border-white/[0.08] bg-surface-raised/95 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4"
                                    style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
                                >
                                    <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
                                        <motion.button
                                            whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                                            type="button"
                                            onClick={handleSendToWhatsappAndSave}
                                            disabled={isSubmitting}
                                            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_32px_-10px_rgba(37,211,102,0.55)] transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-[1.5] sm:text-base"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                    Salvando e abrindo…
                                                </>
                                            ) : (
                                                <>
                                                    <FaWhatsapp className="text-xl" />
                                                    Enviar para WhatsApp
                                                </>
                                            )}
                                        </motion.button>
                                        <button
                                            type="button"
                                            onClick={() => !isSubmitting && setShowWhatsAppModal(false)}
                                            disabled={isSubmitting}
                                            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/[0.08] disabled:opacity-50 sm:flex-1"
                                        >
                                            Voltar
                                        </button>
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
                        <motion.button
                            initial={{ opacity: 0, y: 24, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.9 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setIsCartOpen(true)}
                            className="fixed bottom-5 right-4 z-50 flex items-center gap-2.5 rounded-full bg-ember-600 px-5 py-3.5 text-white shadow-glow sm:bottom-6 sm:right-6"
                            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-sm font-bold">
                                {cartItems.reduce((total, item) => total + item.quantity, 0)}
                            </span>
                            <span className="hidden text-sm font-semibold sm:inline">Ver sacola</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}