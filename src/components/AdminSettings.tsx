'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getRestaurantStatus } from '../utils/timeUtils';
import type { BusinessHoursConfig } from '../utils/timeUtils';

interface DeliveryFee {
    neighborhood: string;
    fee: number;
}

interface BusinessHours {
    open: boolean;
    start: string;
    end: string;
}

export default function AdminSettings() {
    // Estado para permitir/desabilitar pizzas meio a meio
    const [allowHalfAndHalf, setAllowHalfAndHalf] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
    const [businessHours, setBusinessHours] = useState<BusinessHoursConfig>({
        monday: { open: false, start: '18:00', end: '22:00' },
        tuesday: { open: false, start: '18:00', end: '22:00' },
        wednesday: { open: false, start: '18:00', end: '22:00' },
        thursday: { open: false, start: '18:00', end: '22:00' },
        friday: { open: false, start: '18:00', end: '22:00' },
        saturday: { open: false, start: '18:00', end: '22:00' },
        sunday: { open: false, start: '18:00', end: '22:00' }
    });
    const [newNeighborhood, setNewNeighborhood] = useState('');
    const [newFee, setNewFee] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Estados para alteração de senha
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');
    
    // Estados para mostrar/ocultar senhas
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Função para verificar se o estabelecimento está aberto
    const checkOpenStatus = useCallback(() => {
        const status = getRestaurantStatus(businessHours);
        
        console.log('Status detalhado do estabelecimento:', status);
        return status.isOpen;
    }, [businessHours]);

    // Função utilitária para garantir valores padrão
    function mergeBusinessHours(recebido: Partial<BusinessHoursConfig>): BusinessHoursConfig {
        const dias: (keyof BusinessHoursConfig)[] = [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday',
        ];
        const padrao = { open: false, start: '18:00', end: '22:00' };
        const resultado = {} as BusinessHoursConfig;
        dias.forEach((dia) => {
            const recebidoDia = (recebido?.[dia] || {}) as Partial<BusinessHours>;
            resultado[dia] = {
                open: typeof recebidoDia.open === 'boolean' ? recebidoDia.open : padrao.open,
                start: recebidoDia.start || padrao.start,
                end: recebidoDia.end || padrao.end,
            };
        });
        return resultado;
    }

    useEffect(() => {
        // Buscar configurações apenas no mount
        let mounted = true;
        async function fetchSettings() {
            try {
                setLoading(true);
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success && data.data) {
                    setBusinessHours(data.data.businessHours || {});
                    setDeliveryFees(data.data.deliveryFees || []);
                    setAllowHalfAndHalf(data.data.allowHalfAndHalf || false);
                }
            } catch (err) {
                if (mounted) {
                    setSaveMessage('Erro ao carregar configurações do banco. Usando valores padrão.');
                    setBusinessHours(mergeBusinessHours({}));
                    setDeliveryFees([]);
                    setIsOpen(false);
                }
            }
        }
        fetchSettings();
        return () => { mounted = false; };
    }, []); // Só no mount

    // Atualizar o estado isOpen a cada minuto (apenas se não estiver editando)
    useEffect(() => {
        if (isEditing) return;
        const interval = setInterval(() => {
            const newStatus = checkOpenStatus();
            setIsOpen(newStatus);
        }, 60000);
        return () => clearInterval(interval);
    }, [checkOpenStatus, isEditing]);

    // Não atualizar isOpen automaticamente ao editar
    useEffect(() => {
        if (isEditing) return;
        setIsOpen(checkOpenStatus());
    }, [businessHours, checkOpenStatus, isEditing]);

    // Pausar atualização automática de businessHours durante edição
    useEffect(() => {
        if (isEditing) return;
        // Aqui não faz nada, apenas impede qualquer atualização automática de businessHours enquanto edita
    }, [businessHours, isEditing]);

    const handleAddFee = () => {
        if (!newNeighborhood || !newFee) return;

        const fee = parseFloat(newFee);
        if (isNaN(fee) || fee < 0) {
            setSaveMessage('Taxa inválida');
            return;
        }

        setDeliveryFees(prev => [...prev, { neighborhood: newNeighborhood, fee }]);
        setNewNeighborhood('');
        setNewFee('');
    };

    const handleRemoveFee = (index: number) => {
        setDeliveryFees(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('');
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    businessHours, 
                    deliveryFees,
                    allowHalfAndHalf
                })
            });
            const data = await res.json();
            if (data.success) {
                setSaveMessage('Alterações salvas com sucesso!');
                setIsEditing(false);
                setIsOpen(checkOpenStatus());
            } else {
                setSaveMessage('Erro ao salvar alterações.');
            }
        } catch (error) {
            setSaveMessage('Erro ao salvar alterações.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };
    {/* SEÇÃO PIZZA MEIO A MEIO */}
    <div className="bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-white mb-4">Pizzas Meio a Meio</h3>
        <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
            <label htmlFor="allowHalfAndHalf" className="text-gray-300">
                Permitir que clientes montem pizzas com dois sabores?
            </label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input
                    type="checkbox"
                    name="allowHalfAndHalf"
                    id="allowHalfAndHalf"
                    checked={allowHalfAndHalf}
                    onChange={() => setAllowHalfAndHalf(!allowHalfAndHalf)}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label htmlFor="allowHalfAndHalf" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
            </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
            Se ativado, os clientes verão a opção "Adicionar Meio a Meio" no modal de pizzas.
        </p>
    </div>

    const handleLogout = () => {
        router.push('/admin/logout');
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordMessage('Todos os campos são obrigatórios');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordMessage('A nova senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage('As senhas não coincidem');
            return;
        }

        setIsChangingPassword(true);
        setPasswordMessage('');

        try {
            const response = await fetch('/api/admin/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setPasswordMessage('Senha alterada com sucesso!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordChange(false);
            } else {
                setPasswordMessage(data.message || 'Erro ao alterar senha');
            }
        } catch (error) {
            setPasswordMessage('Erro ao conectar com o servidor');
        } finally {
            setIsChangingPassword(false);
            setTimeout(() => setPasswordMessage(''), 3000);
        }
    };

    const handleBusinessHoursChange = (day: keyof BusinessHoursConfig, field: 'open' | 'start' | 'end', value: string | boolean) => {
        setIsEditing(true);
        setBusinessHours(prev => {
            const novo = {
                ...prev,
                [day]: {
                    ...prev[day],
                    [field]: value
                }
            };
            console.log('Alterando horário:', day, field, value, novo);
            return novo;
        });
    };

    const daysOfWeek = [
        { key: 'monday', label: 'Segunda-feira' },
        { key: 'tuesday', label: 'Terça-feira' },
        { key: 'wednesday', label: 'Quarta-feira' },
        { key: 'thursday', label: 'Quinta-feira' },
        { key: 'friday', label: 'Sexta-feira' },
        { key: 'saturday', label: 'Sábado' },
        { key: 'sunday', label: 'Domingo' }
    ] as const;

    return (
        <div className="max-w-4xl mx-auto p-4 w-full">
            <h1 className="text-2xl font-bold mb-6">Configurações do Estabelecimento</h1>

            {/* Indicador de status aberto/fechado */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className={`px-4 py-2 rounded-full text-lg font-semibold ${checkOpenStatus() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {checkOpenStatus() ? 'Aberto' : 'Fechado'}
                </span>
                <span className="text-gray-400 text-sm">(de acordo com as caixas de seleção e horários atuais)</span>
            </div>

            {/* Horários de Funcionamento */}
            <div className="mb-8 p-4 bg-[#262525] text-white border border-gray-700 rounded-lg shadow w-full">
                <h2 className="text-xl font-semibold mb-4">Horários de Funcionamento</h2>
                <div className="space-y-4">
                    {daysOfWeek.map(({ key, label }) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                            <label className="flex items-center space-x-2 min-w-[150px]">
                                <input
                                    type="checkbox"
                                    checked={businessHours[key]?.open ?? false}
                                    onChange={(e) => handleBusinessHoursChange(key, 'open', e.target.checked)}
                                    className="form-checkbox h-5 w-5 text-blue-600"
                                />
                                <span>{label}</span>
                            </label>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0 w-full">
                                <input
                                    type="time"
                                    value={businessHours[key]?.start ?? '18:00'}
                                    onChange={(e) => handleBusinessHoursChange(key, 'start', e.target.value)}
                                    className="form-input w-full sm:w-32 bg-[#262525] text-white border border-gray-700"
                                />
                                <span className="hidden sm:inline">até</span>
                                <input
                                    type="time"
                                    value={businessHours[key]?.end ?? '22:00'}
                                    onChange={(e) => handleBusinessHoursChange(key, 'end', e.target.value)}
                                    className="form-input w-full sm:w-32 bg-[#262525] text-white border border-gray-700"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Alterar Senha */}
            <div className="mb-8 p-4 bg-[#262525] text-white border border-gray-700 rounded-lg shadow w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Alterar Senha Administrativa</h2>
                    <button
                        onClick={() => setShowPasswordChange(!showPasswordChange)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                        {showPasswordChange ? 'Cancelar' : 'Alterar Senha'}
                    </button>
                </div>
                
                {showPasswordChange && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Senha Atual
                            </label>
                            <div className="relative">
                                <input
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full rounded-md border border-gray-700 bg-[#262525] text-gray-100 shadow-sm focus:border-red-600 focus:ring-red-600 px-3 py-2 pr-10"
                                    placeholder="Digite sua senha atual"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showCurrentPassword ? (
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Nova Senha
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full rounded-md border border-gray-700 bg-[#262525] text-gray-100 shadow-sm focus:border-red-600 focus:ring-red-600 px-3 py-2 pr-10"
                                    placeholder="Digite a nova senha (mín. 6 caracteres)"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showNewPassword ? (
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Confirmar Nova Senha
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full rounded-md border border-gray-700 bg-[#262525] text-gray-100 shadow-sm focus:border-red-600 focus:ring-red-600 px-3 py-2 pr-10"
                                    placeholder="Confirme a nova senha"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showConfirmPassword ? (
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleChangePassword}
                            disabled={isChangingPassword}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                        </button>
                        
                        {passwordMessage && (
                            <div className={`p-3 rounded-md text-sm ${
                                passwordMessage.includes('sucesso') 
                                    ? 'bg-green-900 text-green-200' 
                                    : 'bg-red-900 text-red-200'
                            }`}>
                                {passwordMessage}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Taxas de Entrega */}
            <div className="mb-8 p-4 bg-[#262525] text-white border border-gray-700 rounded-lg shadow w-full">
                <h2 className="text-xl font-semibold mb-4">Taxas de Entrega por Bairro</h2>
                <div className="space-y-4">
                    {deliveryFees.map((fee, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-[#1a1a1a] p-3 rounded-lg">
                            <div className="flex-1 w-full">
                                <div className="text-gray-300 font-medium">{fee.neighborhood}</div>
                                <div className="text-red-500">R$ {fee.fee.toFixed(2)}</div>
                            </div>
                            <button
                                onClick={() => handleRemoveFee(index)}
                                className="text-red-600 hover:text-red-700"
                            >
                                Remover
                            </button>
                        </div>
                    ))}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <input
                            type="text"
                            value={newNeighborhood}
                            onChange={(e) => setNewNeighborhood(e.target.value)}
                            placeholder="Nome do bairro"
                            className="flex-1 rounded-md border border-gray-700 bg-[#262525] text-gray-100 shadow-sm focus:border-red-600 focus:ring-red-600"
                        />
                        <input
                            type="number"
                            value={newFee}
                            onChange={(e) => setNewFee(e.target.value)}
                            placeholder="Taxa (R$)"
                            step="0.01"
                            min="0"
                            className="w-full sm:w-32 rounded-md border border-gray-700 bg-[#262525] text-gray-100 shadow-sm focus:border-red-600 focus:ring-red-600"
                        />
                        <button
                            onClick={handleAddFee}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-6 w-full flex flex-col sm:flex-row gap-2 sm:gap-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
                >
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors w-full sm:w-auto"
                >
                    Sair
                </button>
            </div>

            {saveMessage && (
                <div className="mt-4 p-4 rounded-md bg-green-900 text-green-200">
                    {saveMessage}
                </div>
            )}
        </div>
    );
} 