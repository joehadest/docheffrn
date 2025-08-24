'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from '@/types/menu';
import Image from 'next/image';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaListAlt, FaThList } from 'react-icons/fa';

// --- COMPONENT: ITEM MODAL (COMPLETE) ---
const ItemModal = ({
  item,
  onClose,
  onSave,
  categories,
}: {
  item: Partial<MenuItem>;
  onClose: () => void;
  onSave: (itemData: Partial<MenuItem>) => void;
  categories: { value: string; label: string }[];
}) => {
  const [formData, setFormData] = useState<Partial<MenuItem>>(item);

  useEffect(() => {
    setFormData({
      name: '', description: '', price: 0, category: categories[0]?.value || '',
      image: '', destaque: false, ingredients: [], sizes: {}, borderOptions: {}, extraOptions: {},
      ...item,
    });
  }, [item, categories]);

  if (!formData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const isChecked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: isCheckbox ? isChecked : value }));
  };

  const handleDynamicChange = (section: 'sizes' | 'borderOptions' | 'extraOptions', key: string, field: 'name' | 'price', value: string) => {
    const currentSection = formData[section] || {};
    if (field === 'name') {
      const entries = Object.entries(currentSection);
      const newEntries = entries.map(([k, v]) => (k === key ? [value, v] : [k, v]));
      setFormData(prev => ({ ...prev, [section]: Object.fromEntries(newEntries) }));
    } else {
      setFormData(prev => ({ ...prev, [section]: { ...currentSection, [key]: parseFloat(value) || 0 } }));
    }
  };

  const addDynamicField = (section: 'sizes' | 'borderOptions' | 'extraOptions') => {
    const currentSection = formData[section] || {};
    const newKey = `Novo ${Object.keys(currentSection).length + 1}`;
    setFormData(prev => ({ ...prev, [section]: { ...currentSection, [newKey]: 0 } }));
  };

  const removeDynamicField = (section: 'sizes' | 'borderOptions' | 'extraOptions', key: string) => {
    const currentSection = { ...(formData[section] || {}) };
    delete (currentSection as any)[key];
    setFormData(prev => ({ ...prev, [section]: currentSection }));
  };
  
  const handleIngredientChange = (index: number, value: string) => {
    const newIngredients = [...(formData.ingredients || [])];
    newIngredients[index] = value;
    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => setFormData(prev => ({ ...prev, ingredients: [...(prev.ingredients || []), ''] }));
  const removeIngredient = (index: number) => setFormData(prev => ({ ...prev, ingredients: (prev.ingredients || []).filter((_, i) => i !== index) }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="bg-[#1e1e1e] rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-white border border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold mb-6 text-red-500">{formData._id ? 'Editar Item' : 'Adicionar Novo Item'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div><label className="form-label">Nome *</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" required /></div>
              <div><label className="form-label">Categoria *</label><select name="category" value={formData.category} onChange={handleChange} className="form-input" required>{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            </div>
            <div><label className="form-label">Descrição *</label><textarea name="description" value={formData.description} onChange={handleChange} className="form-input" rows={3}></textarea></div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div><label className="form-label">Preço (R$) *</label><input type="number" name="price" value={formData.price} onChange={handleChange} className="form-input" required step="0.01" /></div>
              <div><label className="form-label">URL da Imagem</label><input type="text" name="image" value={formData.image} onChange={handleChange} className="form-input" /></div>
            </div>
            <div className="flex items-center"><input type="checkbox" id="destaque" name="destaque" checked={formData.destaque} onChange={handleChange} className="form-checkbox" /><label htmlFor="destaque" className="ml-2 block text-sm text-gray-300">Item em destaque</label></div>
            <hr className="border-gray-700" />
            <div className="space-y-2"><label className="form-label">Ingredientes</label>{formData.ingredients?.map((ing, index) => (<div key={index} className="flex items-center gap-2"><input type="text" value={ing} onChange={e => handleIngredientChange(index, e.target.value)} className="form-input flex-grow" /><button type="button" onClick={() => removeIngredient(index)} className="form-button-danger p-2"><FaTrash /></button></div>))}<button type="button" onClick={addIngredient} className="form-button-secondary text-sm">+ Adicionar</button></div>
            <div className="space-y-2"><label className="form-label">Tamanhos e Preços</label>{Object.entries(formData.sizes || {}).map(([key, value]) => (<div key={key} className="flex items-center gap-2"><input type="text" value={key} onChange={e => handleDynamicChange('sizes', key, 'name', e.target.value)} className="form-input w-1/3" /><span className="text-gray-400">R$</span><input type="number" value={value} onChange={e => handleDynamicChange('sizes', key, 'price', e.target.value)} className="form-input flex-grow" step="0.01" /><button type="button" onClick={() => removeDynamicField('sizes', key)} className="form-button-danger p-2"><FaTrash /></button></div>))}<button type="button" onClick={() => addDynamicField('sizes')} className="form-button-secondary text-sm">+ Adicionar</button></div>
            <div className="space-y-2"><label className="form-label">Opções de Borda</label>{Object.entries(formData.borderOptions || {}).map(([key, value]) => (<div key={key} className="flex items-center gap-2"><input type="text" value={key} onChange={e => handleDynamicChange('borderOptions', key, 'name', e.target.value)} className="form-input w-1/3" /><span className="text-gray-400">+ R$</span><input type="number" value={value} onChange={e => handleDynamicChange('borderOptions', key, 'price', e.target.value)} className="form-input flex-grow" step="0.01" /><button type="button" onClick={() => removeDynamicField('borderOptions', key)} className="form-button-danger p-2"><FaTrash /></button></div>))}<button type="button" onClick={() => addDynamicField('borderOptions')} className="form-button-secondary text-sm">+ Adicionar</button></div>
            <div className="space-y-2"><label className="form-label">Opções de Extras</label>{Object.entries(formData.extraOptions || {}).map(([key, value]) => (<div key={key} className="flex items-center gap-2"><input type="text" value={key} onChange={e => handleDynamicChange('extraOptions', key, 'name', e.target.value)} className="form-input w-1/3" /><span className="text-gray-400">+ R$</span><input type="number" value={value} onChange={e => handleDynamicChange('extraOptions', key, 'price', e.target.value)} className="form-input flex-grow" step="0.01" /><button type="button" onClick={() => removeDynamicField('extraOptions', key)} className="form-button-danger p-2"><FaTrash /></button></div>))}<button type="button" onClick={() => addDynamicField('extraOptions')} className="form-button-secondary text-sm">+ Adicionar</button></div>
            <div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="form-button-secondary">Cancelar</button><button type="submit" className="form-button-primary"><FaSave className="mr-2" />{formData._id ? 'Atualizar' : 'Salvar'}</button></div>
          </form>
        </motion.div>
      </motion.div>
  );
};

// --- COMPONENT: CATEGORIES TAB (RESTORED) ---
const CategoriesTab = ({ categories: initialCategories, onUpdate }: { categories: { _id?: string; value: string; label: string; order?: number }[]; onUpdate: () => void }) => {
  const [categories, setCategories] = useState<{ _id?: string; value: string; label: string; order?: number; allowHalfAndHalf?: boolean }[]>(initialCategories);
  const [catForm, setCatForm] = useState({ value: '', label: '', order: 0, allowHalfAndHalf: false });
    const [catEditId, setCatEditId] = useState<string | null>(null);
    const [catLoading, setCatLoading] = useState(false);
    const [catError, setCatError] = useState('');

    const fetchCategories = async () => {
        setCatLoading(true);
        try {
            const res = await fetch('/api/categories');
            const data = await res.json();
            if (data.success) { setCategories(data.data); } 
            else { setCatError(data.error || 'Erro ao carregar categorias'); }
        } catch { setCatError('Erro de conexão.'); } 
        finally { setCatLoading(false); }
    };

    useEffect(() => { fetchCategories(); }, []);
    useEffect(() => { setCategories(initialCategories); }, [initialCategories]);

    const handleSaveCategory = async (e: FormEvent) => {
        e.preventDefault();
        setCatLoading(true); setCatError('');
        try {
      const method = catEditId ? 'PUT' : 'POST';
      const url = '/api/categories';
      const body = catEditId ? { ...catForm, _id: catEditId } : catForm;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
      if (data.success) {
        setCatForm({ value: '', label: '', order: 0, allowHalfAndHalf: false }); setCatEditId(null);
        fetchCategories();
        onUpdate();
      } else { setCatError(data.error || 'Erro ao salvar categoria'); }
        } catch { setCatError('Erro de conexão.'); } 
        finally { setCatLoading(false); }
    };

    const handleDeleteCategory = async (id?: string) => {
        if (!id || !confirm('Tem certeza que deseja excluir esta categoria?')) return;
        setCatLoading(true);
        try {
            const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) { fetchCategories(); onUpdate(); }
            else { setCatError(data.error || 'Erro ao excluir'); }
        } catch { setCatError('Erro de conexão.'); }
        finally { setCatLoading(false); }
    };

    return (
        <div className="bg-[#262525] rounded-xl p-6 border border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-4">Gerenciar Categorias</h2>
      <form onSubmit={handleSaveCategory} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input type="text" placeholder="Valor (ex: pizzas)" value={catForm.value} onChange={e => setCatForm({ ...catForm, value: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="form-input flex-1" required />
        <input type="text" placeholder="Nome (ex: Pizzas)" value={catForm.label} onChange={e => setCatForm({ ...catForm, label: e.target.value })} className="form-input flex-1" required />
        <input type="number" placeholder="Ordem" value={catForm.order} onChange={e => setCatForm({ ...catForm, order: parseInt(e.target.value) || 0 })} className="form-input w-24" />
        <label className="flex items-center space-x-2 text-white">
          <input
            type="checkbox"
            checked={catForm.allowHalfAndHalf}
            onChange={e => setCatForm({ ...catForm, allowHalfAndHalf: e.target.checked })}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <span>Permitir Meio a Meio?</span>
        </label>
        <button type="submit" className="form-button-primary" disabled={catLoading}>{catEditId ? 'Atualizar' : 'Adicionar'}</button>
        {catEditId && <button type="button" className="form-button-secondary" onClick={() => { setCatEditId(null); setCatForm({ value: '', label: '', order: 0, allowHalfAndHalf: false }); }}>Cancelar</button>}
      </form>
            {catError && <p className="text-red-500 text-sm mb-4">{catError}</p>}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                            <th className="p-2">Ordem</th>
                            <th className="p-2">Nome</th>
                            <th className="p-2">Valor</th>
                            <th className="p-2">Meio a Meio</th>
                            <th className="p-2">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.sort((a,b) => (a.order || 0) - (b.order || 0)).map(cat => (
                            <tr key={cat._id} className="border-b border-gray-700">
                                <td className="p-2">{cat.order}</td>
                                <td className="p-2">{cat.label}</td>
                                <td className="p-2">{cat.value}</td>
                                <td className="p-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        cat.allowHalfAndHalf 
                                            ? 'bg-green-900/30 text-green-400 border border-green-600/50' 
                                            : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                                    }`}>
                                        {cat.allowHalfAndHalf ? '✅ Ativo' : '❌ Inativo'}
                                    </span>
                                </td>
                                <td className="p-2 flex gap-2">
                                    <button onClick={() => {setCatEditId(cat._id!); setCatForm(cat as any);}} className="form-button-secondary p-2">
                                        <FaEdit/>
                                    </button>
                                    <button onClick={() => handleDeleteCategory(cat._id)} className="form-button-danger p-2">
                                        <FaTrash/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function AdminMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [activeTab, setActiveTab] = useState<'menu' | 'categories'>('menu');
  const [categories, setCategories] = useState<{ _id?: string; value: string; label: string; order?: number }[]>([]);
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [menuRes, catRes] = await Promise.all([ fetch('/api/menu/all'), fetch('/api/categories') ]);
      const menuData = await menuRes.json();
      if (menuData.success) {
          const sorted = menuData.data.sort((a: MenuItem, b: MenuItem) => (a.isAvailable === b.isAvailable) ? 0 : a.isAvailable ? -1 : 1);
          setMenuItems(sorted);
      } else { setError('Falha ao carregar o cardápio.'); }
      const catData = await catRes.json();
      if (catData.success) { setCategories(catData.data); } 
      else { setError((prev) => prev + ' Falha ao carregar categorias.'); }
    } catch (err) { setError('Erro de conexão.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAvailabilityChange = async (item: MenuItem, newStatus: boolean) => {
    setMenuItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, isAvailable: newStatus } : i)));
    try {
      const res = await fetch(`/api/menu/availability/${item._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAvailable: newStatus }) });
      if (!res.ok) throw new Error('Falha na API');
    } catch (error) {
      setMenuItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, isAvailable: !newStatus } : i)));
      alert('Não foi possível atualizar o status.');
    }
  };
  
  const handleOpenModal = (item: Partial<MenuItem> | null = null) => { setEditingItem(item || {}); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingItem(null); };

  const handleSaveItem = async (itemData: Partial<MenuItem>) => {
    const method = itemData._id ? 'PUT' : 'POST';
    const url = itemData._id ? `/api/menu/${itemData._id}` : '/api/menu';
    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemData) });
        if (res.ok) { handleCloseModal(); fetchData(); } 
        else { alert("Erro ao salvar o item.") }
    } catch (error) { alert("Erro de conexão.") }
  };

  const handleDeleteItem = async (id?: string, name?: string) => {
    if (!id || !name || !confirm(`Excluir "${name}"?`)) return;
    setDeletingItems(prev => new Set(prev).add(id));
    try {
        const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
        if (res.ok) { setMenuItems(prev => prev.filter(item => item._id !== id)); } 
        else { alert('Erro ao excluir.'); }
    } catch (err) { alert('Erro de conexão.');
    } finally {
        setDeletingItems(prev => { const newSet = new Set(prev); newSet.delete(id); return newSet; });
    }
  };
  
  const filteredItems = menuItems.filter((item) => selectedCategory === 'todas' || item.category === selectedCategory);

  return (
    <div className="bg-[#1a1a1a] min-h-screen text-gray-200 p-4 sm:p-6 lg:p-8">
      <style jsx global>{`
        .form-input { @apply w-full mt-1 p-2 bg-[#2a2a2a] border border-gray-600 rounded-md text-white focus:ring-red-500 focus:border-red-500 transition-colors; }
        .form-label { @apply block text-sm font-medium text-gray-300; }
        .form-checkbox { @apply h-4 w-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500; }
        .form-button-primary { @apply px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center font-semibold; }
        .form-button-secondary { @apply px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-700 transition-colors; }
        .form-button-danger { @apply p-2 bg-red-800 rounded-md hover:bg-red-700 transition-colors; }
      `}</style>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div><h1 className="text-3xl font-bold text-white">Admin do Cardápio</h1><p className="text-gray-400 mt-1">Gerencie os itens e categorias.</p></div>
          <div className="flex gap-2 mt-4 sm:mt-0">
             <button className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${activeTab === 'menu' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-gray-700'}`} onClick={() => setActiveTab('menu')}> <FaThList /> Itens</button>
             <button className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${activeTab === 'categories' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-gray-700'}`} onClick={() => setActiveTab('categories')}> <FaListAlt /> Categorias</button>
          </div>
        </div>

        {activeTab === 'menu' && (
          <div>
            <div className="bg-[#262525] rounded-xl p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-800">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full md:w-auto form-input">
                <option value="todas">Filtrar por Todas as Categorias</option>
                {categories.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
              </select>
              <motion.button onClick={() => handleOpenModal()} whileHover={{ scale: 1.05 }} className="w-full md:w-auto form-button-primary"><FaPlus /> Adicionar Novo Item</motion.button>
            </div>
            {loading ? <p className="text-center py-10">Carregando...</p> : error ? <p className="text-red-500 text-center py-10">{error}</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <motion.div key={item._id} layout className={`bg-[#2a2a2a] rounded-xl overflow-hidden border border-gray-800 flex flex-col justify-between transition-all hover:border-red-500 ${item.isAvailable === false ? 'opacity-50' : ''}`}>
                    <div>
                      <div className="relative h-40 w-full"><Image src={item.image || '/placeholder.jpg'} alt={item.name} layout="fill" className="object-cover" /></div>
                      <div className="p-4"><h3 className="text-lg font-bold text-white truncate">{item.name}</h3><p className="text-gray-400 text-sm mt-1">R$ {item.price.toFixed(2)}</p></div>
                    </div>
                    <div className="p-4 border-t border-gray-800 bg-[#1e1e1e]/50 flex justify-between items-center gap-2">
                        <div className="flex flex-col items-center"><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={item.isAvailable ?? true} onChange={(e) => handleAvailabilityChange(item, e.target.checked)} className="sr-only peer"/><div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div></label><span className={`text-xs mt-1 font-medium ${item.isAvailable ?? true ? 'text-green-400' : 'text-gray-400'}`}>{item.isAvailable ?? true ? 'On' : 'Off'}</span></div>
                        <div className='flex gap-2'>
                          <button className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700" onClick={() => handleOpenModal(item)}><FaEdit /></button>
                          <button className="bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 disabled:opacity-50" onClick={() => handleDeleteItem(item._id, item.name)} disabled={deletingItems.has(item._id!)}>{deletingItems.has(item._id!) ? '...' : <FaTrash />}</button>
                        </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && <CategoriesTab categories={categories} onUpdate={fetchData} />}
      </div>

      {isModalOpen && <AnimatePresence><ItemModal item={editingItem!} onClose={handleCloseModal} onSave={handleSaveItem} categories={categories} /></AnimatePresence>}
    </div>
  );
}