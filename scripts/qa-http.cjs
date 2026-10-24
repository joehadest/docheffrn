// Non-mutating smoke checks. Start a local production build before running:
// node scripts/qa-http.cjs http://127.0.0.1:3187
const assert = require('node:assert/strict');
const base = new URL(process.argv[2] || 'http://127.0.0.1:3187');
const emptyId = '000000000000000000000000';
const cases = [
  ['GET', '/', 200], ['GET', '/menu', 200], ['GET', '/admin/login', 200],
  ['GET', '/admin', 307], ['GET', '/api/menu', 200], ['GET', '/api/categories', 200],
  ['GET', '/api/settings', 200], ['GET', '/api/status', 200],
  ['GET', '/api/menu/all', 401], ['GET', '/api/pedidos', 401],
  ['GET', '/api/admin/couriers', 401], ['GET', '/api/pedidos?id=invalido', 400],
  ['POST', '/api/menu', 401, {}], ['PUT', '/api/settings', 401, {}],
  ['POST', '/api/settings', 401, {}], ['PATCH', '/api/settings', 405, {}],
  ['PATCH', '/api/admin/orders/' + emptyId, 401, { status: 'preparando' }],
  ['PATCH', '/api/pedidos?id=' + emptyId, 401, {}],
  ['POST', '/api/admin/couriers', 401, {}],
  ['POST', '/api/pedidos', 400, {}],
  ['POST', '/api/pedidos', 400, { tipoEntrega: 'entrega', itens: [{ nome: 'QA', quantidade: 1, preco: -1 }] }],
  ['POST', '/api/menu', 403, {}, { origin: 'https://example.invalid', 'sec-fetch-site': 'cross-site' }],
  ['GET', '/admin', 307, undefined, { cookie: 'isAuthenticated=true' }],
  ['GET', '/api/menu/all', 401, undefined, { cookie: 'isAuthenticated=true' }],
];

(async () => {
  for (const [method, route, status, data, headers] of cases) {
    const response = await fetch(new URL(route, base), {
      method, redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { ...(data !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
    const body = await response.text();
    assert.equal(response.status, status, `${method} ${route}`);
    if (route === '/api/settings') assert.equal(body.includes('adminPassword'), false, 'Settings must not expose password hashes');
    if (route === '/admin') assert.ok(response.headers.get('location').endsWith('/admin/login'));
    if (route === '/' || route === '/menu') assert.ok(body.includes('public-site-header'));
    console.log(`PASS ${method} ${route}: ${status}`);
  }
  console.log(`${cases.length} verificações HTTP de produção passaram.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
