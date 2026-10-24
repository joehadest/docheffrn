'use client';
import { FaSyncAlt } from 'react-icons/fa';
import { useAdminData } from '@/contexts/AdminDataContext';

export default function AdminDataStatus() {
  const { error, loading, refreshing, lastUpdated, refresh } = useAdminData();
  return <div className="admin-data-status">
    <span role={error ? 'alert' : 'status'}>{error || (loading ? 'Carregando os dados do estabelecimento…' : lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' })} · atualização automática` : 'Aguardando atualização')}</span>
    <button className="form-button-secondary" type="button" onClick={() => void refresh()} disabled={refreshing}><FaSyncAlt aria-hidden="true" className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Atualizando…' : 'Atualizar'}</button>
  </div>;
}
