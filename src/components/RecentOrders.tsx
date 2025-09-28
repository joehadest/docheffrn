'use client';
import React, { useEffect, useState, useRef } from 'react';
import { FaShareAlt } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';

interface Endereco {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  referencePoint?: string;
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
  nome?: string;
  telefone?: string;
}

type PedidoStatus = 'pendente' | 'preparando' | 'pronto' | 'em_entrega' | 'entregue' | 'cancelado';

interface Pedido {
  _id: string;
  itens: PedidoItem[];
  total: number;
  status: PedidoStatus;
  data: string;
  endereco?: {
    address?: Endereco;
    deliveryFee?: number;
    estimatedTime?: string;
    complement?: string;
    neighborhood?: string;
  };
  cliente?: Cliente;
  observacoes?: string;
  formaPagamento?: string;
  troco?: string;
  tipoEntrega?: string;
}

const statusColors: Record<PedidoStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  preparando: 'bg-blue-100 text-blue-800',
  pronto: 'bg-green-100 text-green-800',
  em_entrega: 'bg-purple-100 text-purple-800',
  entregue: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800'
};

const statusTexts: Record<PedidoStatus, string> = {
  pendente: 'Pendente',
  preparando: 'Preparando',
  pronto: 'Pronto',
  em_entrega: 'Em Entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

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
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2
    }
  }
};

export default function RecentOrders() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemCompartilhamento, setMensagemCompartilhamento] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [statusUpdateCount, setStatusUpdateCount] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const savedCounts = localStorage.getItem('statusUpdateCounts');
      return savedCounts ? JSON.parse(savedCounts) : {};
    }
    return {};
  });
  const UPDATE_INTERVAL = 30000; // 30 segundos

  const fetchPedidos = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastUpdate < UPDATE_INTERVAL) {
      return; // Não atualiza se não passou o intervalo
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar o telefone do cliente do localStorage
      const telefone = localStorage.getItem('customerPhone');

      // Se não houver telefone, não buscar pedidos
      if (!telefone) {
        setPedidos([]);
        setLoading(false);
        return;
      }

      // Construir a URL com o parâmetro de telefone
      const url = `/api/pedidos?telefone=${encodeURIComponent(telefone)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Erro ao carregar pedidos');
      }

      // Garantir que os pedidos tenham todos os campos necessários
      const pedidosFormatados = (data.data || []).map((pedido: any) => ({
        ...pedido,
        itens: pedido.itens || [],
        total: pedido.total || 0,
        status: (pedido.status || 'pendente') as PedidoStatus,
        data: pedido.data || new Date().toISOString(),
        cliente: pedido.cliente || { nome: '', telefone: '' },
        endereco: pedido.endereco || {
          address: {
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            referencePoint: ''
          },
          deliveryFee: 0,
          estimatedTime: '30-45 minutos'
        },
        formaPagamento: pedido.formaPagamento || '',
        observacoes: pedido.observacoes || '',
        tipoEntrega: pedido.tipoEntrega || 'entrega'
      }));

      setPedidos(pedidosFormatados);
      setLastUpdate(now);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (pedidoId: string, newStatus: PedidoStatus) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Erro ao atualizar status');
      }

      // Incrementar o contador de atualizações para este pedido
      setStatusUpdateCount(prev => {
        const newCounts = {
          ...prev,
          [pedidoId]: (prev[pedidoId] || 0) + 1
        };
        // Salvar no localStorage imediatamente
        localStorage.setItem('statusUpdateCounts', JSON.stringify(newCounts));
        return newCounts;
      });

      // Atualizar o pedido localmente
      setPedidos(pedidos.map(pedido =>
        pedido._id === pedidoId
          ? { ...pedido, status: newStatus }
          : pedido
      ));

      // Força atualização após mudança de status
      fetchPedidos(true);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setError(error instanceof Error ? error.message : 'Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pedidoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Erro ao excluir pedido');
      }

      // Remover o pedido localmente
      setPedidos(pedidos.filter(pedido => pedido._id !== pedidoId));

      // Força atualização após exclusão
      fetchPedidos(true);
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      setError(error instanceof Error ? error.message : 'Erro ao excluir pedido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos(true); // Carrega inicialmente

    // Configura o intervalo de atualização
    const interval = setInterval(() => {
      fetchPedidos();
    }, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('statusUpdateCounts', JSON.stringify(statusUpdateCount));
  }, [statusUpdateCount]);

  const handleCompartilharPedido = async (pedido: Pedido) => {
    try {
      const pedidoText = `*Do'Cheff - Pedido #${pedido._id}*\n\n` +
        `*Data:* ${new Date(pedido.data).toLocaleString()}\n` +
        `*Status:* ${getStatusText(pedido.status)}\n\n` +
        `*Cliente:*\n` +
        `Nome: ${pedido.cliente?.nome || 'Não informado'}\n` +
        `Telefone: ${pedido.cliente?.telefone || 'Não informado'}\n\n` +
        `*Endereço:*\n` +
        (pedido.tipoEntrega === 'entrega'
          ? `Rua: ${pedido.endereco?.address?.street || '-'}, ${pedido.endereco?.address?.number || '-'}\n` +
          (pedido.endereco?.address?.complement ? `Complemento: ${pedido.endereco.address.complement}\n` : '') +
          `Bairro: ${pedido.endereco?.address?.neighborhood || '-'}\n` +
          `Ponto de Referência: ${pedido.endereco?.address?.referencePoint || '-'}\n\n`
          : `*Tipo de Entrega:* Retirada no Local\n\n`) +
        `*Itens:*\n` +
        pedido.itens.map(item =>
          `${item.quantidade}x ${item.nome}` +
          (item.size ? ` (${item.size})` : '') +
          (item.border ? ` - Borda: ${item.border}` : '') +
          (item.extras && item.extras.length > 0 ? ` - Extras: ${item.extras.join(', ')}` : '') +
          (item.observacao ? `\nObs: ${item.observacao}` : '') +
          ` - R$ ${(item.preco * item.quantidade).toFixed(2)}`
        ).join('\n') + '\n\n' +
        `*Forma de Pagamento:* ${pedido.formaPagamento?.toLowerCase() === 'pix' ? 'PIX' : 'Dinheiro'}\n` +
        (pedido.formaPagamento?.toLowerCase() === 'pix' ? `*Chave PIX:* 8498729126\n` : '') +
        `*Total:* R$ ${pedido.total.toFixed(2)}`;

      if (navigator.share) {
        await navigator.share({
          title: `Pedido Do'Cheff #${pedido._id}`,
          text: pedidoText
        });
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = pedidoText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setMensagemCompartilhamento('Pedido copiado para a área de transferência!');
        setTimeout(() => setMensagemCompartilhamento(''), 3000);
      }
    } catch (error) {
      console.error('Erro ao compartilhar pedido:', error);
      setMensagemCompartilhamento('Erro ao compartilhar pedido');
      setTimeout(() => setMensagemCompartilhamento(''), 3000);
    }
  };

  const getStatusColor = (status: PedidoStatus) => statusColors[status];
  const getStatusText = (status: PedidoStatus) => statusTexts[status];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = searchFilter
    ? pedidos.filter(order =>
      (order.cliente?.telefone && order.cliente.telefone.includes(searchFilter)) ||
      (order._id && order._id.includes(searchFilter))
    )
    : pedidos;

  const renderOrderDetails = (pedido: Pedido) => {
    return (
      <div className="space-y-4">
        <div className="bg-[#262525] p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Informações do Cliente</h3>
          <p className="text-gray-300 break-words">Nome: {pedido.cliente?.nome || '-'}</p>
          <p className="text-gray-300 break-words">Telefone: {pedido.cliente?.telefone || '-'}</p>
        </div>

        <div className="bg-[#262525] p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Informações de Entrega</h3>
          {pedido.tipoEntrega === 'entrega' && pedido.endereco ? (
            <>
              <p className="text-gray-300 break-words">Endereço: {pedido.endereco.address?.street || '-'}, {pedido.endereco.address?.number || '-'}</p>
              {pedido.endereco.address?.complement && (
                <p className="text-gray-300 break-words">Complemento: {pedido.endereco.address.complement}</p>
              )}
              <p className="text-gray-300 break-words">Bairro: {pedido.endereco.address?.neighborhood || '-'}</p>
              <p className="text-gray-300 break-words">Ponto de Referência: {pedido.endereco.address?.referencePoint || '-'}</p>
              <p className="text-gray-300">Taxa de Entrega: R$ {pedido.endereco.deliveryFee?.toFixed(2) || '0.00'}</p>
              <p className="text-gray-300">Tempo Estimado: {pedido.endereco.estimatedTime || '30-45 minutos'}</p>
            </>
          ) : (
            <p className="text-gray-300">Tipo de Entrega: Retirada no Local</p>
          )}
        </div>

        <div className="bg-[#262525] p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Itens do Pedido</h3>
          <div className="space-y-2">
            {pedido.itens.map((item, index) => (
              <div key={index} className="border-b border-gray-700 pb-2">
                <p className="text-gray-300 break-words">
                  {item.quantidade}x {item.nome}
                  {item.size ? ` (${item.size})` : ''}
                  {item.border ? ` - Borda: ${item.border}` : ''}
                  {item.extras && item.extras.length > 0 ? ` - Extras: ${item.extras.join(', ')}` : ''}
                </p>
                {item.observacao && (
                  <p className="text-gray-400 text-sm break-words">Obs: {item.observacao}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#262525] p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Informações de Pagamento</h3>
          <p className="text-gray-300">Total: R$ {pedido.total.toFixed(2)}</p>
          <p className="text-gray-300">Forma de Pagamento: {
            pedido.formaPagamento?.toLowerCase() === 'pix' ? 'PIX' :
              pedido.formaPagamento?.toLowerCase() === 'cartao' ? 'Cartão' :
                'Dinheiro'
          }</p>
          {pedido.formaPagamento?.toLowerCase() === 'pix' && (
            <p className="text-gray-300">Chave PIX: 8498729126</p>
          )}
        </div>

        {pedido.observacoes && (
          <div className="bg-[#262525] p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Observações</h3>
            <p className="text-gray-300 break-words">{pedido.observacoes}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Meus Pedidos</h2>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      ) : !localStorage.getItem('customerPhone') ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Você precisa fazer login para ver seus pedidos.</p>
          <p className="text-sm text-gray-500">Faça um pedido para começar a ver seu histórico.</p>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Você ainda não tem pedidos.</p>
          <p className="text-sm text-gray-500">Faça seu primeiro pedido para começar a ver seu histórico.</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {pedidos.map((pedido) => (
            <motion.div
              key={pedido._id}
              variants={itemVariants}
              exit="exit"
              className="bg-white rounded-lg shadow-md p-4"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">Pedido <span className="text-red-500">#{pedido._id.slice(-6)}</span></h3>
                  <p className="text-sm text-gray-500">{formatDate(pedido.data)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold
                    ${pedido.status === 'entregue' ? 'bg-green-700 text-green-200' : ''}
                    ${pedido.status === 'pendente' ? 'bg-yellow-700 text-yellow-200' : ''}
                    ${pedido.status === 'preparando' ? 'bg-blue-700 text-blue-200' : ''}
                    ${pedido.status === 'pronto' ? 'bg-green-700 text-green-200' : ''}
                    ${pedido.status === 'em_entrega' ? 'bg-purple-700 text-purple-200' : ''}
                    ${pedido.status === 'cancelado' ? 'bg-red-700 text-red-200' : ''}
                  `}>
                    {getStatusText(pedido.status)}
                  </span>
                  {statusUpdateCount[pedido._id] > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {statusUpdateCount[pedido._id]}
                    </span>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCompartilharPedido(pedido)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <FaShareAlt className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Nome:</span>
                  <span className="text-right break-words">{pedido.cliente?.nome || 'Não informado'}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Telefone:</span>
                  <span className="text-right break-words">{pedido.cliente?.telefone || 'Não informado'}</span>
                </div>
                {pedido.tipoEntrega === 'entrega' && pedido.endereco ? (
                  <>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Endereço:</span>
                      <span className="text-right break-words">{pedido.endereco.address?.street || 'Não informado'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Número:</span>
                      <span className="text-right break-words">{pedido.endereco.address?.number || 'Não informado'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Complemento:</span>
                      <span className="text-right break-words">{pedido.endereco.address?.complement || 'Não informado'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Bairro:</span>
                      <span className="text-right break-words">{pedido.endereco.address?.neighborhood || 'Não informado'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Ponto de Referência:</span>
                      <span className="text-right break-words">{pedido.endereco.address?.referencePoint || 'Não informado'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Taxa de Entrega:</span>
                      <span>R$ {pedido.endereco.deliveryFee?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Tempo Estimado:</span>
                      <span>{pedido.endereco.estimatedTime || '30-45 minutos'}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Tipo de Entrega:</span>
                    <span>Retirada no Local</span>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-sm text-gray-500 mb-2">Itens do Pedido:</h4>
                  {pedido.itens.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm text-gray-500">
                      <span className="break-words">
                        {item.quantidade}x {item.nome}
                        {item.size && ` (${item.size})`}
                        {item.border ? ` - Borda: ${item.border}` : ''}
                        {item.extras && item.extras.length > 0 && (
                          ` - Extras: ${item.extras.join(', ')}`
                        )}
                        {item.observacao && (
                          <span className="block text-xs text-gray-400 mt-1 break-words">{item.observacao}</span>
                        )}
                      </span>
                      <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                    </div>
                  ))}
                  {pedido.itens.some(item => item.observacao) && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <h4 className="font-medium text-sm text-gray-500">Observações:</h4>
                      {pedido.itens.map((item, index) => (
                        item.observacao && (
                          <p key={index} className="text-sm text-gray-500 break-words">
                            {item.nome}: {item.observacao}
                          </p>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>Total</span>
                  <span>R$ {pedido.total.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {mensagemCompartilhamento && (
        <div className="mt-4 p-3 bg-green-900 border border-green-700 text-green-200 rounded text-center font-semibold">
          {mensagemCompartilhamento}
        </div>
      )}

      {/* Modal de detalhes */}
      {pedidoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setPedidoSelecionado(null)}>
          <div
            className="bg-[#262525] rounded-xl shadow-xl p-6 max-w-md w-full relative print-pedido border border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-orange-500 hover:text-orange-700 text-2xl focus:outline-none no-print"
              onClick={() => setPedidoSelecionado(null)}
              aria-label="Fechar modal de pedido"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-2 text-orange-600 text-center">Do'Cheff</h3>
            <div className="mb-2 text-xs text-gray-700 text-center">
              <div><b>Pedido:</b> #{pedidoSelecionado._id?.slice(-6) || '-'}</div>
              <div><b>Data:</b> {pedidoSelecionado.data ? formatDate(pedidoSelecionado.data) : '-'}</div>
              <div><b>Status:</b> {getStatusText(pedidoSelecionado.status as Pedido['status'])}</div>
            </div>
            <div className="mb-2 text-xs">
              <h4 className="font-semibold mb-1">Cliente:</h4>
              <div className="break-words">Nome: {pedidoSelecionado.cliente?.nome || '-'}</div>
              <div className="break-words">Telefone: {pedidoSelecionado.cliente?.telefone || '-'}</div>
            </div>
            {pedidoSelecionado.tipoEntrega === 'entrega' ? (
              <>
                <div className="mb-2 text-xs">
                  <h4 className="font-semibold mb-1">Endereço de Entrega:</h4>
                  <div className="break-words">{pedidoSelecionado.endereco?.address?.street || '-'}, {pedidoSelecionado.endereco?.address?.number || '-'}</div>
                  {pedidoSelecionado.endereco?.address?.complement && <div className="break-words">Compl: {pedidoSelecionado.endereco.address.complement}</div>}
                  <div className="break-words">{pedidoSelecionado.endereco?.address?.neighborhood || '-'}</div>
                  <div className="break-words">Ponto de Referência: {pedidoSelecionado.endereco?.address?.referencePoint || '-'}</div>
                </div>
                <div className="mb-2 text-xs">
                  <div><b>Tempo estimado de entrega:</b> {pedidoSelecionado.endereco?.estimatedTime || '-'}</div>
                </div>
              </>
            ) : (
              <div className="mb-2 text-xs">
                <h4 className="font-semibold mb-1">Tipo de Pedido:</h4>
                <div>Retirada no Local</div>
              </div>
            )}
            <div className="mb-2">
              <h4 className="font-semibold mb-1">Itens:</h4>
              <ul>
                {pedidoSelecionado.itens.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-xs">
                    <span className="break-words">
                      {item.quantidade}x {item.nome}
                      {item.size && ` (${item.size})`}
                      {item.border && ` - Borda: ${item.border}`}
                      {item.extras && item.extras.length > 0 && (
                        ` - Extras: ${item.extras.join(', ')}`
                      )}
                      {item.observacao && (
                        <span className="block text-xs text-gray-400 mt-1 break-words">{item.observacao}</span>
                      )}
                    </span>
                    <span>R$ {item.preco.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {pedidoSelecionado.observacoes && (
              <div className="mb-2 text-xs">
                <h4 className="font-semibold mb-1">Observações:</h4>
                <div className="break-words">{pedidoSelecionado.observacoes}</div>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span>Taxa de Entrega:</span>
              <span>R$ {pedidoSelecionado.endereco?.deliveryFee?.toFixed(2) || '0,00'}</span>
            </div>
            <div className="mb-2 text-xs">
              <h4 className="font-semibold mb-1">Forma de Pagamento:</h4>
              <div>{pedidoSelecionado.formaPagamento?.toLowerCase() === 'pix' ? 'PIX' : 'Dinheiro'}</div>
            </div>
            {pedidoSelecionado.formaPagamento?.toLowerCase() === 'dinheiro' && (
              <div className="flex justify-between text-sm text-gray-300">
                <span>Troco para:</span>
                <span>R$ {pedidoSelecionado.troco || '-'}</span>
              </div>
            )}
            <div className="font-bold text-orange-600 mt-2 text-lg flex justify-between">
              <span>Total:</span>
              <span>R$ {pedidoSelecionado.total?.toFixed(2) || '-'}</span>
            </div>
            <button
              className="w-full mt-4 bg-yellow-400 hover:bg-yellow-500 text-orange-900 font-bold py-2 rounded-lg transition-colors no-print"
              onClick={() => window.print()}
            >
              Imprimir
            </button>
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
                color: #111 !important;
                font-size: 10px !important;
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 4px !important;
              }
              .print-pedido h3 {
                font-size: 12px !important;
                margin-bottom: 4px !important;
                text-align: center !important;
              }
              .print-pedido h4 {
                font-size: 11px !important;
                margin-bottom: 2px !important;
              }
              .print-pedido div, .print-pedido span {
                font-size: 10px !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .print-pedido button, .print-pedido .no-print {
                display: none !important;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}