'use client';
import { useAdminConfirm } from './admin/useAdminConfirm';
import React, { useEffect, useMemo, useState } from 'react';
import { FaMoneyBillWave, FaCheckCircle, FaHourglassHalf } from 'react-icons/fa';
import { Pedido } from '../types/cart';

import AdminDialog from './admin/AdminDialog';
import { PageHeading, StatCard, EmptyState } from './admin/AdminUI';
import FinancePeriodFilter from './admin/FinancePeriodFilter';
import { buildFinanceReport, financialOrderTotal as calcularTotal, financePeriodLabel, FINANCE_TIME_ZONE, type FinancePeriod } from '@/utils/financePeriod';
type PedidoStatus = Pedido['status'];

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

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: FINANCE_TIME_ZONE, hour: '2-digit', minute: '2-digit' });

export default function AdminFinanceiro() {
  const { confirm, confirmationDialog } = useAdminConfirm();
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<FinancePeriod>({ type: 'preset', preset: 'today' });
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

    const [success, setSuccess] = useState<string | null>(null);
    const report = useMemo(() => buildFinanceReport(pedidos, period), [pedidos, period]);
    const periodPedidos = report.orders;
    const faturamentoTotal = report.revenue;
    const pedidosConcluidos = report.completed;
    const pedidosPendentesNoPeriodo = report.pendingOrders;
    const pedidosPendentes = report.pendingOrders.length;

    const periodLabel = financePeriodLabel(period);

    const handleFinalizarPedido = async (pedidoId: string) => {
        try {
            setFinalizingId(pedidoId);
            setError(null); setSuccess(null);
            const res = await fetch(`/api/pedidos?id=${pedidoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'entregue' }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao finalizar pedido');
            setPedidos((prev) => prev.map((p) => (p._id === pedidoId ? { ...p, status: 'entregue' } : p)));
            setPedidoSelecionado((prev) => (prev && prev._id === pedidoId ? { ...prev, status: 'entregue' } : prev));
            setSuccess('Pedido finalizado com sucesso.');
        } catch {
            setError('Erro ao finalizar pedido. Tente novamente.');
        } finally {
            setFinalizingId(null);
        }
    };

    const handleFinalizarTodos = async () => {
        const pendentes = pedidosPendentesNoPeriodo;
        if (pendentes.length === 0) return;
        const confirmado = await confirm({
            title: 'Finalizar pedidos do período?',
            message: `Finalizar ${pendentes.length} pedido(s) pendente(s) de "${periodLabel}"? Todos serão marcados como Entregue.`,
            confirmLabel: 'Finalizar pedidos',
        });
        if (!confirmado) return;

        setFinalizingAll(true);
        setSuccess(null);
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
        if (succeededIds.size > 0) setSuccess(`${succeededIds.size} pedido(s) finalizado(s) com sucesso.`);
        setFinalizingAll(false);
    };

    if (loading) {
        return (
            <div role="status" className="flex items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-red-500" />
                <span className="text-gray-400">Carregando financeiro...</span>
            </div>
        );
    }

    return (
        <div className="admin-page space-y-6">
      {confirmationDialog}
            <PageHeading title="Financeiro" description="Consulte o faturamento e acompanhe os pedidos no período que você escolher." />

            {error && (
                <div role="alert" className="p-3 bg-red-900/30 border border-red-800/50 text-red-300 rounded-lg text-sm">{error}</div>
            )}

            {success && <p role="status" className="p-3 rounded-xl border border-green-800 text-green-300 bg-green-950/40 text-sm">{success}</p>}
            <FinancePeriodFilter value={period} onChange={next => { setPeriod(next); setSuccess(null); }} />

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
                    label="Faturamento concluído"
                    value={faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                <EmptyState>Nenhum pedido encontrado neste período. Escolha outras datas ou limpe os filtros.</EmptyState>
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
                <AdminDialog
                    id="finance-order-title"
                    title={`Pedido #${pedidoSelecionado._id?.slice(-6) || '-'}`}
                    description="Confira os itens, a entrega e o pagamento."
                    icon={<FaMoneyBillWave />}
                    onClose={() => setPedidoSelecionado(null)}
                    size="wide"
                    footer={<>
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
                    </>}
                >
                        <div className="admin-order-summary">
                            <div><span className="text-gray-400">Pedido:</span> <span className="text-white font-semibold">#{pedidoSelecionado._id?.slice(-6) || '-'}</span></div>
                            <div><span className="text-gray-400">Data:</span> <span className="text-white">{formatDate(pedidoSelecionado.data)}</span></div>
                            <div className="col-span-2"><span className="text-gray-400">Status:</span> <span className={`font-semibold px-2 py-1 rounded-md text-xs ${getStatusColor(pedidoSelecionado.status)}`}>{getStatusText(pedidoSelecionado.status)}</span></div>
                        </div>
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
                                            <span className="flex-1 min-w-0 pr-2 break-words">
                                                {item.quantidade}x {item.nome}{item.size && ` (${item.size})`}
                                                {item.border && <span className="block text-xs text-gray-400 pl-2">- Borda: {item.border}</span>}
                                                {item.extras && item.extras.length > 0 && <span className="block text-xs text-gray-400 pl-2">- Extras: {item.extras.join(', ')}</span>}
                                                {item.observacao && <span className="block text-xs text-gray-400 pl-2">- Obs: {item.observacao}</span>}
                                            </span>
                                            <span className="font-medium shrink-0">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="admin-dialog-section">
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
                </AdminDialog>
            )}
        </div>
    );
}
