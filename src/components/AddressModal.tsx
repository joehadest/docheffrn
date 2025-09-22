'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Address {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    zipCode: string;
}

interface AddressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (address: Address) => void;
    initialAddress?: Address;
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

export default function AddressModal({ isOpen, onClose, onSave, initialAddress }: AddressModalProps) {
    const [address, setAddress] = useState<Address>(initialAddress || {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        zipCode: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(address);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
            <div className="modal-panel slim" role="document">
                <button
                    onClick={onClose}
                    className="modal-close-btn focus-outline"
                    aria-label="Fechar modal"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 id="address-modal-title" className="text-xl font-bold mb-4 text-white">Endereço de Entrega</h2>

                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    <div>
                        <label htmlFor="street" className="block text-sm font-medium text-gray-200">Rua</label>
                        <input
                            type="text"
                            id="street"
                            value={address.street}
                            onChange={(e) => setAddress({ ...address, street: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-700 bg-[#262525] text-white shadow-sm focus:border-red-600 focus:ring-red-600"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="number" className="block text-sm font-medium text-gray-200">Número</label>
                        <input
                            type="text"
                            id="number"
                            value={address.number}
                            onChange={(e) => setAddress({ ...address, number: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-700 bg-[#262525] text-white shadow-sm focus:border-red-600 focus:ring-red-600"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="complement" className="block text-sm font-medium text-gray-200">Complemento</label>
                        <input
                            type="text"
                            id="complement"
                            value={address.complement}
                            onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-700 bg-[#262525] text-white shadow-sm focus:border-red-600 focus:ring-red-600"
                        />
                    </div>

                    <div>
                        <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-200">Bairro</label>
                        <input
                            type="text"
                            id="neighborhood"
                            value={address.neighborhood}
                            onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-700 bg-[#262525] text-white shadow-sm focus:border-red-600 focus:ring-red-600"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="zipCode" className="block text-sm font-medium text-gray-200">CEP</label>
                        <input
                            type="text"
                            id="zipCode"
                            value={address.zipCode}
                            onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-700 bg-[#262525] text-white shadow-sm focus:border-red-600 focus:ring-red-600"
                            required
                        />
                    </div>

                    <div className="mt-6 flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 