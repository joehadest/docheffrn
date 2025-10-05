'use client';
import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from '../types/menu';
import { calculatePizzaPrice } from '../utils/priceCalculator';
import { MenuContext } from '../contexts/MenuContext'; // Importar o MenuContext

// Tipagem para as props do componente
interface ItemModalProps {
    item: MenuItem;
    onClose: () => void;
    onAddToCart: (item: MenuItem, quantity: number, unitPrice: number, observation: string, size?: string, border?: string, extras?: string[], flavors?: string[]) => void;
    allPizzas?: MenuItem[];
    categories?: any[];
    allowHalfAndHalf?: boolean;
}

const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: "spring", damping: 25, stiffness: 300 }
    },
    exit: {
        opacity: 0,
        scale: 0.8,
        transition: { duration: 0.2 }
    }
};

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

export default function ItemModal({ item, onClose, onAddToCart, allPizzas, categories = [], allowHalfAndHalf = false }: ItemModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [observation, setObservation] = useState('');
    const defaultSize = item.sizes ? Object.keys(item.sizes)[0] : 'P';
    const [selectedSize, setSelectedSize] = useState<string>(defaultSize);
    const [selectedBorder, setSelectedBorder] = useState<string>('');
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    
    // Lógica para Meio a Meio
    const [isHalf, setIsHalf] = useState(false);
    const [half1, setHalf1] = useState<MenuItem | null>(item);
    const [half2, setHalf2] = useState<MenuItem | null>(null);

    // Resetar seleções quando o item mudar
    useEffect(() => {
        setHalf1(item);
        setHalf2(null);
        setIsHalf(false);
    }, [item]);

    // Usar apenas a prop 'categories' recebida
    const itemCategory = categories.find(c => c.value === item.category || c.name === item.category);
    
    // Debug para verificar se a categoria tem allowHalfAndHalf
    console.log('ItemModal - Categoria encontrada:', itemCategory);
    console.log('ItemModal - allowHalfAndHalf:', itemCategory?.allowHalfAndHalf);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validação para meio a meio
        if (isHalf && (!half1 || !half2)) {
            alert('Por favor, selecione ambos os sabores para a pizza meio a meio.');
            return;
        }
        
        if (isHalf && half1 && half2) {
            const description = `Meio a meio: ${half1.name} / ${half2.name}`;
            onAddToCart(
                item,
                quantity,
                calculatePizzaPrice(item, selectedSize, selectedBorder, selectedExtras, description, allPizzas),
                observation ? `${description} - ${observation}` : description,
                selectedSize,
                selectedBorder,
                selectedExtras,
                [half1.name, half2.name]
            );
        } else {
            onAddToCart(
                item,
                quantity,
                calculatePizzaPrice(item, selectedSize, selectedBorder, selectedExtras, undefined, allPizzas),
                observation,
                selectedSize,
                selectedBorder,
                selectedExtras
            );
        }
    };

    const calculateTotal = () => {
        const price = calculatePizzaPrice(item, selectedSize, selectedBorder, selectedExtras, isHalf ? `Meio a meio: ${half1?.name} / ${half2?.name}` : undefined, allPizzas);
        return price * quantity;
    };

    const toggleExtra = (extra: string) => {
        setSelectedExtras(prev =>
            prev.includes(extra)
                ? prev.filter(e => e !== extra)
                : [...prev, extra]
        );
    };

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={onClose}
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-modal-title"
            >
                <motion.div
                    className="modal-panel"
                    variants={modalVariants}
                    onClick={e => e.stopPropagation()}
                    role="document"
                >
                    <div className="flex justify-between items-start mb-4">
                        <h3 id="item-modal-title" className="text-xl font-bold text-white">{item.name}</h3>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="modal-close-btn focus-outline"
                            onClick={onClose}
                            aria-label="Fechar modal"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </motion.button>
                    </div>

                    {item.image && (
                        <div className="relative h-48 mb-4">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                        </div>
                    )}

                    <p className="text-gray-300 mb-4">{item.description}</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Seção de Tamanhos */}
                        {item.sizes && Object.keys(item.sizes).length > 0 && (
                            <div className="bg-[#1e1d1d] p-4 rounded-lg">
                                <label className="block text-sm font-medium text-gray-200 mb-3">Tamanho</label>
                                <div className={`grid grid-cols-${Object.keys(item.sizes).length > 2 ? 3 : 2} gap-3`}>
                                    {Object.entries(item.sizes).map(([sizeKey, price]) => (
                                        <button
                                            key={sizeKey}
                                            type="button"
                                            onClick={() => setSelectedSize(sizeKey)}
                                            className={`p-3 rounded-lg border-2 transition-all ${selectedSize === sizeKey ? 'border-red-600 bg-red-900/20 text-red-400' : 'border-gray-700 hover:border-red-600 text-gray-300'}`}
                                        >
                                            <div className="font-semibold">{sizeKey}</div>
                                            <div className="text-sm">R$ {price.toFixed(2)}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Seção Meio a Meio (condicional) */}
                        {itemCategory?.allowHalfAndHalf && allPizzas && (
                             <div className={`p-4 rounded-lg transition-all duration-300 ${isHalf ? 'bg-gradient-to-r from-red-900/30 to-red-800/20 border-2 border-red-600/50' : 'bg-[#1e1d1d] border border-gray-700'}`}>
                                 <label className="flex items-center gap-3 mb-3 cursor-pointer group">
                                     <div className="relative">
                                         <input 
                                             type="checkbox" 
                                             checked={isHalf} 
                                             onChange={e => setIsHalf(e.target.checked)} 
                                             className="form-checkbox h-6 w-6 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500 transition-all duration-200" 
                                         />
                                         {isHalf && (
                                             <motion.div
                                                 initial={{ scale: 0 }}
                                                 animate={{ scale: 1 }}
                                                 className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                                             />
                                         )}
                                     </div>
                                     <span className={`text-lg font-medium transition-colors duration-200 ${isHalf ? 'text-red-400' : 'text-gray-200 group-hover:text-gray-300'}`}>
                                         🍕 Montar Pizza Meio a Meio
                                     </span>
                                     {isHalf && (
                                         <motion.div
                                             initial={{ opacity: 0, scale: 0.8 }}
                                             animate={{ opacity: 1, scale: 1 }}
                                             className="ml-auto"
                                         >
                                             <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                                                 ATIVO
                                             </span>
                                         </motion.div>
                                     )}
                                 </label>
                                 <AnimatePresence>
                                     {isHalf && (
                                         <motion.div
                                             initial={{ opacity: 0, height: 0 }}
                                             animate={{ opacity: 1, height: 'auto' }}
                                             exit={{ opacity: 0, height: 0 }}
                                             transition={{ duration: 0.3 }}
                                             className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3"
                                         >
                                             <div>
                                                 <label className="block text-xs text-red-300 mb-2 font-medium">1º Sabor</label>
                                                 <select
                                                     className="w-full rounded-lg border-2 border-red-600/50 bg-[#262525] text-white p-3 focus:border-red-500 focus:ring-red-500 transition-all duration-200"
                                                     value={half1?.name || ''}
                                                     onChange={e => {
                                                         const sabor = allPizzas.find(p => p.name === e.target.value);
                                                         setHalf1(sabor || null);
                                                     }}
                                                 >
                                                     {allPizzas.map(pizza => (
                                                         <option key={pizza._id} value={pizza.name}>{pizza.name}</option>
                                                     ))}
                                                 </select>
                                             </div>
                                             <div>
                                                 <label className="block text-xs text-red-300 mb-2 font-medium">2º Sabor</label>
                                                 <select
                                                     className="w-full rounded-lg border-2 border-red-600/50 bg-[#262525] text-white p-3 focus:border-red-500 focus:ring-red-500 transition-all duration-200"
                                                     value={half2?.name || ''}
                                                     onChange={e => {
                                                         const sabor = allPizzas.find(p => p.name === e.target.value);
                                                         setHalf2(sabor || null);
                                                     }}
                                                 >
                                                     <option value="">Selecione...</option>
                                                     {allPizzas.filter(p => p.name !== half1?.name).map(pizza => (
                                                         <option key={pizza._id} value={pizza.name}>{pizza.name}</option>
                                                     ))}
                                                 </select>
                                             </div>
                                             {half1 && half2 && (
                                                 <motion.div
                                                     initial={{ opacity: 0, y: 10 }}
                                                     animate={{ opacity: 1, y: 0 }}
                                                     className="col-span-full mt-2 p-3 bg-red-900/20 border border-red-600/30 rounded-lg"
                                                 >
                                                     <p className="text-sm text-red-300 text-center">
                                                         <span className="font-semibold">Combinando:</span> {half1.name} + {half2.name}
                                                     </p>
                                                 </motion.div>
                                             )}
                                         </motion.div>
                                     )}
                                 </AnimatePresence>
                             </div>
                        )}
                        
                        {/* Seção de Bordas (apenas para pizzas) */}
                        {item.category === 'pizzas' && item.borderOptions && Object.keys(item.borderOptions).length > 0 && (
                            <div className="bg-[#1e1d1d] p-4 rounded-lg">
                                <label className="block text-sm font-medium text-gray-200 mb-3">Borda</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBorder('')}
                                        className={`p-3 rounded-lg border-2 transition-all ${selectedBorder === '' ? 'border-red-600 bg-red-900/20 text-red-400' : 'border-gray-700 hover:border-red-600 text-gray-300'}`}
                                    >
                                        <div className="font-semibold">Sem Borda</div>
                                        <div className="text-sm">R$ 0,00</div>
                                    </button>
                                    {Object.entries(item.borderOptions).map(([borderKey, price]) => (
                                        <button
                                            key={borderKey}
                                            type="button"
                                            onClick={() => setSelectedBorder(borderKey)}
                                            className={`p-3 rounded-lg border-2 transition-all ${selectedBorder === borderKey ? 'border-red-600 bg-red-900/20 text-red-400' : 'border-gray-700 hover:border-red-600 text-gray-300'}`}
                                        >
                                            <div className="font-semibold">{borderKey}</div>
                                            <div className="text-sm">+ R$ {price.toFixed(2)}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Seção de Extras (apenas para pizzas) */}
                        {item.category === 'pizzas' && item.extraOptions && Object.keys(item.extraOptions).length > 0 && (
                            <div className="bg-[#1e1d1d] p-4 rounded-lg">
                                <label className="block text-sm font-medium text-gray-200 mb-3">Extras</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(item.extraOptions).map(([extraKey, price]) => (
                                        <button
                                            key={extraKey}
                                            type="button"
                                            onClick={() => toggleExtra(extraKey)}
                                            className={`p-3 rounded-lg border-2 transition-all ${selectedExtras.includes(extraKey) ? 'border-red-600 bg-red-900/20 text-red-400' : 'border-gray-700 hover:border-red-600 text-gray-300'}`}
                                        >
                                            <div className="font-semibold">{extraKey}</div>
                                            <div className="text-sm">+ R$ {price.toFixed(2)}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Seção de Quantidade */}
                        <div className="bg-[#1e1d1d] p-4 rounded-lg">
                            <label className="block text-sm font-medium text-gray-200 mb-3">Quantidade</label>
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-colors"
                                >
                                    -
                                </button>
                                <span className="text-2xl font-bold text-white min-w-[3rem] text-center">{quantity}</span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Seção de Observação */}
                        <div className="bg-[#1e1d1d] p-4 rounded-lg">
                            <label className="block text-sm font-medium text-gray-200 mb-3">Observação (opcional)</label>
                            <textarea
                                value={observation}
                                onChange={(e) => setObservation(e.target.value)}
                                placeholder="Ex: Sem cebola, bem passada..."
                                className="w-full p-3 rounded-lg border border-gray-700 bg-[#262525] text-white focus:border-red-500 focus:ring-red-500 resize-none"
                                rows={3}
                            />
                        </div>
                        
                        <div className="flex justify-between items-center pt-4">
                            <div>
                                <span className="text-sm text-gray-400">Total</span>
                                <div className="text-2xl font-bold text-red-500">
                                    R$ {calculateTotal().toFixed(2)}
                                </div>
                            </div>
                            <motion.button
                                whileHover={!(isHalf && (!half1 || !half2)) ? { scale: 1.02 } : {}}
                                whileTap={!(isHalf && (!half1 || !half2)) ? { scale: 0.98 } : {}}
                                type="submit"
                                disabled={isHalf && (!half1 || !half2)}
                                className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
                                    isHalf && (!half1 || !half2)
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                            >
                                {isHalf && (!half1 || !half2) ? 'Selecione os sabores' : 'Adicionar ao Carrinho'}
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}