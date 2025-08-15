'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from '../types/menu';

interface PastaModalProps {
    item: MenuItem;
    onClose: () => void;
    onAddToCart: (quantity: number, observation: string, size?: 'P' | 'G') => void;
}

const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            damping: 25,
            stiffness: 300
        }
    },
    exit: {
        opacity: 0,
        scale: 0.8,
        transition: {
            duration: 0.2
        }
    }
};

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

export default function PastaModal({ item, onClose, onAddToCart }: PastaModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [observation, setObservation] = useState('');
    const [selectedSize, setSelectedSize] = useState<'P' | 'G'>('P');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddToCart(quantity, observation, selectedSize);
    };

    const calculateTotal = () => {
        const price = item.sizes ? item.sizes[selectedSize] || item.price : item.price;
        return price * quantity;
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={onClose}
            >
                <motion.div
                    className="bg-[#262525] rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white">{item.name}</h3>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="text-gray-500 hover:text-gray-700"
                            onClick={onClose}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </motion.button>
                    </div>

                    {item.image && (
                        <div className="relative h-48 mb-4">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover rounded-lg"
                            />
                        </div>
                    )}

                    <p className="text-gray-300 mb-4">{item.description}</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-[#262525] p-4 rounded-lg mb-4">
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                Tamanho
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedSize('P')}
                                    className={`p-3 rounded-lg border-2 transition-all ${selectedSize === 'P'
                                        ? 'border-red-600 bg-red-900/20 text-red-400'
                                        : 'border-gray-700 hover:border-red-600 text-gray-300'
                                        }`}
                                >
                                    <div className="font-semibold">Pequena</div>
                                    <div className="text-sm">R$ {item.sizes?.P?.toFixed(2)}</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSize('G')}
                                    className={`p-3 rounded-lg border-2 transition-all ${selectedSize === 'G'
                                        ? 'border-red-600 bg-red-900/20 text-red-400'
                                        : 'border-gray-700 hover:border-red-600 text-gray-300'
                                        }`}
                                >
                                    <div className="font-semibold">Grande</div>
                                    <div className="text-sm">R$ {item.sizes?.G?.toFixed(2)}</div>
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#262525] p-4 rounded-lg">
                            <label htmlFor="quantity" className="block text-sm font-medium text-gray-200 mb-3">
                                Quantidade
                            </label>
                            <div className="flex items-center gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center text-lg font-bold hover:bg-red-700"
                                >
                                    -
                                </motion.button>
                                <span className="font-semibold text-lg text-gray-200">{quantity}</span>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center text-lg font-bold hover:bg-red-700"
                                >
                                    +
                                </motion.button>
                            </div>
                        </div>

                        <div className="bg-[#262525] p-4 rounded-lg">
                            <label htmlFor="observation" className="block text-sm font-medium text-gray-200 mb-3">
                                Observação
                            </label>
                            <textarea
                                id="observation"
                                value={observation}
                                onChange={(e) => setObservation(e.target.value)}
                                className="block w-full rounded-md border-gray-700 bg-[#262525] text-gray-200 shadow-sm focus:border-red-600 focus:ring-red-600"
                                rows={3}
                                placeholder="Ex: Sem cebola, mais queijo..."
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
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 font-semibold"
                            >
                                Adicionar ao Carrinho
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
} 