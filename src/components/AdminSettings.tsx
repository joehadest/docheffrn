"use client";
import { PageHeading, StatCard } from './admin/AdminUI';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRestaurantStatus } from '../utils/timeUtils';
import type { BusinessHoursConfig } from '../utils/timeUtils';
import {
    FaSave, FaTrash, FaPlus, FaClock,
    FaMotorcycle, FaQrcode, FaChartBar,
    FaShoppingBag, FaMoneyBillWave, FaExclamationTriangle,
} from 'react-icons/fa';

interface DeliveryFee { neighborhood: string; fee: number; }
interface Stats { todayOrders: number; todayRevenue: number; pendingOrders: number; }

/* ─── SettingsCard ─── */
function SettingsCard({
    title, icon, children,
}: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="relative rounded-2xl border border-white/[0.08] bg-[#111] overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.8)]">
            <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-red-700/40 to-transparent" />
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
                {icon && (
                    <div className="w-7 h-7 rounded-lg bg-red-700/15 border border-red-700/25 flex items-center justify-center text-red-400 shrink-0">
                        {icon}
                    </div>
                )}
                <h2 className="text-sm font-bold text-white tracking-wide">{title}</h2>
            </div>
            <div className="p-5 space-y-4">{children}</div>
        </div>
    );
}

/* ─── Componente principal ─── */
export default function AdminSettings() {
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ text: string; ok: boolean } | null>(null);
    const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
    const [businessHours, setBusinessHours] = useState<BusinessHoursConfig>({
        monday:    { open: false, start: '18:00', end: '22:00' },
        tuesday:   { open: false, start: '18:00', end: '22:00' },
        wednesday: { open: false, start: '18:00', end: '22:00' },
        thursday:  { open: false, start: '18:00', end: '22:00' },
        friday:    { open: false, start: '18:00', end: '22:00' },
        saturday:  { open: false, start: '18:00', end: '22:00' },
        sunday:    { open: false, start: '18:00', end: '22:00' },
    });
    const [newNeighborhood, setNewNeighborhood] = useState('');
    const [newFee, setNewFee] = useState('');
    const [pixKey, setPixKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
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
                if (!settingsRes.ok || !settingsData.success || !settingsData.data) throw new Error('Falha ao carregar');
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
                setLoadError(true);
                setSaveMessage({ text: 'Não foi possível carregar as configurações. Recarregue a página para tentar novamente.', ok: false });
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
        const trimmed = newNeighborhood.trim();
        const fee = parseFloat(newFee);
        if (!trimmed || isNaN(fee) || fee < 0) return;
        setDeliveryFees(prev => [...prev, { neighborhood: trimmed, fee }]);
        setNewNeighborhood('');
        setNewFee('');
    };

    const handleRemoveFee = (index: number) =>
        setDeliveryFees(prev => prev.filter((_, i) => i !== index));

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage(null);
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
            setTimeout(() => setSaveMessage(null), 4000);
        }
    };

    const handleBusinessHoursChange = (
        day: keyof BusinessHoursConfig,
        field: 'open' | 'start' | 'end',
        value: string | boolean
    ) => {
        setBusinessHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    };

    const daysOfWeek = [
        { key: 'sunday',    label: 'Dom', labelFull: 'Domingo' },
        { key: 'monday',    label: 'Seg', labelFull: 'Segunda' },
        { key: 'tuesday',   label: 'Ter', labelFull: 'Terça'   },
        { key: 'wednesday', label: 'Qua', labelFull: 'Quarta'  },
        { key: 'thursday',  label: 'Qui', labelFull: 'Quinta'  },
        { key: 'friday',    label: 'Sex', labelFull: 'Sexta'   },
        { key: 'saturday',  label: 'Sáb', labelFull: 'Sábado'  },
    ] as const;

    if (loading) return (
        <div role="status" className="flex items-center justify-center py-24 gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500" />
            <span className="text-gray-500 text-sm">Carregando configurações...</span>
        </div>
    );

    return (
        <div className="admin-page space-y-6">

            {/* ── Cabeçalho ── */}
            <PageHeading title="Configurações" description="Defina os horários de atendimento, as taxas de entrega e os dados de pagamento.">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border w-fit ${isOpen ? 'bg-green-950/60 text-green-400 border-green-800/50' : 'bg-red-950/60 text-red-400 border-red-900/50'}`}>
                    <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    {isOpen ? 'Aberto Agora' : 'Fechado Agora'}
                </div>
            </PageHeading>

            {/* ── Stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    label="Pedidos Hoje"
                    value={stats.todayOrders}
                    icon={<FaShoppingBag size={14} />}
                />
                <StatCard
                    label="Faturamento Hoje"
                    value={`R$ ${stats.todayRevenue.toFixed(2)}`}
                    color="text-green-400"
                    icon={<FaMoneyBillWave size={14} />}
                />
                <StatCard
                    label="Pendentes"
                    value={stats.pendingOrders}
                    sub="aguardando atenção"
                    color={stats.pendingOrders > 0 ? 'text-yellow-400' : 'text-gray-400'}
                    icon={<FaExclamationTriangle size={13} />}
                />
            </div>

            {/* ── Configurações principais ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Horários */}
                <SettingsCard title="Horários de Funcionamento" icon={<FaClock size={12} />}>
                    <div className="space-y-1">
                        {/* Cabeçalho das colunas */}
                        <div className="grid grid-cols-[1fr_auto] items-center px-1 mb-2">
                            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Dia</span>
                            <div className="flex gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold w-[5.5rem] text-center">Abertura</span>
                                <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold w-[5.5rem] text-center">Fechamento</span>
                            </div>
                        </div>

                        {daysOfWeek.map(({ key, label, labelFull }) => {
                            const cfg = businessHours[key];
                            const isOn = cfg?.open ?? false;
                            return (
                                <div
                                    key={key}
                                    className={`admin-hours-row px-3 py-2.5 rounded-xl transition-all ${isOn ? 'bg-white/[0.03] border border-white/[0.06]' : 'border border-transparent'}`}
                                >
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isOn}
                                            onChange={(e) => handleBusinessHoursChange(key, 'open', e.target.checked)}
                                            className="form-checkbox shrink-0"
                                        />
                                        <span className={`text-sm font-semibold ${isOn ? 'text-white' : 'text-gray-500'}`}>
                                            <span className="sm:hidden">{label}</span>
                                            <span className="hidden sm:inline">{labelFull}</span>
                                        </span>
                                    </label>
                                    <div className="admin-hours-times">
                                        <input
                                            type="time"
                                            aria-label={`Abertura: ${labelFull}`}
                                            value={cfg?.start ?? '18:00'}
                                            onChange={(e) => handleBusinessHoursChange(key, 'start', e.target.value)}
                                            disabled={!isOn}
                                            className="form-input text-xs text-center w-[5.5rem]"
                                        />
                                        <input
                                            type="time"
                                            aria-label={`Fechamento: ${labelFull}`}
                                            value={cfg?.end ?? '22:00'}
                                            onChange={(e) => handleBusinessHoursChange(key, 'end', e.target.value)}
                                            disabled={!isOn}
                                            className="form-input text-xs text-center w-[5.5rem]"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SettingsCard>

                {/* Coluna direita */}
                <div className="space-y-6">

                    {/* Taxas de entrega */}
                    <SettingsCard title="Taxas de Entrega" icon={<FaMotorcycle size={12} />}>
                        {/* Lista de taxas */}
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5 custom-scrollbar">
                            {deliveryFees.length === 0 ? (
                                <p className="text-xs text-gray-600 text-center py-4 rounded-xl border border-dashed border-white/[0.06]">
                                    Nenhuma taxa cadastrada
                                </p>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {deliveryFees.map((fee, index) => (
                                        <motion.div
                                            key={`${fee.neighborhood}-${index}`}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 8 }}
                                            transition={{ duration: 0.18 }}
                                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] group"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-600/60 shrink-0" />
                                                <span className="text-sm text-gray-200 truncate">{fee.neighborhood}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-2">
                                                <span className="text-sm font-bold text-red-400">
                                                    R$ {fee.fee.toFixed(2)}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveFee(index)}
                                                    className="admin-icon-button text-gray-400 hover:text-red-300"
                                                    aria-label={`Remover ${fee.neighborhood}`}
                                                >
                                                    <FaTrash size={10} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>

                        {/* Formulário de adição */}
                        <div className="pt-3 border-t border-white/[0.06] space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newNeighborhood}
                                    onChange={e => setNewNeighborhood(e.target.value)}
                                    aria-label="Nome do bairro" placeholder="Nome do bairro"
                                    className="form-input flex-1 min-w-0"
                                    onKeyDown={e => e.key === 'Enter' && handleAddFee()}
                                />
                                <div className="relative w-24 shrink-0">
                                    <span className="absolute inset-y-0 left-2.5 flex items-center text-gray-500 text-xs pointer-events-none select-none">R$</span>
                                    <input
                                        type="number"
                                        value={newFee}
                                        onChange={e => setNewFee(e.target.value)}
                                        aria-label="Taxa de entrega em reais" placeholder="0.00"
                                        className="form-input w-full"
                                        style={{ paddingLeft: '1.875rem' }}
                                        onKeyDown={e => e.key === 'Enter' && handleAddFee()}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAddFee}
                                disabled={!newNeighborhood.trim() || !newFee}
                                className="w-full form-button-secondary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <FaPlus size={10} /> Adicionar Taxa
                            </button>
                        </div>
                    </SettingsCard>

                    {/* Chave PIX */}
                    <SettingsCard title="Chave PIX" icon={<FaQrcode size={12} />}>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="admin-pix" className="form-label">Chave para Recebimento</label>
                                <input
                                    type="text"
                                    id="admin-pix" value={pixKey}
                                    onChange={(e) => setPixKey(e.target.value)}
                                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                                    className="form-input"
                                />
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Essa chave é exibida nas mensagens de WhatsApp quando o cliente escolhe pagar via PIX.
                            </p>
                        </div>
                    </SettingsCard>

                </div>
            </div>

            {/* ── Rodapé / Ações ── */}
            <div className="admin-settings-save flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <motion.button
                    onClick={handleSave}
                    disabled={isSaving || loadError}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="form-button-primary min-w-[160px] disabled:opacity-60 disabled:cursor-not-allowed gap-2"
                >
                    {isSaving ? (
                        <>
                            <span className="animate-spin h-4 w-4 border-b-2 border-white/60 rounded-full" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <FaSave size={13} />
                            Salvar Alterações
                        </>
                    )}
                </motion.button>

                <AnimatePresence>
                    {saveMessage && (
                        <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.2 }}
                            role="status" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${saveMessage.ok ? 'bg-green-950/60 border-green-800/50 text-green-300' : 'bg-red-950/60 border-red-800/50 text-red-300'}`}
                        >
                            {saveMessage.ok ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            )}
                            {saveMessage.text}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </div>
    );
}
