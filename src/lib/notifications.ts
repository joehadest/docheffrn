export function sendNotification(clients: Map<string, any>, clientId: string, notification: any) {
    const controller = clients.get(clientId);
    if (controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(notification)}\n\n`));
    }
} 