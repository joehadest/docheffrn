"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getRestaurantStatus } from '../utils/timeUtils';
import type { BusinessHoursConfig } from '../utils/timeUtils';

interface DeliveryFee { neighborhood: string; fee: number; }

interface Stats {
    todayOrders: number;
    todayRevenue: number;
    pendingOrders: number;
}

const SettingsCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-[#1F1F1F] border border-gray-800/50 rounded-xl shadow-lg">
        <div className="p-3 sm:p-4 border-b border-gray-800/50">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <div className="p-3 sm:p-4 space-y-4">{children}</div>
    </div>
);

const StatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div className="bg-[#1F1F1F] border border-gray-800/50 rounded-xl p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-3xl font-bold ${color ?? 'text-white'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
);

export default function AdminSettings() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ text: string; ok: boolean } | null>(null);
    const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
    const [businessHours, setBusinessHours] = useState<BusinessHoursConfig>({
        monday: { open: false, start: '18:00', end: '22:00' },
        tuesday: { open: false, start: '18:00', end: '22:00' },
        wednesday: { open: false, start: '18:00', end: '22:00' },
        thursday: { open: false, start: '18:00', end: '22:00' },
        friday: { open: false, start: '18:00', end: '22:00' },
        saturday: { open: false, start: '18:00', end: '22:00' },
        sunday: { open: false, start: '18:00', end: '22:00' },
    });
    const [newNeighborhood, setNewNeighborhood] = useState('');
    const [newFee, setNewFee] = useState('');
    const [pixKey, setPixKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({ todayOrders: 0, todayRevenue: 0, pendingOrders: 0 });

    const checkOpenStatus = useCallback(() => getRestaurantStatus(businessHours).isOpen, [businessHours]);

    useEffect(() => {
        async function fetchAll() {
            setLoading(true);
            try {
                const [settingsRes, pedidosRes] = await Promise.all([
                    fetch('/api/settings'),
                    fetch('/api/pedidos'),
                ]);
                const settingsData = await settingsRes.json();
                if (settingsData.success && settingsData.data) {
                    setBusinessHours(settingsData.data.businessHours || {});
                    setDeliveryFees(settingsData.data.deliveryFees || []);
                    setPixKey(settingsData.data.pixKey || '');
                }
                const pedidosData = await pedidosRes.json();
                if (pedidosData.success && Array.isArray(pedidosData.data)) {
                    const todayStr = new Date().toLocaleDateString('pt-BR');
                    const todayOrders = pedidosData.data.filter(
                        (p: { data: string }) => new Date(p.data).toLocaleDateString('pt-BR') === todayStr
                    );
                    setStats({
                        todayOrders: todayOrders.length,
                        todayRevenue: todayOrders.reduce((sum: number, p: { total?: number }) => sum + (p.total || 0), 0),
                        pendingOrders: pedidosData.data.filter((p: { status: string }) => p.status === 'pendente').length,
                    });
                }
            } catch {
                setSaveMessage({ text: 'Erro ao carregar configurações.', ok: false });
            } finally {
                setLoading(false);
            }
        }
        fetchAll();
    }, []);

    useEffect(() => {
        setIsOpen(checkOpenStatus());
        const interval = setInterval(() => setIsOpen(checkOpenStatus()), 60000);
        return () => clearInterval(interval);
    }, [businessHours, checkOpenStatus]);

    const handleAddFee = () => {
        if (!newNeighborhood || !newFee) return;
        const fee = parseFloat(newFee);
        if (isNaN(fee) || fee < 0) return;
        setDeliveryFees(prev => [...prev, { neighborhood: newNeighborhood, fee }]);
        setNewNeighborhood('');
        setNewFee('');
    };

    const handleRemoveFee = (index: number) => setDeliveryFees(prev => prev.filter((_, i) => i !== index));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessHours, deliveryFees, pixKey }),
            });
            setSaveMessage({ text: res.ok ? 'Configurações salvas com sucesso!' : 'Erro ao salvar.', ok: res.ok });
        } catch {
            setSaveMessage({ text: 'Erro de conexão.', ok: false });
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(null), 3000);
        }
    };

    const handleLogout = () => router.push('/admin/logout');

    const handleBusinessHoursChange = (
        day: keyof BusinessHoursConfig,
        field: 'open' | 'start' | 'end',
        value: string | boolean
    ) => {
        setBusinessHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    };

    const daysOfWeek = [
        { key: 'sunday', label: 'Domingo' },
        { key: 'monday', label: 'Segunda' },
        { key: 'tuesday', label: 'Terça' },
        { key: 'wednesday', label: 'Quarta' },
        { key: 'thursday', label: 'Quinta' },
        { key: 'friday', label: 'Sexta' },
        { key: 'saturday', label: 'Sábado' },
    ] as const;

    if (loading) return (
        <div className="flex items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-red-500" />
            <span className="text-gray-400">Carregando configurações...</span>
        </div>
    );

    return (
        <div className="space-y-6">
            <style jsx global>{`
                .form-input { @apply w-full mt-1 p-2 bg-[#2a2a2a] border border-gray-600 rounded-md text-white focus:ring-red-500 focus:border-red-500 transition-colors; }
                .form-checkbox { @apply h-4 w-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500; }
                .form-button-primary { @apply px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center font-semibold; }
                .form-button-secondary { @apply px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-700 transition-colors; }
            `}</style>

            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-white">Configurações</h1>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold w-fit ${isOpen ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {isOpen ? '🟢 Aberto Agora' : '🔴 Fechado Agora'}
                </span>
            </div>

            {/* Resumo do dia */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Pedidos Hoje" value={stats.todayOrders} />
                <StatCard label="Faturamento Hoje" value={`R$ ${stats.todayRevenue.toFixed(2)}`} color="text-green-400" />
                <StatCard
                    label="Aguardando Atenção"
                    value={stats.pendingOrders}
                    sub="pedidos pendentes"
                    color={stats.pendingOrders > 0 ? 'text-yellow-400' : 'text-gray-400'}
                />
            </div>

            {/* Configurações principais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SettingsCard title="Horários de Funcionamento">
                    {daysOfWeek.map(({ key, label }) => (
                        <div key={key} className={`grid grid-cols-[auto_1fr_1fr] sm:grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2 p-2 rounded-lg transition-colors ${businessHours[key]?.open ? 'hover:bg-gray-800/40' : 'opacity-60 hover:bg-gray-800/20'}`}>
                            <label className="flex items-center gap-3 col-span-3 sm:col-span-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={businessHours[key]?.open ?? false}
                                    onChange={(e) => handleBusinessHoursChange(key, 'open', e.target.checked)}
                                />
                                <span className={`font-medium text-sm sm:text-base ${businessHours[key]?.open ? 'text-white' : 'text-gray-500'}`}>
                                    {label}
                                </span>
                            </label>
                            <input
                                type="time"
                                className="form-input text-sm"
                                value={businessHours[key]?.start ?? '18:00'}
                                onChange={(e) => handleBusinessHoursChange(key, 'start', e.target.value)}
                                disabled={!businessHours[key]?.open}
                            />
                            <input
                                type="time"
                                className="form-input text-sm"
                                value={businessHours[key]?.end ?? '22:00'}
                                onChange={(e) => handleBusinessHoursChange(key, 'end', e.target.value)}
                                disabled={!businessHours[key]?.open}
                            />
                        </div>
                    ))}
                </SettingsCard>

                <div className="space-y-6">
                    <SettingsCard title="Taxas de Entrega por Bairro">
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {deliveryFees.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-3">Nenhuma taxa cadastrada.</p>
                            )}
                            {deliveryFees.map((fee, index) => (
                                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/40">
                                    <span className="text-sm sm:text-base">{fee.neighborhood}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-red-400 text-sm">R$ {fee.fee.toFixed(2)}</span>
                                        <button
                                            onClick={() => handleRemoveFee(index)}
                                            className="text-gray-400 hover:text-red-500 text-xl leading-none"
                                            aria-label={`Remover taxa de ${fee.neighborhood}`}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-800/50">
                            <input
                                type="text"
                                value={newNeighborhood}
                                onChange={e => setNewNeighborhood(e.target.value)}
                                placeholder="Bairro"
                                className="form-input"
                                onKeyDown={e => e.key === 'Enter' && handleAddFee()}
                            />
                            <input
                                type="number"
                                value={newFee}
                                onChange={e => setNewFee(e.target.value)}
                                placeholder="Taxa (R$)"
                                className="form-input sm:w-32"
                                onKeyDown={e => e.key === 'Enter' && handleAddFee()}
                            />
                            <button onClick={handleAddFee} className="form-button-secondary whitespace-nowrap">
                                + Adicionar
                            </button>
                        </div>
                    </SettingsCard>

                    <SettingsCard title="Chave PIX">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Chave para Pagamento via PIX
                            </label>
                            <input
                                type="text"
                                value={pixKey}
                                onChange={(e) => setPixKey(e.target.value)}
                                placeholder="CPF, e-mail, telefone ou chave aleatória"
                                className="form-input w-full"
                            />
                            <p className="mt-2 text-xs text-gray-400">
                                Exibida nas mensagens do WhatsApp quando o pagamento for via PIX.
                            </p>
                        </div>
                    </SettingsCard>
                </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button onClick={handleSave} disabled={isSaving} className="form-button-primary min-w-[160px]">
                    {isSaving ? (
                        <span className="flex items-center gap-2">
                            <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
                            Salvando...
                        </span>
                    ) : 'Salvar Alterações'}
                </button>
                <button onClick={handleLogout} className="form-button-secondary">
                    Sair
                </button>
            </div>

            {saveMessage && (
                <p className={`text-sm font-medium ${saveMessage.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {saveMessage.ok ? '✓ ' : '✕ '}{saveMessage.text}
                </p>
            )}
        </div>
    );
}
