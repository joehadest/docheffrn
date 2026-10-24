'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { FaCheckCircle, FaClock, FaMapMarkerAlt, FaMotorcycle, FaPhoneAlt, FaPlus, FaSearch, FaSyncAlt, FaUserFriends } from 'react-icons/fa';
import { useAdminData } from '@/contexts/AdminDataContext';
import type { Pedido } from '@/types/cart';
import { validateCourierInput, type Courier, type CourierInput } from '@/types/delivery';
import { financeDateKey, financialOrderTotal } from '@/utils/financePeriod';
import AdminDialog from './AdminDialog';
import { EmptyState, PageHeading, StatCard } from './AdminUI';
import { useAdminConfirm } from './useAdminConfirm';
import { matchesOrderSearch, orderElapsedLabel, ORDER_STATUS_LABELS } from './orderOperations';
import './admin-deliveries.css';

type DeliveryQueue = 'pronto' | 'em_entrega' | 'entregue';
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const paymentLabels: Record<string, string> = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'Pix' };
const blankCourier: CourierInput = { name: '', phone: '', active: true };
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

function completedAt(order: Pedido) {
  return [...(order.statusHistory || [])].reverse().find(event => event.status === 'entregue')?.at || order.data;
}

function addressLines(order: Pedido) {
  const address = order.endereco?.address;
  if (!address) return 'Endereço não informado';
  return [address.street && `${address.street}${address.number ? `, ${address.number}` : ''}`, address.neighborhood, address.complement].filter(Boolean).join(' · ') || 'Endereço não informado';
}

function matchesDeliverySearch(order: Pedido, query: string) {
  if (matchesOrderSearch(order, query)) return true;
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  return normalize([addressLines(order), order.deliveryAssignment?.name].join(' ')).includes(normalize(query.trim()));
}

export default function AdminDeliveries({ initialOrderId }: { initialOrderId?: string } = {}) {
  const { orders, loading, refreshing, error, refresh, updateOrder } = useAdminData();
  const { confirm, confirmationDialog } = useAdminConfirm();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [couriersLoading, setCouriersLoading] = useState(true);
  const [couriersError, setCouriersError] = useState('');
  const [queue, setQueue] = useState<DeliveryQueue>('pronto');
  const [search, setSearch] = useState('');
  const [courierFilter, setCourierFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const [clock, setClock] = useState(() => Date.now());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [detailsId, setDetailsId] = useState<string | null>(initialOrderId ?? null);
  const [assignment, setAssignment] = useState('');
  const [couriersOpen, setCouriersOpen] = useState(false);
  const [courierFormOpen, setCourierFormOpen] = useState(false);
  const [editingCourierId, setEditingCourierId] = useState<string | null>(null);
  const [courierDraft, setCourierDraft] = useState<CourierInput>(blankCourier);
  const [savingCourier, setSavingCourier] = useState(false);
  const [courierFormError, setCourierFormError] = useState('');
  const [courierSuccess, setCourierSuccess] = useState('');

  const loadCouriers = useCallback(async () => {
    setCouriersLoading(true);
    setCouriersError('');
    try {
      const response = await fetch('/api/admin/couriers', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error(result.message || 'Não foi possível carregar os entregadores.');
      setCouriers(result.data);
    } catch (loadError) { setCouriersError(errorMessage(loadError, 'Não foi possível carregar os entregadores.')); }
    finally { setCouriersLoading(false); }
  }, []);

  useEffect(() => { void loadCouriers(); }, [loadCouriers]);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);

  const deliveryOrders = useMemo(() => orders.filter(order => order.tipoEntrega === 'entrega'), [orders]);
  const today = financeDateKey(new Date(clock));
  const ready = deliveryOrders.filter(order => order.status === 'pronto');
  const inTransit = deliveryOrders.filter(order => order.status === 'em_entrega');
  const completedToday = deliveryOrders.filter(order => order.status === 'entregue' && financeDateKey(completedAt(order)) === today);
  const activeCouriers = couriers.filter(courier => courier.active);
  const queueOrders = queue === 'pronto' ? ready : queue === 'em_entrega' ? inTransit : completedToday;
  const filteredOrders = queueOrders.filter(order => matchesDeliverySearch(order, search) && (!courierFilter || (courierFilter === 'unassigned' ? !order.deliveryAssignment : order.deliveryAssignment?.courierId === courierFilter)))
    .sort((a, b) => queue === 'entregue' ? new Date(completedAt(b)).getTime() - new Date(completedAt(a)).getTime() : new Date(a.data).getTime() - new Date(b.data).getTime());
  const selectedOrder = deliveryOrders.find(order => order._id === detailsId);
  const canAssign = selectedOrder?.status === 'pronto' || selectedOrder?.status === 'em_entrega';
  const assignedIsInactive = selectedOrder?.deliveryAssignment && !activeCouriers.some(courier => courier._id === selectedOrder.deliveryAssignment?.courierId);
  const assignmentChanged = !!selectedOrder && assignment !== (selectedOrder.deliveryAssignment?.courierId || '');

  function changeQueue(next: DeliveryQueue) { setQueue(next); setVisibleCount(12); setActionError(''); }
  function openDetails(order: Pedido) { setDetailsId(order._id); setAssignment(order.deliveryAssignment?.courierId || ''); setActionError(''); }
  function openCourierManager() { setCouriersOpen(true); setCourierFormOpen(false); setCourierFormError(''); setCourierSuccess(''); }
  function editCourier(courier?: Courier) {
    setEditingCourierId(courier?._id || null);
    setCourierDraft(courier ? { name: courier.name, phone: courier.phone, active: courier.active } : { ...blankCourier });
    setCourierFormOpen(true); setCourierFormError(''); setCourierSuccess('');
  }

  async function saveCourier(event: FormEvent) {
    event.preventDefault();
    const validation = validateCourierInput(courierDraft);
    if (validation.error) { setCourierFormError(validation.error); return; }
    setSavingCourier(true); setCourierFormError(''); setCourierSuccess('');
    try {
      const response = await fetch('/api/admin/couriers', { method: editingCourierId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...validation.data, ...(editingCourierId ? { id: editingCourierId } : {}) }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Não foi possível salvar o entregador.');
      setCouriers(current => [...current.filter(courier => courier._id !== result.data._id), result.data].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'pt-BR')));
      setCourierFormOpen(false); setCourierSuccess(editingCourierId ? 'Cadastro do entregador atualizado.' : 'Entregador cadastrado e disponível para atribuição.');
    } catch (saveError) { setCourierFormError(errorMessage(saveError, 'Não foi possível salvar o entregador.')); }
    finally { setSavingCourier(false); }
  }

  async function saveAssignment() {
    if (!selectedOrder || !canAssign || !assignmentChanged) return;
    setPendingId(selectedOrder._id); setActionError(''); setSuccess('');
    try {
      await updateOrder(selectedOrder._id, { courierId: assignment || null, expectedStatus: selectedOrder.status });
      setSuccess(assignment ? 'Entregador atribuído ao pedido.' : 'Atribuição removida.');
      setDetailsId(null);
    } catch (saveError) { setActionError(errorMessage(saveError, 'Não foi possível alterar o entregador.')); }
    finally { setPendingId(null); }
  }

  async function advanceOrder(order: Pedido) {
    if (order.status !== 'pronto' && order.status !== 'em_entrega') return;
    if (order.status === 'pronto' && !order.deliveryAssignment) { openDetails(order); return; }
    const delivered = order.status === 'em_entrega';
    if (!await confirm({ title: delivered ? 'Confirmar entrega' : 'Confirmar saída', message: delivered ? `O pedido #${order._id.slice(-6).toUpperCase()} foi recebido por ${order.cliente?.nome || 'este cliente'}?` : `${order.deliveryAssignment?.name} está saindo com o pedido #${order._id.slice(-6).toUpperCase()}?`, confirmLabel: delivered ? 'Confirmar entrega' : 'Confirmar saída' })) return;
    setPendingId(order._id); setActionError(''); setSuccess('');
    try {
      await updateOrder(order._id, { status: delivered ? 'entregue' : 'em_entrega', expectedStatus: order.status });
      setSuccess(delivered ? 'Entrega concluída. O pedido já está nos relatórios.' : 'Pedido marcado como em entrega.');
    } catch (saveError) { setActionError(errorMessage(saveError, 'Não foi possível atualizar a entrega.')); }
    finally { setPendingId(null); }
  }

  return (
    <section className="admin-page admin-deliveries">
      <PageHeading title="Entregas" description="Organize a saída dos pedidos e acompanhe cada entrega até a conclusão.">
        <button type="button" className="form-button-secondary" disabled={refreshing || couriersLoading} onClick={() => { void refresh(); void loadCouriers(); }}><FaSyncAlt aria-hidden="true" /> Atualizar</button>
        <button type="button" className="form-button-primary" onClick={openCourierManager}><FaUserFriends aria-hidden="true" /> Entregadores</button>
      </PageHeading>

      <div className="delivery-stats">
        <StatCard label="Prontos para sair" value={loading ? '—' : ready.length} sub={`${ready.filter(order => !order.deliveryAssignment).length} sem entregador atribuído`} icon={<FaClock />} />
        <StatCard label="Em entrega" value={loading ? '—' : inTransit.length} sub="Pedidos a caminho do cliente" icon={<FaMotorcycle />} />
        <StatCard label="Entregues hoje" value={loading ? '—' : completedToday.length} sub="Horário de Brasília" icon={<FaCheckCircle />} />
        <StatCard label="Entregadores ativos" value={couriersLoading ? '—' : couriersError ? '—' : activeCouriers.length} sub="Disponíveis para atribuição" icon={<FaUserFriends />} />
      </div>

      {(error || couriersError || actionError) && !detailsId && <div className="delivery-alert" role="alert">{actionError || error || couriersError}<button type="button" onClick={() => { void refresh(); void loadCouriers(); setActionError(''); }}>Tentar novamente</button></div>}
      {success && <p className="delivery-success" role="status">{success}</p>}

      <div className="delivery-worklist">
        <div className="delivery-queues" aria-label="Etapas de entrega">
          {([{ key: 'pronto', label: 'Prontos para sair', count: ready.length }, { key: 'em_entrega', label: 'Em entrega', count: inTransit.length }, { key: 'entregue', label: 'Entregues hoje', count: completedToday.length }] as const).map(tab => <button key={tab.key} type="button" aria-pressed={queue === tab.key} onClick={() => changeQueue(tab.key)}>{tab.label}<span>{tab.count}</span></button>)}
        </div>
        <div className="delivery-filters">
          <label className="delivery-search"><span className="form-label">Buscar entrega</span><span className="delivery-search-field"><FaSearch aria-hidden="true" /><input className="form-input" type="search" value={search} onChange={event => { setSearch(event.target.value); setVisibleCount(12); }} placeholder="Pedido, cliente, bairro ou entregador" /></span></label>
          <label><span className="form-label">Entregador</span><select className="form-input" value={courierFilter} onChange={event => { setCourierFilter(event.target.value); setVisibleCount(12); }}><option value="">Todos os entregadores</option><option value="unassigned">Sem entregador</option>{couriers.map(courier => <option key={courier._id} value={courier._id}>{courier.name}{!courier.active ? ' (inativo)' : ''}</option>)}</select></label>
          {(search || courierFilter) && <button type="button" className="form-button-secondary" onClick={() => { setSearch(''); setCourierFilter(''); setVisibleCount(12); }}>Limpar filtros</button>}
        </div>
      </div>

      <p className="delivery-result-count" aria-live="polite">{loading ? 'Carregando entregas…' : `${filteredOrders.length} ${filteredOrders.length === 1 ? 'pedido nesta fila' : 'pedidos nesta fila'}`}{queue !== 'entregue' && ' · mais antigos primeiro'}</p>
      {loading ? <div className="delivery-loading" role="status"><FaSyncAlt aria-hidden="true" /> Carregando a operação de entregas…</div> : filteredOrders.length === 0 ? <EmptyState>{search || courierFilter ? 'Nenhuma entrega corresponde aos filtros selecionados.' : queue === 'pronto' ? 'Nenhum pedido pronto para sair. Os pedidos aparecerão aqui quando a cozinha concluir o preparo.' : queue === 'em_entrega' ? 'Nenhum pedido em entrega no momento.' : 'Ainda não há entregas concluídas hoje.'}</EmptyState> : <div className="delivery-grid">
        {filteredOrders.slice(0, visibleCount).map(order => <article key={order._id} className="delivery-card">
          <div className="delivery-card-heading"><span className="delivery-order-number">#{order._id.slice(-6).toUpperCase()}</span><span className={`delivery-status delivery-status-${order.status}`}>{queue === 'pronto' ? 'Pronto para sair' : queue === 'em_entrega' ? 'Em entrega' : 'Entregue'}</span></div>
          <h2>{order.cliente?.nome || 'Cliente não informado'}</h2>
          <p className="delivery-elapsed"><FaClock aria-hidden="true" /> {queue === 'entregue' ? `Concluído em ${dateTime(completedAt(order))}` : orderElapsedLabel(order.data, clock)}</p>
          <div className="delivery-address"><FaMapMarkerAlt aria-hidden="true" /><p>{addressLines(order)}</p></div>
          <div className="delivery-card-courier"><FaMotorcycle aria-hidden="true" /><span>{order.deliveryAssignment?.name || 'Aguardando entregador'}</span></div>
          <dl className="delivery-amounts"><div><dt>Total do pedido</dt><dd>{money(financialOrderTotal(order))}</dd></div><div><dt>Taxa de entrega</dt><dd>{money(order.endereco?.deliveryFee || 0)}</dd></div><div><dt>Pagamento</dt><dd>{paymentLabels[order.formaPagamento] || order.formaPagamento || 'Não informado'}</dd></div></dl>
          {order.observacoes && <p className="delivery-note"><strong>Observação:</strong> {order.observacoes}</p>}
          <div className="delivery-card-actions"><button type="button" className="form-button-secondary" disabled={!!pendingId} onClick={() => openDetails(order)}>{queue === 'entregue' ? 'Ver detalhes' : 'Detalhes e entregador'}</button>{queue !== 'entregue' && <button type="button" className="form-button-primary" disabled={!!pendingId} onClick={() => { void advanceOrder(order); }}>{pendingId === order._id ? 'Salvando…' : queue === 'em_entrega' ? 'Confirmar entrega' : order.deliveryAssignment ? 'Saiu para entrega' : 'Atribuir entregador'}</button>}</div>
        </article>)}
      </div>}
      {filteredOrders.length > visibleCount && <div className="delivery-load-more"><button type="button" className="form-button-secondary" onClick={() => setVisibleCount(count => count + 12)}>Mostrar mais {Math.min(12, filteredOrders.length - visibleCount)} entregas</button></div>}
      {queue === 'entregue' && <p className="delivery-footnote">Pedidos antigos sem histórico de conclusão são contabilizados pela data do pedido.</p>}

      {selectedOrder && <AdminDialog id="delivery-details-title" title={`Entrega #${selectedOrder._id.slice(-6).toUpperCase()}`} description={`${ORDER_STATUS_LABELS[selectedOrder.status]} · Pedido de ${dateTime(selectedOrder.data)}`} icon={<FaMotorcycle />} onClose={() => { if (!pendingId) { setDetailsId(null); setActionError(''); } }} size="wide" footer={<>{actionError && <p className="admin-dialog-error" role="alert">{actionError}</p>}<button type="button" className="form-button-secondary" disabled={!!pendingId} onClick={() => setDetailsId(null)}>Fechar</button>{canAssign && <button type="button" className="form-button-primary" disabled={!!pendingId || !assignmentChanged || couriersLoading || !!couriersError} onClick={() => { void saveAssignment(); }}>{pendingId ? 'Salvando…' : 'Salvar entregador'}</button>}</>}>
        <div className="delivery-detail-grid">
          <section className="admin-dialog-section"><h3>Cliente e endereço</h3><strong>{selectedOrder.cliente?.nome || 'Cliente não informado'}</strong>{selectedOrder.cliente?.telefone && <a className="delivery-phone" href={`tel:${selectedOrder.cliente.telefone.replace(/[^\d+]/g, '')}`}><FaPhoneAlt aria-hidden="true" /> {selectedOrder.cliente.telefone}</a>}<p>{addressLines(selectedOrder)}</p>{selectedOrder.endereco?.address.referencePoint && <p><strong>Referência:</strong> {selectedOrder.endereco.address.referencePoint}</p>}{selectedOrder.observacoes && <p className="delivery-note"><strong>Observações:</strong> {selectedOrder.observacoes}</p>}</section>
          <section className="admin-dialog-section"><h3>Pagamento</h3><dl className="delivery-amounts"><div><dt>Forma</dt><dd>{paymentLabels[selectedOrder.formaPagamento] || selectedOrder.formaPagamento || 'Não informado'}</dd></div><div><dt>Taxa de entrega</dt><dd>{money(selectedOrder.endereco?.deliveryFee || 0)}</dd></div><div><dt>Total do pedido</dt><dd>{money(financialOrderTotal(selectedOrder))}</dd></div>{selectedOrder.troco && <div><dt>Troco solicitado</dt><dd>{selectedOrder.troco}</dd></div>}</dl></section>
          <section className="admin-dialog-section delivery-detail-full"><h3>Entregador responsável</h3>{canAssign ? <><label className="form-label" htmlFor="delivery-courier">Atribuir ou trocar entregador</label><select id="delivery-courier" className="form-input" value={assignment} onChange={event => setAssignment(event.target.value)} disabled={!!pendingId || couriersLoading || !!couriersError}><option value="">Sem entregador</option>{assignedIsInactive && selectedOrder.deliveryAssignment && <option value={selectedOrder.deliveryAssignment.courierId} disabled>{selectedOrder.deliveryAssignment.name} (inativo)</option>}{activeCouriers.map(courier => <option key={courier._id} value={courier._id}>{courier.name}</option>)}</select>{couriersLoading ? <p>Carregando entregadores…</p> : couriersError ? <p role="alert">{couriersError}</p> : activeCouriers.length === 0 ? <p>Cadastre um entregador ativo em “Entregadores” para atribuir este pedido.</p> : <p>A atribuição é salva ao confirmar no botão abaixo.</p>}</> : <p>{selectedOrder.deliveryAssignment?.name || 'Sem atribuição registrada'}</p>}{selectedOrder.deliveryAssignment?.phone && <a className="delivery-phone" href={`tel:${selectedOrder.deliveryAssignment.phone.replace(/[^\d+]/g, '')}`}><FaPhoneAlt aria-hidden="true" /> {selectedOrder.deliveryAssignment.phone}</a>}</section>
          <section className="admin-dialog-section delivery-detail-full"><h3>Itens do pedido</h3><ul className="delivery-items">{selectedOrder.itens.map((item, index) => <li key={index}><div><strong>{item.quantidade}× {item.nome}</strong>{[item.size, item.border, item.flavors?.join(' / '), item.extras?.join(', ')].filter(Boolean).length > 0 && <p>{[item.size, item.border, item.flavors?.join(' / '), item.extras?.join(', ')].filter(Boolean).join(' · ')}</p>}{item.observacao && <p>Observação: {item.observacao}</p>}</div><span>{money(item.preco * item.quantidade)}</span></li>)}</ul></section>
          {!!selectedOrder.statusHistory?.length && <section className="admin-dialog-section delivery-detail-full"><h3>Histórico do pedido</h3><ol className="delivery-history">{selectedOrder.statusHistory.map((event, index) => <li key={`${event.at}-${index}`}><strong>{ORDER_STATUS_LABELS[event.status]}</strong><time dateTime={event.at}>{dateTime(event.at)}</time>{event.note && <p>{event.note}</p>}</li>)}</ol></section>}
        </div>
      </AdminDialog>}

      {couriersOpen && <AdminDialog id="delivery-couriers-title" title="Entregadores" description="Cadastre sua equipe e gerencie quem pode receber novas entregas." icon={<FaUserFriends />} onClose={() => { if (!savingCourier) setCouriersOpen(false); }} size="wide" footer={<button type="button" className="form-button-secondary" disabled={savingCourier} onClick={() => setCouriersOpen(false)}>Concluir</button>}>
        <div className="delivery-courier-toolbar"><p>{activeCouriers.length} ativos · {couriers.length} cadastrados</p><button type="button" className="form-button-primary" disabled={savingCourier} onClick={() => editCourier()}><FaPlus aria-hidden="true" /> Novo entregador</button></div>
        {courierSuccess && <p className="delivery-success" role="status">{courierSuccess}</p>}
        {courierFormOpen && <form className="delivery-courier-form admin-dialog-section" onSubmit={saveCourier}><h3>{editingCourierId ? 'Editar entregador' : 'Novo entregador'}</h3><div className="delivery-detail-grid"><label><span className="form-label">Nome do entregador</span><input className="form-input" name="courier-name" autoComplete="name" required minLength={2} maxLength={80} value={courierDraft.name} onChange={event => setCourierDraft(current => ({ ...current, name: event.target.value }))} disabled={savingCourier} /></label><label><span className="form-label">Telefone com DDD</span><input className="form-input" name="courier-phone" type="tel" autoComplete="tel" required maxLength={32} placeholder="(84) 99999-9999" value={courierDraft.phone} onChange={event => setCourierDraft(current => ({ ...current, phone: event.target.value }))} disabled={savingCourier} /></label></div><label className="delivery-active-check"><input type="checkbox" checked={courierDraft.active} onChange={event => setCourierDraft(current => ({ ...current, active: event.target.checked }))} disabled={savingCourier} /><span>Ativo para receber novas entregas</span></label><p className="delivery-footnote">Desativar preserva o cadastro e as atribuições dos pedidos anteriores.</p>{courierFormError && <p className="admin-dialog-error" role="alert">{courierFormError}</p>}<div className="delivery-form-actions"><button type="button" className="form-button-secondary" disabled={savingCourier} onClick={() => setCourierFormOpen(false)}>Cancelar edição</button><button type="submit" className="form-button-primary" disabled={savingCourier}>{savingCourier ? 'Salvando…' : 'Salvar entregador'}</button></div></form>}
        {couriersError && <div className="delivery-alert" role="alert">{couriersError}<button type="button" onClick={() => { void loadCouriers(); }}>Tentar novamente</button></div>}
        {couriersLoading ? <p className="delivery-loading" role="status">Carregando entregadores…</p> : !couriers.length ? <EmptyState>Nenhum entregador cadastrado. Use “Novo entregador” para começar.</EmptyState> : <ul className="delivery-courier-list">{couriers.map(courier => {
          const assignedCount = inTransit.filter(order => order.deliveryAssignment?.courierId === courier._id).length;
          return <li key={courier._id}><span className="delivery-courier-avatar" aria-hidden="true">{courier.name.slice(0, 1).toLocaleUpperCase('pt-BR')}</span><div className="delivery-courier-info"><strong>{courier.name}</strong><a href={`tel:${courier.phone}`}>{courier.phone}</a><small>{assignedCount} {assignedCount === 1 ? 'pedido em entrega' : 'pedidos em entrega'}</small></div><span className={`delivery-courier-state ${courier.active ? 'is-active' : ''}`}>{courier.active ? 'Ativo' : 'Inativo'}</span><button type="button" className="form-button-secondary" disabled={savingCourier} aria-label={`Editar entregador ${courier.name}`} onClick={() => editCourier(courier)}>Editar</button></li>;
        })}</ul>}
      </AdminDialog>}
      {confirmationDialog}
    </section>
  );
}
