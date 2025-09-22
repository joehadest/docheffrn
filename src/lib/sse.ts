// Utilitário simples para SSE em memória (reinicia a cada reload do servidor)
type ClientEntry = { id: string; controller: ReadableStreamDefaultController<Uint8Array> };

const globalAny = globalThis as any;
if (!globalAny.__SSE_CLIENTS__) {
  globalAny.__SSE_CLIENTS__ = new Map<string, ClientEntry>();
}

const clients: Map<string, ClientEntry> = globalAny.__SSE_CLIENTS__;

export function registerClient(id: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  clients.set(id, { id, controller });
}

export function removeClient(id: string) {
  clients.delete(id);
}

export function broadcast(payload: any) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
  clients.forEach(({ controller }) => {
    try { controller.enqueue(data); } catch { /* ignore */ }
  });
}

export function pingAll() {
  const encoder = new TextEncoder();
  const data = encoder.encode(`event: ping\ndata: ok\n\n`);
  clients.forEach(({ controller }) => {
    try { controller.enqueue(data); } catch { /* ignore */ }
  });
}
