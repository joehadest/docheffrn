'use client';
import { useMemo } from 'react';
import { FaArrowRight, FaChartLine, FaClock, FaMotorcycle, FaShoppingBag } from 'react-icons/fa';
import { useAdminData } from '@/contexts/AdminDataContext';
import { buildAdminAnalytics, channelLabel, formatAdminDate, money, statusLabel } from '@/utils/adminAnalytics';
import { financialOrderTotal } from '@/utils/financePeriod';
import { EmptyState, PageHeading, StatCard } from './AdminUI';
import AdminDataStatus from './AdminDataStatus';

export default function AdminOverview({ onNavigate }: { onNavigate: (tab: 'orders' | 'kitchen' | 'deliveries' | 'reports') => void }) {
  const { orders, loading, lastUpdated } = useAdminData();
  const report = useMemo(() => buildAdminAnalytics(orders, { type: 'preset', preset: 'today' }), [orders, lastUpdated]);
  const active = orders.filter(order => !['entregue', 'cancelado'].includes(order.status));
  const queue = [...active].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  const steps = [{ status: 'pendente', label: 'Novos pedidos', tab: 'orders' }, { status: 'preparando', label: 'Na cozinha', tab: 'kitchen' }, { status: 'pronto', label: 'Prontos', tab: 'kitchen' }, { status: 'em_entrega', label: 'Em entrega', tab: 'deliveries' }] as const;
  return <div className="admin-page admin-management-page">
    <PageHeading title="Visão geral" description="Seu restaurante em um só lugar. Acompanhe o dia e o que precisa de atenção."><span className="admin-today-pill">{formatAdminDate(new Date().toISOString())} · Brasília</span></PageHeading>
    <AdminDataStatus />
    {loading ? <div className="admin-loading-grid" role="status">Carregando os indicadores…</div> : <>
      <section className="admin-kpi-grid" aria-label="Indicadores de hoje">
        <StatCard label="Faturamento de hoje" value={money(report.revenue)} sub={`${report.completed} pedidos concluídos`} icon={<FaChartLine />} color="text-green-400" />
        <StatCard label="Pedidos recebidos" value={report.orders.length} sub={`${report.canceled} cancelados hoje`} icon={<FaShoppingBag />} />
        <StatCard label="Ticket médio" value={money(report.ticket)} sub="por pedido concluído hoje" icon={<FaChartLine />} />
        <StatCard label="Em atendimento" value={active.length} sub="inclui pedidos abertos de outros dias" icon={<FaClock />} color="text-amber-300" />
      </section>
      <section className="admin-overview-hero">
        <div><p className="admin-eyebrow">Operação em andamento</p><h2>{active.length ? `${active.length} pedidos para acompanhar` : 'Tudo em dia por aqui'}</h2><p>A cozinha, a expedição e o atendimento acompanham as mesmas etapas do pedido.</p><button type="button" className="form-button-primary" onClick={() => onNavigate('orders')}>Abrir central de pedidos <FaArrowRight /></button></div>
        <div className="admin-flow-grid">{steps.map(step => <button key={step.status} type="button" onClick={() => onNavigate(step.tab)}><span>{step.label}</span><strong>{active.filter(order => order.status === step.status).length}</strong><FaArrowRight aria-hidden="true" /></button>)}</div>
      </section>
      <div className="admin-management-columns">
        <section className="admin-surface"><div className="admin-section-heading"><div><h2>Pedidos que aguardam atendimento</h2><p>Os mais antigos aparecem primeiro, independentemente do dia.</p></div><button type="button" className="admin-text-link" onClick={() => onNavigate('orders')}>Ver todos <FaArrowRight /></button></div>
          {!queue.length ? <EmptyState>Nenhum pedido em aberto.</EmptyState> : <div className="admin-activity-list">{queue.slice(0, 6).map(order => <button key={order._id} type="button" onClick={() => onNavigate('orders')}><span className="admin-activity-icon"><FaShoppingBag /></span><span><strong>#{order._id.slice(-6)} · {order.cliente?.nome || order.mesa || 'Cliente'}</strong><small>{channelLabel(order.tipoEntrega)} · {formatAdminDate(order.data, true)}</small></span><span><strong>{money(financialOrderTotal(order))}</strong><small>{statusLabel(order.status)}</small></span></button>)}</div>}
        </section>
        <section className="admin-surface"><div className="admin-section-heading"><div><h2>Mais vendidos hoje</h2><p>Itens de pedidos concluídos.</p></div><button type="button" aria-label="Abrir relatórios de produtos" className="admin-icon-button" onClick={() => onNavigate('reports')}><FaArrowRight /></button></div>
          {!report.products.length ? <EmptyState>As vendas concluídas do dia aparecerão aqui.</EmptyState> : <ol className="admin-ranking">{report.products.slice(0, 5).map((product, index) => <li key={product.name}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{product.name}</strong><small>{product.quantity} unidades</small></div><strong>{money(product.revenue)}</strong></li>)}</ol>}
          <button type="button" className="admin-inline-action" onClick={() => onNavigate('deliveries')}><FaMotorcycle /> Organizar entregas e entregadores <FaArrowRight /></button>
        </section>
      </div>
    </>}
  </div>;
}
