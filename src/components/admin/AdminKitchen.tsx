'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaClock, FaPrint, FaSyncAlt, FaUtensils } from 'react-icons/fa';
import { useAdminData } from '@/contexts/AdminDataContext';
import type { Pedido } from '@/types/cart';
import { FINANCE_TIME_ZONE } from '@/utils/financePeriod';
import { EmptyState, PageHeading } from './AdminUI';
import { matchesOrderSearch, ORDER_CHANNEL_LABELS, ORDER_STATUS_LABELS, orderElapsedLabel } from './orderOperations';
import './admin-operations.css';

const kitchenStatuses: Pedido['status'][] = ['pendente', 'preparando', 'pronto'];

export default function AdminKitchen() {
  const { orders, loading, refreshing, error, lastUpdated, refresh, updateOrder } = useAdminData();
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const queue = useMemo(() => orders.filter(order => kitchenStatuses.includes(order.status) && order.itens.length > 0 && (!channel || channel === order.tipoEntrega) && matchesOrderSearch(order, search)).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()), [orders, channel, search]);
  const itemsToPrepare = queue.filter(order => order.status !== 'pronto').reduce((sum, order) => sum + order.itens.reduce((count, item) => count + item.quantidade, 0), 0);

  async function advance(order: Pedido) {
    if (updatingId) return;
    const status = order.status === 'pendente' ? 'preparando' : order.status === 'preparando' ? 'pronto' : null;
    if (!status) return;
    setUpdatingId(order._id);
    setActionError(null);
    setNotice('');
    try {
      await updateOrder(order._id, { status, expectedStatus: order.status });
      setNotice(`Pedido #${order._id.slice(-6)} ${status === 'preparando' ? 'em preparo' : 'pronto'}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível atualizar o pedido. Tente novamente.');
    } finally {
      setUpdatingId(null);
    }
  }

  return <div className="admin-page ops-kitchen-page">
    <PageHeading title="Cozinha" description="Uma fila clara para preparar, conferir e liberar cada pedido. Os mais antigos aparecem primeiro."><button type="button" className="form-button-secondary" onClick={() => refresh()} disabled={refreshing}><FaSyncAlt aria-hidden="true" className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Atualizando…' : 'Atualizar'}</button></PageHeading>
    <div className="ops-summary-strip"><span><FaUtensils aria-hidden="true" /> <strong>{itemsToPrepare}</strong> itens aguardando ou em preparo</span><span><strong>{queue.filter(order => order.status === 'pronto').length}</strong> pedidos prontos</span><span className="ops-updated">{lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR', { timeZone: FINANCE_TIME_ZONE, hour: '2-digit', minute: '2-digit' })}` : 'Aguardando atualização'}</span></div>
    {(error || actionError) && <div role="alert" className="ops-error"><p>{actionError || error}</p><button className="form-button-secondary" type="button" disabled={refreshing} onClick={() => refresh()}>Atualizar dados</button></div>}
    {notice && <p role="status" className="ops-success">{notice}</p>}
    <fieldset className="admin-toolbar ops-kitchen-filters" aria-label="Filtros da cozinha"><div><label htmlFor="kitchen-search">Buscar pedido</label><input id="kitchen-search" type="search" className="form-input" placeholder="Nome, telefone, número ou mesa" value={search} onChange={event => setSearch(event.target.value)} /></div><div><label htmlFor="kitchen-channel">Canal</label><select id="kitchen-channel" className="form-input" value={channel} onChange={event => setChannel(event.target.value)}><option value="">Todos os canais</option><option value="entrega">Delivery</option><option value="retirada">Retirada</option><option value="local">Mesas</option></select></div>{(search || channel) && <button type="button" className="form-button-secondary" onClick={() => { setSearch(''); setChannel(''); }}>Limpar</button>}</fieldset>
    <p className="ops-kitchen-hint"><FaClock aria-hidden="true" /> O tempo exibido começa na criação do pedido. Pedidos em aberto de dias anteriores continuam na fila.</p>
    {loading ? <div role="status" className="ops-loading">Carregando fila da cozinha…</div> : queue.length === 0 ? <EmptyState>{search || channel ? 'Nenhum pedido corresponde aos filtros selecionados.' : 'Fila em dia. Novos pedidos com itens aparecerão aqui.'}</EmptyState> : <div className="ops-kitchen-board">
      {kitchenStatuses.map(status => {
        const columnOrders = queue.filter(order => order.status === status);
        return <section key={status} className="ops-column" data-status={status} aria-labelledby={`kitchen-${status}`}><header className="ops-column-heading"><h2 id={`kitchen-${status}`}>{ORDER_STATUS_LABELS[status]}</h2><span>{columnOrders.length}</span></header>
          {columnOrders.length === 0 ? <p className="ops-column-empty">Nenhum pedido nesta etapa.</p> : <ul className="ops-card-stack">{columnOrders.map(order => <li key={order._id}><article className="ops-order-card ops-kitchen-card" data-status={order.status}>
            <div className="ops-order-card-top"><strong>#{order._id.slice(-6)}</strong><span className="ops-channel">{ORDER_CHANNEL_LABELS[order.tipoEntrega]}{order.tipoEntrega === 'local' && order.mesa ? ` · ${order.mesa}` : ''}</span></div>
            <h3>{order.cliente?.nome || 'Cliente não informado'}</h3><p className="ops-order-time"><FaClock aria-hidden="true" />{orderElapsedLabel(order.data, now)}</p>
            <ul className="ops-kitchen-items">{order.itens.map((item, index) => <li key={index}><span className="ops-kitchen-quantity">{item.quantidade}×</span><div><strong>{item.nome}</strong>{item.size && <p>Tamanho: {item.size}</p>}{item.flavors?.length ? <p>Sabores: {item.flavors.join(' / ')}</p> : null}{item.border && <p>Borda: {item.border}</p>}{item.extras?.length ? <p>Adicionais: {item.extras.join(', ')}</p> : null}{item.observacao && <p className="ops-item-observation">{item.observacao}</p>}</div></li>)}</ul>
            {order.observacoes && <div className="ops-kitchen-observation"><strong>Observação do pedido</strong><p>{order.observacoes}</p></div>}
            <div className="ops-kitchen-actions"><button className="form-button-secondary" type="button" aria-label={`Imprimir pedido ${order._id.slice(-6)}`} onClick={() => window.open(`/admin/print/${order._id}`, '_blank', 'noopener,noreferrer')}><FaPrint aria-hidden="true" /></button>{order.status !== 'pronto' ? <button className="form-button-primary" type="button" disabled={!!updatingId} onClick={() => advance(order)}>{updatingId === order._id ? 'Salvando…' : order.status === 'pendente' ? 'Iniciar preparo' : 'Marcar pronto'}</button> : <p className="ops-ready-note">{order.tipoEntrega === 'local' ? 'Pronto para servir · fechamento em Mesas' : order.tipoEntrega === 'retirada' ? 'Aguardando retirada · finalize em Pedidos' : 'Aguardando expedição · veja Entregas'}</p>}</div>
          </article></li>)}</ul>}
        </section>;
      })}
    </div>}
  </div>;
}
