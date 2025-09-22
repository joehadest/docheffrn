import { NextResponse } from 'next/server';
import { registerClient, removeClient, pingAll } from '@/lib/sse';

// Handler para Server-Sent Events (SSE)
export async function GET(req: Request) {
    // Verificar se o cliente está autorizado
    const clientId = new URL(req.url).searchParams.get('clientId');
    if (!clientId) {
        return new NextResponse('ClientId não fornecido', { status: 400 });
    }

    // Criar stream SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            registerClient(clientId, controller as any);
            controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));
            const cleanup = () => removeClient(clientId);
            req.signal.addEventListener('abort', cleanup);
        }
    });

    // Ping keep-alive a cada 25s (SSE alguns proxies fecham sem tráfego)
    const pingInterval = setInterval(() => {
        try { pingAll(); } catch {}
    }, 25000);
    req.signal.addEventListener('abort', () => clearInterval(pingInterval));

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}

