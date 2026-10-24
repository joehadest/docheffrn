import type { Pedido } from '@/types/cart';
import { buildFinanceReport, financeDateKey, financialOrderTotal, FINANCE_TIME_ZONE, type FinancePeriod } from './financePeriod';

export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0);
export const channelLabel = (channel: string) => ({ entrega: 'Delivery', retirada: 'Retirada', local: 'Mesa' }[channel] || channel);
export const statusLabel = (status: string) => ({ pendente: 'Novo', preparando: 'Em preparo', pronto: 'Pronto', em_entrega: 'Em entrega', entregue: 'Concluído', cancelado: 'Cancelado' }[status] || status);
export const paymentLabel = (payment: string) => ({ pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', credito: 'Crédito', debito: 'Débito', 'cartão': 'Cartão' }[payment?.toLowerCase()] || payment || 'Não informado');
export function formatAdminDate(value: string, time = false) {
  if (!Number.isFinite(new Date(value).getTime())) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FINANCE_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } as const : {}) }).format(new Date(value));
}
export const normalizedText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function normalizePhone(value?: string) {
  let digits = (value || '').replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  return /^\d{10,11}$/.test(digits) ? digits : '';
}

export function buildAdminAnalytics(orders: Pedido[], period: FinancePeriod, now = new Date()) {
  const report = buildFinanceReport(orders, period, now);
  const completed = report.orders.filter(order => order.status === 'entregue');
  const sum = (entries: Pedido[]) => entries.reduce((total, order) => total + Math.round(financialOrderTotal(order) * 100), 0) / 100;
  const group = (key: (order: Pedido) => string) => {
    const groups = new Map<string, { label: string; count: number; cents: number }>();
    for (const order of completed) {
      const label = key(order);
      const row = groups.get(label) || { label, count: 0, cents: 0 };
      row.count++; row.cents += Math.round(financialOrderTotal(order) * 100); groups.set(label, row);
    }
    return [...groups.values()].map(row => ({ label: row.label, count: row.count, revenue: row.cents / 100 })).sort((a, b) => b.revenue - a.revenue);
  };
  const products = new Map<string, { name: string; quantity: number; cents: number }>();
  for (const order of completed) for (const item of order.itens) {
    if (!Number.isFinite(item.quantidade) || !Number.isFinite(item.preco) || item.quantidade <= 0 || item.preco < 0) continue;
    const name = `${item.nome}${item.size ? ` · ${item.size}` : ''}`;
    const row = products.get(name) || { name, quantity: 0, cents: 0 };
    row.quantity += item.quantidade; row.cents += Math.round(item.preco * item.quantidade * 100); products.set(name, row);
  }
  const canceled = report.orders.filter(order => order.status === 'cancelado');
  const daily = group(order => financeDateKey(order.data)).sort((a, b) => a.label.localeCompare(b.label));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const hourFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: FINANCE_TIME_ZONE, hour: '2-digit', hourCycle: 'h23' });
  for (const order of report.orders) if (order.status !== 'cancelado') hours[Number(hourFormatter.format(new Date(order.data)))].count++;
  return {
    ...report, ticket: completed.length ? report.revenue / completed.length : 0,
    canceled: canceled.length, canceledValue: sum(canceled), pendingValue: sum(report.pendingOrders),
    cancellationRate: report.orders.length ? canceled.length / report.orders.length * 100 : 0,
    products: [...products.values()].map(row => ({ name: row.name, quantity: row.quantity, revenue: row.cents / 100 })).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue),
    daily, payments: group(order => paymentLabel(order.formaPagamento)), channels: group(order => channelLabel(order.tipoEntrega)), hours,
  };
}

export type AdminCustomer = { phone: string; name: string; orders: Pedido[]; completed: number; spent: number; firstOrder: string; lastOrder: string; lastAddress?: Pedido['endereco']; };
export function buildCustomers(orders: Pedido[]) {
  const groups = new Map<string, AdminCustomer>();
  let unidentified = 0;
  const sorted = [...orders].filter(order => financeDateKey(order.data)).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  for (const order of sorted) {
    const phone = normalizePhone(order.cliente?.telefone);
    if (!phone) { unidentified++; continue; }
    const current = groups.get(phone) || { phone, name: order.cliente?.nome?.trim() || 'Cliente sem nome', orders: [], completed: 0, spent: 0, firstOrder: order.data, lastOrder: order.data, lastAddress: order.endereco };
    current.orders.push(order); current.firstOrder = order.data;
    if (order.status === 'entregue') { current.completed++; current.spent = (Math.round(current.spent * 100) + Math.round(financialOrderTotal(order) * 100)) / 100; }
    if (!current.lastAddress && order.endereco) current.lastAddress = order.endereco;
    groups.set(phone, current);
  }
  return { customers: [...groups.values()], unidentified };
}

/** Quoted semicolon-separated CSV, with formula injection protection for text cells. */
export function csvDocument(rows: (string | number)[][]) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }).join(';')).join('\r\n');
}
