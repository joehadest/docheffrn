'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { FaPlus, FaTrash, FaArrowLeft, FaChair } from 'react-icons/fa';
import { MenuItem } from '../types/menu';
import { Pedido } from '../types/cart';
import ItemModal from './ItemModal';
import PastaModal from './PastaModal';

type Categoria = { value: string; label: string; icon?: string; order?: number; allowHalfAndHalf?: boolean };
type ItemPedido = Pedido['itens'][number];
type FormaPagamento = 'dinheiro' | 'cartao' | 'pix';

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const calcularTotalItens = (itens: ItemPedido[]) =>
    itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

export default function AdminMesas() {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [mesaAtivaId, setMesaAtivaId] = useState<string | null>(null);
    const [novoRotulo, setNovoRotulo] = useState('');
    const [criandoMesa, setCriandoMesa] = useState(false);
    const [busca, setBusca] = useState('');
    const [itemSelecionado, setItemSelecionado] = useState<MenuItem | null>(null);
    const [pastaSelecionada, setPastaSelecionada] = useState<MenuItem | null>(null);
    const [salvandoItem, setSalvandoItem] = useState(false);
    const [mostrarFechamento, setMostrarFechamento] = useState(false);
    const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro');
    const [fechandoConta, setFechandoConta] = useState(false);

    useEffect(() => {
        async function fetchAll() {
            setLoading(true);
            try {
                const [pedidosRes, menuRes, catRes] = await Promise.all([
                    fetch('/api/pedidos', { cache: 'no-store' }),
                    fetch('/api/menu/all', { cache: 'no-store' }),
                    fetch('/api/categories', { cache: 'no-store' }),
                ]);
                const pedidosData = await pedidosRes.json();
                const menuData = await menuRes.json();
                const catData = await catRes.json();
                if (pedidosData.success) setPedidos(pedidosData.data);
                if (menuData.success) setMenuItems(menuData.data);
                if (catData.success) {
                    const sorted = (catData.data || [])
                        .slice()
                        .sort((a: Categoria, b: Categoria) => (a.order ?? 0) - (b.order ?? 0));
                    setCategorias(sorted);
                }
                if (!pedidosData.success || !menuData.success || !catData.success) {
                    setError('Alguns dados não puderam ser carregados.');
                }
            } catch {
                setError('Não foi possível carregar os dados.');
            } finally {
                setLoading(false);
            }
        }
        fetchAll();
    }, []);

    const mesasAbertas = useMemo(
        () =>
            pedidos
                .filter((p) => p.tipoEntrega === 'local' && p.status !== 'entregue' && p.status !== 'cancelado')
                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
        [pedidos]
    );

    const mesaAtiva = mesasAbertas.find((p) => p._id === mesaAtivaId) || null;
    const allPizzas = useMemo(() => menuItems.filter((i) => i.category === 'pizzas'), [menuItems]);

    const itensFiltrados = useMemo(() => {
        if (!busca.trim()) return menuItems;
        const q = busca.trim().toLowerCase();
        return menuItems.filter((i) => i.name.toLowerCase().includes(q));
    }, [menuItems, busca]);

    const criarMesa = async () => {
        const rotulo = novoRotulo.trim();
        if (!rotulo) {
            setError('Escreva o nome ou número da mesa antes de abrir.');
            return;
        }
        setCriandoMesa(true);
        setError(null);
        try {
            const res = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mesa: rotulo,
                    tipoEntrega: 'local',
                    cliente: { nome: rotulo, telefone: '' },
                    itens: [],
                    total: 0,
                    status: 'pendente',
                    formaPagamento: '',
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error();
            const novaMesa: Pedido = {
                _id: data.pedidoId,
                mesa: rotulo,
                tipoEntrega: 'local',
                cliente: { nome: rotulo, telefone: '' },
                itens: [],
                total: 0,
                status: 'pendente',
                formaPagamento: '',
                data: new Date().toISOString(),
            };
            setPedidos((prev) => [novaMesa, ...prev]);
            setMesaAtivaId(data.pedidoId);
            setNovoRotulo('');
        } catch {
            setError('Erro ao abrir a mesa. Tente novamente.');
        } finally {
            setCriandoMesa(false);
        }
    };

    const persistirItens = async (mesaId: string, novosItens: ItemPedido[]) => {
        const novoTotal = calcularTotalItens(novosItens);
        const res = await fetch(`/api/pedidos?id=${mesaId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens: novosItens, total: novoTotal }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error();
        setPedidos((prev) =>
            prev.map((p) => (p._id === mesaId ? { ...p, itens: novosItens, total: novoTotal } : p))
        );
    };

    const adicionarItem = async (entry: ItemPedido) => {
        if (!mesaAtiva) return;
        setSalvandoItem(true);
        setError(null);
        try {
            await persistirItens(mesaAtiva._id, [...mesaAtiva.itens, entry]);
        } catch {
            setError('Erro ao adicionar item. Tente novamente.');
        } finally {
            setSalvandoItem(false);
        }
    };

    const removerItem = async (idx: number) => {
        if (!mesaAtiva) return;
        setSalvandoItem(true);
        setError(null);
        try {
            await persistirItens(mesaAtiva._id, mesaAtiva.itens.filter((_, i) => i !== idx));
        } catch {
            setError('Erro ao remover item. Tente novamente.');
        } finally {
            setSalvandoItem(false);
        }
    };

    const fecharConta = async () => {
        if (!mesaAtiva) return;
        setFechandoConta(true);
        setError(null);
        try {
            const res = await fetch(`/api/pedidos?id=${mesaAtiva._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'entregue', formaPagamento }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error();
            setPedidos((prev) =>
                prev.map((p) => (p._id === mesaAtiva._id ? { ...p, status: 'entregue', formaPagamento } : p))
            );
            setMesaAtivaId(null);
            setMostrarFechamento(false);
            setFormaPagamento('dinheiro');
        } catch {
            setError('Erro ao fechar a conta. Tente novamente.');
        } finally {
            setFechandoConta(false);
        }
    };

    const cancelarMesa = async () => {
        if (!mesaAtiva) return;
        if (!window.confirm(`Cancelar "${mesaAtiva.mesa}"? Isso remove a mesa e não pode ser desfeito.`)) return;
        setError(null);
        try {
            const res = await fetch(`/api/pedidos?id=${mesaAtiva._id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error();
            setPedidos((prev) => prev.filter((p) => p._id !== mesaAtiva._id));
            setMesaAtivaId(null);
        } catch {
            setError('Erro ao cancelar a mesa. Tente novamente.');
        }
    };

    const abrirItem = (item: MenuItem) => {
        if (item.isAvailable === false) return;
        if (item.category === 'massas') setPastaSelecionada(item);
        else setItemSelecionado(item);
    };

    const handleAddToCart = (
        item: MenuItem,
        quantity: number,
        unitPrice: number,
        observation: string,
        size?: string,
        border?: string,
        extras?: string[]
    ) => {
        adicionarItem({
            nome: item.name,
            quantidade: quantity,
            preco: unitPrice,
            observacao: observation || undefined,
            size,
            border,
            extras,
        });
        setItemSelecionado(null);
    };

    const handlePastaAddToCart = (quantity: number, observation: string, size?: 'P' | 'G') => {
        if (!pastaSelecionada) return;
        const unitPrice = pastaSelecionada.sizes?.[size || 'P'] || pastaSelecionada.price;
        adicionarItem({
            nome: pastaSelecionada.name,
            quantidade: quantity,
            preco: unitPrice,
            observacao: observation || undefined,
            size,
        });
        setPastaSelecionada(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-red-500" />
                <span className="text-gray-400">Carregando mesas...</span>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Mesas</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Atendimento presencial — abra uma mesa e lance os itens do pedido</p>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-900/30 border border-red-800/50 text-red-300 rounded-lg text-sm">{error}</div>
            )}

            {!mesaAtiva ? (
                <>
                    {/* Abrir nova mesa */}
                    <div className="flex flex-col sm:flex-row gap-2 bg-[#141414] border border-white/[0.07] rounded-xl p-3.5">
                        <input
                            type="text"
                            value={novoRotulo}
                            onChange={(e) => setNovoRotulo(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && criarMesa()}
                            placeholder="Ex: Mesa 5, Balcão 2..."
                            className="form-input flex-1"
                        />
                        <button
                            type="button"
                            className="form-button-primary flex items-center justify-center gap-2 shrink-0"
                            disabled={criandoMesa}
                            onClick={criarMesa}
                        >
                            <FaPlus size={11} /> {criandoMesa ? 'Abrindo...' : 'Abrir Mesa'}
                        </button>
                    </div>

                    {/* Grid de mesas abertas */}
                    {mesasAbertas.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">Nenhuma mesa aberta no momento.</div>
                    ) : (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {mesasAbertas.map((mesa) => (
                                <li
                                    key={mesa._id}
                                    className="bubble-card p-4 cursor-pointer"
                                    onClick={() => setMesaAtivaId(mesa._id)}
                                    onMouseMove={(e) => {
                                        const r = e.currentTarget.getBoundingClientRect();
                                        e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                                        e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
                                    }}
                                >
                                    <span className="bubble-glow" /><span className="bubble-press-overlay" /><span className="bubble-border-gradient" />
                                    <div className="bubble-content">
                                        <div className="flex items-center gap-2 font-semibold text-lg text-white">
                                            <FaChair className="text-red-500" size={14} /> {mesa.mesa || 'Mesa'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">Aberta desde {formatDate(mesa.data)}</div>
                                        <div className="text-xs text-gray-400 mt-1">{mesa.itens.length} item(ns)</div>
                                        <div className="font-bold text-red-500 mt-2">R$ {calcularTotalItens(mesa.itens).toFixed(2)}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            ) : (
                <>
                    {/* Detalhe da mesa ativa */}
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                            onClick={() => setMesaAtivaId(null)}
                        >
                            <FaArrowLeft size={12} /> Voltar
                        </button>
                        <button type="button" className="form-button-danger text-xs py-1.5 px-3" onClick={cancelarMesa}>
                            Cancelar Mesa
                        </button>
                    </div>

                    <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                                <FaChair className="text-red-500" /> {mesaAtiva.mesa || 'Mesa'}
                            </h2>
                            <span className="font-bold text-red-500 text-lg">R$ {calcularTotalItens(mesaAtiva.itens).toFixed(2)}</span>
                        </div>

                        {mesaAtiva.itens.length === 0 ? (
                            <p className="text-sm text-gray-500">Nenhum item lançado ainda — adicione abaixo.</p>
                        ) : (
                            <ul className="divide-y divide-gray-800">
                                {mesaAtiva.itens.map((item, idx) => (
                                    <li key={idx} className="flex items-start justify-between gap-2 py-2 text-sm text-gray-200">
                                        <span className="flex-1 break-words">
                                            {item.quantidade}x {item.nome}{item.size && ` (${item.size})`}
                                            {item.border && <span className="block text-xs text-gray-400 pl-2">- Borda: {item.border}</span>}
                                            {item.extras && item.extras.length > 0 && <span className="block text-xs text-gray-400 pl-2">- Extras: {item.extras.join(', ')}</span>}
                                            {item.observacao && <span className="block text-xs text-gray-400 pl-2">- Obs: {item.observacao}</span>}
                                        </span>
                                        <span className="font-medium shrink-0">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                                        <button
                                            type="button"
                                            className="shrink-0 text-gray-500 hover:text-red-400 transition-colors"
                                            disabled={salvandoItem}
                                            onClick={() => removerItem(idx)}
                                            aria-label="Remover item"
                                        >
                                            <FaTrash size={12} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {!mostrarFechamento ? (
                            <button
                                type="button"
                                className="form-button-primary w-full"
                                disabled={mesaAtiva.itens.length === 0}
                                onClick={() => setMostrarFechamento(true)}
                            >
                                Fechar Conta
                            </button>
                        ) : (
                            <div className="border-t border-white/[0.07] pt-3 space-y-2.5">
                                <p className="text-sm text-gray-400">Forma de pagamento</p>
                                <div className="flex bg-[#2a2a2a] rounded-lg p-1 border border-gray-700">
                                    {([
                                        { id: 'dinheiro', label: 'Dinheiro' },
                                        { id: 'cartao', label: 'Cartão' },
                                        { id: 'pix', label: 'PIX' },
                                    ] as { id: FormaPagamento; label: string }[]).map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setFormaPagamento(opt.id)}
                                            className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                                                formaPagamento === opt.id ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" className="flex-1 form-button-secondary" onClick={() => setMostrarFechamento(false)}>
                                        Voltar
                                    </button>
                                    <button type="button" className="flex-1 form-button-primary" disabled={fechandoConta} onClick={fecharConta}>
                                        {fechandoConta ? 'Fechando...' : `Confirmar · R$ ${calcularTotalItens(mesaAtiva.itens).toFixed(2)}`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Catálogo para adicionar itens */}
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar item por nome..."
                            className="form-input"
                        />

                        {busca.trim() ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                {itensFiltrados.map((item) => (
                                    <ItemCard key={item._id} item={item} onClick={() => abrirItem(item)} />
                                ))}
                                {itensFiltrados.length === 0 && (
                                    <p className="col-span-full text-sm text-gray-500 text-center py-6">Nenhum item encontrado.</p>
                                )}
                            </div>
                        ) : (
                            categorias.map((categoria) => {
                                const itensDaCategoria = menuItems.filter((i) => i.category === categoria.value);
                                if (itensDaCategoria.length === 0) return null;
                                return (
                                    <div key={categoria.value} className="space-y-2.5">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{categoria.label}</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                            {itensDaCategoria.map((item) => (
                                                <ItemCard key={item._id} item={item} onClick={() => abrirItem(item)} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {itemSelecionado && (
                <ItemModal
                    item={itemSelecionado}
                    onClose={() => setItemSelecionado(null)}
                    onAddToCart={handleAddToCart}
                    allPizzas={allPizzas}
                    categories={categorias}
                    submitLabel="Adicionar à Mesa"
                />
            )}
            {pastaSelecionada && (
                <PastaModal
                    item={pastaSelecionada}
                    onClose={() => setPastaSelecionada(null)}
                    onAddToCart={handlePastaAddToCart}
                    submitLabel="Adicionar à Mesa"
                />
            )}
        </div>
    );
}

function ItemCard({ item, onClick }: { item: MenuItem; onClick: () => void }) {
    const indisponivel = item.isAvailable === false;
    return (
        <button
            type="button"
            disabled={indisponivel}
            onClick={onClick}
            className={`text-left rounded-xl border p-3 transition-colors ${
                indisponivel
                    ? 'border-white/[0.05] bg-white/[0.015] opacity-50 cursor-not-allowed'
                    : 'border-white/[0.08] bg-[#111] hover:border-red-700/40 hover:bg-white/[0.03]'
            }`}
        >
            <p className="text-sm font-semibold text-white truncate">{item.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">R$ {item.price.toFixed(2)}</p>
            {indisponivel && <p className="text-[10px] text-red-400 mt-1">Indisponível</p>}
        </button>
    );
}
