'use client';

import { useState } from 'react';
import { displayFinanceMonth, financeDateKey, financePeriodLabel, validateFinancePeriod, type FinancePeriod, type FinancePreset } from '@/utils/financePeriod';

export default function FinancePeriodFilter({ value, onChange }: { value: FinancePeriod; onChange: (period: FinancePeriod) => void }) {
  const today = financeDateKey(new Date());
  const [mode, setMode] = useState<'months' | 'day' | 'range'>('range');
  const [day, setDay] = useState(today);
  const [start, setStart] = useState(`${today.slice(0, 7)}-01`);
  const [end, setEnd] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [months, setMonths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reset = () => {
    onChange({ type: 'all' }); setMonths([]); setMonth(''); setDay(''); setStart(''); setEnd(''); setError(null);
  };
  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    const selectedMonths = [...new Set([...months, ...(month ? [month] : [])])].sort();
    const period: FinancePeriod = mode === 'months' ? { type: 'months', months: selectedMonths } : mode === 'day' ? { type: 'day', day } : { type: 'range', start, end };
    const message = validateFinancePeriod(period);
    setError(message);
    if (!message) { onChange(period); if (mode === 'months') { setMonths(selectedMonths); setMonth(''); } }
  };
  return <section className="admin-toolbar" aria-labelledby="finance-period-title">
    <div className="flex flex-wrap justify-between items-center gap-3"><div><h2 id="finance-period-title" className="text-sm font-bold">Período do relatório</h2><p className="text-xs text-gray-400 mt-1">Datas no horário de Brasília. Intervalos incluem o primeiro e o último dia.</p></div></div>
    <div className="flex flex-wrap gap-2 mt-4" aria-label="Atalhos de período">
      {([{ id: 'today', label: 'Hoje' }, { id: 'week', label: 'Esta semana' }, { id: 'month', label: 'Este mês' }, { id: 'last30', label: 'Últimos 30 dias' }, { id: 'year', label: 'Este ano' }] as { id: FinancePreset; label: string }[]).map(preset => <button key={preset.id} type="button" className="admin-filter-chip" aria-pressed={value.type === 'preset' && value.preset === preset.id} onClick={() => { onChange({ type: 'preset', preset: preset.id }); setError(null); }}>{preset.label}</button>)}
    </div>
    <form onSubmit={apply} className="mt-5" noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 items-end gap-3">
        <div><label htmlFor="finance-mode" className="form-label">Personalizar período</label><select id="finance-mode" value={mode} onChange={event => { setMode(event.target.value as typeof mode); setError(null); }} className="form-input"><option value="range">Intervalo de datas</option><option value="day">Dia específico</option><option value="months">Um ou vários meses</option></select></div>
        {mode === 'range' && <><div><label htmlFor="finance-start" className="form-label">Data inicial</label><input id="finance-start" type="date" className="form-input" value={start} onInput={event => { setStart(event.currentTarget.value); setError(null); }} aria-invalid={!!error} aria-describedby={error ? 'finance-filter-error' : undefined} /></div><div><label htmlFor="finance-end" className="form-label">Data final</label><input id="finance-end" type="date" className="form-input" value={end} onInput={event => { setEnd(event.currentTarget.value); setError(null); }} aria-invalid={!!error} aria-describedby={error ? 'finance-filter-error' : undefined} /></div></>}
        {mode === 'day' && <div className="xl:col-span-2"><label htmlFor="finance-day" className="form-label">Data da consulta</label><input id="finance-day" type="date" className="form-input" value={day} onInput={event => { setDay(event.currentTarget.value); setError(null); }} aria-invalid={!!error} aria-describedby={error ? 'finance-filter-error' : undefined} /></div>}
        {mode === 'months' && <div className="xl:col-span-2"><label htmlFor="finance-month" className="form-label">Mês e ano</label><div className="flex flex-col sm:flex-row gap-2"><input id="finance-month" type="month" className="form-input min-w-0" value={month} onInput={event => { setMonth(event.currentTarget.value); setError(null); }} aria-invalid={!!error} aria-describedby="finance-month-help" /><button type="button" className="form-button-secondary shrink-0" disabled={!month} onClick={() => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { setMonths(prev => [...new Set([...prev, month])].sort()); setMonth(''); setError(null); } }}>Adicionar mês</button></div></div>}
        <button className="form-button-primary" type="submit">Aplicar período</button>
      </div>
      {mode === 'months' && <><p id="finance-month-help" className="text-xs text-gray-400 mt-3">Adicione meses de qualquer ano e clique em “Aplicar período”. O mês preenchido também será incluído.</p><div className="admin-months">{months.map(item => <button type="button" key={item} className="admin-filter-chip" aria-label={`Remover ${displayFinanceMonth(item)}`} onClick={() => setMonths(prev => prev.filter(current => current !== item))}>{displayFinanceMonth(item)} <span aria-hidden="true">×</span></button>)}</div></>}
      {error && <p id="finance-filter-error" className="text-red-300 text-sm mt-3" role="alert">{error}</p>}
    </form>
    <div className="admin-filter-summary"><p role="status" aria-live="polite"><span className="text-gray-400">Exibindo: </span><strong>{financePeriodLabel(value)}</strong></p><button type="button" className="form-button-secondary" onClick={reset}>Limpar filtros</button></div>
  </section>;
}
