'use client';
import React, { useEffect, useState, useRef } from 'react';
import { FaShareAlt } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Notification from './Notification';
import { Pedido } from '../types/cart';

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

export default function AdminOrders() {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [mensagemCompartilhamento, setMensagemCompartilhamento] = useState<string | null>(null);
    const [phoneFilter, setPhoneFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    const fetchPedidos = async () => {
        try {
            const res = await fetch('/api/pedidos');
            const data = await res.json();
            if (data.success) {
                const novosPedidos = data.data.filter((novoPedido: Pedido) =>
                    !pedidos.some(pedido => pedido._id === novoPedido._id)
                );

                if (novosPedidos.length > 0) {
                    setNotification(`Novo pedido recebido! #${novosPedidos[0]._id.slice(-6)}`);
                    const notifyOrders = JSON.parse(localStorage.getItem('notifyOrders') || '[]');
                    if (!notifyOrders.includes(novosPedidos[0]._id)) {
                        notifyOrders.push(novosPedidos[0]._id);
                        localStorage.setItem('notifyOrders', JSON.stringify(notifyOrders));
                    }
                }

                setPedidos(data.data);
            }
        } catch (err) {
            console.error('Erro ao buscar pedidos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPedidos();
    }, []);

    useEffect(() => {
        const interval = setInterval(fetchPedidos, 30000);
        return () => clearInterval(interval);
    }, [pedidos]);

    const handleRemoverPedido = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja remover este pedido?')) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/pedidos?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await res.json();

            if (data.success) {
                setPedidos((prev) => prev.filter((p) => p._id !== id));
                setMensagem('Pedido removido com sucesso!');
                setTimeout(() => setMensagem(null), 3000);
            } else {
                console.error('Erro na resposta:', data);
                setMensagem(data.message || 'Erro ao remover pedido.');
                setTimeout(() => setMensagem(null), 3000);
            }
        } catch (err) {
            console.error('Erro ao remover pedido:', err);
            setMensagem('Erro ao remover pedido. Tente novamente.');
            setTimeout(() => setMensagem(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleCompartilharPedido = (pedido: Pedido) => {
        const endereco = pedido.endereco;
        const enderecoFormatado = endereco ? 
            `${endereco.address.street}, ${endereco.address.number}${endereco.address.complement ? ` - ${endereco.address.complement}` : ''}, ${endereco.address.neighborhood}` : 
            'Retirada no local';

        const formaPagamento = pedido.formaPagamento === 'pix' ? 'PIX' :
            pedido.formaPagamento === 'cartao' ? 'Cartão' : 'Dinheiro';

        const troco = pedido.formaPagamento === 'dinheiro' && pedido.troco ? 
            `\nTroco: R$ ${pedido.troco}` : '';

        const taxaEntrega = pedido.endereco?.deliveryFee ? 
            `\nTaxa de Entrega: R$ ${pedido.endereco.deliveryFee}` : '';

        const itensFormatados = pedido.itens.map(item => {
            let itemStr = `${item.nome}`;
            if (item.size) itemStr += ` (${item.size})`;
            itemStr += ` x${item.quantidade}`;
            if (item.border) itemStr += `\nBorda: ${item.border}`;
            if (item.extras && item.extras.length > 0) itemStr += `\nExtras: ${item.extras.join(', ')}`;
            if (item.observacao) itemStr += `\nObs: ${item.observacao}`;
            itemStr += ` - R$ ${(item.preco * item.quantidade).toFixed(2)}`;
            return itemStr;
        }).join('\n\n');

        const subtotal = pedido.itens.reduce((total, item) => total + (item.preco * item.quantidade), 0);
        const total = subtotal + (pedido.endereco?.deliveryFee || 0);

        const mensagem = `*Do'Cheff - Pedido #${pedido._id}*\n\n` +
                `*Data:* ${new Date(pedido.data).toLocaleString()}\n` +
            `*Status:* ${pedido.status}\n\n` +
                `*Cliente:*\n` +
            `Nome: ${pedido.cliente.nome}\n` +
            `Telefone: ${pedido.cliente.telefone}\n\n` +
            `*Endereço:*\n${enderecoFormatado}\n\n` +
            `*Itens do Pedido:*\n${itensFormatados}\n\n` +
            `*Forma de Pagamento:* ${formaPagamento}${troco}\n` +
            `*Subtotal:* R$ ${subtotal.toFixed(2)}${taxaEntrega}\n` +
            `*Total:* R$ ${total.toFixed(2)}\n\n` +
            `*Observações:*\n${pedido.observacoes || 'Nenhuma observação'}`;

        if (navigator.share) {
            navigator.share({
                title: `Pedido #${pedido._id}`,
                text: mensagem
            });
        } else {
            alert('Compartilhamento não suportado neste navegador.');
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: PedidoStatus) => {
        try {
            setUpdatingStatus(orderId);
            const res = await fetch(`/api/pedidos?id=${orderId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Erro ao atualizar status do pedido');
            }

            if (data.success) {
                setPedidos(pedidos.map(order =>
                    order._id === orderId
                        ? { ...order, status: newStatus }
                        : order
                ));
                setMensagem('Status atualizado com sucesso!');
                setNotification(`Status do pedido #${orderId.slice(-6)} atualizado para ${getStatusText(newStatus)}`);
                
                // Enviar notificação em tempo real
                const timestamp = new Date().toLocaleString('pt-BR');
                const message = `Status do pedido #${orderId.slice(-6)} atualizado para ${getStatusText(newStatus)}`;
                
                // Enviar para o servidor de notificações
                await fetch('/api/notifications', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        clientId: pedidos.find(p => p._id === orderId)?.cliente.telefone,
                        orderId,
                        status: newStatus,
                        message,
                        timestamp
                    }),
                });
                
                // Atualizar localStorage para compatibilidade com o sistema atual
                const notifyOrders = JSON.parse(localStorage.getItem('notifyOrders') || '[]');
                if (!notifyOrders.includes(orderId)) {
                    notifyOrders.push(orderId);
                    localStorage.setItem('notifyOrders', JSON.stringify(notifyOrders));
                }
                localStorage.setItem(`notifyStatus_${orderId}`, newStatus);
                localStorage.setItem(`notifyTimestamp_${orderId}`, timestamp);
                
                setTimeout(() => setMensagem(null), 3000);
            } else {
                throw new Error(data.message || 'Erro ao atualizar status do pedido');
            }
        } catch (err) {
            console.error('Erro ao atualizar status:', err);
            setMensagem('Erro ao atualizar status do pedido. Por favor, tente novamente.');
            setTimeout(() => setMensagem(null), 3000);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const getStatusColor = (status: PedidoStatus) => {
        const colors = {
            pendente: 'bg-yellow-100 text-yellow-800',
            preparando: 'bg-blue-100 text-blue-800',
            pronto: 'bg-green-100 text-green-800',
            em_entrega: 'bg-purple-100 text-purple-800',
            entregue: 'bg-green-100 text-green-800',
            cancelado: 'bg-red-100 text-red-800'
        };
        return colors[status];
    };

    const getStatusText = (status: PedidoStatus) => {
        const texts = {
            pendente: 'Pendente',
            preparando: 'Preparando',
            pronto: 'Pronto',
            em_entrega: 'Em Entrega',
            entregue: 'Entregue',
            cancelado: 'Cancelado'
        };
        return texts[status];
    };

    const getNextStatus = (currentStatus: PedidoStatus): PedidoStatus | null => {
        switch (currentStatus) {
            case 'pendente':
                return 'preparando';
            case 'preparando':
                return 'pronto';
            case 'pronto':
                return 'em_entrega';
            case 'em_entrega':
                return 'entregue';
            default:
                return null;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calcularTotal = (pedido: Pedido) => {
        if (pedido.total) return pedido.total;

        // Verifica se existem itens antes de calcular
        if (!pedido.itens || !Array.isArray(pedido.itens)) {
            console.warn('Pedido sem itens:', pedido);
            return 0;
        }

        // Se não houver total, calcula a partir dos itens
        return pedido.itens.reduce((acc, item) => {
            return acc + (item.preco * item.quantidade);
        }, 0);
    };

    const filteredPedidos = pedidos.filter(pedido => {
        const matchesPhone = !phoneFilter || pedido.cliente?.telefone?.includes(phoneFilter);
        const matchesStatus = !statusFilter || pedido.status === statusFilter;
        return matchesPhone && matchesStatus;
    });

    if (loading) return <div>Carregando pedidos...</div>;
    if (!pedidos.length) return <div className="text-center text-gray-500">Nenhum pedido recente.</div>;

    return (
        <div className="min-h-screen bg-[#262525] p-4">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Painel de Pedidos</h2>
            {mensagemCompartilhamento && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded text-center font-semibold">
                    {mensagemCompartilhamento}
                </div>
            )}
            {notification && (
                <div className="fixed top-6 right-6 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up font-semibold text-lg">
                    <span>🔔</span>
                    <span>{notification}</span>
                    <button
                        onClick={() => setNotification(null)}
                        className="ml-2 hover:text-red-200 transition-colors text-2xl font-bold"
                        aria-label="Fechar notificação"
                    >
                        ×
                    </button>
                </div>
            )}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                    Buscar por telefone
                </label>
                <input
                    type="tel"
                    value={phoneFilter}
                    onChange={(e) => setPhoneFilter(e.target.value)}
                    placeholder="Digite o telefone do pedido"
                    className="w-full max-w-md rounded-md border border-gray-700 bg-[#262525] text-gray-100 shadow-sm focus:border-red-600 focus:ring-red-600"
                />
            </div>
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                    Filtrar por status
                </label>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full max-w-md rounded-md border border-gray-700 bg-[#262525] text-gray-100 shadow-sm focus:border-red-600 focus:ring-red-600"
                >
                    <option value="">Todos os status</option>
                    <option value="pendente">Pendente</option>
                    <option value="preparando">Preparando</option>
                    <option value="pronto">Pronto</option>
                    <option value="em_entrega">Em Entrega</option>
                    <option value="entregue">Entregue</option>
                    <option value="cancelado">Cancelado</option>
                </select>
            </div>
            <ul className="space-y-4">
                {filteredPedidos.map((pedido) => (
                    <li key={pedido._id} className="bg-[#262525] rounded-xl shadow-lg p-6 border border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="font-semibold text-lg text-white">Pedido <span className="text-red-500">#{pedido._id.slice(-6)}</span></div>
                            <div className="text-sm text-gray-400 mb-2">
                                Data: {formatDate(pedido.data)}
                            </div>
                            <div className="font-bold text-red-600">Total: R$ {calcularTotal(pedido).toFixed(2)}</div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold 
                                    ${pedido.status === 'entregue' ? 'bg-green-700 text-green-200' : ''}
                                    ${pedido.status === 'pendente' ? 'bg-yellow-700 text-yellow-200' : ''}
                                    ${pedido.status === 'preparando' ? 'bg-blue-700 text-blue-200' : ''}
                                    ${pedido.status === 'em_entrega' ? 'bg-purple-700 text-purple-200' : ''}
                                    ${pedido.status === 'cancelado' ? 'bg-red-700 text-red-200' : ''}
                                `}>
                                    {getStatusText(pedido.status)}
                                </div>
                                {getNextStatus(pedido.status) && (
                                    <button
                                        onClick={() => updateOrderStatus(pedido._id, getNextStatus(pedido.status)!)}
                                        disabled={updatingStatus === pedido._id}
                                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        {updatingStatus === pedido._id ? 'Atualizando...' : 'Próximo Status'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 mt-2 sm:mt-0">
                            <button
                                className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                onClick={() => setPedidoSelecionado(pedido)}
                            >
                                Ver Detalhes
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-500 text-white rounded font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                onClick={() => handleCompartilharPedido(pedido)}
                            >
                                <FaShareAlt /> Compartilhar
                            </button>
                            <button
                                className="px-4 py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600 transition-colors"
                                onClick={() => handleRemoverPedido(pedido._id)}
                            >
                                Remover
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            {mensagem && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-center font-semibold">
                    {mensagem}
                </div>
            )}

            {/* Modal de detalhes */}
            {pedidoSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setPedidoSelecionado(null)}>
                    <div
                        className="bg-[#262525] rounded-xl shadow-xl p-6 max-w-md w-full relative print-pedido border border-gray-800 max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-2 right-2 text-red-500 hover:text-red-400 text-2xl focus:outline-none no-print"
                            onClick={() => setPedidoSelecionado(null)}
                            aria-label="Fechar modal de pedido"
                        >
                            &times;
                        </button>
                        <h3 className="text-2xl font-bold mb-4 text-red-600 text-center">Do'Cheff</h3>
                        <div className="mb-4 text-sm text-gray-300 text-center space-y-1">
                            <div><span className="text-gray-400">Pedido:</span> <span className="text-white font-semibold">#{pedidoSelecionado._id?.slice(-6) || '-'}</span></div>
                            <div><span className="text-gray-400">Data:</span> <span className="text-white">{pedidoSelecionado.data ? formatDate(pedidoSelecionado.data) : '-'}</span></div>
                            <div><span className="text-gray-400">Status:</span> <span className="font-semibold text-green-400">{getStatusText(pedidoSelecionado.status)}</span></div>
                        </div>
                        <div className="mb-4 text-sm text-gray-300 space-y-1">
                            <h4 className="font-semibold text-gray-400 mb-1">Cliente</h4>
                            <div><span className="text-gray-400">Nome:</span> <span className="text-white">{pedidoSelecionado.cliente?.nome || '-'}</span></div>
                            <div><span className="text-gray-400">Telefone:</span> <span className="text-white">{pedidoSelecionado.cliente?.telefone || '-'}</span></div>
                        </div>
                        <div className="mb-4 text-sm text-gray-300 space-y-1">
                            <h4 className="font-semibold text-gray-400 mb-1">Endereço de Entrega</h4>
                            <div><span className="text-gray-400">Rua:</span> <span className="text-white">{pedidoSelecionado.endereco?.address?.street || '-'}</span></div>
                            <div><span className="text-gray-400">Número:</span> <span className="text-white">{pedidoSelecionado.endereco?.address?.number || '-'}</span></div>
                            {pedidoSelecionado.endereco?.address?.complement && <div><span className="text-gray-400">Compl:</span> <span className="text-white">{pedidoSelecionado.endereco.address.complement}</span></div>}
                            <div><span className="text-gray-400">Bairro:</span> <span className="text-white">{pedidoSelecionado.endereco?.address?.neighborhood || '-'}</span></div>
                            <div><span className="text-gray-400">Ponto de Referência:</span> <span className="text-white">{pedidoSelecionado.endereco?.address?.referencePoint || '-'}</span></div>
                        </div>
                        <div className="mb-4 text-sm text-gray-300">
                            <span className="text-gray-400">Tempo estimado de entrega:</span> <span className="text-white">{pedidoSelecionado.endereco?.estimatedTime || '-'}</span>
                        </div>
                        <div className="mb-4">
                            <h4 className="font-semibold text-gray-400 mb-1">Itens</h4>
                            <ul className="divide-y divide-gray-800">
                                {pedidoSelecionado.itens.map((item, idx) => (
                                    <li key={idx} className="flex justify-between text-sm py-1 text-gray-200">
                                        <span>
                                            {item.quantidade}x {item.nome}
                                            {item.size ? ` (${item.size})` : ''}
                                            {item.border ? ` - Borda: ${item.border}` : ''}
                                            {item.extras && item.extras.length > 0 && (
                                                ` - Extras: ${item.extras.join(', ')}`
                                            )}
                                            {item.observacao ? (
                                                <span className="block text-xs text-gray-400 mt-1">{item.observacao}</span>
                                            ) : ''}
                                        </span>
                                        <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {pedidoSelecionado.observacoes && (
                            <div className="mb-4 text-sm text-gray-300">
                                <h4 className="font-semibold text-gray-400 mb-1">Observações</h4>
                                <div>{pedidoSelecionado.observacoes}</div>
                            </div>
                        )}
                        <div className="flex justify-between text-sm text-gray-300 border-t border-gray-800 pt-2 mb-2">
                            <span>Taxa de Entrega:</span>
                            <span>R$ {pedidoSelecionado.endereco?.deliveryFee?.toFixed(2) || '0,00'}</span>
                        </div>
                        <div className="mb-4 text-sm text-gray-300 space-y-1">
                            <h4 className="font-semibold text-gray-400 mb-1">Pagamento</h4>
                            <div><span className="text-gray-400">Forma:</span> <span className="text-white">{
                                pedidoSelecionado.formaPagamento?.toLowerCase() === 'pix' ? 'PIX' : 
                                pedidoSelecionado.formaPagamento?.toLowerCase() === 'cartao' ? 'Cartão' : 
                                'Dinheiro'
                            }</span></div>
                            {pedidoSelecionado.formaPagamento?.toLowerCase() === 'dinheiro' && (
                                <div><span className="text-gray-400">Troco para:</span> <span className="text-white">R$ {pedidoSelecionado.troco || '-'}</span></div>
                            )}
                        </div>
                        <div className="font-bold text-red-600 mt-2 text-2xl flex justify-between items-center border-t border-gray-800 pt-4">
                            <span>Total:</span>
                            <span>R$ {calcularTotal(pedidoSelecionado).toFixed(2)}</span>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button
                                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-orange-900 font-bold py-2 rounded-lg transition-colors no-print"
                                onClick={() => window.print()}
                            >
                                Imprimir
                            </button>
                            {getNextStatus(pedidoSelecionado.status) && (
                                <button
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition-colors no-print"
                                    onClick={() => {
                                        updateOrderStatus(pedidoSelecionado._id, getNextStatus(pedidoSelecionado.status)!);
                                        setPedidoSelecionado(null);
                                    }}
                                >
                                    Atualizar Status
                                </button>
                            )}
                        </div>
                    </div>
                    <style jsx global>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .print-pedido, .print-pedido * {
                visibility: visible !important;
              }
              .print-pedido {
                position: absolute !important;
                left: 0; top: 0; width: 80mm; min-width: 0; max-width: 100vw;
                background: white !important;
                color: #000 !important;
                font-size: 9px !important;
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 2mm !important;
              }
              .print-pedido h3 {
                font-size: 11px !important;
                margin-bottom: 2mm !important;
                text-align: center !important;
              }
              .print-pedido h4 {
                font-size: 10px !important;
                margin-bottom: 1mm !important;
              }
              .print-pedido div, .print-pedido span {
                font-size: 9px !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .print-pedido button, .print-pedido .no-print {
                display: none !important;
              }
              .print-pedido ul {
                margin: 0 !important;
                padding: 0 !important;
              }
              .print-pedido li {
                margin-bottom: 1mm !important;
              }
            }
          `}</style>
                </div>
            )}
        </div>
    );
} 