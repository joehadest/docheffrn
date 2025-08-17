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

const categoryVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            type: "spring",
            stiffness: 100
        }
    }
};

export default function MenuDisplay() {
    // Estado para permitir/desabilitar pizzas meio a meio
    const [allowHalfAndHalf, setAllowHalfAndHalf] = useState(true); // Padrão true para não quebrar
    // Buscar configuração allowHalfAndHalf junto com deliveryFees
    useEffect(() => {
        async function fetchSettingsData() {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success && data.data) {
                    setDeliveryFees(data.data.deliveryFees || []);
                    setAllowHalfAndHalf(data.data.allowHalfAndHalf === true);
                }
            } catch (err) {
                // erro silencioso
            }
        }
        fetchSettingsData();
    }, []);
    // ...existing code...
    const categoriesContainerRef = useRef<HTMLDivElement>(null);
    const { isOpen, toggleOpen } = useMenu();
    const { items: cartItems, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [orderDetails, setOrderDetails] = useState<CartItem[]>([]);
    const [formaPagamento, setFormaPagamento] = useState<string>('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [tipoEntrega, setTipoEntrega] = useState<'entrega' | 'retirada'>('entrega');

    // Estados para dados da API
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [categories, setCategories] = useState<{ _id?: string, value: string, label: string }[]>([]);
    const [catLoading, setCatLoading] = useState(false);
    const [catError, setCatError] = useState('');

    // Carregar dados do menu e categorias da API
    useEffect(() => {
        const fetchMenuItems = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/menu');
                const data = await response.json();
                if (data.success) {
                    setMenuItems(data.data);
                } else {
                    setError('Erro ao carregar o cardápio');
                }
            } catch (error) {
                console.error('Erro ao carregar menu:', error);
                setError('Erro ao conectar com o servidor');
            } finally {
                setLoading(false);
            }
        };
        const fetchCategories = async () => {
            setCatLoading(true);
            setCatError('');
            try {
                const res = await fetch('/api/categories');
                const data = await res.json();
                if (data.success) {
                    // Ordena as categorias pelo campo 'order' antes de exibir
                    const sorted = (data.data || []).slice().sort((a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0));
                    setCategories(sorted);
                    // Inicializa a categoria selecionada após buscar
                    if (sorted.length > 0) {
                        setSelectedCategory(sorted[0].value);
                    }
                } else {
                    setCatError(data.error || 'Falha ao buscar categorias.');
                }
            } catch (err) {
                setCatError('Falha ao buscar categorias.');
            } finally {
                setCatLoading(false);
            }
        };
        fetchMenuItems();
        fetchCategories();
    }, []);

    // Scroll horizontal automático da barra de categorias
    useEffect(() => {
        if (!selectedCategory || !categoriesContainerRef.current) return;
        const btn = categoriesContainerRef.current.querySelector(`[data-category="${selectedCategory}"]`);
        if (btn && typeof (btn as HTMLElement).scrollIntoView === 'function') {
            (btn as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [selectedCategory]);

    // Efeito para sincronizar tipoEntrega com localStorage
    useEffect(() => {
        const savedTipoEntrega = localStorage.getItem('tipoEntrega') as 'entrega' | 'retirada';
        if (savedTipoEntrega) {
            setTipoEntrega(savedTipoEntrega);
        }

        // Listener para mudanças no localStorage (quando o usuário muda no Cart)
        const handleStorageChange = () => {
            const newTipoEntrega = localStorage.getItem('tipoEntrega') as 'entrega' | 'retirada';
            if (newTipoEntrega) {
                setTipoEntrega(newTipoEntrega);
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Verificar mudanças no localStorage a cada segundo (fallback)
        const interval = setInterval(() => {
            const currentTipoEntrega = localStorage.getItem('tipoEntrega') as 'entrega' | 'retirada';
            if (currentTipoEntrega && currentTipoEntrega !== tipoEntrega) {
                setTipoEntrega(currentTipoEntrega);
            }
        }, 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [tipoEntrega]);
    const [deliveryFees, setDeliveryFees] = useState<{ neighborhood: string; fee: number }[]>([]);
    const [selectedPasta, setSelectedPasta] = useState<MenuItem | null>(null);
    const [showCategoriesModal, setShowCategoriesModal] = useState(false);
    const [isRestaurantOpen, setIsRestaurantOpen] = useState(true);

    // Categorias agora vêm da API, não só dos itens
    const allPizzas = menuItems.filter(item => item.category === 'pizzas');
    // categoriesContainerRef já existe
    // Scroll horizontal automático da barra de categorias
    useEffect(() => {
        if (!selectedCategory || !categoriesContainerRef.current) return;
        const btn = categoriesContainerRef.current.querySelector(`[data-category="${selectedCategory}"]`);
        if (btn && typeof (btn as HTMLElement).scrollIntoView === 'function') {
            (btn as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [selectedCategory]);

    useEffect(() => {
        if (categories.length === 0) return;

        let isScrolling = false;

        // Função para verificar qual categoria está mais visível
        const checkVisibleCategory = () => {
            if (isScrolling) return;
            
            const categoryElements = categories.map(cat => ({
                element: document.getElementById(`category-${cat.value}`),
                value: cat.value
            })).filter(item => item.element);

            let bestCategory = categories[0]?.value || 'pizzas';
            let bestVisibility = 0;

            categoryElements.forEach(({ element, value }) => {
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const windowHeight = window.innerHeight;
                    
                    // Calcula a visibilidade do elemento
                    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
                    const visibility = Math.max(0, visibleHeight / element.offsetHeight);
                    
                    if (visibility > bestVisibility) {
                        bestVisibility = visibility;
                        bestCategory = value;
                    }
                }
            });

            if (bestVisibility > 0.2) { // Só muda se pelo menos 20% estiver visível
                setSelectedCategory(bestCategory);
            }
        };

        // Listener para detectar scroll no topo
        const handleScroll = () => {
            if (window.scrollY < 100) {
                setSelectedCategory(categories[0]?.value || 'pizzas');
            } else {
                // Chama a verificação de categoria visível
                checkVisibleCategory();
            }
        };

        // Listener para detectar quando o usuário está fazendo scroll manual
        const handleScrollStart = () => {
            isScrolling = true;
            setTimeout(() => {
                isScrolling = false;
            }, 500); // Reduzido para 500ms
        };

        // Adiciona os event listeners
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('scroll', handleScrollStart, { passive: true });

        // Executa uma verificação inicial
        setTimeout(checkVisibleCategory, 100);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('scroll', handleScrollStart);
        };
    }, [categories]);

    const handleCategoryClick = (category: string | null) => {
        setSelectedCategory(category);
        if (category) {
            const element = document.getElementById(`category-${category}`);
            if (element) {
                // Adiciona um offset para considerar a barra de navegação fixa
                const offset = 120; // Altura da barra de navegação + margem
                const elementPosition = element.offsetTop - offset;
                
                window.scrollTo({
                    top: elementPosition,
                    behavior: 'smooth'
                });
            }
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const interval = setInterval(async () => {
            const notifyOrders = JSON.parse(localStorage.getItem('notifyOrders') || '[]');
            if (notifyOrders.length === 0) return;
            for (const orderId of notifyOrders) {
                try {
                    const res = await fetch(`/api/pedidos/${orderId}`);
                    if (!res.ok) continue;
                    const data = await res.json();
                    const pedido = data.data || data;
                    if (!pedido || !pedido.status) continue;
                    localStorage.setItem(`notifyStatus_${orderId}`, pedido.status);
                } catch (e) { /* ignorar erros */ }
            }
        }, 5000); // 5 segundos
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Buscar taxas de entrega do banco
        async function fetchDeliveryFees() {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success && data.data) {
                    console.log('Taxas de entrega carregadas:', data.data.deliveryFees);
                    setDeliveryFees(data.data.deliveryFees || []);

                    // Verificar se o estabelecimento está aberto
                    if (data.data.businessHours) {
                        const restaurantStatus = checkRestaurantOpen(data.data.businessHours as BusinessHoursConfig);
                        setIsRestaurantOpen(restaurantStatus);

                        // Debug temporário
                        console.log('MenuDisplay - Status calculado:', restaurantStatus);
                        console.log('MenuDisplay - Configurações:', data.data.businessHours);
                    } else {
                        setIsRestaurantOpen(false);
                    }
                }
            } catch (err) {
                console.error('Erro ao carregar taxas de entrega:', err);
                setIsRestaurantOpen(false);
            }
        }
        fetchDeliveryFees();
    }, []);

    const calculateDeliveryFee = (neighborhood: string, tipoEntrega: string) => {
        if (tipoEntrega === 'retirada') return 0;
        const deliveryFee = deliveryFees.find(fee => fee.neighborhood === neighborhood);
        return deliveryFee ? deliveryFee.fee : 0;
    };

    const handleAddToCart = (item: MenuItem, quantity: number, observation: string, size?: string, border?: string, extras?: string[]) => {
        let price = item.price;
        if (item.category === 'pizzas' && size && item.sizes) {
            const sizeKey = size as keyof typeof item.sizes;

            // Se for pizza meio a meio, pega o preço mais alto dos dois sabores
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
            } else {
                price = item.sizes[sizeKey] || price;
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

        addToCart(item, quantity, observation, size, border, extras);
        setSelectedItem(null);
    };

    const handleCheckout = () => {
        const customerName = localStorage.getItem('customerName') || '';
        const customerPhone = localStorage.getItem('customerPhone') || '';
        const customerAddress = localStorage.getItem('customerAddress') || '';
        const customerNeighborhood = localStorage.getItem('customerNeighborhood') || '';
        const customerComplement = localStorage.getItem('customerComplement') || '';
        const customerReferencePoint = localStorage.getItem('customerReferencePoint') || '';
        const customerNumber = localStorage.getItem('customerNumber') || '';
        const troco = localStorage.getItem('troco') || '';

        const deliveryFee = calculateDeliveryFee(customerNeighborhood, tipoEntrega);
        const subtotal = cartItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
        const valorFinal = subtotal + deliveryFee;

        const customerInfo = `\nNome: ${customerName}\nTelefone: ${customerPhone}`;
        const addressInfo = tipoEntrega === 'entrega'
            ? `\nEndereço: ${customerAddress}, ${customerNumber}${customerComplement ? `, ${customerComplement}` : ''}\nBairro: ${customerNeighborhood}\nPonto de Referência: ${customerReferencePoint}`
            : '\nTipo de Entrega: Retirada no Local';
        const paymentInfo = formaPagamento === 'pix' ? '\nForma de Pagamento: PIX\n' :
            formaPagamento === 'dinheiro' ? `\nForma de Pagamento: Dinheiro${troco ? `\nTroco para: R$ ${troco}` : ''}\n` :
                formaPagamento === 'cartao' ? '\nForma de Pagamento: Cartão\n' : '';

        const message = `*Novo Pedido*\n${customerInfo}${addressInfo}${paymentInfo}\n*Itens:*\n${cartItems.map(item => `${item.quantity}x ${item.item.name}${item.size ? ` (${item.size})` : ''}${item.observation ? ` - ${item.observation}` : ''} - R$ ${calculateItemPrice(item).toFixed(2)}`).join('\n')}\n\n*Valor Final: R$ ${valorFinal.toFixed(2)}*${formaPagamento === 'pix' ? '\n\n*Chave PIX para pagamento:* 84 99872-9126' : ''}`;

        setOrderDetails(cartItems);
        setShowWhatsAppModal(true);
    };
    const calculateItemPrice = (item: CartItem) => {
        let price = item.item.price;

        // Se o item tem tamanhos (sizes) e um tamanho foi selecionado, usa o preço do tamanho
        if (item.size && item.item.sizes) {
            // Garante que o tamanho existe nas opções
            if (item.item.sizes[item.size as keyof typeof item.item.sizes]) {
                price = item.item.sizes[item.size as keyof typeof item.item.sizes] ?? price;
            }
        }

        // Lógica especial para pizzas meio a meio
        if (
            item.item.category === 'pizzas' &&
            item.size &&
            item.item.sizes &&
            item.observation &&
            item.observation.includes('Meio a meio:')
        ) {
            const sizeKey = item.size as keyof typeof item.item.sizes;
            const meioAMeioText = item.observation.split('Meio a meio:')[1];
            // Remove observações adicionais após o slash (como "- Sem cebola")
            const cleanMeioAMeioText = meioAMeioText.split(' - ')[0];
            const [sabor1, sabor2] = cleanMeioAMeioText.split('/').map(s => s.trim());
            const pizzas = menuItems.filter((p: MenuItem) => p.category === 'pizzas');
            const pizza1 = pizzas.find((p: MenuItem) => p.name === sabor1);
            const pizza2 = pizzas.find((p: MenuItem) => p.name === sabor2);
            if (pizza1 && pizza2) {
                const price1 = pizza1.sizes ? pizza1.sizes[sizeKey] ?? pizza1.price : pizza1.price;
                const price2 = pizza2.sizes ? pizza2.sizes[sizeKey] ?? pizza2.price : pizza2.price;
                price = Math.max(price1, price2);
            }
        }

        // Borda e extras (apenas para pizzas)
        if (item.item.category === 'pizzas' && item.size && item.item.sizes) {
            const sizeKey = item.size as keyof typeof item.item.sizes;
            if (item.border && item.item.borderOptions) {
                const borderPrice = sizeKey === 'G' ? 8.00 : 4.00;
                price += borderPrice;
            }
            if (item.extras && item.item.extraOptions) {
                item.extras.forEach(extra => {
                    const extraPrice = item.item.extraOptions![extra];
                    if (extraPrice) {
                        price += extraPrice;
                    }
                });
            }
        }

        return price * item.quantity;
    };

    const handleShareClick = () => {
        const customerName = localStorage.getItem('customerName') || '';
        const customerPhone = localStorage.getItem('customerPhone') || '';
        const customerAddress = localStorage.getItem('customerAddress') || '';
        const customerNeighborhood = localStorage.getItem('customerNeighborhood') || '';
        const customerComplement = localStorage.getItem('customerComplement') || '';
        const customerReferencePoint = localStorage.getItem('customerReferencePoint') || '';
        const customerNumber = localStorage.getItem('customerNumber') || '';
        const troco = localStorage.getItem('troco') || '';

        const deliveryFee = calculateDeliveryFee(customerNeighborhood, tipoEntrega);
        const subtotal = cartItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
        const valorFinal = subtotal + deliveryFee;

        const customerInfo = `\nNome: ${customerName}\nTelefone: ${customerPhone}`;
        const addressInfo = tipoEntrega === 'entrega'
            ? `\nEndereço: ${customerAddress}, ${customerNumber}${customerComplement ? `, ${customerComplement}` : ''}\nBairro: ${customerNeighborhood}\nPonto de Referência: ${customerReferencePoint}`
            : '\nTipo de Entrega: Retirada no Local';
        const paymentInfo = formaPagamento === 'pix' ? '\nForma de Pagamento: PIX\n' :
            formaPagamento === 'dinheiro' ? `\nForma de Pagamento: Dinheiro${troco ? `\nTroco para: R$ ${troco}` : ''}\n` :
                formaPagamento === 'cartao' ? '\nForma de Pagamento: Cartão\n' : '';

        const itemsInfo = cartItems.map(item =>
            `${item.quantity}x ${item.item.name}${item.size ? ` (${item.size})` : ''}${item.observation ? ` - ${item.observation}` : ''} - R$ ${calculateItemPrice(item).toFixed(2)}`
        ).join('\n');

        const message = `*Novo Pedido*\n${customerInfo}${addressInfo}${paymentInfo}\n*Itens:*\n${itemsInfo}\n\n*Valor Final: R$ ${valorFinal.toFixed(2)}*\n\n*Chave PIX do estabelecimento:* 84 99872-9126`;

        if (navigator.share) {
            navigator.share({
                title: 'Meu Pedido',
                text: message
            });
        } else {
            alert('Compartilhamento não suportado neste navegador.');
        }
        setShowWhatsAppModal(false);
    };

    const handleWhatsAppClick = () => {
        const customerName = localStorage.getItem('customerName') || '';
        const customerPhone = localStorage.getItem('customerPhone') || '';
        const customerAddress = localStorage.getItem('customerAddress') || '';
        const customerNeighborhood = localStorage.getItem('customerNeighborhood') || '';
        const customerComplement = localStorage.getItem('customerComplement') || '';
        const customerReferencePoint = localStorage.getItem('customerReferencePoint') || '';
        const customerNumber = localStorage.getItem('customerNumber') || '';
        const troco = localStorage.getItem('troco') || '';

        const deliveryFee = calculateDeliveryFee(customerNeighborhood, tipoEntrega);
        const subtotal = cartItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
        const valorFinal = subtotal + deliveryFee;

        const customerInfo = `\nNome: ${customerName}\nTelefone: ${customerPhone}`;
        const addressInfo = tipoEntrega === 'entrega'
            ? `\nEndereço: ${customerAddress}, ${customerNumber}${customerComplement ? `, ${customerComplement}` : ''}\nBairro: ${customerNeighborhood}\nPonto de Referência: ${customerReferencePoint}`
            : '\nTipo de Entrega: Retirada no Local';
        const paymentInfo = formaPagamento === 'pix' ? '\nForma de Pagamento: PIX\n' :
            formaPagamento === 'dinheiro' ? `\nForma de Pagamento: Dinheiro${troco ? `\nTroco para: R$ ${troco}` : ''}\n` :
                formaPagamento === 'cartao' ? '\nForma de Pagamento: Cartão\n' : '';

        const itemsInfo = cartItems.map(item =>
            `${item.quantity}x ${item.item.name}${item.size ? ` (${item.size})` : ''}${item.observation ? ` - ${item.observation}` : ''} - R$ ${calculateItemPrice(item).toFixed(2)}`
        ).join('\n');

        const message = `*Novo Pedido*\n${customerInfo}${addressInfo}${paymentInfo}\n*Itens:*\n${itemsInfo}\n\n*Valor Final: R$ ${valorFinal.toFixed(2)}*\n\n*Chave PIX do estabelecimento:* 84 99872-9126`;

        const whatsappUrl = `https://wa.me/558498729126?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        setShowWhatsAppModal(false);
    };

    useEffect(() => {
        if (orderSuccessId) {
            const notifyOrders = JSON.parse(localStorage.getItem('notifyOrders') || '[]');
            if (!notifyOrders.includes(orderSuccessId)) {
                notifyOrders.push(orderSuccessId);
                localStorage.setItem('notifyOrders', JSON.stringify(notifyOrders));
            }
            setOrderSuccessId(null);
        }
    }, [orderSuccessId]);

    const handlePastaClick = (item: MenuItem) => {
        setSelectedPasta(item);
    };

    const handlePastaClose = () => {
        setSelectedPasta(null);
    };

    const handlePastaAddToCart = (quantity: number, observation: string, size?: 'P' | 'G') => {
        if (selectedPasta) {
            addToCart(selectedPasta, quantity, observation, size);
            setSelectedPasta(null);
        }
    };

    // Mapear nomes das categorias para exibição
    const getCategoryDisplayName = (category: string) => {
        const categoryNames: { [key: string]: string } = {
            'pizzas': 'Pizzas',
            'massas': 'Massas',
            'hamburguer': 'Hambúrgueres',
            'panquecas': 'Panquecas',
            'tapiocas': 'Tapiocas',
            'esfirras': 'Esfirras',
            'petiscos': 'Petiscos',
            'bebidas': 'Bebidas'
        };
        return categoryNames[category] || category;
    };

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        setShowCategoriesModal(false);
        setTimeout(() => {
            const element = document.getElementById(`category-${category}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50); // Pequeno delay para garantir que o scroll do body foi liberado
    };

    // Controlar scroll quando modal de categorias estiver aberto
    useEffect(() => {
        if (showCategoriesModal) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
    }, [showCategoriesModal]);



    if (!isOpen) {
        return (
            <div className="text-center py-8">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Estabelecimento Fechado</h2>
                <p className="text-gray-400 mb-4">Desculpe, estamos fechados no momento.</p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleOpen}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                >
                    Abrir para Pedidos
                </motion.button>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#262525] p-4 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Carregando cardápio...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-[#262525] p-4 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar cardápio</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => window.location.reload()}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                    >
                        Tentar Novamente
                    </motion.button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#262525] p-4">
            {/* Barra de categorias */}
            <div className="sticky top-0 z-10 bg-[#262525] pb-4 mb-6">
                {/* Container centralizado para desktop, sem limites laterais em mobile */}
                <div className="max-w-7xl mx-auto px-0 sm:px-4">
                    <motion.div
                        ref={categoriesContainerRef}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-red-600 scrollbar-track-gray-800 w-full px-4 sm:px-0 categories-container"
                    >
                        {/* Botão Hambúrguer visível em todos os dispositivos */}
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

                        {/* Categorias visíveis em todos os dispositivos */}
                        {categories.map(category => (
                            <motion.button
                                key={category.value}
                                variants={categoryVariants}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCategoryClick(category.value)}
                                data-category={category.value}
                                className={`px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 category-button relative ${selectedCategory === category.value
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                                    : 'bg-[#262525] text-gray-200 hover:bg-gray-800'
                                    }`}
                            >
                                {category.label}
                                {selectedCategory === category.value && (
                                    <motion.div
                                        layoutId="activeCategory"
                                        className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0 }}
                                    />
                                )}
                            </motion.button>
                        ))}
                    </motion.div>
                </div>
            </div>
            {/* Container centralizado para o restante do conteúdo */}
            <div className="max-w-7xl mx-auto px-4 py-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl font-bold text-red-600 mb-2">Do'Cheff</h1>
                    <p className="text-gray-400">Escolha seus itens favoritos</p>

                    {!isRestaurantOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-4 p-4 bg-red-900/20 border border-red-600/50 rounded-lg max-w-md mx-auto"
                        >
                            <div className="flex items-center justify-center gap-2 text-red-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <span className="font-semibold">Estabelecimento Fechado</span>
                            </div>
                            <p className="text-red-300 text-sm mt-1 text-center">
                                Pedidos não são aceitos no momento. Volte durante o horário de funcionamento.
                            </p>
                        </motion.div>
                    )}
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-8"
                >
                    {categories.map(category => (
                        <div key={category.value} id={`category-${category.value}`} className="space-y-4">
                            <h2 className="text-2xl font-bold text-red-600 capitalize">{category.label}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {menuItems
                                    .filter(item => item.category === category.value)
                                    .slice() // cópia para não mutar o estado
                                    .sort((a, b) => {
                                        // Mantém a regra especial: se for pizza, "Calabresa" vem primeiro.
                                        if (category.value === 'pizzas') {
                                            const aIsCalabresa = a.name.toLowerCase().includes('calabresa');
                                            const bIsCalabresa = b.name.toLowerCase().includes('calabresa');
                                            if (aIsCalabresa && !bIsCalabresa) return -1;
                                            if (!aIsCalabresa && bIsCalabresa) return 1;
                                        }
                                        // Ordena todos os itens pelo preço, do menor para o maior.
                                        return a.price - b.price;
                                    })
                                    .map((item) => (
                                        <motion.div
                                            key={item._id}
                                            variants={itemVariants}
                                            initial="hidden"
                                            animate="visible"
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
                                                {item.destaque && (
                                                    <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                                        Destaque
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <h3 className="text-xl font-semibold text-white mb-2">{item.name}</h3>
                                                <p className="text-gray-300 mb-4">{item.description}</p>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-red-500 font-bold text-lg">R$ {item.price.toFixed(2)}</span>
                                                    <motion.button
                                                        whileHover={isRestaurantOpen ? { scale: 1.05 } : {}}
                                                        whileTap={isRestaurantOpen ? { scale: 0.95 } : {}}
                                                        onClick={() => {
                                                            if (!isRestaurantOpen) return;
                                                            if (item.category === 'pizzas' || item.category === 'calzone') {
                                                                setSelectedItem(item);
                                                            } else if (item.category === 'massas') {
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

                {/* Modal de Categorias */}
                <AnimatePresence>
                    {showCategoriesModal && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCategoriesModal(false)}
                        >
                            <motion.div
                                className="bg-gradient-to-br from-[#262525] to-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-800 p-6 max-w-sm w-full mx-4 max-h-[80vh] flex flex-col"
                                initial={{ scale: 0.8, y: 20, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.8, y: 20, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-6 flex-shrink-0 pb-4 border-b border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <h2 className="text-xl font-bold text-white">Categorias</h2>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setShowCategoriesModal(false)}
                                        className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </motion.button>
                                </div>

                                <div className="space-y-2 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-red-600 scrollbar-track-gray-800 pr-2">
                                    {categories.map((category, index) => (
                                        <motion.button
                                            key={category.value}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ scale: 1.02, x: 5 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleCategorySelect(category.value)}
                                            className={`w-full text-left p-4 rounded-xl transition-all duration-300 border ${selectedCategory === category.value
                                                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-500 shadow-lg shadow-red-600/25'
                                                : 'bg-gray-800/50 text-gray-200 hover:bg-gray-700/70 border-gray-700 hover:border-gray-600 hover:shadow-lg'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${selectedCategory === category.value ? 'bg-white' : 'bg-gray-500'
                                                        }`}></div>
                                                    <span className="text-lg font-medium">{getCategoryDisplayName(category.value)}</span>
                                                </div>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.1 + 0.2 }}
                                                >
                                                    <svg className={`w-5 h-5 transition-colors ${selectedCategory === category.value ? 'text-white' : 'text-gray-400'
                                                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </motion.div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-700 flex-shrink-0">
                                    <p className="text-sm text-gray-400 text-center">
                                        Selecione uma categoria para navegar
                                    </p>
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
                            allowHalfAndHalf={allowHalfAndHalf}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {selectedPasta && (
                        <PastaModal
                            item={selectedPasta}
                            onClose={handlePastaClose}
                            onAddToCart={handlePastaAddToCart}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isCartOpen && (
                        <Cart
                            items={cartItems}
                            onUpdateQuantity={updateQuantity}
                            onRemoveItem={removeFromCart}
                            onCheckout={handleCheckout}
                            onClose={() => setIsCartOpen(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Modal do WhatsApp */}
                <AnimatePresence>
                    {showWhatsAppModal && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="bg-[#262525] rounded-xl shadow-xl p-8 max-w-md w-full mx-4 text-center max-h-[90vh] overflow-y-auto"
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.8 }}
                            >
                                <h2 className="text-2xl font-bold text-red-600 mb-4">Confirme seu pedido</h2>
                                <div className="bg-[#1a1a1a] p-4 rounded-lg mb-6 text-left">
                                    <h3 className="text-red-600 font-semibold mb-2">Detalhes do seu pedido:</h3>
                                    <pre className="text-gray-300 whitespace-pre-wrap text-sm">
                                        {(() => {
                                            const customerName = localStorage.getItem('customerName') || '';
                                            const customerPhone = localStorage.getItem('customerPhone') || '';
                                            const customerAddress = localStorage.getItem('customerAddress') || '';
                                            const customerNeighborhood = localStorage.getItem('customerNeighborhood') || '';
                                            const customerComplement = localStorage.getItem('customerComplement') || '';
                                            const customerReferencePoint = localStorage.getItem('customerReferencePoint') || '';
                                            const customerNumber = localStorage.getItem('customerNumber') || '';
                                            const troco = localStorage.getItem('troco') || '';

                                            const deliveryFee = calculateDeliveryFee(customerNeighborhood, tipoEntrega);
                                            const subtotal = cartItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
                                            const valorFinal = subtotal + deliveryFee;

                                            const customerInfo = `\nNome: ${customerName}\nTelefone: ${customerPhone}`;
                                            const addressInfo = tipoEntrega === 'entrega'
                                                ? `\nEndereço: ${customerAddress}, ${customerNumber}${customerComplement ? `, ${customerComplement}` : ''}\nBairro: ${customerNeighborhood}\nPonto de Referência: ${customerReferencePoint}`
                                                : '\nTipo de Entrega: Retirada no Local';
                                            const paymentInfo = formaPagamento === 'pix' ? '\nForma de Pagamento: PIX\n' :
                                                formaPagamento === 'dinheiro' ? `\nForma de Pagamento: Dinheiro${troco ? `\nTroco para: R$ ${troco}` : ''}\n` :
                                                    formaPagamento === 'cartao' ? '\nForma de Pagamento: Cartão\n' : '';

                                            const itemsInfo = cartItems.map(item =>
                                                `${item.quantity}x ${item.item.name}${item.size ? ` (${item.size})` : ''}${item.observation ? ` - ${item.observation}` : ''} - R$ ${calculateItemPrice(item).toFixed(2)}`
                                            ).join('\n');

                                            return `*Novo Pedido*\n${customerInfo}${addressInfo}${paymentInfo}\n*Itens:*\n${itemsInfo}\n\n*Valor Final: R$ ${valorFinal.toFixed(2)}*\n\n*Chave PIX do estabelecimento:* 84 99872-9126`;
                                        })()}
                                    </pre>
                                </div>

                                <div className="flex justify-center gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleWhatsAppClick}
                                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                                    >
                                        <FaWhatsapp className="text-xl" />
                                        Enviar para WhatsApp
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowWhatsAppModal(false)}
                                        className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                                    >
                                        Cancelar
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modal de sucesso do pedido */}
                <AnimatePresence>
                    {orderSuccessId && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="bg-[#262525] rounded-xl shadow-xl p-8 max-w-md w-full mx-4 text-center"
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.8 }}
                            >
                                <h2 className="text-2xl font-bold text-red-600 mb-4">Pedido realizado com sucesso!</h2>
                                <p className="text-gray-300 mb-2">Anote o número do seu pedido para acompanhar em <b>Pedidos</b>:</p>
                                <div className="text-3xl font-bold text-red-500 mb-4 break-all max-w-full" style={{ wordBreak: 'break-all' }}>{orderSuccessId}</div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 mt-2"
                                    onClick={() => {
                                        setOrderSuccessId(null);
                                    }}
                                >
                                    OK
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {cartItems.length > 0 && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            onClick={() => setIsCartOpen(true)}
                            className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-colors duration-300"
                        >
                            <div className="flex items-center">
                                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="font-semibold">{cartItems.reduce((total, item) => total + item.quantity, 0)}</span>
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
            {/* Painel de Debug - Removido */}
        </div>
    );
}