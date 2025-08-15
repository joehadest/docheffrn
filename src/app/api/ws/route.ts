import { NextResponse } from 'next/server';

// Mapa para armazenar conexões ativas
const clients = new Map<string, any>();

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
            // Armazenar o controller para enviar mensagens posteriormente
            clients.set(clientId, controller);

            // Enviar uma mensagem de confirmação
            controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

            // Limpar quando a conexão for fechada
            const cleanup = () => {
                clients.delete(clientId);
            };

            // Adicionar listener para quando o cliente desconectar
            req.signal.addEventListener('abort', cleanup);
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}

// Função utilitária para enviar notificação (não exportar aqui)
function sendNotification(clientId: string, notification: any) {
    const controller = clients.get(clientId);
    if (controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(notification)}\n\n`));
    }
} 