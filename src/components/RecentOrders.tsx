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
  comprovante?: {
    url: string;
    uploadedAt: string;
  };
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
  const [uploadingComprovante, setUploadingComprovante] = useState<string | null>(null);
  const [newOrderNotification, setNewOrderNotification] = useState<string | null>(null);
  const [showComprovanteModal, setShowComprovanteModal] = useState(false);
  const [pedidoParaComprovante, setPedidoParaComprovante] = useState<Pedido | null>(null);
  const notifiedPedidosRef = useRef<Set<string>>(new Set());
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
      if (!telefone || !telefone.trim()) {
        setPedidos([]);
        setLoading(false);
        return;
      }

      // Construir a URL com o parâmetro de telefone (sempre obrigatório)
      const url = `/api/pedidos?telefone=${encodeURIComponent(telefone.trim())}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Erro ao carregar pedidos');
      }

      // Filtrar apenas pedidos do cliente atual (segurança extra)
      const telefoneCliente = telefone.trim();
      const telefoneClienteNormalizado = telefoneCliente.replace(/\D/g, '');
      
      const pedidosFiltrados = (data.data || []).filter((pedido: any) => {
        const telefonePedido = pedido.cliente?.telefone || '';
        if (!telefonePedido) return false;
        
        // Comparar telefones normalizados (apenas dígitos)
        const telefonePedidoNormalizado = telefonePedido.replace(/\D/g, '');
        
        // Comparação exata ou se um contém o outro (para casos como "8498729126" vs "8498729126")
        return telefoneClienteNormalizado === telefonePedidoNormalizado || 
               (telefoneClienteNormalizado.length >= 8 && telefonePedidoNormalizado.includes(telefoneClienteNormalizado)) ||
               (telefonePedidoNormalizado.length >= 8 && telefoneClienteNormalizado.includes(telefonePedidoNormalizado));
      });


      // Garantir que os pedidos tenham todos os campos necessários
      const pedidosFormatados = pedidosFiltrados.map((pedido: any) => ({
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
        tipoEntrega: pedido.tipoEntrega || 'entrega',
        comprovante: pedido.comprovante || undefined
      }));

      // Detectar novos pedidos
      const previousPedidoIds = new Set(pedidos.map(p => p._id));
      const novosPedidos = pedidosFormatados.filter(p => !previousPedidoIds.has(p._id));
      
      // Se houver novos pedidos e não for o primeiro carregamento
      if (novosPedidos.length > 0 && pedidos.length > 0) {
        const novoPedido = novosPedidos[0]; // Pega o mais recente
        const pedidoId = novoPedido._id;
        
        // Verifica se já notificou sobre este pedido
        if (!notifiedPedidosRef.current.has(pedidoId)) {
          notifiedPedidosRef.current.add(pedidoId);
          
          // Mostra notificação
          setNewOrderNotification(`Novo pedido #${pedidoId.slice(-6)} recebido!`);
          
          // Se for PIX e não tiver comprovante, mostra modal de comprovante
          if (novoPedido.formaPagamento?.toLowerCase() === 'pix' && !novoPedido.comprovante) {
            setPedidoParaComprovante(novoPedido);
            setShowComprovanteModal(true);
          }
          
          // Esconde notificação após 5 segundos
          setTimeout(() => {
            setNewOrderNotification(null);
          }, 5000);
        }
      }
      
      // Verificar se há pedidos PIX sem comprovante ao carregar a página
      if (pedidos.length === 0 && pedidosFormatados.length > 0) {
        const pedidosPixSemComprovante = pedidosFormatados.filter(
          p => p.formaPagamento?.toLowerCase() === 'pix' && !p.comprovante
        );
        if (pedidosPixSemComprovante.length > 0) {
          const maisRecente = pedidosPixSemComprovante[0];
          if (!notifiedPedidosRef.current.has(maisRecente._id)) {
            setPedidoParaComprovante(maisRecente);
            setShowComprovanteModal(true);
            notifiedPedidosRef.current.add(maisRecente._id);
          }
        }
      }

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

  const handleUploadComprovante = async (pedidoId: string, file: File) => {
    try {
      setUploadingComprovante(pedidoId);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/pedidos/${pedidoId}/comprovante`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Erro ao enviar comprovante');
      }

      // Atualizar pedido localmente
      setPedidos(pedidos.map(pedido =>
        pedido._id === pedidoId
          ? { ...pedido, comprovante: data.data }
          : pedido
      ));

      setMensagem('Comprovante enviado com sucesso!');
      setTimeout(() => setMensagem(null), 3000);

      // Força atualização
      fetchPedidos(true);
    } catch (error) {
      console.error('Erro ao enviar comprovante:', error);
      setError(error instanceof Error ? error.message : 'Erro ao enviar comprovante');
    } finally {
      setUploadingComprovante(null);
    }
  };

  useEffect(() => {
    fetchPedidos(true); // Carrega inicialmente

    // Configura o intervalo de atualização
    const interval = setInterval(() => {
      fetchPedidos();
    }, UPDATE_INTERVAL);

    // Atualizar quando a página voltar ao foco (útil após voltar do WhatsApp)
    const handleFocus = () => {
      fetchPedidos(true);
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        fetchPedidos(true);
      }
    });

    // Listener para evento customizado de novo pedido
    const handleNewOrder = () => {
      fetchPedidos(true);
    };
    window.addEventListener('pedido-salvo', handleNewOrder);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('pedido-salvo', handleNewOrder);
    };
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
              id={`pedido-${pedido._id}`}
              variants={itemVariants}
              exit="exit"
              className="bg-white rounded-lg shadow-md p-4 transition-all"
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

              {/* Seção de Comprovante para pagamentos PIX */}
              {pedido.formaPagamento?.toLowerCase() === 'pix' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Comprovante de Pagamento</h4>
                  {pedido.comprovante ? (
                    <div className="space-y-2">
                      <div className="text-sm text-green-600 font-semibold">
                        ✓ Comprovante enviado
                      </div>
                      <a
                        href={pedido.comprovante.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Ver comprovante
                      </a>
                      <p className="text-xs text-gray-500">
                        Enviado em: {new Date(pedido.comprovante.uploadedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Envie o comprovante do pagamento PIX
                      </p>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadComprovante(pedido._id, file);
                            }
                          }}
                          disabled={uploadingComprovante === pedido._id}
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={uploadingComprovante === pedido._id}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                handleUploadComprovante(pedido._id, file);
                              }
                            };
                            input.click();
                          }}
                        >
                          {uploadingComprovante === pedido._id ? 'Enviando...' : 'Enviar Comprovante'}
                        </motion.button>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {mensagemCompartilhamento && (
        <div className="mt-4 p-3 bg-green-900 border border-green-700 text-green-200 rounded text-center font-semibold">
          {mensagemCompartilhamento}
        </div>
      )}

      {mensagem && (
        <div className="mt-4 p-3 bg-green-900 border border-green-700 text-green-200 rounded text-center font-semibold">
          {mensagem}
        </div>
      )}

      {/* Notificação de Novo Pedido */}
      <AnimatePresence>
        {newOrderNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] max-w-md w-full mx-4"
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-2xl shadow-2xl border-2 border-blue-400/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{newOrderNotification}</p>
                </div>
                <button
                  onClick={() => setNewOrderNotification(null)}
                  className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Lembrete de Comprovante */}
      <AnimatePresence>
        {showComprovanteModal && pedidoParaComprovante && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
            onClick={() => setShowComprovanteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-[#262525] rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center border-2 border-yellow-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500/20 rounded-full mb-4">
                  <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-yellow-400 mb-3">Novo Pedido Recebido!</h2>
                <p className="text-gray-300 mb-4 text-base">
                  Pedido #{pedidoParaComprovante._id.slice(-6)} foi registrado com sucesso.
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-2 border-yellow-500/60 text-yellow-100 text-base font-semibold p-5 rounded-xl mb-6 shadow-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📸</span>
                  <div className="text-left">
                    <p className="text-lg font-bold mb-2">Envie o Comprovante de Pagamento</p>
                    <p className="text-sm leading-relaxed">
                      Para confirmar seu pedido, por favor <span className="font-bold text-yellow-300">envie o comprovante do pagamento PIX</span> na seção do pedido abaixo.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowComprovanteModal(false);
                    // Scroll para o pedido
                    const pedidoElement = document.getElementById(`pedido-${pedidoParaComprovante._id}`);
                    if (pedidoElement) {
                      pedidoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Destacar o pedido
                      pedidoElement.classList.add('ring-4', 'ring-yellow-500', 'ring-offset-2');
                      setTimeout(() => {
                        pedidoElement.classList.remove('ring-4', 'ring-yellow-500', 'ring-offset-2');
                      }, 3000);
                    }
                  }}
                  className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-8 py-4 rounded-xl hover:from-yellow-700 hover:to-yellow-800 flex items-center justify-center gap-3 font-bold text-lg shadow-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3-3m0 0l-3 3m3-3v8" />
                  </svg>
                  <span>Ver Pedido</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowComprovanteModal(false)}
                  className="bg-gray-700 text-white px-6 py-4 rounded-xl hover:bg-gray-600 font-semibold text-base transition-all"
                >
                  Fechar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            {pedidoSelecionado.formaPagamento?.toLowerCase() === 'pix' && (
              <div className="mb-2 text-xs">
                <h4 className="font-semibold mb-1">Comprovante de Pagamento:</h4>
                {pedidoSelecionado.comprovante ? (
                  <div className="space-y-1">
                    <div className="text-green-400 font-semibold">✓ Comprovante enviado</div>
                    <a
                      href={pedidoSelecionado.comprovante.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-400 hover:text-blue-300 underline"
                    >
                      Ver comprovante
                    </a>
                    <p className="text-gray-400 text-xs">
                      Enviado em: {new Date(pedidoSelecionado.comprovante.uploadedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-300">Envie o comprovante do pagamento PIX</p>
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadComprovante(pedidoSelecionado._id, file);
                          }
                        }}
                        disabled={uploadingComprovante === pedidoSelecionado._id}
                      />
                      <button
                        disabled={uploadingComprovante === pedidoSelecionado._id}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-xs"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              handleUploadComprovante(pedidoSelecionado._id, file);
                            }
                          };
                          input.click();
                        }}
                      >
                        {uploadingComprovante === pedidoSelecionado._id ? 'Enviando...' : 'Enviar Comprovante'}
                      </button>
                    </label>
                  </div>
                )}
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