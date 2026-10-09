'use client';

import { useAdminConfirm } from './admin/useAdminConfirm';
import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from '@/types/menu';
import Image from 'next/image';
import { FaPlus, FaEdit, FaTrash, FaSave, FaListAlt, FaThList, FaInfoCircle, FaPizzaSlice, FaPepperHot, FaSmile } from 'react-icons/fa';
import { PageHeading, EmptyState } from './admin/AdminUI';
import AdminDialog from './admin/AdminDialog';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

// --- COMPONENT: ITEM MODAL (TABBED) ---
function ItemModal({ item, onClose, onSave, categories }: {
  item: Partial<MenuItem>;
  onClose: () => void;
  onSave: (itemData: Partial<MenuItem>) => Promise<void>;
  categories: { value: string; label: string }[];
}) {
  // Estado do formulário
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [name, setName] = useState(item.name || '');
  const [description, setDescription] = useState(item.description || '');
  const [price, setPrice] = useState(item.price || 0);
  const [category, setCategory] = useState(item.category || categories[0]?.value || '');
  const [image, setImage] = useState(item.image || '');
  const [imageError, setImageError] = useState(false);
  const [destaque, setDestaque] = useState(item.destaque || false);

  React.useEffect(() => {
    setImageError(false);
  }, [image]);
  
  // Listas dinâmicas como arrays de objetos com IDs únicos
  const [sizes, setSizes] = useState<Array<{ id: string; name: string; price: number }>>(() => {
    return Object.entries(item.sizes || {}).map(([name, price]) => ({
      id: `${name}-${Math.random()}`,
      name,
      price: price as number
    }));
  });
  
  const [borders, setBorders] = useState<Array<{ id: string; name: string; prices: Record<string, number> }>>(() => {
    return Object.entries(item.borderOptions || {}).map(([name, value]) => {
      let prices: Record<string, number>;
      if (typeof value === 'number') {
        // Formato antigo (preço único, ainda não migrado): pré-preenche todos os tamanhos com o valor atual.
        prices = {};
        sizes.forEach(s => { if (s.name) prices[s.name] = value; });
      } else {
        prices = { ...(value as Record<string, number>) };
      }
      return { id: `${name}-${Math.random()}`, name, prices };
    });
  });
  
  const [extras, setExtras] = useState<Array<{ id: string; name: string; price: number }>>(() => {
    return Object.entries(item.extraOptions || {}).map(([name, price]) => ({
      id: `${name}-${Math.random()}`,
      name,
      price: price as number
    }));
  });
  
  const [ingredients, setIngredients] = useState<Array<{ id: string; value: string }>>(() => {
    return (item.ingredients || []).map((value) => ({
      id: `${value}-${Math.random()}`,
      value
    }));
  });
  
  const [tab, setTab] = useState<'basic' | 'options' | 'ingredients'>('basic');

  const handleSave = async () => {
    if (saving) return;
    if (!name.trim() || !category || !Number.isFinite(price) || price < 0) { setSaveError('Informe o nome, a categoria e um preço válido.'); setTab('basic'); return; }
    setSaving(true); setSaveError('');
    // Converte arrays de volta para objetos
    const sizesObj: Record<string, number> = {};
    sizes.forEach(s => { if (s.name) sizesObj[s.name] = s.price; });
    
    const bordersObj: Record<string, Record<string, number>> = {};
    borders.forEach(b => { if (b.name) bordersObj[b.name] = { ...b.prices }; });
    
    const extrasObj: Record<string, number> = {};
    extras.forEach(e => { if (e.name) extrasObj[e.name] = e.price; });
    
    const ingredientsArr = ingredients.map(i => i.value).filter(v => v);
    
    try { await onSave({
      ...item,
      name,
      description,
      price,
      category,
      image,
      destaque,
      sizes: sizesObj,
      borderOptions: bordersObj,
      extraOptions: extrasObj,
      ingredients: ingredientsArr
    }); } catch (error) { setSaveError(error instanceof Error ? error.message : 'Erro ao salvar o item.'); } finally { setSaving(false); }
  };

  const TabButton = ({ id, icon, label }: { id: 'basic' | 'options' | 'ingredients'; icon: React.ReactNode; label: string }) => (
    <button
      type="button"
      aria-pressed={tab === id}
      onClick={() => setTab(id)}
      className="admin-dialog-tab"
    >
      <span className="opacity-80">{icon}</span>
      <span>{label}</span>
    </button>
  );

  const fieldRowBtn = "shrink-0 w-11 h-11 rounded-lg bg-red-950/50 border border-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 flex items-center justify-center transition-colors";
  const addRowBtn = "w-full mt-1 py-2.5 rounded-xl border border-dashed border-white/[0.08] text-gray-600 text-xs hover:border-red-700/40 hover:text-red-400 transition-all duration-200 flex items-center justify-center gap-2 hover:bg-red-950/10";

  const rowVariants = {
    hidden: { opacity: 0, x: -10, scale: 0.97 },
    visible: (i: number) => ({
      opacity: 1, x: 0, scale: 1,
      transition: { delay: i * 0.05, duration: 0.2, ease: 'easeOut' }
    }),
    exit: { opacity: 0, x: 10, scale: 0.97, transition: { duration: 0.15 } }
  };

  const tabContentVariants = {
    enter: { opacity: 0, y: 8 },
    center: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 0.77, 0.3, 1] } },
    exit: { opacity: 0, y: -4, transition: { duration: 0.14 } },
  };

  return (
    <AdminDialog
      id="item-modal-title"
      title={item._id ? 'Editar item' : 'Novo item'}
      description={item._id ? `Atualize as informações de ${item.name}.` : 'Organize as informações e opções do produto.'}
      icon={item._id ? <FaEdit /> : <FaPlus />}
      onClose={onClose}
      size="wide"
      navigation={<div className="admin-dialog-tabs" aria-label="Seções do item">
        <TabButton id="basic" icon={<FaInfoCircle />} label="Básico" />
        <TabButton id="options" icon={<FaPizzaSlice />} label="Opções" />
        <TabButton id="ingredients" icon={<FaPepperHot />} label="Ingredientes" />
      </div>}
      footer={<>
        {saveError && <p role="alert" className="admin-dialog-error">{saveError}</p>}
        <button type="button" onClick={onClose} className="form-button-secondary">Cancelar</button>
        <button type="button" disabled={saving} aria-busy={saving} onClick={handleSave} className="form-button-primary gap-2">
          <FaSave size={13} /> {saving ? 'Salvando…' : item._id ? 'Salvar alterações' : 'Salvar item'}
        </button>
      </>}
    >
        {/* Conteúdo scrollável com AnimatePresence para trocar abas */}
        <div className="admin-item-content">
          <AnimatePresence mode="wait">
            {tab === 'basic' && (
              <motion.div
                key="basic"
                variants={tabContentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-5"
              >
                {/* Nome (largo) + Preço (compacto) */}
                <div className="admin-dialog-fields">
                  <div className="flex-1 min-w-0">
                    <label htmlFor="admin-item-name" className="form-label">Nome *</label>
                    <input id="admin-item-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-input"
                      placeholder="Ex: Pizza Calabresa"
                      required
                    />
                  </div>
                  <div className="admin-dialog-price">
                    <label htmlFor="admin-item-price" className="form-label">Preço (R$) *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm pointer-events-none select-none">R$</span>
                      <input id="admin-item-price"
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                        className="form-input"
                        style={{ paddingLeft: '2.25rem' }}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Categoria (largura total) */}
                <div>
                  <label htmlFor="admin-item-category" className="form-label">Categoria *</label>
                  <select id="admin-item-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-input"
                    required
                  >
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                {/* Descrição */}
                <div>
                  <label htmlFor="admin-item-description" className="form-label">Descrição</label>
                  <textarea id="admin-item-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="form-input resize-none"
                    placeholder="Descrição curta do item..."
                  />
                </div>

                {/* URL da Imagem (largura total) */}
                <div>
                  <label htmlFor="admin-item-image" className="form-label">URL da Imagem</label>
                  <input id="admin-item-image"
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="form-input"
                    placeholder="https://..."
                  />
                </div>

                {/* Prévia da imagem */}
                <AnimatePresence>
                  {image && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`rounded-xl overflow-hidden border ${imageError ? 'border-red-800/40 bg-red-950/20' : 'border-white/[0.07] bg-[#0a0a0a]'} h-40 flex items-center justify-center`}
                    >
                      {imageError ? (
                        <p className="text-xs text-red-400 px-4 text-center">Imagem não encontrada — verifique a URL</p>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt="Prévia" className="h-full w-full object-cover" onError={() => setImageError(true)} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Destaque */}
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={destaque}
                    onChange={(e) => setDestaque(e.target.checked)}
                    className="form-checkbox"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-200">Item em destaque</p>
                    <p className="text-xs text-gray-500 mt-0.5">Aparece na seção de destaques do cardápio</p>
                  </div>
                </label>
              </motion.div>
            )}

            {tab === 'options' && (
              <motion.div
                key="options"
                variants={tabContentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4"
              >
                {/* Tamanhos */}
                <div className="admin-dialog-section">
                  <p className="admin-section-title">Tamanhos e Preços</p>
                  <AnimatePresence initial={false}>
                    {sizes.map((size, idx) => (
                      <motion.div key={size.id} custom={idx} variants={rowVariants} initial="hidden" animate="visible" exit="exit" className="admin-field-row admin-field-row-3">
                        <input type="text" aria-label={`Nome do tamanho ${idx + 1}`} value={size.name} onChange={(e) => { const n = [...sizes]; n[idx] = { ...size, name: e.target.value }; setSizes(n); }} className="form-input w-full" placeholder="Ex: P, M, G" />
                        <div className="relative">
                          <span className="absolute inset-y-0 left-2 flex items-center text-gray-600 text-[11px] pointer-events-none select-none z-10">R$</span>
                          <input type="number" aria-label={`Preço do tamanho ${idx + 1}`} value={size.price} onChange={(e) => { const n = [...sizes]; n[idx] = { ...size, price: parseFloat(e.target.value) || 0 }; setSizes(n); }} step="0.01" min="0" className="form-input w-full" style={{ paddingLeft: '1.75rem' }} />
                        </div>
                        <button type="button" aria-label="Remover tamanho" onClick={() => setSizes(sizes.filter((_, i) => i !== idx))} className={fieldRowBtn}><FaTrash size={11} /></button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button type="button" onClick={() => setSizes([...sizes, { id: `new-${Date.now()}`, name: '', price: 0 }])} className={addRowBtn}>
                    <FaPlus size={10} /> Adicionar Tamanho
                  </button>
                </div>

                {/* Bordas */}
                <div className="admin-dialog-section">
                  <p className="admin-section-title">Opções de Borda</p>
                  <p className="text-[11px] text-gray-500 mb-2 -mt-1">O preço da borda pode variar por tamanho.</p>
                  <AnimatePresence initial={false}>
                    {borders.map((border, idx) => (
                      <motion.div key={border.id} custom={idx} variants={rowVariants} initial="hidden" animate="visible" exit="exit" className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5 mb-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <input type="text" aria-label={`Nome da borda ${idx + 1}`} value={border.name} onChange={(e) => { const n = [...borders]; n[idx] = { ...border, name: e.target.value }; setBorders(n); }} className="form-input w-full" placeholder="Ex: Catupiry" />
                          <button type="button" aria-label="Remover borda" onClick={() => setBorders(borders.filter((_, i) => i !== idx))} className={fieldRowBtn}><FaTrash size={11} /></button>
                        </div>
                        {sizes.filter(s => s.name).length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {sizes.filter(s => s.name).map((size) => (
                              <div key={size.name} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg pl-2 pr-1 py-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{size.name}</span>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-1.5 flex items-center text-gray-600 text-[10px] pointer-events-none select-none z-10">R$</span>
                                  <input
                                    type="number"
                                    aria-label={`Preço da borda ${border.name || idx + 1}, tamanho ${size.name}`} value={border.prices[size.name] ?? 0}
                                    onChange={(e) => {
                                      const n = [...borders];
                                      n[idx] = { ...border, prices: { ...border.prices, [size.name]: parseFloat(e.target.value) || 0 } };
                                      setBorders(n);
                                    }}
                                    step="0.01"
                                    min="0"
                                    className="form-input w-20 text-sm"
                                    style={{ paddingLeft: '1.5rem' }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-600">Cadastre os tamanhos acima para definir o preço da borda.</p>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button type="button" onClick={() => setBorders([...borders, { id: `new-${Date.now()}`, name: '', prices: {} }])} className={addRowBtn}>
                    <FaPlus size={10} /> Adicionar Borda
                  </button>
                </div>

                {/* Extras */}
                <div className="admin-dialog-section">
                  <p className="admin-section-title">Extras</p>
                  <AnimatePresence initial={false}>
                    {extras.map((extra, idx) => (
                      <motion.div key={extra.id} custom={idx} variants={rowVariants} initial="hidden" animate="visible" exit="exit" className="admin-field-row admin-field-row-3">
                        <input type="text" aria-label={`Nome do extra ${idx + 1}`} value={extra.name} onChange={(e) => { const n = [...extras]; n[idx] = { ...extra, name: e.target.value }; setExtras(n); }} className="form-input w-full" placeholder="Ex: Bacon" />
                        <div className="relative">
                          <span className="absolute inset-y-0 left-2 flex items-center text-gray-600 text-[11px] pointer-events-none select-none z-10">R$</span>
                          <input type="number" aria-label={`Preço do extra ${idx + 1}`} value={extra.price} onChange={(e) => { const n = [...extras]; n[idx] = { ...extra, price: parseFloat(e.target.value) || 0 }; setExtras(n); }} step="0.01" min="0" className="form-input w-full" style={{ paddingLeft: '1.75rem' }} />
                        </div>
                        <button type="button" aria-label="Remover extra" onClick={() => setExtras(extras.filter((_, i) => i !== idx))} className={fieldRowBtn}><FaTrash size={11} /></button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button type="button" onClick={() => setExtras([...extras, { id: `new-${Date.now()}`, name: '', price: 0 }])} className={addRowBtn}>
                    <FaPlus size={10} /> Adicionar Extra
                  </button>
                </div>
              </motion.div>
            )}

            {tab === 'ingredients' && (
              <motion.div
                key="ingredients"
                variants={tabContentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="admin-dialog-section"
              >
                <p className="admin-section-title">Ingredientes</p>
                <AnimatePresence initial={false}>
                  {ingredients.map((ing, idx) => (
                    <motion.div key={ing.id} custom={idx} variants={rowVariants} initial="hidden" animate="visible" exit="exit" className="admin-field-row admin-field-row-2">
                      <input type="text" aria-label={`Ingrediente ${idx + 1}`} value={ing.value} onChange={(e) => { const n = [...ingredients]; n[idx] = { ...ing, value: e.target.value }; setIngredients(n); }} className="form-input w-full" placeholder="Ex: Tomate, Queijo..." />
                      <button type="button" aria-label="Remover ingrediente" onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))} className={fieldRowBtn}><FaTrash size={11} /></button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <button type="button" onClick={() => setIngredients([...ingredients, { id: `new-${Date.now()}`, value: '' }])} className={addRowBtn}>
                  <FaPlus size={10} /> Adicionar Ingrediente
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

    </AdminDialog>
  );
}

// --- COMPONENT: CATEGORY MODAL ---
const CategoryModal = ({
  category,
  onClose,
  onSaved
}: {
  category: { _id?: string; value: string; label: string; icon?: string; order?: number; allowHalfAndHalf?: boolean } | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const isEdit = !!category?._id;
  const [form, setForm] = useState(() => ({
    value: category?.value || '',
    label: category?.label || '',
    icon: category?.icon || '',
    order: category?.order || 0,
    allowHalfAndHalf: category?.allowHalfAndHalf || false,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false); // Estado para controlar o seletor

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setForm({ ...form, icon: emojiData.emoji });
    setShowPicker(false);
  };

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

  const fieldVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: 0.1 + i * 0.06, duration: 0.2, ease: 'easeOut' }
    }),
  };

  return (
    <AdminDialog
      id="category-modal-title"
      title={isEdit ? 'Editar categoria' : 'Nova categoria'}
      description={isEdit ? `Atualize a categoria ${category?.label}.` : 'Defina como esta categoria aparece no cardápio.'}
      icon={<FaListAlt />}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} className="form-button-secondary">Cancelar</button>
        <button type="submit" form="admin-category-form" disabled={loading} aria-busy={loading} className="form-button-primary gap-2">
          <FaSave size={13} /> {loading ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar categoria'}
        </button>
      </>}
    >
          <form id="admin-category-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Nome */}
            <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible">
              <label htmlFor="admin-category-name" className="form-label">Nome da Categoria</label>
              <input id="admin-category-name"
                type="text"
                className="form-input"
                value={form.label}
                onChange={e => setForm({ ...form, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="Ex: Pizzas"
                required
              />
              <AnimatePresence>
                {form.value && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] text-gray-600 mt-1"
                  >
                    slug: <span className="text-gray-500">{form.value}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Ícone + Ordem */}
            <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible" className="admin-dialog-fields">
              <div className="flex-1 min-w-0">
                <label htmlFor="admin-category-icon" className="form-label">Ícone (Emoji)</label>
                <div className="relative">
                  <input id="admin-category-icon"
                    type="text"
                    className="form-input pr-10"
                    value={form.icon}
                    onChange={e => setForm({ ...form, icon: e.target.value })}
                    placeholder="Ex: 🍕"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label="Escolher emoji da categoria" aria-expanded={showPicker} onClick={() => setShowPicker(val => !val)}
                  >
                    <FaSmile size={14} />
                  </button>
                  {showPicker && (
                    <div className="relative z-10 mt-2">
                      <EmojiPicker width="100%" height={300} theme={Theme.DARK} searchPlaceHolder="Pesquisar emoji" previewConfig={{ showPreview: false }} onEmojiClick={onEmojiClick} />
                    </div>
                  )}
                </div>
              </div>
              <div className="w-24 shrink-0">
                <label htmlFor="admin-category-order" className="form-label">Ordem</label>
                <input id="admin-category-order"
                  type="number"
                  className="form-input"
                  value={form.order}
                  onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </motion.div>

            {/* Meio a meio */}
            <motion.label
              custom={2} variants={fieldVariants} initial="hidden" animate="visible"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors select-none"
            >
              <input
                type="checkbox"
                className="form-checkbox"
                checked={form.allowHalfAndHalf}
                onChange={e => setForm({ ...form, allowHalfAndHalf: e.target.checked })}
              />
              <div>
                <p className="text-sm font-medium text-gray-200">Permitir Meio a Meio</p>
                <p className="text-xs text-gray-500 mt-0.5">Clientes poderão dividir o item em dois sabores</p>
              </div>
            </motion.label>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  role="alert" className="admin-dialog-error"
                >
                  <span className="text-red-300 text-xs">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

          </form>
    </AdminDialog>
  );
};

// --- COMPONENT: CATEGORIES TAB ---
const CategoriesTab = ({ categories: initialCategories, onUpdate }: { categories: { _id?: string; value: string; label: string; icon?: string; order?: number; allowHalfAndHalf?: boolean }[]; onUpdate: () => void }) => {
  const { confirm, confirmationDialog } = useAdminConfirm();
  const [categories, setCategories] = useState<{ _id?: string; value: string; label: string; icon?: string; order?: number; allowHalfAndHalf?: boolean }[]>(initialCategories);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState('');
  const [modalCategory, setModalCategory] = useState<{ _id?: string; value: string; label: string; icon?: string; order?: number; allowHalfAndHalf?: boolean } | null>(null);

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
    if (!id || !await confirm({ title: 'Excluir categoria?', message: 'A categoria será removida do cardápio. Deseja continuar?', confirmLabel: 'Excluir categoria', destructive: true })) return;
    setCatLoading(true);
    try {
      const res = await fetch(`/api/categories`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _id: id }) });
      const data = await res.json();
      if (data.success) { fetchCategories(); onUpdate(); }
      else { setCatError(data.error || 'Erro ao excluir'); }
    } catch { setCatError('Erro de conexão.'); }
    finally { setCatLoading(false); }
  };


  const sorted = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="space-y-5">
      {confirmationDialog}
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Categorias</h2>
          <p className="text-gray-500 text-sm mt-0.5">{categories.length} {categories.length === 1 ? 'categoria cadastrada' : 'categorias cadastradas'}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setModalCategory({ value: '', label: '', icon: '', order: categories.length, allowHalfAndHalf: false })}
          className="form-button-primary gap-2 shrink-0"
        >
          <FaPlus size={12} /> Nova Categoria
        </motion.button>
      </div>

      {/* Erro */}
      <AnimatePresence>
        {catError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-950/50 border border-red-800/50 text-red-300 text-sm"
          >
            {catError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista / grid unificado */}
      {catLoading && categories.length === 0 ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-600">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600" />
          <span className="text-sm">Carregando categorias...</span>
        </div>
      ) : sorted.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-white/[0.07]"
        >
          <span className="text-3xl opacity-30">🗂️</span>
          <p className="text-sm text-gray-600">Nenhuma categoria cadastrada</p>
          <button
            onClick={() => setModalCategory({ value: '', label: '', icon: '', order: 0, allowHalfAndHalf: false })}
            className="form-button-secondary text-xs gap-1.5 mt-1"
          >
            <FaPlus size={10} /> Criar primeira categoria
          </button>
        </motion.div>
      ) : (
        /* Tabela-like refinada: cabeçalho + linhas animadas */
        <div className="rounded-2xl border border-white/[0.07] bg-[#111] overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7)]">
          {/* Linha de acento */}
          <div className="absolute left-8 right-8 h-px bg-gradient-to-r from-transparent via-red-700/30 to-transparent" aria-hidden />

          {/* Cabeçalho das colunas — oculto em mobile muito pequeno */}
          <div className="hidden xl:grid grid-cols-[2.5rem_minmax(0,1fr)_5rem_6rem_5.5rem_6rem] gap-4 px-5 py-3 border-b border-white/[0.06]">
            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold text-center">Icon</span>
            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Nome</span>
            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold text-center">Ordem</span>
            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Slug</span>
            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold text-center">Meio a Meio</span>
            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold text-right">Ações</span>
          </div>

          <AnimatePresence initial={false}>
            {sorted.map((cat, i) => (
              <motion.div
                key={cat._id ?? cat.value}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.2 } }}
                exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
                className="group border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                {/* Desktop row */}
                <div className="hidden xl:grid grid-cols-[2.5rem_minmax(0,1fr)_5rem_6rem_5.5rem_6rem] gap-4 items-center px-5 py-3.5">
                  {/* Ícone */}
                  <div className="flex items-center justify-center">
                    <span className="text-xl leading-none">{cat.icon || <span className="text-gray-700 text-sm">—</span>}</span>
                  </div>
                  {/* Nome */}
                  <div>
                    <p className="text-sm font-semibold text-white">{cat.label}</p>
                  </div>
                  {/* Ordem */}
                  <div className="flex justify-center">
                    <span className="text-xs font-mono text-gray-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md">{cat.order ?? 0}</span>
                  </div>
                  {/* Slug */}
                  <div className="min-w-0">
                    <span className="text-xs text-gray-600 font-mono truncate block">{cat.value}</span>
                  </div>
                  {/* Meio a Meio */}
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cat.allowHalfAndHalf ? 'bg-green-950/60 text-green-400 border-green-800/50' : 'bg-white/[0.03] text-gray-600 border-white/[0.06]'}`}>
                      {cat.allowHalfAndHalf ? (
                        <><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Sim</>
                      ) : '—'}
                    </span>
                  </div>
                  {/* Ações */}
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setModalCategory(cat)}
                      className="admin-icon-button text-gray-400 hover:text-blue-300"
                      aria-label={`Editar ${cat.label}`}
                    >
                      <FaEdit size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat._id)}
                      className="admin-icon-button text-gray-400 hover:text-red-300"
                      aria-label={`Excluir ${cat.label}`}
                    >
                      <FaTrash size={11} />
                    </button>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="xl:hidden flex items-center gap-3 px-4 py-3.5">
                  {/* Ícone */}
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-xl shrink-0">
                    {cat.icon || '?'}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{cat.label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-mono text-gray-600">{cat.value}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-[10px] text-gray-600">ordem {cat.order ?? 0}</span>
                      {cat.allowHalfAndHalf && (
                        <span className="text-[10px] bg-green-950/60 text-green-400 border border-green-800/40 px-1.5 py-0.5 rounded-full font-bold">M/M</span>
                      )}
                    </div>
                  </div>
                  {/* Ações mobile */}
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => setModalCategory(cat)}
                      className="admin-icon-button text-gray-400 hover:text-blue-300"
                      aria-label={`Editar ${cat.label}`}
                    >
                      <FaEdit size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat._id)}
                      className="admin-icon-button text-gray-400 hover:text-red-300"
                      aria-label={`Excluir ${cat.label}`}
                    >
                      <FaTrash size={11} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {catLoading && (
            <div className="flex items-center justify-center py-4 gap-2 text-gray-600 border-t border-white/[0.05]">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
              <span className="text-xs">Atualizando...</span>
            </div>
          )}
        </div>
      )}

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
  const { confirm, confirmationDialog } = useAdminConfirm();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [activeTab, setActiveTab] = useState<'menu' | 'categories'>('menu');
  const [categories, setCategories] = useState<{ _id?: string; value: string; label: string; icon?: string; order?: number }[]>([]);
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set());
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

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
      const [menuRes, catRes] = await Promise.all([
        fetch('/api/menu/all', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ]);
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
      else { setError((prev) => (prev ? prev + ' ' : '') + 'Falha ao carregar categorias.'); }
    } catch (err) {
      setError('Erro de conexão.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAvailabilityChange = async (item: MenuItem, newStatus: boolean) => {
    if (!item._id || togglingItems.has(item._id)) return;

    const previousStatus = item.isAvailable ?? true;
    setAvailabilityError(null);
    setTogglingItems((prev) => new Set(prev).add(item._id));

    try {
      const res = await fetch(`/api/menu/availability/${item._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ isAvailable: newStatus }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha na API');
      }

      const updated = data.data as MenuItem;
      setMenuItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, ...updated, isAvailable: updated.isAvailable ?? newStatus } : i))
      );
    } catch (error) {
      setMenuItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, isAvailable: previousStatus } : i))
      );
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar o status.';
      setAvailabilityError(message);
    } finally {
      setTogglingItems((prev) => {
        const next = new Set(prev);
        next.delete(item._id);
        return next;
      });
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
      else { throw new Error("Não foi possível salvar o item. Tente novamente."); }
    } catch (error) { throw error instanceof Error ? error : new Error("Erro de conexão."); }
  };

  const handleDeleteItem = async (id?: string, name?: string) => {
    if (!id || !name || !await confirm({ title: 'Excluir item?', message: `O item "${name}" será removido do cardápio. Deseja continuar?`, confirmLabel: 'Excluir item', destructive: true })) return;
    setDeleteError(null);
    setDeletingItems(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
      if (res.ok) { setMenuItems(prev => prev.filter(item => item._id !== id)); }
      else { setDeleteError('Não foi possível excluir o item. Tente novamente.'); }
    } catch (err) {
      setDeleteError('Erro de conexão ao excluir o item. Tente novamente.');
    } finally {
      setDeletingItems(prev => { const newSet = new Set(prev); newSet.delete(id); return newSet; });
    }
  };

  const filteredItems = menuItems.filter((item) => selectedCategory === 'todas' || item.category === selectedCategory);

  return (
    <div className="admin-page text-gray-200">
      {confirmationDialog}
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <PageHeading title="Cardápio" description="Organize seus produtos, preços e categorias em um só lugar.">
          <div className="flex items-center gap-2 bg-[#0f0f0f] rounded-xl p-1 border border-white/[0.06]">
            <button className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'menu' ? 'bg-red-700/90 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`} aria-pressed={activeTab === 'menu'} onClick={() => setActiveTab('menu')}><FaThList size={13} /> Itens</button>
            <button className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'categories' ? 'bg-red-700/90 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`} aria-pressed={activeTab === 'categories'} onClick={() => setActiveTab('categories')}><FaListAlt size={13} /> Categorias</button>
          </div>
        </PageHeading>
        {deleteError && <p role="alert" className="admin-dialog-error mb-6">{deleteError}</p>}

        {activeTab === 'menu' && (
          <div>
            {/* Barra de filtro */}
            <div className="admin-toolbar flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
              <select aria-label="Filtrar itens por categoria" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="form-input flex-1 sm:max-w-xs">
                <option value="todas">Todas as Categorias</option>
                {categories.map((cat) => (<option key={cat.value} value={cat.value}>{cat.icon ? `${cat.icon} ` : ''}{cat.label}</option>))}
              </select>
              <div className="flex-1 sm:text-right">
                <span className="text-xs text-gray-600" role="status">{filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}</span>
              </div>
              <motion.button onClick={() => handleOpenModal()} whileHover={{ scale: 1.02 }} className="form-button-primary shrink-0"><FaPlus size={13} /> Novo Item</motion.button>
            </div>
            {availabilityError && (
              <p className="text-red-400 text-center text-sm mb-4" role="alert">{availabilityError}</p>
            )}
            {loading ? <p className="text-center py-10">Carregando...</p> : error ? <p className="text-red-500 text-center py-10">{error}</p> : (
              <div className="auto-grid">
                {filteredItems.length === 0 && <div className="col-span-full"><EmptyState>Nenhum item nesta categoria. Use “Novo Item” para cadastrar.</EmptyState></div>}
                {filteredItems.map((item) => (
                  <motion.div
                    key={item._id}
                    layout
                    className={`bubble-card flex flex-col justify-between ${item.isAvailable === false ? 'ring-1 ring-red-900/40' : ''}`}
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
                      <div className="relative h-32 sm:h-40 w-full bg-[#2a2a2a]">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={`Imagem do item ${item.name}`}
                            fill
                            sizes="(max-width: 640px) 100vw, 300px"
                            className="object-cover"
                            unoptimized={item.image.startsWith('http')}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                            Sem imagem
                          </div>
                        )}
                      </div>
                      <div className="p-2 sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-white break-words">{item.name}</h3>
                          <span className={`shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${item.isAvailable === false ? 'bg-red-900/60 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
                            {item.isAvailable === false ? 'Inativo' : 'Ativo'}
                          </span>
                        </div>
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
                            disabled={togglingItems.has(item._id)}
                            className="sr-only peer"
                            aria-label={item.isAvailable ? `Desativar disponibilidade de ${item.name}` : `Ativar disponibilidade de ${item.name}`}
                            role="switch"
                            aria-checked={item.isAvailable ?? true}
                          />
                          <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                        <span className={`text-xs mt-1 font-medium ${item.isAvailable ?? true ? 'text-green-400' : 'text-gray-400'}`}>
                          {togglingItems.has(item._id) ? '...' : item.isAvailable ?? true ? 'Disponível' : 'Indisponível'}
                        </span>
                      </div>
                      <div className='flex gap-2'>
                        <button className="admin-icon-button text-gray-200" onClick={() => handleOpenModal(item)} aria-label={`Editar item ${item.name}`} title={`Editar ${item.name}`}><FaEdit /></button>
                        <button
                          className="admin-icon-button text-red-300 disabled:opacity-50"
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

      {isModalOpen && <ItemModal item={editingItem!} onClose={handleCloseModal} onSave={handleSaveItem} categories={categories} />}
    </div>
  );
}
