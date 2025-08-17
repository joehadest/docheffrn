'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from '@/types/menu';
import Image from 'next/image';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';

export default function AdminMenu() {
    // --- Estado do Componente ---
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('todas');
    const [activeTab, setActiveTab] = useState<'menu' | 'categories'>('menu');
    const [categories, setCategories] = useState<{ _id?: string, value: string, label: string, order?: number }[]>([]);
    const [catLoading, setCatLoading] = useState(false);
    const [catError, setCatError] = useState('');
    const [catForm, setCatForm] = useState<{ value: string, label: string, order?: number }>({ value: '', label: '', order: 0 });
    const [catEditId, setCatEditId] = useState<string | null>(null);

    // --- Tipo para o formulário de item ---
    interface FormData {
        name: string;
        description: string;
        price: number;
        category: string;
        image: string;
        destaque: boolean;
        sizes: { [key: string]: number };
        ingredients: string[];
        borderOptions: { [key: string]: number };
        extraOptions: { [key: string]: number };
    }

    const [formData, setFormData] = useState<FormData>({
        name: '',
        description: '',
        price: 0,
        category: 'pizzas',
        image: '',
        destaque: false,
        sizes: { 'Única': 0 },
        ingredients: [''],
        borderOptions: {},
        extraOptions: {}
    });

    // --- Funções de Lógica (placeholders) ---
    // Você precisa implementar a lógica de como esses dados são buscados e alterados.
    const fetchMenuItems = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/menu');
            const data = await res.json();
            if (data.success) {
                setMenuItems(data.data || []);
            } else {
                setError(data.error || 'Falha ao buscar itens do cardápio.');
            }
        } catch (err) {
            setError('Falha ao buscar itens do cardápio.');
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
                // Ordena as categorias pelo campo 'order' para manter sincronização com o cardápio
                const sorted = (data.data || []).slice().sort((a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0));
                setCategories(sorted);
            } else {
                setCatError(data.error || 'Falha ao buscar categorias.');
            }
        } catch (err) {
            setCatError('Falha ao buscar categorias.');
        } finally {
            setCatLoading(false);
        }
    };
    
    const handleIngredientChange = (index: number, value: string) => {
        const newIngredients = [...formData.ingredients];
        newIngredients[index] = value;
        setFormData({ ...formData, ingredients: newIngredients });
    };

    const removeIngredient = (index: number) => {
        const newIngredients = formData.ingredients.filter((_, i) => i !== index);
        setFormData({ ...formData, ingredients: newIngredients });
    };

    const addIngredient = () => {
        setFormData({
            ...formData,
            ingredients: [...formData.ingredients, '']
        });
    };

    const applyPizzaDefaults = () => {
        setFormData({
            ...formData,
            sizes: { 'Pequena': 0, 'Média': 0, 'Grande': 0, 'Gigante': 0 },
            borderOptions: { 'Sem Borda': 0, 'Catupiry': 5, 'Cheddar': 5 },
            extraOptions: { 'Azeitona Extra': 3.5, 'Bacon Extra': 4 }
        });
    };

    // --- Efeitos do Componente ---
    useEffect(() => {
        fetchMenuItems();
        fetchCategories();
    }, []);

    // --- Renderização do Componente ---
    return (
        <div className="container mx-auto p-4 md:p-8 bg-gray-900 min-h-screen text-gray-200 rounded-2xl">
            <h1 className="text-3xl font-bold mb-6 text-red-600">Admin do Cardápio</h1>

            {/* Abas de navegação */}
            <div className="flex gap-2 mb-6">
                <button
                    className={`px-4 py-2 rounded-t-lg font-bold ${activeTab === 'menu' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                    onClick={() => setActiveTab('menu')}
                >Itens do Cardápio</button>
                <button
                    className={`px-4 py-2 rounded-t-lg font-bold ${activeTab === 'categories' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                    onClick={() => setActiveTab('categories')}
                >Categorias</button>
            </div>

            {/* Aba de Categorias */}
            {activeTab === 'categories' && (
                <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-red-600">Gerenciar Categorias</h2>
                        <button
                            onClick={async () => {
                                try {
                                    setCatLoading(true);
                                    setCatError('');
                                    const res = await fetch('/api/categories', {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ categories: categories })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        fetchCategories();
                                    } else {
                                        setCatError(data.error || 'Erro ao sincronizar ordem');
                                    }
                                } catch {
                                    setCatError('Erro ao conectar com o servidor');
                                } finally {
                                    setCatLoading(false);
                                }
                            }}
                            disabled={catLoading}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {catLoading ? 'Sincronizando...' : 'Salvar Ordem Atual'}
                        </button>
                    </div>
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const method = catEditId ? 'PUT' : 'POST';
                                const url = '/api/categories';
                                const body = catEditId ? { ...catForm, _id: catEditId } : catForm;
                                if (typeof body.order !== 'number') body.order = 0;
                                const res = await fetch(url, {
                                    method,
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(body)
                                });
                                const data = await res.json();
                                if (data.success) {
                                    setCatForm({ value: '', label: '', order: 0 });
                                    setCatEditId(null);
                                    fetchCategories();
                                } else {
                                    setCatError(data.error || 'Erro ao salvar categoria');
                                }
                            } catch {
                                setCatError('Erro ao conectar com o servidor');
                            }
                        }}
                        className="flex flex-col sm:flex-row gap-2 mb-4"
                    >
                        <input
                            type="text"
                            placeholder="Valor (ex: pizzas)"
                            value={catForm.value}
                            onChange={e => setCatForm({ ...catForm, value: e.target.value })}
                            className="rounded-md border border-gray-600 bg-[#262525] text-white px-3 py-2 flex-1"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Nome (ex: Pizzas)"
                            value={catForm.label}
                            onChange={e => setCatForm({ ...catForm, label: e.target.value })}
                            className="rounded-md border border-gray-600 bg-[#262525] text-white px-3 py-2 flex-1"
                            required
                        />
                        <input
                            type="number"
                            placeholder="Ordem"
                            value={typeof catForm.order === 'number' ? catForm.order : 0}
                            min={0}
                            onChange={e => setCatForm({ ...catForm, order: parseInt(e.target.value) || 0 })}
                            className="rounded-md border border-gray-600 bg-[#262525] text-white px-3 py-2 w-24"
                        />
                        <button
                            type="submit"
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold"
                            disabled={catLoading}
                        >{catEditId ? 'Salvar' : 'Adicionar'}</button>
                        {catEditId && (
                            <button type="button" className="bg-gray-600 text-white px-4 py-2 rounded-lg" onClick={() => { setCatEditId(null); setCatForm({ value: '', label: '' }); }}>Cancelar</button>
                        )}
                    </form>
                    {catError && <div className="text-red-400 mb-2">{catError}</div>}
                    <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-300">
                            <strong>Salvar Ordem Atual:</strong> Salva a ordem atual da tabela como a nova ordem padrão para o cardápio. Organize as categorias manualmente alterando os números na coluna "Ordem" e clique neste botão para aplicar as mudanças.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400">
                                    <th className="py-2">Ordem</th>
                                    <th className="py-2">Valor</th>
                                    <th className="py-2">Nome</th>
                                    <th className="py-2">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map(cat => (
                                    <tr key={cat._id || cat.value} className="border-b border-gray-700">
                                        <td className="py-2 text-white">
                                            <input
                                                type="number"
                                                value={typeof cat.order === 'number' ? cat.order : 0}
                                                min={0}
                                                className="w-16 rounded border border-gray-600 bg-[#262525] text-white px-2 py-1"
                                                onChange={async (e) => {
                                                    const newOrder = parseInt(e.target.value) || 0;
                                                    try {
                                                        setCatLoading(true);
                                                        setCatError('');
                                                        const res = await fetch('/api/categories', {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ ...cat, order: newOrder })
                                                        });
                                                        const data = await res.json();
                                                        if (data.success) fetchCategories();
                                                        else setCatError(data.error || 'Erro ao atualizar ordem');
                                                    } catch {
                                                        setCatError('Erro ao conectar com o servidor');
                                                    } finally {
                                                        setCatLoading(false);
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="py-2 text-white">{cat.value}</td>
                                        <td className="py-2 text-white">{cat.label}</td>
                                        <td className="py-2">
                                            <button className="bg-blue-600 text-white px-3 py-1 rounded-lg mr-2" onClick={() => { setCatEditId(cat._id || ''); setCatForm({ value: cat.value, label: cat.label, order: cat.order ?? 0 }); }}>Editar</button>
                                            <button className="bg-red-600 text-white px-3 py-1 rounded-lg" onClick={async () => {
                                                if (!confirm('Excluir esta categoria?')) return;
                                                setCatLoading(true);
                                                setCatError('');
                                                try {
                                                    const res = await fetch('/api/categories', {
                                                        method: 'DELETE',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ _id: cat._id })
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) fetchCategories();
                                                    else setCatError(data.error || 'Erro ao excluir categoria');
                                                } catch {
                                                    setCatError('Erro ao conectar com o servidor');
                                                } finally {
                                                    setCatLoading(false);
                                                }
                                            }}>Excluir</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Aba de Cardápio */}
            {activeTab === 'menu' && (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
                        <h2 className="text-2xl font-semibold">Itens</h2>
                        <div className="flex items-center gap-2">
                            <label htmlFor="filtro-categoria" className="text-sm text-gray-300 font-medium">Filtrar por categoria:</label>
                            <select
                                id="filtro-categoria"
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                                className="rounded-md border border-gray-600 bg-[#262525] text-white px-3 py-2"
                            >
                                <option value="todas">Todas</option>
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                            <motion.button
                                onClick={() => {
                                    setShowAddModal(true);
                                    setEditingItem(null);
                                    setFormData({
                                        name: '',
                                        description: '',
                                        price: 0,
                                        category: categories[0]?.value || 'pizzas',
                                        image: '',
                                        destaque: false,
                                        sizes: { 'Única': 0 },
                                        ingredients: [''],
                                        borderOptions: {},
                                        extraOptions: {}
                                    });
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                            >
                                <FaPlus /> Adicionar Item
                            </motion.button>
                        </div>
                    </div>

                    {loading ? (
                        <p>Carregando itens...</p>
                    ) : error ? (
                        <p className="text-red-500">{error}</p>
                    ) : menuItems.length === 0 ? (
                        <p className="text-gray-400">Nenhum item encontrado.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {menuItems
                                .filter(item => selectedCategory === 'todas' || item.category === selectedCategory)
                                .map(item => (
                                    <div key={item._id} className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2">
                                        <div className="flex items-center gap-4">
                                            <img src={item.image || '/placeholder.jpg'} alt={item.name} className="w-20 h-20 object-cover rounded" />
                                            <div>
                                                <h3 className="text-lg font-bold text-white">{item.name}</h3>
                                                <p className="text-gray-400">R$ {item.price.toFixed(2)}</p>
                                                <p className="text-xs text-gray-500">{item.category}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                className="bg-blue-600 text-white px-3 py-1 rounded"
                                                onClick={() => {
                                                    setEditingItem(item);
                                                    setShowEditModal(true);
                                                    setFormData({
                                                        name: item.name,
                                                        description: item.description,
                                                        price: item.price,
                                                        category: item.category,
                                                        image: item.image,
                                                        destaque: item.destaque,
                                                        sizes: item.sizes ? { ...item.sizes } : { 'Única': 0 },
                                                        ingredients: item.ingredients ? [...item.ingredients] : [''],
                                                        borderOptions: item.borderOptions ? { ...item.borderOptions } : {},
                                                        extraOptions: item.extraOptions ? { ...item.extraOptions } : {}
                                                    });
                                                }}
                                            >
                                                Editar
                                            </button>
                                            <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={() => {/* implementar exclusão */}}>Excluir</button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </>
            )}

            {/* Modal de Adicionar/Editar */}
            <AnimatePresence>
                {(showAddModal || showEditModal) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 50 }}
                            className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <h3 className="text-xl font-bold mb-4">
                                {editingItem ? 'Editar Item' : 'Adicionar Novo Item'}
                            </h3>
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    try {
                                        const method = editingItem ? 'PUT' : 'POST';
                                        const url = editingItem ? `/api/menu/${editingItem._id}` : '/api/menu';
                                        const body = editingItem ? { ...formData, _id: editingItem._id } : formData;
                                        const res = await fetch(url, {
                                            method,
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(body)
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            setShowAddModal(false);
                                            setShowEditModal(false);
                                            setEditingItem(null);
                                            setFormData({
                                                name: '',
                                                description: '',
                                                price: 0,
                                                category: categories[0]?.value || 'pizzas',
                                                image: '',
                                                destaque: false,
                                                sizes: { 'Única': 0 },
                                                ingredients: [''],
                                                borderOptions: {},
                                                extraOptions: {}
                                            });
                                            fetchMenuItems();
                                        } else {
                                            alert(data.error || 'Erro ao salvar item');
                                        }
                                    } catch {
                                        alert('Erro ao conectar com o servidor');
                                    }
                                }}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Nome do Item */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-200 mb-2">
                                            Nome do Item *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                            required
                                        />
                                    </div>
                                    {/* Categoria */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-200 mb-2">
                                            Categoria *
                                        </label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                            required
                                        >
                                            {categories.map(category => (
                                                <option key={category.value} value={category.value}>
                                                    {category.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {/* Descrição */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-200 mb-2">
                                        Descrição *
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    {/* Preço */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-200 mb-2">
                                            Preço (R$) *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                            required
                                        />
                                    </div>
                                    {/* URL da Imagem */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-200 mb-2">
                                            URL da Imagem
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.image}
                                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                            className="w-full rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                                {/* Destaque */}
                                <div>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.destaque}
                                            onChange={(e) => setFormData({ ...formData, destaque: e.target.checked })}
                                            className="rounded border-gray-600 bg-[#1a1a1a] text-red-600 focus:ring-red-600"
                                        />
                                        <span className="text-gray-200">Item em destaque</span>
                                    </label>
                                </div>
                                {/* Ingredientes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-200 mb-2">
                                        Ingredientes
                                    </label>
                                    {formData.ingredients.map((ingredient, index) => (
                                        <div key={index} className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={ingredient}
                                                onChange={(e) => handleIngredientChange(index, e.target.value)}
                                                className="flex-1 rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                                placeholder="Ex: Mussarela"
                                            />
                                            {formData.ingredients.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeIngredient(index)}
                                                    className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700"
                                                >
                                                    <FaTrash />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addIngredient}
                                        className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm"
                                    >
                                        + Adicionar Ingrediente
                                    </button>
                                </div>
                                {/* Seção de Tamanhos */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-200">
                                            Tamanhos e Preços
                                        </label>
                                        {formData.category === 'pizzas' && (
                                            <button
                                                type="button"
                                                onClick={applyPizzaDefaults}
                                                className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
                                            >
                                                Aplicar Padrão Pizza
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {Object.entries(formData.sizes).map(([size, price]) => (
                                            <div key={size + price} className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={size}
                                                    onChange={(e) => {
                                                        const entries = Object.entries(formData.sizes);
                                                        const newEntries = entries.map(([s, p], idx) => idx === entries.findIndex(([ss]) => ss === size) ? [e.target.value, p] : [s, p]);
                                                        setFormData({ ...formData, sizes: Object.fromEntries(newEntries) });
                                                    }}
                                                    className="w-20 rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                                    placeholder="P, G, Única"
                                                />
                                                <span className="text-gray-400">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={price}
                                                    onChange={(e) => {
                                                        const entries = Object.entries(formData.sizes);
                                                        const newEntries = entries.map(([s, p], idx) => idx === entries.findIndex(([ss]) => ss === size) ? [s, parseFloat(e.target.value) || 0] : [s, p]);
                                                        setFormData({ ...formData, sizes: Object.fromEntries(newEntries) });
                                                    }}
                                                    className="w-24 rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const entries = Object.entries(formData.sizes);
                                                        const newEntries = entries.filter(([s]) => s !== size);
                                                        setFormData({ ...formData, sizes: Object.fromEntries(newEntries) });
                                                    }}
                                                    className="bg-red-600 text-white px-2 py-2 rounded-md hover:bg-red-700"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newSizes = { ...formData.sizes };
                                                newSizes['Novo'] = 0;
                                                setFormData({ ...formData, sizes: newSizes });
                                            }}
                                            className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm"
                                        >
                                            + Adicionar Tamanho
                                        </button>
                                    </div>
                                </div>
                                {/* Seção de Opções de Borda (apenas para pizzas) */}
                                {formData.category === 'pizzas' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-200 mb-2">
                                            Opções de Borda
                                        </label>
                                        <div className="space-y-2">
                                            {Object.entries(formData.borderOptions).map(([border, price]) => (
                                                <div key={border} className="flex gap-2 items-center">
                                                    <input
                                                        type="text"
                                                        value={border}
                                                        onChange={(e) => {
                                                            const newBorders = { ...formData.borderOptions };
                                                            delete newBorders[border];
                                                            newBorders[e.target.value] = price;
                                                            setFormData({ ...formData, borderOptions: newBorders });
                                                        }}
                                                        className="flex-1 rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                                        placeholder="Ex: Sem Borda, Catupiry"
                                                    />
                                                    <span className="text-gray-400">+R$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={price}
                                                        onChange={(e) => {
                                                            const newBorders = { ...formData.borderOptions };
                                                            newBorders[border] = parseFloat(e.target.value) || 0;
                                                            setFormData({ ...formData, borderOptions: newBorders });
                                                        }}
                                                        className="w-24 rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newBorders = { ...formData.borderOptions };
                                                            delete newBorders[border];
                                                            setFormData({ ...formData, borderOptions: newBorders });
                                                        }}
                                                        className="bg-red-600 text-white px-2 py-2 rounded-md hover:bg-red-700"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newBorders = { ...formData.borderOptions };
                                                    newBorders['Nova Borda'] = 0;
                                                    setFormData({ ...formData, borderOptions: newBorders });
                                                }}
                                                className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm"
                                            >
                                                + Adicionar Opção de Borda
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {/* Seção de Extras (para pizzas e massas) */}
                                {(formData.category === 'pizzas' || formData.category === 'massas') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-200 mb-2">
                                            Opções de Extras
                                        </label>
                                        <div className="space-y-2">
                                            {Object.entries(formData.extraOptions).map(([extra, price]) => (
                                                <div key={extra} className="flex gap-2 items-center">
                                                    <input
                                                        type="text"
                                                        value={extra}
                                                        onChange={(e) => {
                                                            const newExtras = { ...formData.extraOptions };
                                                            delete newExtras[extra];
                                                            newExtras[e.target.value] = price;
                                                            setFormData({ ...formData, extraOptions: newExtras });
                                                        }}
                                                        className="flex-1 rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                                        placeholder="Ex: Cheddar Extra, Bacon"
                                                    />
                                                    <span className="text-gray-400">+R$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={price}
                                                        onChange={(e) => {
                                                            const newExtras = { ...formData.extraOptions };
                                                            newExtras[extra] = parseFloat(e.target.value) || 0;
                                                            setFormData({ ...formData, extraOptions: newExtras });
                                                        }}
                                                        className="w-24 rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newExtras = { ...formData.extraOptions };
                                                            delete newExtras[extra];
                                                            setFormData({ ...formData, extraOptions: newExtras });
                                                        }}
                                                        className="bg-red-600 text-white px-2 py-2 rounded-md hover:bg-red-700"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newExtras = { ...formData.extraOptions };
                                                    newExtras['Novo Extra'] = 0;
                                                    setFormData({ ...formData, extraOptions: newExtras });
                                                }}
                                                className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm"
                                            >
                                                + Adicionar Extra
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end gap-4 pt-4">
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            setShowAddModal(false);
                                            setShowEditModal(false);
                                        }}
                                        className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
                                    >
                                        <FaTimes /> Cancelar
                                    </motion.button>
                                    <motion.button
                                        type="submit"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                                    >
                                        <FaSave /> {editingItem ? 'Atualizar' : 'Adicionar'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}