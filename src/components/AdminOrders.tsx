'use client';
import React, { useEffect, useState, useRef } from 'react';
import { FaShareAlt } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Notification from './Notification';
import { Pedido } from '../types/cart';
import { motion, AnimatePresence } from 'framer-motion';

interface Endereco {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    zipCode: string;
    deliveryFee: number;
    estimatedTime: string;
}

interface PedidoItem {
    nome: string;
    quantidade: number;
    preco: number;
    observacao?: string;
    size?: string;
    border?: string;
    extras?: string[];
}

interface Cliente {
    nome: string;
    telefone: string;
}

type PedidoStatus = 'pendente' | 'preparando' | 'pronto' | 'em_entrega' | 'entregue' | 'cancelado';
type DateFilter = 'today' | 'all'; // Novo tipo para o filtro de data

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
            className="fixed bottom-4 right-4 z-50"
        >
            <div className="bg-blue-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 border border-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm font-medium">{message}</span>
            </div>
        </motion.div>
    );
};


export default function AdminOrders() {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [mensagemCompartilhamento, setMensagemCompartilhamento] = useState<string | null>(null);
    const [phoneFilter, setPhoneFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilter>('today'); // Novo estado para filtro de data
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [newOrderNotification, setNewOrderNotification] = useState<string | null>(null);
    const [statusUpdateToast, setStatusUpdateToast] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [audioReady, setAudioReady] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const firstLoadRef = useRef<boolean>(true);
    const userInteractedRef = useRef<boolean>(false);
    const lastHeardOrderIdsRef = useRef<Set<string>>(new Set());
    const sseRef = useRef<EventSource | null>(null);
    const soundLoopRef = useRef<number | null>(null);
    const soundLoopCountRef = useRef<number>(0);

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
    const playNotificationSound = async () => {
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
    };

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

    const fetchPedidos = async (isPolling = false) => {
        try {
            if (!isPolling) setLoading(true);
            const res = await fetch(`/api/pedidos?ts=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (!data.success || !Array.isArray(data.data)) {
                console.error('API de pedidos não retornou dados válidos.');
                return;
            }

            const allFetchedPedidos = data.data;

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
            }
        } catch (err) {
            console.error('Erro ao buscar pedidos:', err);
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        fetchPedidos(false);
        const interval = setInterval(() => fetchPedidos(true), 120000);
        return () => clearInterval(interval);
    }, []);

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
                        setNewOrderNotification(`Comprovante recebido para pedido #${String(pedidoAtualizado._id).slice(-6)}`);
                        if (userInteractedRef.current) {
                            await playNotificationSound();
                        }
                    }
                }
            } catch (e) { console.warn('Falha ao processar evento SSE', e); }
        };
        es.onerror = () => {
            es.close(); sseRef.current = null;
            setTimeout(() => { if (!sseRef.current) fetchPedidos(true); }, 5000);
        };
        return () => { es.close(); sseRef.current = null; };
    }, []);

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
        return () => { if (soundLoopRef.current) clearInterval(soundLoopRef.current); };
    }, [newOrderNotification, soundEnabled]);

    const handleRemoverPedido = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja remover este pedido?')) return;
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
        const enderecoFormatado = pedido.tipoEntrega === 'retirada' || !endereco?.address ? 'Retirada no local' : `${endereco.address.street}, ${endereco.address.number}${endereco.address.complement ? ` - ${endereco.address.complement}` : ''}\nBairro: ${endereco.address.neighborhood}\nPonto de Referência: ${endereco.address.referencePoint || 'Nenhum'}`;
        const formaPagamento = pedido.formaPagamento === 'pix' ? 'PIX' : pedido.formaPagamento === 'cartao' ? 'Cartão' : 'Dinheiro';
        const troco = pedido.formaPagamento === 'dinheiro' && pedido.troco ? `\nTroco para: R$ ${pedido.troco}` : '';
        const taxaEntrega = pedido.tipoEntrega === 'entrega' && endereco?.deliveryFee ? `\nTaxa de Entrega: R$ ${endereco.deliveryFee.toFixed(2)}` : '';
        const itensFormatados = pedido.itens.map(item => `*${item.quantidade}x ${item.nome}*${item.size ? ` (${item.size})` : ''}${item.border ? `\n  - Borda: ${item.border}` : ''}${item.extras && item.extras.length > 0 ? `\n  - Extras: ${item.extras.join(', ')}` : ''}${item.observacao ? `\n  - _Obs: ${item.observacao}_` : ''}\n  - R$ ${(item.preco * item.quantidade).toFixed(2)}`).join('\n\n');
        const subtotal = pedido.itens.reduce((total, item) => total + (item.preco * item.quantidade), 0);
        const total = subtotal + (endereco?.deliveryFee || 0);
        const mensagem = `*Do'Cheff - Pedido #${pedido._id.slice(-6)}*\n\n` +
            `*Data:* ${new Date(pedido.data).toLocaleString('pt-BR')}\n` +
            `*Status:* ${getStatusText(pedido.status)}\n\n` +
            `*Cliente:*\nNome: ${pedido.cliente.nome}\nTelefone: ${pedido.cliente.telefone}\n\n` +
            `*Endereço de Entrega:*\n${enderecoFormatado}\n\n` +
            `*Itens do Pedido:*\n${itensFormatados}\n\n` +
            `*Resumo Financeiro:*\nSubtotal: R$ ${subtotal.toFixed(2)}${taxaEntrega}\n*Total: R$ ${total.toFixed(2)}*\n\n` +
            `*Forma de Pagamento:* ${formaPagamento}${troco}\n\n` +
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
        try {
            setUpdatingStatus(orderId);
            const res = await fetch(`/api/pedidos?id=${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Erro ao atualizar status do pedido');
            if (data.success) {
                setPedidos(pedidos.map(order => order._id === orderId ? { ...order, status: newStatus } : order));
                setStatusUpdateToast(`Pedido #${orderId.slice(-6)}: ${getStatusText(newStatus)}`);
                const timestamp = new Date().toLocaleString('pt-BR');
                const message = `Status do seu pedido #${orderId.slice(-6)} foi atualizado para: ${getStatusText(newStatus)}`;
                await fetch('/api/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientId: pedidos.find(p => p._id === orderId)?.cliente.telefone,
                        orderId,
                        status: newStatus,
                        message,
                        timestamp
                    }),
                });
            } else {
                throw new Error(data.message || 'Erro ao atualizar status do pedido');
            }
        } catch (err) {
            console.error('Erro ao atualizar status:', err);
            setStatusUpdateToast('Erro ao atualizar status.');
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

    const getNextStatus = (currentStatus: PedidoStatus): PedidoStatus | null => {
        const flow: Record<PedidoStatus, PedidoStatus | null> = {
            pendente: 'preparando',
            preparando: 'pronto',
            pronto: 'em_entrega',
            em_entrega: 'entregue',
            entregue: null,
            cancelado: null,
        };
        return flow[currentStatus];
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const calcularTotal = (pedido: Pedido) => pedido.total || pedido.itens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const filteredPedidos = pedidos.filter(pedido => {
        const todayString = getLocalDateString(new Date());
        const orderDate = new Date(pedido.data);
        const orderDateString = getLocalDateString(orderDate);

        const matchesDate = dateFilter === 'all' || orderDateString === todayString;
        const matchesPhone = !phoneFilter || pedido.cliente?.telefone?.includes(phoneFilter);
        const matchesStatus = !statusFilter || pedido.status === statusFilter;

        return matchesDate && matchesPhone && matchesStatus;
    });


    if (loading) return <div>Carregando pedidos...</div>;

    return (
        <div className="p-2 sm:p-4 md:p-6">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Painel de Pedidos</h2>
            {mensagemCompartilhamento && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded text-center font-semibold">
                    {mensagemCompartilhamento}
                </div>
            )}
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
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <button
                    type="button"
                    onClick={() => { const next = !soundEnabled; setSoundEnabled(next); localStorage.setItem('ordersSoundEnabled', String(next)); }}
                    className={`px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${soundEnabled ? 'bg-green-700/40 border-green-600 text-green-300 hover:bg-green-700/60' : 'bg-gray-700/40 border-gray-600 text-gray-300 hover:bg-gray-700/60'}`}
                    aria-pressed={soundEnabled}
                >
                    Som: {soundEnabled ? 'Ativado' : 'Mutado'}
                </button>
                <button type="button" onClick={playNotificationSound} className="px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors bg-blue-700/40 border-blue-600 text-blue-200 hover:bg-blue-700/60">
                    Testar Som
                </button>
                {!audioReady && <span className="text-[11px] text-gray-400">Clique para liberar o áudio.</span>}
            </div>
            <audio ref={audioRef} src="/sound/bell-notification-337658.mp3" preload="auto" className="hidden" />
            <fieldset className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Filtros de pedidos">
                {/* Filtro de Período */}
                <div className="lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-200 mb-2">Mostrar Pedidos</label>
                    <div className="flex bg-[#2a2a2a] rounded-lg p-1 border border-gray-700">
                        <button
                            onClick={() => setDateFilter('today')}
                            className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-colors ${dateFilter === 'today' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                            De Hoje
                        </button>
                        <button
                            onClick={() => setDateFilter('all')}
                            className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-colors ${dateFilter === 'all' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                            Todos
                        </button>
                    </div>
                </div>

                {/* Filtros existentes */}
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2" htmlFor="filtro-telefone">Buscar por telefone</label>
                    <input id="filtro-telefone" type="tel" value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} placeholder="Digite o telefone" className="form-input" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2" htmlFor="filtro-status">Filtrar por status</label>
                    <div className="flex gap-2">
                        <select id="filtro-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input">
                            <option value="">Todos</option>
                            <option value="pendente">Pendente</option>
                            <option value="preparando">Preparando</option>
                            <option value="pronto">Pronto</option>
                            <option value="em_entrega">Em Entrega</option>
                            <option value="entregue">Entregue</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                        {(phoneFilter || statusFilter) && (
                            <button type="button" onClick={() => { setPhoneFilter(''); setStatusFilter(''); }} className="form-button-secondary text-xs">Limpar</button>
                        )}
                    </div>
                </div>
            </fieldset>

            {filteredPedidos.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                    Nenhum pedido encontrado para os filtros selecionados.
                </div>
            ) : (
                <ul className="space-y-4">
                    {filteredPedidos.map((pedido) => (
                        <li key={pedido._id} className="bubble-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`); }}>
                            <span className="bubble-glow" /><span className="bubble-press-overlay" /><span className="bubble-border-gradient" />
                            <div className="bubble-content flex-1">
                                <div className="font-semibold text-lg text-white">Pedido <span className="text-red-500">#{pedido._id.slice(-6)}</span></div>
                                <div className="text-sm text-gray-400 mb-2">Data: {formatDate(pedido.data)}</div>
                                <div className="font-bold text-red-500">Total: R$ {calcularTotal(pedido).toFixed(2)}</div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(pedido.status)}`}>{getStatusText(pedido.status)}</div>
                                    {getNextStatus(pedido.status) && (
                                        <button onClick={() => updateOrderStatus(pedido._id, getNextStatus(pedido.status)!)} disabled={updatingStatus === pedido._id} className="form-button-primary text-xs py-1 px-2">{updatingStatus === pedido._id ? '...' : 'Próximo'}</button>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-row flex-wrap gap-2 mt-2 sm:mt-0 sm:ml-4 sm:flex-col z-10 w-full sm:w-auto">
                                <button className="form-button-primary" onClick={() => setPedidoSelecionado(pedido)}>Ver Detalhes</button>
                                <button className="form-button-secondary" onClick={() => handleCompartilharPedido(pedido)}><FaShareAlt /></button>
                                <button className="form-button-danger" onClick={() => handleRemoverPedido(pedido._id)}>Remover</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {mensagem && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-center font-semibold">{mensagem}</div>
            )}
            {pedidoSelecionado && (
                <div className="modal-overlay" onClick={() => setPedidoSelecionado(null)}>
                    <div className="modal-panel slim print-pedido" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn no-print focus-outline" onClick={() => setPedidoSelecionado(null)}>&times;</button>
                        <div className="text-center mb-4 border-b border-gray-800 pb-4">
                            <h3 id="order-modal-title" className="text-2xl font-bold text-red-500">Do'Cheff</h3>
                            <p className="text-sm text-gray-400">Detalhes do Pedido</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                            <div><span className="text-gray-400">Pedido:</span> <span className="text-white font-semibold">#{pedidoSelecionado._id?.slice(-6) || '-'}</span></div>
                            <div><span className="text-gray-400">Data:</span> <span className="text-white">{formatDate(pedidoSelecionado.data)}</span></div>
                            <div className="col-span-2"><span className="text-gray-400">Status:</span> <span className={`font-semibold px-2 py-1 rounded-md text-xs ${getStatusColor(pedidoSelecionado.status)}`}>{getStatusText(pedidoSelecionado.status)}</span></div>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div className="bg-[#1F1F1F] p-3 rounded-lg border border-gray-800/50">
                                <h4 className="font-semibold text-gray-300 mb-2">Cliente</h4>
                                <p><span className="text-gray-400">Nome:</span> <span className="text-white">{pedidoSelecionado.cliente?.nome || '-'}</span></p>
                                <p><span className="text-gray-400">Telefone:</span> <span className="text-white">{pedidoSelecionado.cliente?.telefone || '-'}</span></p>
                            </div>
                            <div className="bg-[#1F1F1F] p-3 rounded-lg border border-gray-800/50">
                                <h4 className="font-semibold text-gray-300 mb-2">Entrega</h4>
                                {pedidoSelecionado.tipoEntrega === 'retirada' ? (
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
                            <div className="bg-[#1F1F1F] p-3 rounded-lg border border-gray-800/50">
                                <h4 className="font-semibold text-gray-300 mb-2">Itens</h4>
                                <ul className="divide-y divide-gray-800">
                                    {pedidoSelecionado.itens.map((item, idx) => (
                                        <li key={idx} className="flex justify-between py-1 text-gray-200">
                                            <span className="flex-1 pr-2 break-words">{item.quantidade}x {item.nome}{item.size && ` (${item.size})`}{item.border && <span className="block text-xs text-gray-400 pl-2">- Borda: {item.border}</span>}{item.extras && item.extras.length > 0 && <span className="block text-xs text-gray-400 pl-2">- Extras: {item.extras.join(', ')}</span>}{item.observacao && <span className="block text-xs text-gray-400 pl-2">- Obs: {item.observacao}</span>}</span>
                                            <span className="font-medium">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/* ========== INÍCIO DA ALTERAÇÃO ========== */}
                            <div className="bg-[#1F1F1F] p-3 rounded-lg border border-gray-800/50">
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
                                        <span className="text-gray-400">Subtotal:</span>
                                        <span>R$ {pedidoSelecionado.itens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0).toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Taxa de Entrega:</span>
                                        <span>R$ {pedidoSelecionado.endereco?.deliveryFee?.toFixed(2) || '0.00'}</span>
                                    </div>

                                    <div className="flex justify-between font-bold text-red-500 text-lg pt-2 border-t border-gray-700 mt-2">
                                        <span>Total:</span>
                                        <span>R$ {calcularTotal(pedidoSelecionado).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            {/* ========== FIM DA ALTERAÇÃO ========== */}
                        </div>
                        <div className="mt-6 flex flex-col sm:flex-row gap-2 no-print">
                            <button className="flex-1 form-button-secondary" onClick={() => window.open(`/admin/print/${pedidoSelecionado._id}`, '_blank')}>Imprimir</button>
                            {getNextStatus(pedidoSelecionado.status) && (
                                <button className="flex-1 form-button-primary" onClick={() => { updateOrderStatus(pedidoSelecionado._id, getNextStatus(pedidoSelecionado.status)!); setPedidoSelecionado(null); }}>Próximo Status</button>
                            )}
                        </div>
                    </div>
                    <style jsx global>{`
                        @media print { body * { visibility: hidden !important; } .print-pedido, .print-pedido * { visibility: visible !important; } .print-pedido { position: absolute !important; left: 0; top: 0; width: 80mm; min-width: 0; max-width: 100vw; background: white !important; color: #000 !important; font-size: 9px !important; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 2mm !important; } .print-pedido h3 { font-size: 11px !important; margin-bottom: 2mm !important; text-align: center !important; } .print-pedido h4 { font-size: 10px !important; margin-bottom: 1mm !important; } .print-pedido div, .print-pedido span { font-size: 9px !important; margin: 0 !important; padding: 0 !important; } .print-pedido button, .print-pedido .no-print { display: none !important; } .print-pedido ul { margin: 0 !important; padding: 0 !important; } .print-pedido li { margin-bottom: 1mm !important; } }
                    `}</style>
                </div>
            )}
        </div>
    );
}