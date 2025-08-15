'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from '@/types/menu';
import Image from 'next/image';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';

export default function AdminMenu() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('todas');

    // Tipo para o formulário
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

    // Formulário para novo item ou edição
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

    const categories = [
        { value: 'pizzas', label: 'Pizzas' },
        { value: 'massas', label: 'Massas' },
        { value: 'hamburguer', label: 'Hambúrgueres' },
        { value: 'panquecas', label: 'Panquecas' },
        { value: 'tapiocas', label: 'Tapiocas' },
        { value: 'esfirras', label: 'Esfirras' },
        { value: 'petiscos', label: 'Petiscos' },
        { value: 'bebidas', label: 'Bebidas' }
    ];

    useEffect(() => {
        fetchMenuItems();
    }, []);

    const fetchMenuItems = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/menu');
            const data = await response.json();
            if (data.success) {
                setMenuItems(data.data || []);
            } else {
                setError(data.error || 'Erro ao carregar itens do cardápio');
            }
        } catch (err) {
            setError('Erro ao conectar com o servidor');
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setFormData({
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
        setShowAddModal(true);
    };

    const handleEditItem = (item: MenuItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            image: item.image || '',
            destaque: item.destaque || false,
            sizes: item.sizes || { 'Única': item.price },
            ingredients: item.ingredients || [''],
            borderOptions: item.borderOptions || {},
            extraOptions: item.extraOptions || {}
        });
        setShowEditModal(true);
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return;

        try {
            const response = await fetch(`/api/menu/${itemId}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            if (data.success) {
                await fetchMenuItems();
                alert('Item excluído com sucesso!');
            } else {
                alert(data.error || 'Erro ao excluir item');
            }
        } catch (err) {
            alert('Erro ao conectar com o servidor');
            console.error('Erro:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingItem ? `/api/menu/${editingItem._id}` : '/api/menu';
            const method = editingItem ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    ingredients: formData.ingredients.filter(ing => ing.trim() !== '')
                }),
            });

            const data = await response.json();
            if (data.success) {
                await fetchMenuItems();
                setShowAddModal(false);
                setShowEditModal(false);
                setEditingItem(null);
                alert(editingItem ? 'Item atualizado com sucesso!' : 'Item adicionado com sucesso!');
            } else {
                alert(data.error || 'Erro ao salvar item');
            }
        } catch (err) {
            alert('Erro ao conectar com o servidor');
            console.error('Erro:', err);
        }
    };

    const handleIngredientChange = (index: number, value: string) => {
        const newIngredients = [...formData.ingredients];
        newIngredients[index] = value;
        setFormData({ ...formData, ingredients: newIngredients });
    };

    const addIngredient = () => {
        setFormData({ ...formData, ingredients: [...formData.ingredients, ''] });
    };

    const removeIngredient = (index: number) => {
        const newIngredients = formData.ingredients.filter((_, i) => i !== index);
        setFormData({ ...formData, ingredients: newIngredients });
    };

    const applyPizzaDefaults = () => {
        setFormData({
            ...formData,
            sizes: {
                P: 27,
                G: 45
            },
            borderOptions: {
                "Sem Borda": 0,
                "Chocolate": 4,
                "Catupiry": 4,
                "Cheddar": 4
            },
            extraOptions: {
                "Cheddar Extra": 3,
                "Catupiry Extra": 3
            }
        });
    };

    const filteredItems = (selectedCategory === 'todas'
        ? menuItems
        : menuItems.filter(item => item.category === selectedCategory))
        .slice() // cópia para não mutar o estado
        .sort((a, b) => {
            // Se tiver tamanhos, pega o menor preço do array de tamanhos
            const getMinPrice = (item: MenuItem) => {
                if (item.sizes && Object.values(item.sizes).length > 0) {
                    return Math.min(...Object.values(item.sizes));
                }
                return item.price;
            };
            return getMinPrice(a) - getMinPrice(b);
        });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-white text-lg">Carregando cardápio...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-red-600">Gerenciar Cardápio</h2>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddItem}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                    <FaPlus /> Adicionar Item
                </motion.button>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg">
                    {error}
                </div>
            )}

            {/* Filtro por categoria */}
            <div className="flex flex-wrap gap-2 mb-6 w-full justify-center">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 w-full max-w-2xl mx-auto">
                    <button
                        onClick={() => setSelectedCategory('todas')}
                        className={`px-4 py-2 rounded-full transition-colors w-full text-center ${selectedCategory === 'todas'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                    >
                        Todas
                    </button>
                    {categories.map(category => (
                        <button
                            key={category.value}
                            onClick={() => setSelectedCategory(category.value)}
                            className={`px-4 py-2 rounded-full transition-colors w-full text-center ${selectedCategory === category.value
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista de itens */}
            <div className="grid sm:grid-cols-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {filteredItems.map((item) => (
                    <motion.div
                        key={item._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden flex flex-col h-full"
                    >
                        <div className="relative h-48">
                            <Image
                                src={item.image || '/placeholder.jpg'}
                                alt={item.name}
                                fill
                                className="object-cover"
                            />
                            {item.destaque && (
                                <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs">
                                    Destaque
                                </div>
                            )}
                        </div>

                        <div className="p-4">
                            <h3 className="text-lg font-semibold text-white mb-2">{item.name}</h3>
                            <p className="text-gray-400 text-sm mb-2 line-clamp-2">{item.description}</p>
                            <p className="text-red-500 font-bold mb-4">R$ {item.price.toFixed(2)}</p>

                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleEditItem(item)}
                                    className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
                                >
                                    <FaEdit /> Editar
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleDeleteItem(item._id)}
                                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 flex items-center gap-1 text-sm"
                                >
                                    <FaTrash /> Excluir
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal para adicionar/editar item */}
            <AnimatePresence>
                {(showAddModal || showEditModal) && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            setShowAddModal(false);
                            setShowEditModal(false);
                        }}
                    >
                        <motion.div
                            className="bg-[#262525] rounded-xl shadow-xl p-4 sm:p-6 max-w-full sm:max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">
                                    {editingItem ? 'Editar Item' : 'Adicionar Novo Item'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setShowEditModal(false);
                                    }}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
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
                                            <div key={size} className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={size}
                                                    onChange={(e) => {
                                                        const newSizes = { ...formData.sizes };
                                                        delete newSizes[size];
                                                        newSizes[e.target.value] = price;
                                                        setFormData({ ...formData, sizes: newSizes });
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
                                                        const newSizes = { ...formData.sizes };
                                                        newSizes[size] = parseFloat(e.target.value) || 0;
                                                        setFormData({ ...formData, sizes: newSizes });
                                                    }}
                                                    className="w-24 rounded-md border border-gray-600 bg-[#1a1a1a] text-white px-3 py-2 focus:border-red-600 focus:ring-red-600"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newSizes = { ...formData.sizes };
                                                        delete newSizes[size];
                                                        setFormData({ ...formData, sizes: newSizes });
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
