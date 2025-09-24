'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from '@/types/menu';
import Image from 'next/image';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaListAlt, FaThList, FaInfoCircle, FaPizzaSlice, FaPepperHot } from 'react-icons/fa';

// --- COMPONENT: ITEM MODAL (TABBED) ---
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
  const [tab, setTab] = useState<'basic' | 'options' | 'ingredients'>('basic');

  // Inicialização / sincronização
  useEffect(() => {
    setFormData(prev => ({
      name: '', description: '', price: 0, category: categories[0]?.value || '', image: '', destaque: false,
      ingredients: [], sizes: {}, borderOptions: {}, extraOptions: {},
      ...item,
    }));
  }, [item, categories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: isCheckbox ? checked : value }));
  };

  const handleDynamicChange = (section: 'sizes' | 'borderOptions' | 'extraOptions', key: string, field: 'name' | 'price', value: string) => {
    const current = formData[section] || {};
    if (field === 'name') {
      const newEntries = Object.entries(current).map(([k, v]) => (k === key ? [value, v] : [k, v]));
      setFormData(prev => ({ ...prev, [section]: Object.fromEntries(newEntries) }));
    } else {
      setFormData(prev => ({ ...prev, [section]: { ...current, [key]: parseFloat(value) || 0 } }));
    }
  };

  const addDynamicField = (section: 'sizes' | 'borderOptions' | 'extraOptions') => {
    const current = formData[section] || {};
    const newKey = `Novo ${Object.keys(current).length + 1}`;
    setFormData(prev => ({ ...prev, [section]: { ...current, [newKey]: 0 } }));
  };

  const removeDynamicField = (section: 'sizes' | 'borderOptions' | 'extraOptions', key: string) => {
    const current = { ...(formData[section] || {}) } as Record<string, number>;
    delete current[key];
    setFormData(prev => ({ ...prev, [section]: current }));
  };

  const handleIngredientChange = (index: number, value: string) => {
    const arr = [...(formData.ingredients || [])];
    arr[index] = value;
    setFormData(prev => ({ ...prev, ingredients: arr }));
  };
  const addIngredient = () => setFormData(prev => ({ ...prev, ingredients: [...(prev.ingredients || []), ''] }));
  const removeIngredient = (index: number) => setFormData(prev => ({ ...prev, ingredients: (prev.ingredients || []).filter((_, i) => i !== index) }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const TabButton = ({ id, icon, label }: { id: 'basic' | 'options' | 'ingredients'; icon: React.ReactNode; label: string }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 text-xs sm:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${tab === id ? 'bg-red-600 text-white border-red-500' : 'bg-[#2a2a2a] border-gray-700 text-gray-300 hover:bg-gray-700'}`}
      aria-current={tab === id ? 'page' : undefined}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.substring(0, 4)}</span>
    </button>
  );

  const Section: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <section className={`space-y-3 ${className || ''}`}>
      {title && <h3 className="text-sm font-semibold text-gray-300 tracking-wide">{title}</h3>}
      {children}
    </section>
  );

  const DynamicList = ({
    section,
    label,
    currencyPrefix,
  }: { section: 'sizes' | 'borderOptions' | 'extraOptions'; label: string; currencyPrefix?: string }) => (
    <div className="space-y-2">
      <label className="form-label">{label}</label>
      {Object.entries(formData[section] || {}).map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <input
            type="text"
            value={key}
            onChange={e => handleDynamicChange(section, key, 'name', e.target.value)}
            className="form-input w-1/3"
          />
          <span className="text-gray-400">{currencyPrefix || 'R$'}</span>
          <input
            type="number"
            value={value}
            onChange={e => handleDynamicChange(section, key, 'price', e.target.value)}
            className="form-input flex-grow"
            step="0.01"
          />
          <button type="button" onClick={() => removeDynamicField(section, key)} className="form-button-danger p-2"><FaTrash /></button>
        </div>
      ))}
      <button type="button" onClick={() => addDynamicField(section)} className="form-button-secondary text-sm">+ Adicionar</button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
      role="dialog" aria-modal="true" aria-labelledby="edit-item-modal-title"
    >
      <motion.div
        initial={{ scale: 0.94, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 18 }}
        className="modal-panel wide text-white flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <button onClick={onClose} className="modal-close-btn focus-outline" aria-label="Fechar modal"><FaTimes /></button>
        <h2 id="edit-item-modal-title" className="text-2xl font-bold mb-4 text-red-500">{formData._id ? 'Editar Item' : 'Adicionar Novo Item'}</h2>
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton id="basic" icon={<FaInfoCircle />} label="Básico" />
          <TabButton id="options" icon={<FaPizzaSlice />} label="Opções" />
          <TabButton id="ingredients" icon={<FaPepperHot />} label="Ingredientes" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 text-sm overflow-y-auto pr-1 custom-scrollbar flex-1">
          {tab === 'basic' && (
            <div className="space-y-6">
              <Section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Nome *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" required />
                  </div>
                  <div>
                    <label className="form-label">Categoria *</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="form-input" required>
                      {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Descrição *</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="form-input"></textarea>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Preço (R$) *</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} step="0.01" className="form-input" required />
                  </div>
                  <div>
                    <label className="form-label">URL da Imagem</label>
                    <input type="text" name="image" value={formData.image} onChange={handleChange} className="form-input" />
                  </div>
                </div>
                <div className="flex items-center pt-2">
                  <input type="checkbox" id="destaque" name="destaque" checked={formData.destaque} onChange={handleChange} className="form-checkbox" />
                  <label htmlFor="destaque" className="ml-2 text-sm text-gray-300 select-none">Item em destaque</label>
                </div>
              </Section>
            </div>
          )}

          {tab === 'options' && (
            <div className="space-y-8">
              <Section title="Tamanhos e Preços">
                <DynamicList section="sizes" label="Tamanhos" />
              </Section>
              <Section title="Opções de Borda">
                <DynamicList section="borderOptions" label="Bordas" currencyPrefix="+ R$" />
              </Section>
              <Section title="Opções de Extras">
                <DynamicList section="extraOptions" label="Extras" currencyPrefix="+ R$" />
              </Section>
            </div>
          )}

          {tab === 'ingredients' && (
            <div className="space-y-6">
              <Section title="Ingredientes">
                <div className="space-y-2">
                  {(formData.ingredients || []).map((ing, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ing}
                        onChange={e => handleIngredientChange(index, e.target.value)}
                        className="form-input flex-grow"
                      />
                      <button type="button" onClick={() => removeIngredient(index)} className="form-button-danger p-2" aria-label="Remover ingrediente"><FaTrash /></button>
                    </div>
                  ))}
                  <button type="button" onClick={addIngredient} className="form-button-secondary text-sm">+ Adicionar</button>
                </div>
              </Section>
            </div>
          )}
        </form>
        <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-800">
          <button type="button" onClick={onClose} className="form-button-secondary">Cancelar</button>
          <button onClick={(e) => { e.preventDefault(); onSave(formData); }} className="form-button-primary inline-flex items-center gap-2"><FaSave /> {formData._id ? 'Atualizar' : 'Salvar'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- COMPONENT: CATEGORY MODAL ---
const CategoryModal = ({
  category,
  onClose,
  onSaved
}: {
  category: { _id?: string; value: string; label: string; order?: number; allowHalfAndHalf?: boolean } | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const isEdit = !!category?._id;
  const [form, setForm] = useState({
    value: category?.value || '',
    label: category?.label || '',
    order: category?.order || 0,
    allowHalfAndHalf: category?.allowHalfAndHalf || false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...form, _id: category?._id } : form;
      const res = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) { onSaved(); onClose(); }
      else setError(data.error || 'Erro ao salvar');
    } catch { setError('Erro de conexão'); }
    finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="modal-overlay"
        onClick={onClose}
        role="dialog" aria-modal="true" aria-labelledby="category-modal-title"
      >
        <motion.div
          initial={{ scale: 0.94, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 18 }}
          className="modal-panel slim"
          role="document"
          onClick={e => e.stopPropagation()}
        >
          <button className="modal-close-btn focus-outline" onClick={onClose} aria-label="Fechar modal de categoria"><FaTimes /></button>
          <h2 id="category-modal-title" className="text-xl font-bold mb-4 text-red-500">{isEdit ? 'Editar Categoria' : 'Nova Categoria'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <label className="form-label">Valor (slug)</label>
              <input
                type="text"
                className="form-input"
                value={form.value}
                onChange={e => setForm({ ...form, value: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                required
              />
            </div>
            <div>
              <label className="form-label">Nome</label>
              <input
                type="text"
                className="form-input"
                value={form.label}
                onChange={e => setForm({ ...form, label: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Ordem</label>
              <input
                type="number"
                className="form-input"
                value={form.order}
                onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                id="allowHalfAndHalf"
                type="checkbox"
                className="form-checkbox"
                checked={form.allowHalfAndHalf}
                onChange={e => setForm({ ...form, allowHalfAndHalf: e.target.checked })}
              />
              <label htmlFor="allowHalfAndHalf" className="text-gray-300">Permitir Meio a Meio?</label>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="form-button-secondary">Cancelar</button>
              <button type="submit" disabled={loading} className="form-button-primary gap-2 inline-flex items-center">{loading ? 'Salvando...' : (isEdit ? 'Atualizar' : 'Salvar')}</button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- COMPONENT: CATEGORIES TAB (MODAL VERSION) ---
const CategoriesTab = ({ categories: initialCategories, onUpdate }: { categories: { _id?: string; value: string; label: string; order?: number; allowHalfAndHalf?: boolean }[]; onUpdate: () => void }) => {
  const [categories, setCategories] = useState<{ _id?: string; value: string; label: string; order?: number; allowHalfAndHalf?: boolean }[]>(initialCategories);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState('');
  const [modalCategory, setModalCategory] = useState<{ _id?: string; value: string; label: string; order?: number; allowHalfAndHalf?: boolean } | null>(null);

  const fetchCategories = async () => {
    setCatLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        const ordered = (data.data || []).slice().sort((a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0));
        setCategories(ordered);
      } else { setCatError(data.error || 'Erro ao carregar categorias'); }
    } catch { setCatError('Erro de conexão.'); }
    finally { setCatLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => {
    const ordered = (initialCategories || []).slice().sort((a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0));
    setCategories(ordered);
  }, [initialCategories]);

  const handleDeleteCategory = async (id?: string) => {
    if (!id || !confirm('Excluir esta categoria?')) return;
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
    <div className="p-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-white">Categorias</h2>
        <button
          onClick={() => setModalCategory({ value: '', label: '', order: 0, allowHalfAndHalf: false })}
          className="form-button-primary flex items-center gap-2"
        >
          <FaPlus /> Nova Categoria
        </button>
      </div>
      {catError && <p className="text-red-500 text-sm mb-4">{catError}</p>}
      <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#262525] hidden sm:block">
        <table className="w-full text-left" aria-describedby="categories-table-caption">
          <caption id="categories-table-caption" className="sr-only">Tabela de categorias do cardápio</caption>
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-sm">
              <th className="p-2">Ordem</th>
              <th className="p-2">Nome</th>
              <th className="p-2">Valor</th>
              <th className="p-2">Meio a Meio</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {categories.sort((a, b) => (a.order || 0) - (b.order || 0)).map(cat => (
              <tr key={cat._id} className="border-b border-gray-800/60 last:border-0">
                <td className="p-2 w-20">{cat.order}</td>
                <td className="p-2">{cat.label}</td>
                <td className="p-2 text-gray-400">{cat.value}</td>
                <td className="p-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cat.allowHalfAndHalf ? 'bg-green-900/30 text-green-400 border border-green-600/50' : 'bg-gray-700/40 text-gray-400 border border-gray-600/40'}`}>{cat.allowHalfAndHalf ? '✅ Sim' : '—'}</span>
                </td>
                <td className="p-2 flex gap-2">
                  <button
                    onClick={() => setModalCategory(cat)}
                    className="form-button-secondary p-2"
                    aria-label={`Editar categoria ${cat.label}`}
                    title={`Editar ${cat.label}`}
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat._id)}
                    className="form-button-danger p-2"
                    aria-label={`Excluir categoria ${cat.label}`}
                    title={`Excluir ${cat.label}`}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-400">Nenhuma categoria cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden space-y-3">
        {categories.sort((a, b) => (a.order || 0) - (b.order || 0)).map(cat => (
          <div key={cat._id} className="bg-[#2a2a2a] rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white">{cat.label}</h3>
                <p className="text-xs text-gray-400">Ordem: {cat.order} | Valor: {cat.value}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalCategory(cat)}
                  className="form-button-secondary p-2"
                  aria-label={`Editar categoria ${cat.label}`}
                  title={`Editar ${cat.label}`}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat._id)}
                  className="form-button-danger p-2"
                  aria-label={`Excluir categoria ${cat.label}`}
                  title={`Excluir ${cat.label}`}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700/50 text-xs">
              <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${cat.allowHalfAndHalf ? 'bg-green-900/30 text-green-400 border border-green-600/50' : 'bg-gray-700/40 text-gray-400 border border-gray-600/40'}`}>Meio a Meio: {cat.allowHalfAndHalf ? '✅ Sim' : '—'}</span>
            </div>
          </div>
        ))}
      </div>
      {catLoading && <p className="text-xs text-gray-400 mt-2">Carregando...</p>}
      {modalCategory && (
        <CategoryModal
          category={modalCategory}
          onClose={() => setModalCategory(null)}
          onSaved={() => { fetchCategories(); onUpdate(); }}
        />
      )}
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

  // Bloqueio de scroll para modais de item ou categoria
  useEffect(() => {
    const shouldLock = isModalOpen;
    if (shouldLock) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => { document.body.classList.remove('modal-open'); };
  }, [isModalOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [menuRes, catRes] = await Promise.all([fetch('/api/menu/all'), fetch('/api/categories')]);
      const menuData = await menuRes.json();
      if (menuData.success) {
        const sorted = menuData.data
          .slice()
          .sort((a: MenuItem, b: MenuItem) => {
            if ((a.isAvailable === false) !== (b.isAvailable === false)) {
              return a.isAvailable === false ? 1 : -1;
            }
            const aIsCalabresa = a.category === 'pizzas' && a.name.toLowerCase().includes('calabresa');
            const bIsCalabresa = b.category === 'pizzas' && b.name.toLowerCase().includes('calabresa');
            if (aIsCalabresa && !bIsCalabresa) return -1;
            if (!aIsCalabresa && bIsCalabresa) return 1;
            return a.price - b.price;
          });
        setMenuItems(sorted);
      } else { setError('Falha ao carregar o cardápio.'); }
      const catData = await catRes.json();
      if (catData.success) {
        const orderedCats = (catData.data || []).slice().sort((a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0));
        setCategories(orderedCats);
      }
      else { setError((prev) => prev + ' Falha ao carregar categorias.'); }
    } catch (err) {
      setError('Erro de conexão.');
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
    } catch (err) {
      alert('Erro de conexão.');
    } finally {
      setDeletingItems(prev => { const newSet = new Set(prev); newSet.delete(id); return newSet; });
    }
  };

  const filteredItems = menuItems.filter((item) => selectedCategory === 'todas' || item.category === selectedCategory);

  return (
    <div className="p-2 sm:p-6 text-gray-200">
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
              <div className="auto-grid">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item._id}
                    layout
                    className={`bubble-card flex flex-col justify-between ${item.isAvailable === false ? 'opacity-50' : ''}`}
                    onMouseMove={(e) => {
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                      e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
                    }}
                  >
                    <span className="bubble-glow" />
                    <span className="bubble-press-overlay" />
                    <span className="bubble-border-gradient" />
                    <div className="bubble-content">
                      <div className="relative h-32 sm:h-40 w-full">
                        <Image src={item.image || '/placeholder.jpg'} alt={item.image ? `Imagem do item ${item.name}` : `Sem imagem cadastrada para ${item.name}`} layout="fill" className="object-cover" />
                      </div>
                      <div className="p-2 sm:p-4">
                        <h3 className="text-base sm:text-lg font-bold text-white truncate">{item.name}</h3>
                        <p className="text-gray-400 text-sm mt-1">R$ {item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="p-2 sm:p-4 border-t border-gray-800/70 bg-[#1e1e1e]/60 flex justify-between items-center gap-2 relative z-10">
                      <div className="flex flex-col items-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isAvailable ?? true}
                            onChange={(e) => handleAvailabilityChange(item, e.target.checked)}
                            className="sr-only peer"
                            aria-label={item.isAvailable ? `Desativar disponibilidade de ${item.name}` : `Ativar disponibilidade de ${item.name}`}
                            role="switch"
                            aria-checked={item.isAvailable ?? true}
                          />
                          <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                        <span className={`text-xs mt-1 font-medium ${item.isAvailable ?? true ? 'text-green-400' : 'text-gray-400'}`}>
                          {item.isAvailable ?? true ? 'On' : 'Off'}
                        </span>
                      </div>
                      <div className='flex gap-2'>
                        <button className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700" onClick={() => handleOpenModal(item)} aria-label={`Editar item ${item.name}`} title={`Editar ${item.name}`}><FaEdit /></button>
                        <button
                          className="bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                          onClick={() => handleDeleteItem(item._id, item.name)}
                          disabled={deletingItems.has(item._id!)}
                          aria-label={deletingItems.has(item._id!) ? `Excluindo ${item.name}` : `Excluir item ${item.name}`}
                          title={`Excluir ${item.name}`}
                        >
                          {deletingItems.has(item._id!) ? '...' : <FaTrash />}
                        </button>
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