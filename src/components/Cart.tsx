'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from '../types/menu';
import { CartItem } from '../types/cart';
import { isRestaurantOpen as checkRestaurantOpen } from '../utils/timeUtils';
import { getBorderPrice } from '../utils/priceCalculator';
import type { BusinessHoursConfig } from '../utils/timeUtils';

interface CartProps {
    items: CartItem[];
    onUpdateQuantity: (itemId: string, quantity: number) => void;
    onRemoveItem: (itemId: string) => void;
    onClose: () => void;
    onFinalize: (pedidoData: any) => void;
}

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const panelVariants = {
    hidden: { y: '100%' },
    visible: { y: 0, transition: { type: 'spring', damping: 28, stiffness: 320 } },
    exit: { y: '40%', transition: { duration: 0.22 } },
};

const panelVariantsDesktop = {
    hidden: { opacity: 0, scale: 0.97, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', damping: 26, stiffness: 340 },
    },
    exit: { opacity: 0, scale: 0.98, y: 12, transition: { duration: 0.18 } },
};

function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatMoneyInput(value: string) {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const cents = Number(digits) / 100;
    return cents.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Floating label input */
function Field({
    id,
    label,
    value,
    onChange,
    type = 'text',
    required,
    placeholder,
    inputMode,
    autoComplete,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    required?: boolean;
    placeholder?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    autoComplete?: string;
}) {
    const filled = value.length > 0;
    return (
        <div className="relative">
            <input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                placeholder={placeholder || ' '}
                inputMode={inputMode}
                autoComplete={autoComplete}
                className="peer w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 pb-2.5 pt-5 text-sm text-ink outline-none transition placeholder:text-transparent focus:border-ember-500/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-ember-600/20"
            />
            <label
                htmlFor={id}
                className={`pointer-events-none absolute left-4 transition-all ${
                    filled
                        ? 'top-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint'
                        : 'top-1/2 -translate-y-1/2 text-sm text-ink-muted peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-ember-300'
                }`}
            >
                {label}
                {required && <span className="text-ember-400"> *</span>}
            </label>
        </div>
    );
}

function SelectField({
    id,
    label,
    value,
    onChange,
    required,
    children,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    required?: boolean;
    children: React.ReactNode;
}) {
    const filled = value.length > 0;
    return (
        <div className="relative">
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="peer w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 pb-2.5 pt-5 text-sm text-ink outline-none transition focus:border-ember-500/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-ember-600/20"
                style={{ colorScheme: 'dark' }}
            >
                {children}
            </select>
            <label
                htmlFor={id}
                className={`pointer-events-none absolute left-4 top-1.5 text-[10px] font-bold uppercase tracking-wider ${
                    filled ? 'text-ink-faint' : 'text-ink-muted'
                }`}
            >
                {label}
                {required && <span className="text-ember-400"> *</span>}
            </label>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </span>
        </div>
    );
}

export default function Cart({ items, onUpdateQuantity, onRemoveItem, onClose, onFinalize }: CartProps) {
    const [currentPage, setCurrentPage] = useState<'items' | 'checkout'>('items');
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [address, setAddress] = useState({
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        referencePoint: '',
    });
    const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
    const [cliente, setCliente] = useState({ nome: '', telefone: '' });
    const [formaPagamento, setFormaPagamento] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [troco, setTroco] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [deliveryFees, setDeliveryFees] = useState<{ neighborhood: string; fee: number }[]>([]);
    const [tipoEntrega, setTipoEntrega] = useState<'entrega' | 'retirada'>('entrega');
    const [isRestaurantOpen, setIsRestaurantOpen] = useState(true);
    const [isDesktop, setIsDesktop] = useState(false);

    const calculateItemPrice = (item: CartItem) => {
        if (item.size && item.item.sizes) {
            const sizeKey = item.size as keyof typeof item.item.sizes;
            let price = item.item.sizes[sizeKey] || item.item.price;

            if (
                (item.item.category === 'pizzas' || item.item.category === 'calzone') &&
                item.observation &&
                item.observation.includes('Meio a meio:')
            ) {
                const meioAMeioText = item.observation.split('Meio a meio:')[1];
                const cleanMeioAMeioText = meioAMeioText.split(' - ')[0];
                const [sabor1, sabor2] = cleanMeioAMeioText.split('/').map((s) => s.trim());
                const catItems = menuItems.filter((p: MenuItem) => p.category === item.item.category);
                const item1 = catItems.find((p: MenuItem) => p.name === sabor1);
                const item2 = catItems.find((p: MenuItem) => p.name === sabor2);
                if (item1 && item2) {
                    const price1 = item1.sizes ? item1.sizes[sizeKey] || item1.price : item1.price;
                    const price2 = item2.sizes ? item2.sizes[sizeKey] || item2.price : item2.price;
                    price = Math.max(price1, price2);
                }
            }

            if (item.item.category === 'pizzas' || item.item.category === 'calzone') {
                price += getBorderPrice(item.item, item.border, sizeKey);
                if (item.extras && item.item.extraOptions) {
                    item.extras.forEach((extra) => {
                        const extraPrice = item.item.extraOptions![extra];
                        if (extraPrice) price += extraPrice;
                    });
                }
            }
            return price * item.quantity;
        }
        return item.item.price * item.quantity;
    };

    const calculateUnitPrice = (item: CartItem) => {
        if (
            (item.item.category === 'pizzas' || item.item.category === 'calzone' || item.item.category === 'massas') &&
            item.size &&
            item.item.sizes
        ) {
            const sizeKey = item.size as keyof typeof item.item.sizes;
            let price = 0;

            if (item.item.category === 'pizzas' || item.item.category === 'calzone') {
                if (item.observation && item.observation.includes('Meio a meio:')) {
                    const meioAMeioText = item.observation.split('Meio a meio:')[1];
                    const cleanMeioAMeioText = meioAMeioText.split(' - ')[0];
                    const [sabor1, sabor2] = cleanMeioAMeioText.split('/').map((s) => s.trim());
                    const catItems = menuItems.filter((p: MenuItem) => p.category === item.item.category);
                    const item1 = catItems.find((p: MenuItem) => p.name === sabor1);
                    const item2 = catItems.find((p: MenuItem) => p.name === sabor2);
                    if (item1 && item2) {
                        const price1 = item1.sizes ? item1.sizes[sizeKey] || item1.price : item1.price;
                        const price2 = item2.sizes ? item2.sizes[sizeKey] || item2.price : item2.price;
                        price = Math.max(price1, price2);
                    }
                } else {
                    price = item.item.sizes[sizeKey] || item.item.price;
                }
                price += getBorderPrice(item.item, item.border, sizeKey);
                if (item.extras && item.item.extraOptions) {
                    item.extras.forEach((extra) => {
                        const extraPrice = item.item.extraOptions![extra];
                        if (extraPrice) price += extraPrice;
                    });
                }
            } else {
                price = item.item.sizes[sizeKey] || item.item.price;
            }
            return price;
        }
        return item.item.price;
    };

    useEffect(() => {
        async function fetchMenuItems() {
            try {
                const response = await fetch('/api/menu');
                const data = await response.json();
                if (data.success && data.data) setMenuItems(data.data);
            } catch (err) {
                console.error('Erro ao carregar itens do menu:', err);
            }
        }
        async function fetchDeliveryFees() {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success && data.data) {
                    setDeliveryFees(data.data.deliveryFees || []);
                    setIsRestaurantOpen(checkRestaurantOpen(data.data.businessHours as BusinessHoursConfig));
                }
            } catch (err) {
                console.error('Erro ao carregar taxas de entrega:', err);
                setIsRestaurantOpen(checkRestaurantOpen(null));
            }
        }
        fetchMenuItems();
        fetchDeliveryFees();
    }, []);

    useEffect(() => {
        setCliente({
            nome: localStorage.getItem('customerName') || '',
            telefone: formatPhone(localStorage.getItem('customerPhone') || ''),
        });
        setAddress({
            street: localStorage.getItem('customerStreet') || '',
            number: localStorage.getItem('customerNumber') || '',
            complement: localStorage.getItem('customerComplement') || '',
            neighborhood: localStorage.getItem('customerNeighborhood') || '',
            referencePoint: localStorage.getItem('customerReferencePoint') || '',
        });
        setSelectedNeighborhood(localStorage.getItem('customerNeighborhood') || '');
        setTipoEntrega((localStorage.getItem('tipoEntrega') as 'entrega' | 'retirada') || 'entrega');
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 640px)');
        const sync = () => setIsDesktop(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const calculateDeliveryFee = (neighborhood: string) => {
        if (tipoEntrega === 'retirada') return 0;
        const fee = deliveryFees.find((f) => f.neighborhood === neighborhood);
        return fee ? fee.fee : 0;
    };

    const subtotal = items.reduce((sum, item) => sum + calculateItemPrice(item), 0);
    const deliveryFee = calculateDeliveryFee(address.neighborhood);
    const total = subtotal + deliveryFee;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const handleFinalizeOrder = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!cliente.nome.trim()) {
            setError('Informe seu nome.');
            return;
        }
        if (cliente.telefone.replace(/\D/g, '').length < 10) {
            setError('Informe um telefone válido com DDD.');
            return;
        }
        if (tipoEntrega === 'entrega') {
            if (!address.neighborhood) {
                setError('Selecione seu bairro.');
                return;
            }
            if (!address.street.trim() || !address.number.trim()) {
                setError('Preencha rua e número.');
                return;
            }
        }
        if (!formaPagamento) {
            setError('Selecione a forma de pagamento.');
            return;
        }

        localStorage.setItem('customerName', cliente.nome);
        localStorage.setItem('customerPhone', cliente.telefone);
        localStorage.setItem('customerStreet', address.street);
        localStorage.setItem('customerNumber', address.number);
        localStorage.setItem('customerComplement', address.complement);
        localStorage.setItem('customerNeighborhood', address.neighborhood);
        localStorage.setItem('customerReferencePoint', address.referencePoint);
        localStorage.setItem('tipoEntrega', tipoEntrega);
        if (formaPagamento === 'dinheiro') localStorage.setItem('troco', troco);
        else localStorage.removeItem('troco');

        onFinalize({
            itens: items.map((item) => ({
                nome: item.item.name,
                quantidade: item.quantity,
                preco: calculateUnitPrice(item),
                observacao: item.observation,
                size: item.size,
                border: item.border,
                extras: item.extras,
            })),
            total,
            tipoEntrega,
            endereco:
                tipoEntrega === 'entrega'
                    ? {
                          address,
                          deliveryFee: calculateDeliveryFee(address.neighborhood),
                          estimatedTime: '30-45 minutos',
                      }
                    : undefined,
            cliente,
            observacoes,
            formaPagamento,
            troco: formaPagamento === 'dinheiro' ? troco : undefined,
        });
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-md sm:items-center sm:p-4"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={onClose}
            >
                <motion.div
                    className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-surface-raised shadow-2xl sm:max-h-[92vh] sm:max-w-lg sm:rounded-3xl"
                    variants={isDesktop ? panelVariantsDesktop : panelVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Handle */}
                    <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
                        <span className="h-1 w-10 rounded-full bg-white/20" />
                    </div>

                    {/* Header */}
                    <div className="shrink-0 border-b border-white/[0.06] px-4 pb-3 pt-2 sm:px-5 sm:pt-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">Sua sacola</h2>
                                <p className="text-xs text-ink-muted">
                                    {itemCount === 0
                                        ? 'Nenhum item ainda'
                                        : `${itemCount} ${itemCount === 1 ? 'item' : 'itens'} · R$ ${total.toFixed(2)}`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-ink-muted transition hover:bg-white/10 hover:text-ink"
                                aria-label="Fechar carrinho"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Steps */}
                        <div className="relative flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                            {(['items', 'checkout'] as const).map((step) => {
                                const active = currentPage === step;
                                const label = step === 'items' ? `Itens (${items.length})` : 'Checkout';
                                return (
                                    <button
                                        key={step}
                                        type="button"
                                        onClick={() => setCurrentPage(step)}
                                        disabled={step === 'checkout' && items.length === 0}
                                        className={`relative z-10 flex-1 rounded-full py-2 text-xs font-semibold transition sm:text-sm ${
                                            active ? 'text-white' : 'text-ink-muted hover:text-ink disabled:opacity-40'
                                        }`}
                                    >
                                        {active && (
                                            <motion.span
                                                layoutId="cartStep"
                                                className="absolute inset-0 rounded-full bg-ember-600 shadow-glow"
                                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        <span className="relative">{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                        <AnimatePresence mode="wait">
                            {currentPage === 'items' ? (
                                <motion.div
                                    key="items"
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 12 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {items.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04] text-3xl opacity-50">
                                                🛒
                                            </div>
                                            <p className="font-display text-lg font-bold text-ink">Sacola vazia</p>
                                            <p className="mt-1 max-w-xs text-sm text-ink-muted">
                                                Adicione itens do cardápio para montar seu pedido.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="mt-6 rounded-full bg-ember-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-ember-500"
                                            >
                                                Ver cardápio
                                            </button>
                                        </div>
                                    ) : (
                                        <ul className="space-y-3">
                                            {items.map((item) => (
                                                <li
                                                    key={item._id}
                                                    className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="truncate text-sm font-semibold text-ink sm:text-base">
                                                                {item.item.name}
                                                            </h3>
                                                            <p className="mt-0.5 text-xs text-ink-muted">
                                                                {[
                                                                    item.size && `Tam. ${item.size}`,
                                                                    item.border && `Borda ${item.border}`,
                                                                    item.extras?.length
                                                                        ? `Extras: ${item.extras.join(', ')}`
                                                                        : null,
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(' · ')}
                                                            </p>
                                                            {item.observation && (
                                                                <p className="mt-1 line-clamp-2 text-xs text-ink-faint">
                                                                    Obs: {item.observation}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            <p className="text-[10px] text-ink-faint">
                                                                R$ {calculateUnitPrice(item).toFixed(2)} un.
                                                            </p>
                                                            <p className="text-sm font-bold text-ember-300">
                                                                R$ {calculateItemPrice(item).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-0.5">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onUpdateQuantity(item._id, Math.max(1, item.quantity - 1))
                                                                }
                                                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-ink"
                                                                aria-label="Diminuir"
                                                            >
                                                                −
                                                            </button>
                                                            <span className="min-w-[1.5rem] text-center text-sm font-bold text-ink">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                                                                className="flex h-8 w-8 items-center justify-center rounded-full bg-ember-600 text-white"
                                                                aria-label="Aumentar"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => onRemoveItem(item._id)}
                                                            className="text-xs font-semibold text-ink-faint transition hover:text-ember-400"
                                                        >
                                                            Remover
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.form
                                    key="checkout"
                                    id="cart-checkout-form"
                                    onSubmit={handleFinalizeOrder}
                                    initial={{ opacity: 0, x: 12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -12 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4 pb-2"
                                >
                                    {/* Resumo compacto */}
                                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                                            Resumo
                                        </p>
                                        <div className="space-y-1.5">
                                            {items.slice(0, 3).map((item) => (
                                                <div key={item._id} className="flex justify-between gap-2 text-sm">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-ink-muted">
                                                            {item.quantity}× {item.item.name}
                                                        </div>
                                                        {[
                                                            item.size && `Tam. ${item.size}`,
                                                            item.border && `Borda ${item.border}`,
                                                            item.extras?.length
                                                                ? `Extras: ${item.extras.join(', ')}`
                                                                : null,
                                                            item.observation,
                                                        ].filter(Boolean).length > 0 && (
                                                            <div className="truncate text-[11px] text-ink-faint">
                                                                {[
                                                                    item.size && `Tam. ${item.size}`,
                                                                    item.border && `Borda ${item.border}`,
                                                                    item.extras?.length
                                                                        ? `Extras: ${item.extras.join(', ')}`
                                                                        : null,
                                                                    item.observation,
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(' · ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="shrink-0 text-ink">
                                                        R$ {calculateItemPrice(item).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                            {items.length > 3 && (
                                                <p className="text-xs text-ink-faint">+ {items.length - 3} item(s)</p>
                                            )}
                                        </div>
                                        <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-3 text-sm">
                                            <div className="flex justify-between text-ink-muted">
                                                <span>Subtotal</span>
                                                <span>R$ {subtotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-ink-muted">
                                                <span>Entrega</span>
                                                <span>
                                                    {tipoEntrega === 'retirada'
                                                        ? 'Grátis'
                                                        : `R$ ${deliveryFee.toFixed(2)}`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between font-bold text-ink">
                                                <span>Total</span>
                                                <span className="text-ember-400">R$ {total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Field
                                        id="nome"
                                        label="Nome completo"
                                        value={cliente.nome}
                                        onChange={(v) => setCliente({ ...cliente, nome: v })}
                                        required
                                        autoComplete="name"
                                    />
                                    <Field
                                        id="telefone"
                                        label="WhatsApp / Telefone"
                                        value={cliente.telefone}
                                        onChange={(v) => setCliente({ ...cliente, telefone: formatPhone(v) })}
                                        type="tel"
                                        inputMode="tel"
                                        required
                                        autoComplete="tel"
                                        placeholder="(84) 99999-9999"
                                    />

                                    {/* Tipo entrega */}
                                    <div>
                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                                            Tipo de entrega
                                        </p>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {(['entrega', 'retirada'] as const).map((tipo) => {
                                                const active = tipoEntrega === tipo;
                                                return (
                                                    <button
                                                        key={tipo}
                                                        type="button"
                                                        onClick={() => setTipoEntrega(tipo)}
                                                        className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                                                            active
                                                                ? 'border-ember-500/70 bg-ember-950/45 text-ink'
                                                                : 'border-white/10 bg-white/[0.03] text-ink-muted'
                                                        }`}
                                                    >
                                                        {tipo === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {tipoEntrega === 'entrega' && (
                                        <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                                            <SelectField
                                                id="neighborhood"
                                                label="Bairro"
                                                value={selectedNeighborhood}
                                                required
                                                onChange={(v) => {
                                                    setSelectedNeighborhood(v);
                                                    setAddress({ ...address, neighborhood: v });
                                                }}
                                            >
                                                <option value="">Selecione o bairro</option>
                                                {deliveryFees.map((fee) => (
                                                    <option key={fee.neighborhood} value={fee.neighborhood}>
                                                        {fee.neighborhood} — R$ {fee.fee.toFixed(2)}
                                                    </option>
                                                ))}
                                            </SelectField>
                                            <Field
                                                id="street"
                                                label="Rua"
                                                value={address.street}
                                                onChange={(v) => setAddress({ ...address, street: v })}
                                                required
                                                autoComplete="street-address"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field
                                                    id="number"
                                                    label="Número"
                                                    value={address.number}
                                                    onChange={(v) => setAddress({ ...address, number: v })}
                                                    required
                                                    inputMode="numeric"
                                                />
                                                <Field
                                                    id="complement"
                                                    label="Complemento"
                                                    value={address.complement}
                                                    onChange={(v) => setAddress({ ...address, complement: v })}
                                                />
                                            </div>
                                            <Field
                                                id="referencePoint"
                                                label="Ponto de referência"
                                                value={address.referencePoint}
                                                onChange={(v) => setAddress({ ...address, referencePoint: v })}
                                            />
                                        </div>
                                    )}

                                    <SelectField
                                        id="formaPagamento"
                                        label="Forma de pagamento"
                                        value={formaPagamento}
                                        required
                                        onChange={setFormaPagamento}
                                    >
                                        <option value="">Selecione</option>
                                        <option value="pix">PIX</option>
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="cartao">Cartão</option>
                                    </SelectField>

                                    {formaPagamento === 'dinheiro' && (
                                        <div className="relative">
                                            <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-sm text-ink-faint">
                                                R$
                                            </span>
                                            <input
                                                id="troco"
                                                type="text"
                                                inputMode="decimal"
                                                value={troco}
                                                onChange={(e) => setTroco(formatMoneyInput(e.target.value))}
                                                placeholder=" "
                                                className="peer w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pl-11 pr-4 pt-5 text-sm text-ink outline-none transition placeholder:text-transparent focus:border-ember-500/60 focus:ring-2 focus:ring-ember-600/20"
                                            />
                                            <label
                                                htmlFor="troco"
                                                className={`pointer-events-none absolute left-11 transition-all ${
                                                    troco
                                                        ? 'top-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint'
                                                        : 'top-1/2 -translate-y-1/2 text-sm text-ink-muted peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-ember-300'
                                                }`}
                                            >
                                                Troco para quanto?
                                            </label>
                                        </div>
                                    )}

                                    <div className="relative">
                                        <textarea
                                            id="observacoes"
                                            value={observacoes}
                                            onChange={(e) => setObservacoes(e.target.value)}
                                            placeholder=" "
                                            rows={3}
                                            className="peer w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 pb-2.5 pt-5 text-sm text-ink outline-none transition placeholder:text-transparent focus:border-ember-500/60 focus:ring-2 focus:ring-ember-600/20"
                                        />
                                        <label
                                            htmlFor="observacoes"
                                            className={`pointer-events-none absolute left-4 transition-all ${
                                                observacoes
                                                    ? 'top-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint'
                                                    : 'top-4 text-sm text-ink-muted peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-ember-300'
                                            }`}
                                        >
                                            Observações do pedido
                                        </label>
                                    </div>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="rounded-xl border border-ember-800/50 bg-ember-950/50 px-3 py-2.5 text-center text-xs text-ember-200"
                                            >
                                                {error}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {!isRestaurantOpen && (
                                        <div className="rounded-xl border border-ember-700/40 bg-ember-950/40 px-3 py-2.5 text-xs text-ember-200">
                                            <strong>Estabelecimento fechado.</strong> Pedidos não são aceitos no momento.
                                        </div>
                                    )}
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer sticky */}
                    {items.length > 0 && (
                        <div
                            className="shrink-0 border-t border-white/[0.08] bg-surface-raised/95 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-4"
                            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
                        >
                            {currentPage === 'items' ? (
                                <div className="flex flex-col gap-2.5 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/[0.08] sm:flex-1"
                                    >
                                        Continuar comprando
                                    </button>
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        type="button"
                                        onClick={() => setCurrentPage('checkout')}
                                        className="rounded-2xl bg-ember-600 px-4 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-ember-500 sm:flex-[1.4]"
                                    >
                                        Ir para checkout · R$ {total.toFixed(2)}
                                    </motion.button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2.5 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage('items')}
                                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/[0.08] sm:flex-1"
                                    >
                                        Voltar
                                    </button>
                                    <motion.button
                                        whileTap={isRestaurantOpen ? { scale: 0.98 } : {}}
                                        type="submit"
                                        form="cart-checkout-form"
                                        disabled={!isRestaurantOpen}
                                        className={`rounded-2xl px-4 py-3.5 text-sm font-bold transition sm:flex-[1.4] ${
                                            isRestaurantOpen
                                                ? 'bg-ember-600 text-white shadow-glow hover:bg-ember-500'
                                                : 'cursor-not-allowed bg-white/10 text-ink-faint'
                                        }`}
                                    >
                                        {isRestaurantOpen ? `Finalizar · R$ ${total.toFixed(2)}` : 'Estabelecimento fechado'}
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
