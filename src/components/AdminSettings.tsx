"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getRestaurantStatus } from '../utils/timeUtils';
import type { BusinessHoursConfig } from '../utils/timeUtils';

interface DeliveryFee { neighborhood: string; fee: number; }
interface BusinessHours { open: boolean; start: string; end: string; }

const SettingsCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-[#1F1F1F] border border-gray-800/50 rounded-xl shadow-lg">
    <div className="p-3 sm:p-4 border-b border-gray-800/50">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
    <div className="p-3 sm:p-4 space-y-4">{children}</div>
  </div>
);

export default function AdminSettings() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
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
  const [loading, setLoading] = useState(true);

  const checkOpenStatus = useCallback(() => getRestaurantStatus(businessHours).isOpen, [businessHours]);

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.data) {
          setBusinessHours(data.data.businessHours || {});
          setDeliveryFees(data.data.deliveryFees || []);
        }
      } catch {
        setSaveMessage('Erro ao carregar configurações.');
      } finally { setLoading(false); }
    }
    fetchSettings();
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
      const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessHours, deliveryFees }) });
      setSaveMessage(res.ok ? 'Salvo com sucesso!' : 'Erro ao salvar.');
    } catch { setSaveMessage('Erro de conexão.'); } finally {
      setIsSaving(false); setTimeout(() => setSaveMessage(''), 3000);
    }
  };
  const handleLogout = () => router.push('/admin/logout');
  const handleBusinessHoursChange = (day: keyof BusinessHoursConfig, field: 'open' | 'start' | 'end', value: string | boolean) => {
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

  if (loading) return <p>Carregando configurações...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <div className="flex items-center gap-3" role="status">
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {isOpen ? 'Estabelecimento Aberto' : 'Estabelecimento Fechado'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettingsCard title="Horários de Funcionamento">
          {daysOfWeek.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[auto_1fr_1fr] sm:grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2 p-2 rounded-lg hover:bg-gray-800/40">
              <label className="flex items-center gap-3 col-span-3 sm:col-span-1">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={businessHours[key]?.open ?? false}
                  onChange={(e) => handleBusinessHoursChange(key, 'open', e.target.checked)}
                />
                <span className="font-medium text-sm sm:text-base">{label}</span>
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

        <SettingsCard title="Taxas de Entrega">
          <div className="space-y-2">
            {deliveryFees.map((fee, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/40">
                <span className="text-sm sm:text-base">{fee.neighborhood}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-red-400 text-sm sm:text-base">R$ {fee.fee.toFixed(2)}</span>
                  <button onClick={() => handleRemoveFee(index)} className="text-gray-400 hover:text-red-500">&times;</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <input type="text" value={newNeighborhood} onChange={e => setNewNeighborhood(e.target.value)} placeholder="Bairro" className="form-input" />
            <input type="number" value={newFee} onChange={e => setNewFee(e.target.value)} placeholder="Taxa" className="form-input sm:w-28" />
            <button onClick={handleAddFee} className="form-button-secondary">Adicionar</button>
          </div>
        </SettingsCard>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <button onClick={handleSave} disabled={isSaving} className="form-button-primary">
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
        <button onClick={handleLogout} className="form-button-secondary">Sair</button>
      </div>
      {saveMessage && <p className="mt-4 text-sm text-green-400">{saveMessage}</p>}
    </div>
  );
}