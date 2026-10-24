// Pure workflow regressions; no network requests or database writes.
// Run with: node scripts/validate-order-operations.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const modules = new Map();

function load(relative) {
  const filename = path.join(root, 'src', relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const mod = new Module(filename, module);
  modules.set(filename, mod);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = name => name === '@/utils/financePeriod' || name === './financePeriod'
    ? load('utils/financePeriod.ts') : Module.prototype.require.call(mod, name);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  mod._compile(compiled.outputText, filename);
  return mod.exports;
}

const { parseAdminOrderAction, validateAdminOrderTransition, validOrderItems } = load('utils/adminOrderActions.ts');
const { nextOrderStatus, filterOperationOrders, matchesOrderSearch } = load('components/admin/orderOperations.ts');
const { validateCourierInput } = load('types/delivery.ts');
const { buildAdminAnalytics, buildCustomers, csvDocument } = load('utils/adminAnalytics.ts');
let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const rejected = value => check(Boolean(value), true);
const order = (overrides = {}) => ({
  _id: '0123456789abcdef01234567', tipoEntrega: 'entrega', status: 'pendente',
  data: '2026-10-24T18:00:00Z', cliente: { nome: 'João', telefone: '(84) 99999-0000' },
  itens: [{ nome: 'Pizza', preco: 10, quantidade: 1 }], total: 10, formaPagamento: 'pix',
  ...overrides,
});

check(validateAdminOrderTransition(order(), { status: 'preparando' }), null);
rejected(validateAdminOrderTransition(order(), { status: 'pronto' }));
check(validateAdminOrderTransition(order({ status: 'pronto' }), { status: 'em_entrega' }), null);
rejected(validateAdminOrderTransition(order({ status: 'pronto' }), { status: 'entregue' }));
check(validateAdminOrderTransition(order({ status: 'pronto', tipoEntrega: 'retirada' }), { status: 'entregue' }), null);
rejected(validateAdminOrderTransition(order({ status: 'pronto', tipoEntrega: 'local' }), { status: 'entregue' }));
rejected(validateAdminOrderTransition(order({ status: 'entregue' }), { status: 'pendente' }));
rejected(validateAdminOrderTransition(order(), { status: 'preparando', expectedStatus: 'pronto' }));
rejected(validateAdminOrderTransition(order(), { courierId: '0123456789abcdef01234567' }));
rejected(validateAdminOrderTransition(order({ status: 'pronto', tipoEntrega: 'retirada' }), { courierId: '0123456789abcdef01234567' }));
check(nextOrderStatus(order({ status: 'pronto', tipoEntrega: 'local' })), null);
check(nextOrderStatus(order({ status: 'em_entrega' })), 'entregue');
check(nextOrderStatus(order({ status: 'cancelado' })), null);
rejected(parseAdminOrderAction({ status: 'preparando', total: 0 }).error);
rejected(parseAdminOrderAction({ courierId: 'invalid' }).error);
rejected(parseAdminOrderAction({ status: 'unknown' }).error);
rejected(parseAdminOrderAction({}).error);
check(parseAdminOrderAction({ status: 'cancelado', cancelReason: '  Duplicado  ' }).data.cancelReason, 'Duplicado');
check(validOrderItems(order().itens), true);
check(validOrderItems([]), true); // Empty table accounts are supported.
for (const invalid of [null, [{ nome: 'Pizza', preco: -1, quantidade: 1 }], [{ nome: 'Pizza', preco: 1, quantidade: .5 }], [{ nome: 'Pizza', preco: NaN, quantidade: 1 }]]) check(validOrderItems(invalid), false);

const now = new Date('2026-10-24T18:00:00Z');
const filters = { search: '', status: '', channel: '', period: 'active' };
const old = order({ _id: 'old', data: '2026-10-24T02:59:59Z' });
const fresh = order({ _id: 'fresh', data: '2026-10-24T03:00:00Z' });
const completed = order({ _id: 'done', status: 'entregue' });
check(filterOperationOrders([old, fresh, completed], filters, now).map(row => row._id), ['old', 'fresh']);
check(filterOperationOrders([old, fresh, completed], { ...filters, period: 'today' }, now).map(row => row._id), ['fresh', 'done']);
check(matchesOrderSearch(order(), 'joao'), true);
check(matchesOrderSearch(order(), '84 99999-0000'), true);
check(matchesOrderSearch(order(), '#234567'), true);
check(matchesOrderSearch(order(), 'outro cliente'), false);

check(validateCourierInput({ name: '  Entregador QA  ', phone: '+55 (84) 99999-0000' }).data, { name: 'Entregador QA', phone: '5584999990000', active: true });
rejected(validateCourierInput({ name: 'X', phone: '84999990000' }).error);
rejected(validateCourierInput({ name: 'Entregador', phone: 'telefone' }).error);
rejected(validateCourierInput({ name: 'Entregador', phone: '84999990000', active: 'true' }).error);

const sample = [order({ status: 'entregue', total: .1 }), order({ status: 'entregue', total: .2 }), order({ status: 'cancelado', total: 100 }), order({ total: 200 })];
const report = buildAdminAnalytics(sample, { type: 'all' }, now);
check(report.revenue, .3);
check(report.completed, 2);
check(report.cancellationRate, 25);
check(report.pendingValue, 200);
check(buildCustomers(sample).customers[0].spent, .3);
check(csvDocument([['=SUM(1,2)', 'texto "com aspas"', 12]]), '\uFEFF"\'=SUM(1,2)";"texto ""com aspas""";"12"');
console.log(`${checks} verificações de pedidos, entregadores, clientes e exportação passaram.`);
