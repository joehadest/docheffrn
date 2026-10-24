'use client';
import { useAdminConfirm } from './admin/useAdminConfirm';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import AdminDialog from './admin/AdminDialog';
import AdminDeliveries from './admin/AdminDeliveries';
import { AdminDataProvider } from '@/contexts/AdminDataContext';
import { PageHeading, EmptyState } from './admin/AdminUI';
import { FaShareAlt, FaClipboardList, FaSyncAlt, FaList, FaColumns, FaClock, FaSearch, FaVolumeUp, FaVolumeMute, FaChevronLeft, FaChevronRight, FaMotorcycle, FaArrowLeft } from 'react-icons/fa';
import { Pedido } from '../types/cart';
import { motion, AnimatePresence } from 'framer-motion';
import { financialOrderTotal, FINANCE_TIME_ZONE } from '@/utils/financePeriod';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_CHANNEL_LABELS, nextOrderStatus, nextOrderAction, filterOperationOrders, isActiveOrder, orderElapsedLabel } from './admin/orderOperations';
import './admin/admin-operations.css';
import './admin/admin-orders.css';

type PedidoStatus = 'pendente' | 'preparando' | 'pronto' | 'em_entrega' | 'entregue' | 'cancelado';
type DateFilter = 'active' | 'today' | 'all';
const ORDERS_PER_PAGE = 12;

// Componente para a notificação de atualização de status
const StatusUpdateToast = ({ message, onDone }: { message: string, onDone: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onDone, 4000);
        return () => clearTimeout(timer);
    }, [onDone]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            role="status" className="admin-toast"
        >
            <div className="admin-toast-body">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm font-medium">{message}</span>
            </div>
        </motion.div>
    );
};


export default function AdminOrders() {
    const [deliveryView, setDeliveryView] = useState<{ orderId?: string } | null>(null);
    if (deliveryView) return <AdminDataProvider><div className="orders-deliveries-view">
        <div className="orders-deliveries-navigation"><button type="button" className="form-button-secondary" onClick={() => setDeliveryView(null)}><FaArrowLeft aria-hidden="true" /> Voltar aos pedidos</button></div>
        <AdminDeliveries initialOrderId={deliveryView.orderId} />
    </div></AdminDataProvider>;
    return <OrdersWorkspace onOpenDeliveries={orderId => setDeliveryView({ orderId })} />;
}

function OrdersWorkspace({ onOpenDeliveries }: { onOpenDeliveries: (orderId?: string) => void }) {
  const { confirm, confirmationDialog } = useAdminConfirm();
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [pixKey, setPixKey] = useState('84987291269'); // (84) 98729-1269
    const [searchFilter, setSearchFilter] = useState('');
    const [channelFilter, setChannelFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilter>('active');
    const [view, setView] = useState<'list' | 'board'>('board');
    const [listPage, setListPage] = useState(1);
    const [now, setNow] = useState(() => Date.now());
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [newOrderNotification, setNewOrderNotification] = useState<string | null>(null);
    const [statusUpdateToast, setStatusUpdateToast] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [audioReady, setAudioReady] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const firstLoadRef = useRef<boolean>(true);
    const userInteractedRef = useRef<boolean>(false);
    const lastHeardOrderIdsRef = useRef<Set<string>>(new Set());
    const knownOrderIdsRef = useRef<Set<string>>(new Set());
    const sseRef = useRef<EventSource | null>(null);
    const resultsRef = useRef<HTMLDivElement | null>(null);
    const soundLoopRef = useRef<number | null>(null);
    const soundLoopCountRef = useRef<number>(0);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, []);


    // Bloqueia scroll quando modal de pedido aberto
    useEffect(() => {
        if (pedidoSelecionado) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => { document.body.classList.remove('modal-open'); };
    }, [pedidoSelecionado]);

    // Função robusta de reprodução de som
    const playNotificationSound = useCallback(async () => {
        if (!soundEnabled) return;
        if (audioRef.current) {
            try {
                audioRef.current.currentTime = 0;
                await audioRef.current.play();
                return;
            } catch (err) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn('[Pedidos] Falha play principal, tentando fallback', err);
                }
            }
        }
        try {
            const alt = new Audio('/sound/bell-notification-337658.mp3');
            alt.volume = audioRef.current?.volume ?? 1;
            await alt.play();
        } catch (err2) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[Pedidos] Falha fallback de áudio', err2);
            }
        }
    }, [soundEnabled]);

    // Inicializa preferencia de som do localStorage
    useEffect(() => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('ordersSoundEnabled') : null;
        if (saved !== null) setSoundEnabled(saved === 'true');
        const enableAudio = () => {
            userInteractedRef.current = true;
            if (audioRef.current) {
                audioRef.current.play().then(() => {
                    audioRef.current?.pause();
                    audioRef.current!.currentTime = 0;
                    setAudioReady(true);
                }).catch(() => {/* ignore */ });
            }
            window.removeEventListener('click', enableAudio);
            window.removeEventListener('keydown', enableAudio);
        };
        window.addEventListener('click', enableAudio, { once: true });
        window.addEventListener('keydown', enableAudio, { once: true });
        return () => {
            window.removeEventListener('click', enableAudio);
            window.removeEventListener('keydown', enableAudio);
        };
    }, []);

    // Buscar chave PIX das configurações
    useEffect(() => {
        async function fetchPixKey() {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success && data.data?.pixKey) {
                    setPixKey(data.data.pixKey);
                }
            } catch (error) {
                // Mantém o valor padrão em caso de erro
            }
        }
        fetchPixKey();
    }, []);

    const fetchPedidos = useCallback(async (isPolling = false) => {
        try {
            if (!isPolling) setLoading(true);
            else setRefreshing(true);
            const res = await fetch(`/api/pedidos?ts=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok || !data.success || !Array.isArray(data.data)) {
                throw new Error('Falha ao carregar pedidos');
            }

            setLoadError(null);
            const allFetchedPedidos: Pedido[] = data.data;
            setLastUpdated(new Date());

            if (firstLoadRef.current) {
                firstLoadRef.current = false;
                setPedidos(allFetchedPedidos);
                const mostRecentOrder = allFetchedPedidos[0];
                if (mostRecentOrder) {
                    const orderTime = new Date(mostRecentOrder.data);
                    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
                    if (orderTime > oneMinuteAgo && !lastHeardOrderIdsRef.current.has(mostRecentOrder._id)) {
                        setNewOrderNotification(`Novo pedido recebido! #${mostRecentOrder._id.slice(-6)}`);
                        if (userInteractedRef.current) await playNotificationSound();
                        lastHeardOrderIdsRef.current.add(mostRecentOrder._id);
                    }
                }
            } else {
                setPedidos(allFetchedPedidos);
                const newOrders = allFetchedPedidos.filter(order => !knownOrderIdsRef.current.has(order._id) && !lastHeardOrderIdsRef.current.has(order._id) && order.status === 'pendente');
                if (newOrders.length) {
                    setNewOrderNotification(newOrders.length === 1 ? `Novo pedido recebido! #${newOrders[0]._id.slice(-6)}` : `${newOrders.length} novos pedidos recebidos!`);
                    newOrders.forEach(order => lastHeardOrderIdsRef.current.add(order._id));
                    if (userInteractedRef.current) await playNotificationSound();
                }
            }
            knownOrderIdsRef.current = new Set(allFetchedPedidos.map(order => order._id));
            setPedidoSelecionado(previous => previous ? allFetchedPedidos.find(order => order._id === previous._id) || null : null);
        } catch (err) {
            setLoadError('Não foi possível atualizar os pedidos. Os dados exibidos podem estar desatualizados.');
            console.error('Erro ao buscar pedidos:', err);
        } finally {
            if (!isPolling) setLoading(false);
            setRefreshing(false);
        }
    }, [playNotificationSound]);

    useEffect(() => {
        fetchPedidos(false);
        /* Polling mais frequente: SSE em serverless pode não propagar entre instâncias */
        const interval = setInterval(() => fetchPedidos(true), 45000);
        return () => clearInterval(interval);
    }, [fetchPedidos]);

    // Assinatura SSE para novos pedidos em tempo real
    useEffect(() => {
        if (sseRef.current) return;
        const clientId = `admin-${Math.random().toString(36).slice(2)}`;
        const es = new EventSource(`/api/ws?clientId=${clientId}`);
        sseRef.current = es;
        es.onmessage = async (ev) => {
            try {
                const payload = JSON.parse(ev.data);
                if (payload?.type === 'novo-pedido' && payload.pedidoId) {
                    const res = await fetch(`/api/pedidos?id=${payload.pedidoId}&ts=${Date.now()}`, { cache: 'no-store' });
                    const single = await res.json();
                    if (single?.success && single.data) {
                        const pedidoNovo: Pedido = single.data;
                        knownOrderIdsRef.current.add(pedidoNovo._id);
                        setPedidos(prev => [pedidoNovo, ...prev.filter(p => p._id !== pedidoNovo._id)]);
                        if (userInteractedRef.current && !lastHeardOrderIdsRef.current.has(pedidoNovo._id)) {
                            await playNotificationSound();
                            lastHeardOrderIdsRef.current.add(pedidoNovo._id);
                        }
                        setNewOrderNotification(`Novo pedido recebido! #${String(pedidoNovo._id).slice(-6)}`);
                    }
                }
                if (payload?.type === 'comprovante-enviado' && payload.pedidoId) {
                    // Atualizar pedido quando comprovante é enviado
                    const res = await fetch(`/api/pedidos?id=${payload.pedidoId}&ts=${Date.now()}`, { cache: 'no-store' });
                    const single = await res.json();
                    if (single?.success && single.data) {
                        const pedidoAtualizado: Pedido = single.data;
                        setPedidos(prev => prev.map(p => p._id === pedidoAtualizado._id ? pedidoAtualizado : p));
                        setPedidoSelecionado(previous => previous?._id === pedidoAtualizado._id ? pedidoAtualizado : previous);
                        setNewOrderNotification(`Comprovante recebido para pedido #${String(pedidoAtualizado._id).slice(-6)}`);
                        if (userInteractedRef.current) {
                            await playNotificationSound();
                        }
                    }
                }
                if (payload?.type === 'pedido-atualizado' || payload?.type === 'status-atualizado') await fetchPedidos(true);
            } catch (e) { console.warn('Falha ao processar evento SSE', e); }
        };
        // EventSource reconnects automatically; polling continues if serverless instances do not share events.
        es.onerror = () => { fetchPedidos(true); };
        return () => { es.close(); sseRef.current = null; };
    }, [fetchPedidos, playNotificationSound]);

    // Loop de som enquanto a notificação de NOVO PEDIDO estiver aberta
    useEffect(() => {
        if (newOrderNotification && soundEnabled) {
            soundLoopCountRef.current = 0;
            if (soundLoopRef.current === null) {
                soundLoopRef.current = window.setInterval(async () => {
                    if (!newOrderNotification || soundLoopCountRef.current >= 6) {
                        if (soundLoopRef.current) clearInterval(soundLoopRef.current);
                        soundLoopRef.current = null;
                        return;
                    }
                    soundLoopCountRef.current += 1;
                    await playNotificationSound();
                }, 8000);
            }
        } else if (soundLoopRef.current) {
            clearInterval(soundLoopRef.current);
            soundLoopRef.current = null;
        }
        return () => { if (soundLoopRef.current) clearInterval(soundLoopRef.current); soundLoopRef.current = null; };
    }, [newOrderNotification, soundEnabled, playNotificationSound]);

    const handleRemoverPedido = async (id: string) => {
        if (!await confirm({ title: 'Remover pedido?', message: 'Este pedido será removido do sistema. Deseja continuar?', confirmLabel: 'Remover pedido', destructive: true })) return;
        try {
            setLoading(true);
            const res = await fetch(`/api/pedidos?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setPedidos((prev) => prev.filter((p) => p._id !== id));
                setMensagem('Pedido removido com sucesso!');
            } else {
                setMensagem(data.message || 'Erro ao remover pedido.');
            }
        } catch (err) {
            setMensagem('Erro ao remover pedido. Tente novamente.');
        } finally {
            setLoading(false);
            setTimeout(() => setMensagem(null), 3000);
        }
    };

    const handleCompartilharPedido = (pedido: Pedido) => {
        const endereco = pedido.endereco;
        const enderecoFormatado = pedido.tipoEntrega === 'local'
            ? `Mesa: ${pedido.mesa || '-'}`
            : pedido.tipoEntrega === 'retirada' || !endereco?.address
                ? 'Retirada no local'
                : `${endereco.address.street}, ${endereco.address.number}${endereco.address.complement ? ` - ${endereco.address.complement}` : ''}\nBairro: ${endereco.address.neighborhood}\nPonto de Referência: ${endereco.address.referencePoint || 'Nenhum'}`;
        const formaPagamento = pedido.formaPagamento === 'pix' ? 'PIX' : pedido.formaPagamento === 'cartao' ? 'Cartão' : 'Dinheiro';
        const troco = pedido.formaPagamento === 'dinheiro' && pedido.troco ? `\nTroco para: R$ ${pedido.troco}` : '';
        const taxaEntregaValor = calcularTaxaEntrega(pedido);
        const taxaEntrega = taxaEntregaValor > 0 ? `\nTaxa de Entrega: R$ ${taxaEntregaValor.toFixed(2)}` : '';
        const itensFormatados = pedido.itens.map(item => `*${item.quantidade}x ${item.nome}*${item.size ? ` (${item.size})` : ''}${item.border ? `\n  - Borda: ${item.border}` : ''}${item.extras && item.extras.length > 0 ? `\n  - Extras: ${item.extras.join(', ')}` : ''}${item.observacao ? `\n  - _Obs: ${item.observacao}_` : ''}\n  - R$ ${(item.preco * item.quantidade).toFixed(2)}`).join('\n\n');
        const subtotal = calcularSubtotal(pedido);
        const total = calcularTotal(pedido);
        const mensagem = `*Do'Cheff - Pedido #${pedido._id.slice(-6)}*\n\n` +
            `*Data:* ${formatDate(pedido.data)}\n` +
            `*Status:* ${getStatusText(pedido.status)}\n\n` +
            `*Cliente:*\nNome: ${pedido.cliente.nome}\nTelefone: ${pedido.cliente.telefone}\n\n` +
            `*Endereço de Entrega:*\n${enderecoFormatado}\n\n` +
            `*Itens do Pedido:*\n${itensFormatados}\n\n` +
            `*Resumo Financeiro:*\nSubtotal: R$ ${subtotal.toFixed(2)}${taxaEntrega}\n*Total: R$ ${total.toFixed(2)}*\n\n` +
            `*Forma de Pagamento:* ${formaPagamento}${troco}${pedido.formaPagamento === 'pix' ? `\n*Chave PIX:* ${pixKey}` : ''}\n\n` +
            `*Observações Gerais:*\n${pedido.observacoes || 'Nenhuma'}`;
        if (navigator.share) {
            navigator.share({ title: `Pedido Do'Cheff #${pedido._id.slice(-6)}`, text: mensagem }).catch(err => console.error('Erro ao compartilhar:', err));
        } else {
            navigator.clipboard.writeText(mensagem).then(() => {
                setMensagem('Pedido copiado para a área de transferência!');
                setTimeout(() => setMensagem(null), 3000);
            });
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: PedidoStatus) => {
        const current = pedidos.find(order => order._id === orderId);
        if (!current || updatingStatus) return;
        try {
            setUpdatingStatus(orderId);
            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, expectedStatus: current.status }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 409) await fetchPedidos(true);
                throw new Error(data.message || data.error || 'Erro ao atualizar status do pedido');
            }
            if (data.success) {
                setPedidos(prev => prev.map(order => order._id === orderId ? { ...order, status: newStatus } : order));
                setPedidoSelecionado(previous => previous?._id === orderId ? { ...previous, status: newStatus } : previous);
                setStatusUpdateToast(`Pedido #${orderId.slice(-6)}: ${getStatusText(newStatus)}`);
            } else {
                throw new Error(data.message || 'Erro ao atualizar status do pedido');
            }
        } catch (err) {
            console.error('Erro ao atualizar status:', err);
            setStatusUpdateToast(err instanceof Error ? err.message : 'Erro ao atualizar status.');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const getStatusColor = (status: PedidoStatus) => ({
        pendente: 'bg-yellow-100 text-yellow-800',
        preparando: 'bg-blue-100 text-blue-800',
        pronto: 'bg-green-100 text-green-800',
        em_entrega: 'bg-purple-100 text-purple-800',
        entregue: 'bg-green-100 text-green-800',
        cancelado: 'bg-red-100 text-red-800'
    }[status]);

    const getStatusText = (status: PedidoStatus) => ({
        pendente: 'Pendente',
        preparando: 'Preparando',
        pronto: 'Pronto',
        em_entrega: 'Em Entrega',
        entregue: 'Entregue',
        cancelado: 'Cancelado'
    }[status]);

    const formatDate = (dateString: string) => new Date(dateString).toLocaleString('pt-BR', { timeZone: FINANCE_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const calcularSubtotal = (pedido: Pedido) =>
        pedido.itens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

    const calcularTaxaEntrega = (pedido: Pedido) =>
        pedido.tipoEntrega === 'entrega' ? (pedido.endereco?.deliveryFee ?? 0) : 0;

    const calcularTotal = financialOrderTotal;
    const filteredPedidos = filterOperationOrders(pedidos, { search: searchFilter, status: statusFilter, channel: channelFilter, period: dateFilter }, new Date(now));
    const visibleStatuses = ORDER_STATUSES.filter(status => statusFilter
        ? status === statusFilter
        : (dateFilter === 'active' && status !== 'entregue' && status !== 'cancelado') || filteredPedidos.some(order => order.status === status));
    const pendingCount = pedidos.filter(order => order.status === 'pendente').length;
    const activeCount = pedidos.filter(isActiveOrder).length;
    const pageCount = Math.max(1, Math.ceil(filteredPedidos.length / ORDERS_PER_PAGE));
    const currentPage = Math.min(listPage, pageCount);
    const firstListIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    const listOrders = [...filteredPedidos]
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(firstListIndex, firstListIndex + ORDERS_PER_PAGE);
    const hasFilters = searchFilter || statusFilter || channelFilter || dateFilter !== 'active';

    const changeDateFilter = (period: DateFilter) => {
        setDateFilter(period);
        setListPage(1);
        if (period === 'active' && (statusFilter === 'entregue' || statusFilter === 'cancelado')) setStatusFilter('');
    };

    const clearFilters = () => {
        setSearchFilter('');
        setStatusFilter('');
        setChannelFilter('');
        setDateFilter('active');
        setListPage(1);
    };

    const changeListPage = (page: number) => {
        setListPage(page);
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const cancelOrder = async (order: Pedido) => {
        if (!await confirm({ title: 'Cancelar pedido?', message: `O pedido #${order._id.slice(-6)} ficará marcado como cancelado e continuará no histórico.`, confirmLabel: 'Cancelar pedido', destructive: true })) return;
        await updateOrderStatus(order._id, 'cancelado');
    };

    const renderOrderCard = (pedido: Pedido) => (
        <article className="ops-order-card" data-status={pedido.status}>
            <div className="ops-order-card-top"><strong>#{pedido._id.slice(-6)}</strong><span className="ops-channel">{ORDER_CHANNEL_LABELS[pedido.tipoEntrega] || 'Pedido'}{pedido.tipoEntrega === 'local' && pedido.mesa ? ` · ${pedido.mesa}` : ''}</span></div>
            <div className="orders-card-customer">
                <h3>{pedido.cliente?.nome || 'Cliente não informado'}</h3>
                <p className="ops-order-phone">{pedido.cliente?.telefone || (pedido.tipoEntrega === 'local' ? 'Atendimento presencial' : 'Telefone não informado')}</p>
            </div>
            <div className="ops-order-items">{pedido.itens.slice(0, 2).map((item, index) => <p key={index}>{item.quantidade}× {item.nome}{item.size ? ` (${item.size})` : ''}</p>)}{pedido.itens.length > 2 && <p className="ops-muted">+ {pedido.itens.length - 2} {pedido.itens.length - 2 === 1 ? 'item' : 'itens'}</p>}{pedido.itens.length === 0 && <p className="ops-muted">Sem itens lançados</p>}</div>
            <div className="ops-order-totals"><strong>{calcularTotal(pedido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><span className={`ops-status-badge ${getStatusColor(pedido.status)}`}>{getStatusText(pedido.status)}</span></div>
            <p className="ops-order-time" title={formatDate(pedido.data)}><FaClock aria-hidden="true" /> {isActiveOrder(pedido) ? orderElapsedLabel(pedido.data, now) : formatDate(pedido.data)}</p>
            <div className="ops-order-actions">
                {nextOrderStatus(pedido) && (pedido.tipoEntrega === 'entrega' && pedido.status === 'pronto' && !pedido.deliveryAssignment
                    ? <button type="button" className="form-button-primary ops-next-button" onClick={() => onOpenDeliveries(pedido._id)}>Atribuir entregador</button>
                    : <button type="button" disabled={!!updatingStatus} className="form-button-primary ops-next-button" onClick={() => updateOrderStatus(pedido._id, nextOrderStatus(pedido)!)}>{updatingStatus === pedido._id ? 'Salvando…' : nextOrderAction(pedido)}</button>)}
                <button type="button" className="form-button-secondary" onClick={() => setPedidoSelecionado(pedido)}>Detalhes</button>
                <button type="button" className="form-button-secondary ops-share-button" aria-label={`Compartilhar pedido ${pedido._id.slice(-6)}`} onClick={() => handleCompartilharPedido(pedido)}><FaShareAlt aria-hidden="true" /></button>
            </div>
            {pedido.tipoEntrega === 'local' && pedido.status === 'pronto' && <p className="ops-local-note">Finalize o pagamento e feche a conta em Mesas.</p>}
        </article>
    );


    if (loading) return (
        <div role="status" className="flex items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-red-500" />
            <span className="text-gray-400">Carregando pedidos...</span>
        </div>
    );

    return (
        <div className="admin-page orders-page">
      {confirmationDialog}
            <PageHeading title="Central de pedidos" description="Acompanhe a fila, confira os detalhes e avance cada pedido.">
                <button type="button" className="form-button-secondary" onClick={() => onOpenDeliveries()}><FaMotorcycle aria-hidden="true" /> Entregas</button>
                <details className="orders-sound-menu">
                    <summary className="form-button-secondary">{soundEnabled ? <FaVolumeUp aria-hidden="true" /> : <FaVolumeMute aria-hidden="true" />} Alertas</summary>
                    <div className="orders-sound-panel">
                        <strong>Alertas de novos pedidos</strong>
                        <button type="button" className="admin-pill-button" aria-pressed={soundEnabled} onClick={() => { const next = !soundEnabled; setSoundEnabled(next); localStorage.setItem('ordersSoundEnabled', String(next)); }}>
                            {soundEnabled ? <FaVolumeUp aria-hidden="true" /> : <FaVolumeMute aria-hidden="true" />} Som {soundEnabled ? 'ativado' : 'desativado'}
                        </button>
                        <button type="button" onClick={playNotificationSound} className="form-button-secondary">Testar som</button>
                        {!audioReady && <p>Clique em testar som para liberar o áudio neste navegador.</p>}
                    </div>
                </details>
                <button type="button" className="form-button-secondary" disabled={refreshing} onClick={() => fetchPedidos(true)}><FaSyncAlt className={refreshing ? 'animate-spin' : ''} aria-hidden="true" /> {refreshing ? 'Atualizando…' : 'Atualizar'}</button>
            </PageHeading>
            <div className="ops-summary-strip orders-summary">
                <span><strong>{activeCount}</strong> em andamento</span>
                <span><strong>{pendingCount}</strong> aguardando preparo</span>
                <span className="ops-updated">{lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR', { timeZone: FINANCE_TIME_ZONE, hour: '2-digit', minute: '2-digit' })}` : 'Aguardando atualização'}</span>
            </div>
            {loadError && <div role="alert" className="admin-toolbar mb-4 text-red-300 text-sm flex flex-wrap gap-3 items-center justify-between"><p>{loadError}</p><button type="button" className="form-button-secondary" onClick={() => fetchPedidos(false)}>Tentar novamente</button></div>}
            <AnimatePresence>
                {newOrderNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-full z-50 sm:max-w-md"
                        role="status"
                        aria-live="polite"
                    >
                        <div className="notification-card">
                            <span className="notification-glow" />
                            <div className="notification-content">
                                <div className="notification-icon"><span role="img" aria-label="Sino">🔔</span></div>
                                <div className="flex-1">
                                    <h4 className="notification-title">Novo Pedido Recebido!</h4>
                                    <p className="notification-message">{newOrderNotification}</p>
                                </div>
                                <button onClick={() => setNewOrderNotification(null)} className="notification-close-btn" aria-label="Fechar notificação">&times;</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {statusUpdateToast && (
                    <StatusUpdateToast message={statusUpdateToast} onDone={() => setStatusUpdateToast(null)} />
                )}
            </AnimatePresence>
            <audio ref={audioRef} src="/sound/bell-notification-337658.mp3" preload="auto" className="hidden" />
            <section className="orders-workspace" aria-label="Organização dos pedidos">
                <div className="orders-workspace-header">
                    <div className="orders-periods" role="group" aria-label="Período dos pedidos">
                        <button type="button" aria-pressed={dateFilter === 'active'} onClick={() => changeDateFilter('active')}>Em andamento</button>
                        <button type="button" aria-pressed={dateFilter === 'today'} onClick={() => changeDateFilter('today')}>Hoje</button>
                        <button type="button" aria-pressed={dateFilter === 'all'} onClick={() => changeDateFilter('all')}>Histórico</button>
                    </div>
                    <div className="ops-view-switch" role="group" aria-label="Visualização dos pedidos">
                        <button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')}><FaColumns aria-hidden="true" /> Quadro</button>
                        <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><FaList aria-hidden="true" /> Lista</button>
                    </div>
                </div>
                <fieldset className="orders-filters" aria-label="Filtros de pedidos">
                    <div className="orders-search">
                        <label htmlFor="order-search">Buscar pedido</label>
                        <div><FaSearch aria-hidden="true" /><input id="order-search" type="search" value={searchFilter} onChange={event => { setSearchFilter(event.target.value); setListPage(1); }} placeholder="Nome, telefone, número ou mesa" className="form-input" /></div>
                    </div>
                    <div><label htmlFor="order-channel">Canal de atendimento</label><select id="order-channel" className="form-input" value={channelFilter} onChange={event => { setChannelFilter(event.target.value); setListPage(1); }}><option value="">Todos os canais</option><option value="entrega">Delivery</option><option value="retirada">Retirada</option><option value="local">Mesas</option></select></div>
                    <div><label htmlFor="order-status">Status do pedido</label><select id="order-status" value={statusFilter} onChange={event => { const status = event.target.value; setStatusFilter(status); setListPage(1); if (dateFilter === 'active' && (status === 'entregue' || status === 'cancelado')) setDateFilter('all'); }} className="form-input"><option value="">Todos os status</option>{ORDER_STATUSES.map(status => <option key={status} value={status}>{getStatusText(status)}</option>)}</select></div>
                </fieldset>
                <div className="orders-filter-footer">
                    <p>{dateFilter === 'active' ? 'Inclui pedidos em aberto de dias anteriores.' : dateFilter === 'today' ? 'Pedidos de hoje, no horário de Brasília.' : 'Todos os pedidos, inclusive concluídos e cancelados.'}</p>
                    {hasFilters && <button type="button" className="ops-clear" onClick={clearFilters}>Limpar filtros</button>}
                </div>
            </section>
            <div ref={resultsRef} className="ops-results-toolbar orders-results">
                <p role="status"><strong>{filteredPedidos.length}</strong> {filteredPedidos.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}</p>
                {filteredPedidos.length > 0 && <p><FaClock aria-hidden="true" /> {view === 'board' ? 'Mais antigos primeiro em cada etapa' : 'Mais recentes primeiro'}</p>}
            </div>
            {filteredPedidos.length === 0 ? <EmptyState>Nenhum pedido encontrado para os filtros selecionados.{hasFilters && <span className="orders-empty-actions"><button type="button" className="form-button-secondary" onClick={clearFilters}>Limpar filtros</button></span>}</EmptyState> : view === 'board' ? (
                <div className={`ops-board${visibleStatuses.length === 1 ? ' orders-board-single' : ''}`} role="region" tabIndex={0} aria-label="Pedidos organizados por status" style={{ '--orders-column-count': visibleStatuses.length } as React.CSSProperties}>
                    {visibleStatuses.map(status => {
                        const orders = filteredPedidos.filter(order => order.status === status).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
                        return (
                            <section className="ops-column" data-status={status} key={status} aria-labelledby={`ops-column-${status}`}>
                                <header className="ops-column-heading"><h2 id={`ops-column-${status}`}>{ORDER_STATUS_LABELS[status]}</h2><span>{orders.length}</span></header>
                                {orders.length ? <ul className="ops-card-stack" tabIndex={0} aria-label={`Fila: ${ORDER_STATUS_LABELS[status]}`}>{orders.map(order => <li key={order._id}>{renderOrderCard(order)}</li>)}</ul> : <p className="ops-column-empty">Nenhum pedido nesta etapa.</p>}
                            </section>
                        );
                    })}
                </div>
            ) : (
                <>
                    <ul className="ops-order-list">{listOrders.map(order => <li key={order._id}>{renderOrderCard(order)}</li>)}</ul>
                    {pageCount > 1 && <nav className="orders-pagination" aria-label="Paginação dos pedidos">
                        <p>Exibindo {firstListIndex + 1}–{Math.min(firstListIndex + ORDERS_PER_PAGE, filteredPedidos.length)} de {filteredPedidos.length} pedidos</p>
                        <div>
                            <button type="button" className="form-button-secondary" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => changeListPage(currentPage - 1)}><FaChevronLeft aria-hidden="true" /></button>
                            <span role="status">Página {currentPage} de {pageCount}</span>
                            <button type="button" className="form-button-secondary" aria-label="Próxima página" disabled={currentPage === pageCount} onClick={() => changeListPage(currentPage + 1)}><FaChevronRight aria-hidden="true" /></button>
                        </div>
                    </nav>}
                </>
            )}
            {mensagem && (
                <div role="status" className="admin-notice">{mensagem}</div>
            )}
            {pedidoSelecionado && (
                <>
                <AdminDialog
                    id="order-modal-title"
                    title={`Pedido #${pedidoSelecionado._id?.slice(-6) || '-'}`}
                    description="Confira os itens, a entrega e o pagamento."
                    icon={<FaClipboardList />}
                    onClose={() => setPedidoSelecionado(null)}
                    size="wide"
                    className="print-pedido"
                    footer={<>
                            <button className="flex-1 form-button-secondary" onClick={() => window.open(`/admin/print/${pedidoSelecionado._id}`, '_blank')}>Imprimir</button>
                            {pedidoSelecionado.tipoEntrega === 'entrega' && pedidoSelecionado.status === 'pronto' && !pedidoSelecionado.deliveryAssignment ? (
                                <button type="button" className="flex-1 form-button-primary" onClick={() => onOpenDeliveries(pedidoSelecionado._id)}>Atribuir entregador</button>
                            ) : nextOrderStatus(pedidoSelecionado) && (
                                <button disabled={!!updatingStatus} className="flex-1 form-button-primary" onClick={() => updateOrderStatus(pedidoSelecionado._id, nextOrderStatus(pedidoSelecionado)!)}>{updatingStatus === pedidoSelecionado._id ? 'Salvando…' : nextOrderAction(pedidoSelecionado)}</button>
                            )}
                    </>}
                >
                        <div className="admin-order-summary">
                            <div><span className="text-gray-400">Pedido:</span> <span className="text-white font-semibold">#{pedidoSelecionado._id?.slice(-6) || '-'}</span></div>
                            <div><span className="text-gray-400">Data:</span> <span className="text-white">{formatDate(pedidoSelecionado.data)}</span></div>
                            <div className="col-span-2"><span className="text-gray-400">Status:</span> <span className={`font-semibold px-2 py-1 rounded-md text-xs ${getStatusColor(pedidoSelecionado.status)}`}>{getStatusText(pedidoSelecionado.status)}</span></div>
                        </div>
                        {pedidoSelecionado.tipoEntrega === 'local' && pedidoSelecionado.status === 'pronto' && <p className="ops-local-note mb-4">Finalize o pagamento e feche esta conta na aba Mesas.</p>}
                        {pedidoSelecionado.observacoes && <div className="ops-kitchen-observation mb-4"><strong>Observações do pedido</strong><p>{pedidoSelecionado.observacoes}</p></div>}
                        <div className="admin-detail-grid">
                            <div className="admin-dialog-section">
                                <h4 className="font-semibold text-gray-300 mb-2">Cliente</h4>
                                <p><span className="text-gray-400">Nome:</span> <span className="text-white">{pedidoSelecionado.cliente?.nome || '-'}</span></p>
                                <p><span className="text-gray-400">Telefone:</span> <span className="text-white">{pedidoSelecionado.cliente?.telefone || '-'}</span></p>
                            </div>
                            <div className="admin-dialog-section">
                                <h4 className="font-semibold text-gray-300 mb-2">Entrega</h4>
                                {pedidoSelecionado.tipoEntrega === 'local' ? (
                                    <p className="text-white">Mesa: {pedidoSelecionado.mesa || '-'}</p>
                                ) : pedidoSelecionado.tipoEntrega === 'retirada' ? (
                                    <p className="text-white">Retirada no Local</p>
                                ) : (
                                    <>
                                        <p><span className="text-gray-400">Endereço:</span> <span className="text-white break-words">{pedidoSelecionado.endereco?.address?.street || '-'}, {pedidoSelecionado.endereco?.address?.number || '-'}</span></p>
                                        {pedidoSelecionado.endereco?.address?.complement && <p><span className="text-gray-400">Compl:</span> <span className="text-white">{pedidoSelecionado.endereco.address.complement}</span></p>}
                                        <p><span className="text-gray-400">Bairro:</span> <span className="text-white">{pedidoSelecionado.endereco?.address?.neighborhood || '-'}</span></p>
                                        <p><span className="text-gray-400">Referência:</span> <span className="text-white break-words">{pedidoSelecionado.endereco?.address?.referencePoint || '-'}</span></p>
                                    </>
                                )}
                            </div>
                            <div className="admin-dialog-section">
                                <h4 className="font-semibold text-gray-300 mb-2">Itens</h4>
                                <ul className="divide-y divide-gray-800">
                                    {pedidoSelecionado.itens.map((item, idx) => (
                                        <li key={idx} className="flex justify-between py-1 text-gray-200">
                                            <span className="flex-1 min-w-0 pr-2 break-words">{item.quantidade}x {item.nome}{item.size && ` (${item.size})`}{item.border && <span className="block text-xs text-gray-400 pl-2">- Borda: {item.border}</span>}{item.extras && item.extras.length > 0 && <span className="block text-xs text-gray-400 pl-2">- Extras: {item.extras.join(', ')}</span>}{item.observacao && <span className="block text-xs text-gray-400 pl-2">- Obs: {item.observacao}</span>}</span>
                                            <span className="font-medium shrink-0">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/* ========== INÍCIO DA ALTERAÇÃO ========== */}
                            <div className="admin-dialog-section">
                                <h4 className="font-semibold text-gray-300 mb-2">Pagamento e Totais</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between"><span className="text-gray-400">Forma:</span> <span className="text-white font-medium">{pedidoSelecionado.formaPagamento}</span></div>
                                    {pedidoSelecionado.formaPagamento === 'dinheiro' && <div className="flex justify-between"><span className="text-gray-400">Troco para:</span> <span className="text-white">R$ {pedidoSelecionado.troco || '-'}</span></div>}
                                    {pedidoSelecionado.formaPagamento?.toLowerCase() === 'pix' && (
                                        <div className="mt-2 pt-2 border-t border-gray-600">
                                            <div className="text-gray-400 text-sm mb-2">Comprovante de Pagamento:</div>
                                            {pedidoSelecionado.comprovante ? (
                                                <div className="space-y-2">
                                                    <div className="text-green-400 font-semibold text-sm">✓ Comprovante recebido</div>
                                                    <a
                                                        href={pedidoSelecionado.comprovante.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block text-blue-400 hover:text-blue-300 underline text-sm"
                                                    >
                                                        Ver comprovante
                                                    </a>
                                                    <p className="text-gray-500 text-xs">
                                                        Enviado em: {new Date(pedidoSelecionado.comprovante.uploadedAt).toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="text-yellow-400 text-sm">⏳ Aguardando comprovante</div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-2 border-t border-gray-700 mt-2">
                                        <span className="text-gray-400">Subtotal dos itens:</span>
                                        <span>R$ {calcularSubtotal(pedidoSelecionado).toFixed(2)}</span>
                                    </div>

                                    {pedidoSelecionado.tipoEntrega === 'entrega' && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Taxa de Entrega:</span>
                                            <span>R$ {calcularTaxaEntrega(pedidoSelecionado).toFixed(2)}</span>
                                        </div>
                                    )}

                                    {pedidoSelecionado.tipoEntrega === 'retirada' && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Taxa de Entrega:</span>
                                            <span className="text-green-400 text-xs font-medium">Grátis (retirada)</span>
                                        </div>
                                    )}

                                    {pedidoSelecionado.tipoEntrega === 'local' && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Taxa de Entrega:</span>
                                            <span className="text-green-400 text-xs font-medium">Consumo no Local</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between font-bold text-red-500 text-lg pt-2 border-t border-gray-700 mt-2">
                                        <span>Total:</span>
                                        <span>R$ {calcularTotal(pedidoSelecionado).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            {/* ========== FIM DA ALTERAÇÃO ========== */}
                        </div>
                        <div className="ops-detail-management"><p>Gerenciar este pedido</p><div>{isActiveOrder(pedidoSelecionado) && <button type="button" className="form-button-danger" disabled={!!updatingStatus} onClick={() => cancelOrder(pedidoSelecionado)}>Cancelar pedido</button>}<button type="button" className="form-button-secondary" onClick={() => handleCompartilharPedido(pedidoSelecionado)}>Compartilhar</button><button type="button" className="ops-delete" disabled={!!updatingStatus} onClick={() => handleRemoverPedido(pedidoSelecionado._id)}>Remover permanentemente</button></div></div>
                </AdminDialog>

                    <style jsx global>{`
                        @media print { body * { visibility: hidden !important; } .print-pedido, .print-pedido * { visibility: visible !important; } .print-pedido { display: block !important; max-height: none !important; overflow: visible !important; position: absolute !important; left: 0; top: 0; width: 80mm; min-width: 0; max-width: 100vw; background: white !important; color: #000 !important; font-size: 9px !important; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 2mm !important; } .print-pedido h3 { font-size: 11px !important; margin-bottom: 2mm !important; text-align: center !important; } .print-pedido h4 { font-size: 10px !important; margin-bottom: 1mm !important; } .print-pedido div, .print-pedido span { font-size: 9px !important; margin: 0 !important; padding: 0 !important; } .print-pedido button, .print-pedido .no-print { display: none !important; } .print-pedido .admin-dialog-body { overflow: visible !important; } .print-pedido ul { margin: 0 !important; padding: 0 !important; } .print-pedido li { margin-bottom: 1mm !important; } }
                    `}</style>
                </>
            )}
        </div>
    );
}
