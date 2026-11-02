export interface CheckoutSettings {
    pixKey: string;
    /** Quando falso, o PIX é cobrado na entrega (maquininha) e a chave não é enviada ao cliente. */
    pixKeyEnabled: boolean;
    whatsappNumber: string;
}

export const PIX_ON_DELIVERY_TEXT = 'Pagamento na entrega';

export async function fetchCurrentCheckoutSettings(requirePix = false): Promise<CheckoutSettings> {
    const response = await fetch('/api/settings', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success || !result.data) {
        throw new Error('Não foi possível conferir os dados de pagamento. Tente novamente.');
    }

    const pixKey = typeof result.data.pixKey === 'string' ? result.data.pixKey.trim() : '';
    const pixKeyEnabled = result.data.pixKeyEnabled !== false;
    const whatsappNumber = typeof result.data.whatsappNumber === 'string' ? result.data.whatsappNumber : '';
    if (requirePix && pixKeyEnabled && !pixKey) {
        throw new Error('A chave PIX do restaurante não está configurada. Entre em contato com o estabelecimento.');
    }
    return { pixKey, pixKeyEnabled, whatsappNumber };
}

/** Linha da mensagem de WhatsApp com a chave PIX ou o aviso de pagamento na entrega. */
export function pixPaymentLine(settings: CheckoutSettings, label = 'Chave PIX:') {
    return settings.pixKeyEnabled ? `${label} ${settings.pixKey}` : PIX_ON_DELIVERY_TEXT;
}
