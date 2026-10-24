'use client';
import { useMemo, useState } from 'react';
import { FaDownload, FaSearch, FaUser, FaUsers } from 'react-icons/fa';
import { useAdminData } from '@/contexts/AdminDataContext';
import { buildCustomers, channelLabel, csvDocument, formatAdminDate, money, normalizedText, statusLabel } from '@/utils/adminAnalytics';
import { financialOrderTotal } from '@/utils/financePeriod';
import AdminDialog from './AdminDialog';
import AdminDataStatus from './AdminDataStatus';
import { EmptyState, PageHeading, StatCard } from './AdminUI';
import { downloadCSV } from './downloadCSV';

export default function AdminCustomers() {
  const { orders, loading, lastUpdated } = useAdminData();
  const { customers, unidentified } = useMemo(() => buildCustomers(orders), [orders]);
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('all');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const selectedCustomer = customers.find(customer => customer.phone === selected);
  const now = lastUpdated?.getTime() || Date.now();
  const filtered = customers.filter(customer => {
    const matches = normalizedText(`${customer.name} ${customer.phone}`).includes(normalizedText(query)) || (!!query.replace(/\D/g, '') && customer.phone.includes(query.replace(/\D/g, '')));
    return matches && (segment === 'all' || (segment === 'repeat' && customer.completed > 1) || (segment === 'first' && customer.completed === 1) || (segment === 'inactive' && now - new Date(customer.lastOrder).getTime() > 30 * 86400000));
  }).sort((a, b) => sort === 'spent' ? b.spent - a.spent : sort === 'orders' ? b.orders.length - a.orders.length : new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime());
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 25) - 1));
  const exportCustomers = () => downloadCSV('clientes.csv', csvDocument([['Nome', 'Telefone', 'Pedidos', 'Concluídos', 'Total em pedidos concluídos (R$)', 'Primeiro pedido', 'Último pedido'], ...filtered.map(customer => [customer.name, customer.phone, customer.orders.length, customer.completed, customer.spent.toFixed(2).replace('.', ','), formatAdminDate(customer.firstOrder), formatAdminDate(customer.lastOrder)])]));
  return <div className="admin-page admin-management-page">
    <PageHeading title="Clientes" description="Conheça quem compra com você e consulte o histórico de atendimento."><button type="button" className="form-button-secondary" disabled={!filtered.length} onClick={exportCustomers}><FaDownload /> Exportar clientes</button></PageHeading>
    <AdminDataStatus />
    <section className="admin-kpi-grid admin-kpi-grid-three"><StatCard label="Clientes identificados" value={customers.length} icon={<FaUsers />} sub="agrupados pelo telefone" /><StatCard label="Clientes recorrentes" value={customers.filter(customer => customer.completed > 1).length} icon={<FaUser />} sub="mais de uma compra concluída" /><StatCard label="Sem pedidos há 30 dias" value={customers.filter(customer => now - new Date(customer.lastOrder).getTime() > 30 * 86400000).length} icon={<FaUser />} sub="considera a última data de pedido" /></section>
    <section className="admin-toolbar admin-customer-filters" aria-label="Filtros de clientes">
      <div><label htmlFor="customer-query" className="form-label">Buscar cliente</label><div className="admin-search-field"><FaSearch aria-hidden="true" /><input id="customer-query" className="form-input" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Nome ou telefone" /></div></div>
      <div><label htmlFor="customer-segment" className="form-label">Perfil</label><select id="customer-segment" className="form-input" value={segment} onChange={event => { setSegment(event.target.value); setPage(0); }}><option value="all">Todos os clientes</option><option value="first">Uma compra concluída</option><option value="repeat">Recorrentes</option><option value="inactive">Sem pedidos há 30 dias</option></select></div>
      <div><label htmlFor="customer-sort" className="form-label">Ordenar por</label><select id="customer-sort" className="form-input" value={sort} onChange={event => { setSort(event.target.value); setPage(0); }}><option value="recent">Pedido mais recente</option><option value="spent">Maior valor em compras</option><option value="orders">Mais pedidos</option></select></div>
    </section>
    <p className="admin-help-text">Base formada pelo histórico de pedidos. {unidentified > 0 && `${unidentified} pedidos sem telefone válido não foram agrupados.`}</p>
    {loading ? <p role="status">Carregando clientes…</p> : !filtered.length ? <EmptyState>Nenhum cliente encontrado. Ajuste os filtros ou aguarde novos pedidos identificados.</EmptyState> : <section className="admin-surface admin-table-surface">
      <div className="admin-table-scroll"><table className="admin-data-table"><caption className="sr-only">Clientes filtrados e histórico de compras</caption><thead><tr><th>Cliente</th><th>Pedidos</th><th>Compras concluídas</th><th>Último pedido</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{filtered.slice(currentPage * 25, (currentPage + 1) * 25).map(customer => <tr key={customer.phone}><td><strong>{customer.name}</strong><small>{customer.phone}</small></td><td>{customer.orders.length}<small>{customer.completed} concluídos</small></td><td>{money(customer.spent)}</td><td>{formatAdminDate(customer.lastOrder)}</td><td><button className="form-button-secondary" type="button" onClick={() => { setSelected(customer.phone); setHistoryPage(0); }} aria-label={`Ver histórico de ${customer.name}`}>Ver histórico</button></td></tr>)}</tbody></table></div>
      <div className="admin-pagination"><span>{filtered.length} clientes · página {currentPage + 1} de {Math.ceil(filtered.length / 25)}</span><div><button type="button" className="form-button-secondary" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Anterior</button><button type="button" className="form-button-secondary" disabled={(currentPage + 1) * 25 >= filtered.length} onClick={() => setPage(currentPage + 1)}>Próxima</button></div></div>
    </section>}
    {selectedCustomer && <AdminDialog id="customer-detail-title" title={selectedCustomer.name} description={`Histórico associado ao telefone ${selectedCustomer.phone}`} icon={<FaUser />} onClose={() => setSelected(null)} size="wide" footer={<button type="button" className="form-button-secondary" onClick={() => setSelected(null)}>Fechar histórico</button>}>
      <div className="admin-customer-summary"><div><span>Compras concluídas</span><strong>{selectedCustomer.completed}</strong></div><div><span>Valor em compras</span><strong>{money(selectedCustomer.spent)}</strong></div><div><span>Ticket médio</span><strong>{money(selectedCustomer.completed ? selectedCustomer.spent / selectedCustomer.completed : 0)}</strong></div></div>
      {selectedCustomer.lastAddress?.address && <section className="admin-dialog-section mb-4"><h3 className="font-semibold">Último endereço informado</h3><p className="admin-help-text">{selectedCustomer.lastAddress.address.street}, {selectedCustomer.lastAddress.address.number} · {selectedCustomer.lastAddress.address.neighborhood}{selectedCustomer.lastAddress.address.complement && ` · ${selectedCustomer.lastAddress.address.complement}`}</p></section>}
      <h3 className="font-semibold mb-3">Histórico de pedidos</h3><div className="admin-customer-history">{selectedCustomer.orders.slice(historyPage * 10, (historyPage + 1) * 10).map(order => <details key={order._id} className="admin-dialog-section"><summary><span><strong>#{order._id.slice(-6)} · {money(financialOrderTotal(order))}</strong><small>{formatAdminDate(order.data, true)} · {channelLabel(order.tipoEntrega)} · {statusLabel(order.status)}</small></span><span aria-hidden="true">+</span></summary><ul>{order.itens.map((item, index) => <li key={index}>{item.quantidade}× {item.nome}{item.size && ` (${item.size})`}{item.observacao && <small>{item.observacao}</small>}</li>)}</ul><p className="admin-help-text">Pagamento: {order.formaPagamento || 'Não informado'}</p><a className="admin-text-link" target="_blank" rel="noopener noreferrer" href={`/admin/print/${encodeURIComponent(order._id)}`}>Abrir impressão do pedido ↗</a></details>)}</div>
      {selectedCustomer.orders.length > 10 && <div className="admin-pagination"><span>{selectedCustomer.orders.length} pedidos</span><div><button type="button" className="form-button-secondary" disabled={!historyPage} onClick={() => setHistoryPage(historyPage - 1)}>Anterior</button><button type="button" className="form-button-secondary" disabled={(historyPage + 1) * 10 >= selectedCustomer.orders.length} onClick={() => setHistoryPage(historyPage + 1)}>Próxima</button></div></div>}
    </AdminDialog>}
  </div>;
}
