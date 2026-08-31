'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { FaMoneyBillWave, FaCheckCircle, FaHourglassHalf } from 'react-icons/fa';
import { Pedido } from '../types/cart';

type PeriodFilter = 'today' | 'week' | 'month';
type PedidoStatus = Pedido['status'];

/* ─── StatCard (mesmo padrão visual de AdminSettings.tsx) ─── */
function StatCard({
    label, value, sub, color, icon,
}: { label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode }) {
    return (
        <div className="relative rounded-2xl border border-white/[0.08] bg-[#111] overflow-hidden p-5 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold mb-2">{label}</p>
                    <p className={`text-2xl font-bold truncate ${color ?? 'text-white'}`}>{value}</p>
                    {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
                </div>
                {icon && (
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-gray-600 shrink-0">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}

const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getStatusColor = (status: PedidoStatus) => ({
    pendente: 'bg-yellow-100 text-yellow-800',
    preparando: 'bg-blue-100 text-blue-800',
    pronto: 'bg-green-100 text-green-800',
    em_entrega: 'bg-purple-100 text-purple-800',
    entregue: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-800',
}[status]);

const getStatusText = (status: PedidoStatus) => ({
    pendente: 'Pendente',
    preparando: 'Preparando',
    pronto: 'Pronto',
    em_entrega: 'Em Entrega',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
}[status]);

const calcularSubtotal = (pedido: Pedido) =>
    pedido.itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

const calcularTaxaEntrega = (pedido: Pedido) =>
    pedido.tipoEntrega === 'entrega' ? (pedido.endereco?.deliveryFee ?? 0) : 0;

// Usa o total gravado se válido (> 0), senão reconstrói a partir dos itens + taxa
const calcularTotal = (pedido: Pedido) => {
    if (pedido.total != null && pedido.total > 0) return pedido.total;
    return calcularSubtotal(pedido) + calcularTaxaEntrega(pedido);
};

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminFinanceiro() {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<PeriodFilter>('today');
    const [finalizingId, setFinalizingId] = useState<string | null>(null);
    const [finalizingAll, setFinalizingAll] = useState(false);
    const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);

    useEffect(() => {
        async function fetchPedidos() {
            setLoading(true);
            try {
                const res = await fetch('/api/pedidos', { cache: 'no-store' });
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    setPedidos(data.data);
                } else {
                    setError('Não foi possível carregar os pedidos.');
                }
            } catch {
                setError('Não foi possível carregar os pedidos.');
            } finally {
                setLoading(false);
            }
        }
        fetchPedidos();
    }, []);

    const periodPedidos = useMemo(() => {
        const now = new Date();
        const todayString = getLocalDateString(now);

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

        return pedidos
            .filter((pedido) => {
                const orderDate = new Date(pedido.data);
                if (period === 'today') return getLocalDateString(orderDate) === todayString;
                if (period === 'week') return orderDate >= startOfWeek;
                return orderDate >= startOfMonth;
            })
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [pedidos, period]);

    const lucroTotal = periodPedidos
        .filter((p) => p.status === 'entregue')
        .reduce((sum, p) => sum + calcularTotal(p), 0);

    const pedidosPendentesNoPeriodo = periodPedidos.filter((p) => p.status !== 'entregue' && p.status !== 'cancelado');
    const pedidosConcluidos = periodPedidos.filter((p) => p.status === 'entregue').length;
    const pedidosPendentes = pedidosPendentesNoPeriodo.length;

    const periodLabel = { today: 'Hoje', week: 'Esta Semana', month: 'Este Mês' }[period];

    const handleFinalizarPedido = async (pedidoId: string) => {
        try {
            setFinalizingId(pedidoId);
            const res = await fetch(`/api/pedidos?id=${pedidoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'entregue' }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao finalizar pedido');
            setPedidos((prev) => prev.map((p) => (p._id === pedidoId ? { ...p, status: 'entregue' } : p)));
            setPedidoSelecionado((prev) => (prev && prev._id === pedidoId ? { ...prev, status: 'entregue' } : prev));
        } catch {
            setError('Erro ao finalizar pedido. Tente novamente.');
        } finally {
            setFinalizingId(null);
        }
    };

    const handleFinalizarTodos = async () => {
        const pendentes = pedidosPendentesNoPeriodo;
        if (pendentes.length === 0) return;
        const confirmado = window.confirm(
            `Finalizar ${pendentes.length} pedido(s) pendente(s) de "${periodLabel}"? Todos serão marcados como Entregue.`
        );
        if (!confirmado) return;

        setFinalizingAll(true);
        setError(null);
        const results = await Promise.allSettled(
            pendentes.map((p) =>
                fetch(`/api/pedidos?id=${p._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'entregue' }),
                }).then(async (res) => {
                    const data = await res.json();
                    if (!res.ok || !data.success) throw new Error();
                    return p._id;
                })
            )
        );
        const succeededIds = new Set(
            results
                .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
                .map((r) => r.value)
        );
        if (succeededIds.size > 0) {
            setPedidos((prev) => prev.map((p) => (succeededIds.has(p._id) ? { ...p, status: 'entregue' } : p)));
        }
        const failedCount = pendentes.length - succeededIds.size;
        if (failedCount > 0) {
            setError(`${failedCount} de ${pendentes.length} pedido(s) não puderam ser finalizados. Tente novamente.`);
        }
        setFinalizingAll(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-red-500" />
                <span className="text-gray-400">Carregando financeiro...</span>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Financeiro</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Acompanhe o faturamento e finalize pedidos por período</p>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-900/30 border border-red-800/50 text-red-300 rounded-lg text-sm">{error}</div>
            )}

            {/* Filtro de período */}
            <div className="flex bg-[#2a2a2a] rounded-lg p-1 border border-gray-700 max-w-md">
                {([
                    { id: 'today', label: 'Hoje' },
                    { id: 'week', label: 'Esta Semana' },
                    { id: 'month', label: 'Este Mês' },
                ] as { id: PeriodFilter; label: string }[]).map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPeriod(opt.id)}
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                            period === opt.id ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Finalizar todos os pendentes do período */}
            {pedidosPendentesNoPeriodo.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
                    <p className="text-sm text-gray-400">
                        <span className="text-white font-semibold">{pedidosPendentesNoPeriodo.length}</span> pedido(s) pendente(s) em &quot;{periodLabel}&quot;
                    </p>
                    <button
                        type="button"
                        className="form-button-primary text-sm shrink-0"
                        disabled={finalizingAll}
                        onClick={handleFinalizarTodos}
                    >
                        {finalizingAll ? 'Finalizando...' : `Finalizar Todos (${pedidosPendentesNoPeriodo.length})`}
                    </button>
                </div>
            )}

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    label="Lucro Total"
                    value={`R$ ${lucroTotal.toFixed(2)}`}
                    sub="pedidos concluídos no período"
                    color="text-green-400"
                    icon={<FaMoneyBillWave size={14} />}
                />
                <StatCard
                    label="Pedidos Concluídos"
                    value={pedidosConcluidos}
                    color="text-green-400"
                    icon={<FaCheckCircle size={14} />}
                />
                <StatCard
                    label="Pedidos Pendentes"
                    value={pedidosPendentes}
                    color={pedidosPendentes > 0 ? 'text-yellow-400' : 'text-gray-400'}
                    icon={<FaHourglassHalf size={13} />}
                />
            </div>

            {/* Lista de pedidos */}
            {periodPedidos.length === 0 ? (
                <div className="text-center text-gray-500 py-10">Nenhum pedido encontrado para este período.</div>
            ) : (
                <ul className="space-y-4">
                    {periodPedidos.map((pedido) => (
                        <li
                            key={pedido._id}
                            className="bubble-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            onMouseMove={(e) => {
                                const r = e.currentTarget.getBoundingClientRect();
                                e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                                e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
                            }}
                        >
                            <span className="bubble-glow" /><span className="bubble-press-overlay" /><span className="bubble-border-gradient" />
                            <div className="bubble-content flex-1">
                                <div className="font-semibold text-lg text-white">
                                    Pedido <span className="text-red-500">#{pedido._id.slice(-6)}</span>
                                </div>
                                <div className="text-sm text-gray-400 mb-1">{pedido.cliente?.nome || '-'}</div>
                                <div className="text-sm text-gray-400 mb-2">Data: {formatDate(pedido.data)}</div>
                                <div className="font-bold text-red-500">Total: R$ {calcularTotal(pedido).toFixed(2)}</div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(pedido.status)}`}>
                                        {getStatusText(pedido.status)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-row flex-wrap gap-2 mt-2 sm:mt-0 sm:ml-4 z-10 w-full sm:w-auto">
                                <button
                                    type="button"
                                    className="form-button-secondary"
                                    onClick={() => setPedidoSelecionado(pedido)}
                                >
                                    Ver Detalhes
                                </button>
                                {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
                                    <button
                                        type="button"
                                        className="form-button-primary"
                                        disabled={finalizingId === pedido._id || finalizingAll}
                                        onClick={() => handleFinalizarPedido(pedido._id)}
                                    >
                                        {finalizingId === pedido._id ? 'Finalizando...' : 'Finalizar Pedido'}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {pedidoSelecionado && (
                <div className="modal-overlay" onClick={() => setPedidoSelecionado(null)}>
                    <div className="modal-panel slim" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn focus-outline" onClick={() => setPedidoSelecionado(null)}>&times;</button>
                        <div className="text-center mb-4 border-b border-gray-800 pb-4">
                            <h3 className="text-2xl font-bold text-red-500">Do&apos;Cheff</h3>
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
                            <div className="bg-[#1F1F1F] p-3 rounded-lg border border-gray-800/50">
                                <h4 className="font-semibold text-gray-300 mb-2">Itens</h4>
                                <ul className="divide-y divide-gray-800">
                                    {pedidoSelecionado.itens.map((item, idx) => (
                                        <li key={idx} className="flex justify-between py-1 text-gray-200">
                                            <span className="flex-1 pr-2 break-words">
                                                {item.quantidade}x {item.nome}{item.size && ` (${item.size})`}
                                                {item.border && <span className="block text-xs text-gray-400 pl-2">- Borda: {item.border}</span>}
                                                {item.extras && item.extras.length > 0 && <span className="block text-xs text-gray-400 pl-2">- Extras: {item.extras.join(', ')}</span>}
                                                {item.observacao && <span className="block text-xs text-gray-400 pl-2">- Obs: {item.observacao}</span>}
                                            </span>
                                            <span className="font-medium">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-[#1F1F1F] p-3 rounded-lg border border-gray-800/50">
                                <h4 className="font-semibold text-gray-300 mb-2">Pagamento e Totais</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between"><span className="text-gray-400">Forma:</span> <span className="text-white font-medium">{pedidoSelecionado.formaPagamento}</span></div>
                                    {pedidoSelecionado.formaPagamento === 'dinheiro' && (
                                        <div className="flex justify-between"><span className="text-gray-400">Troco para:</span> <span className="text-white">R$ {pedidoSelecionado.troco || '-'}</span></div>
                                    )}
                                    {pedidoSelecionado.formaPagamento?.toLowerCase() === 'pix' && (
                                        <div className="mt-2 pt-2 border-t border-gray-600">
                                            <div className="text-gray-400 text-sm mb-2">Comprovante de Pagamento:</div>
                                            {pedidoSelecionado.comprovante ? (
                                                <div className="space-y-2">
                                                    <div className="text-green-400 font-semibold text-sm">✓ Comprovante recebido</div>
                                                    <a href={pedidoSelecionado.comprovante.url} target="_blank" rel="noopener noreferrer" className="block text-blue-400 hover:text-blue-300 underline text-sm">
                                                        Ver comprovante
                                                    </a>
                                                    <p className="text-gray-500 text-xs">Enviado em: {new Date(pedidoSelecionado.comprovante.uploadedAt).toLocaleString('pt-BR')}</p>
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
                                    {pedidoSelecionado.tipoEntrega === 'entrega' ? (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Taxa de Entrega:</span>
                                            <span>R$ {calcularTaxaEntrega(pedidoSelecionado).toFixed(2)}</span>
                                        </div>
                                    ) : pedidoSelecionado.tipoEntrega === 'local' ? (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Taxa de Entrega:</span>
                                            <span className="text-green-400 text-xs font-medium">Consumo no Local</span>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Taxa de Entrega:</span>
                                            <span className="text-green-400 text-xs font-medium">Grátis (retirada)</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-red-500 text-lg pt-2 border-t border-gray-700 mt-2">
                                        <span>Total:</span>
                                        <span>R$ {calcularTotal(pedidoSelecionado).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col sm:flex-row gap-2">
                            <button className="flex-1 form-button-secondary" onClick={() => window.open(`/admin/print/${pedidoSelecionado._id}`, '_blank')}>Imprimir</button>
                            {pedidoSelecionado.status !== 'entregue' && pedidoSelecionado.status !== 'cancelado' && (
                                <button
                                    className="flex-1 form-button-primary"
                                    disabled={finalizingId === pedidoSelecionado._id || finalizingAll}
                                    onClick={() => handleFinalizarPedido(pedidoSelecionado._id)}
                                >
                                    {finalizingId === pedidoSelecionado._id ? 'Finalizando...' : 'Finalizar Pedido'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
