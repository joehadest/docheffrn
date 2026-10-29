export async function fetchCurrentCheckoutSettings(requirePix = false): Promise<{ pixKey: string; whatsappNumber: string }> {
    const response = await fetch('/api/settings', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success || !result.data) {
        throw new Error('Não foi possível conferir os dados de pagamento. Tente novamente.');
    }

    const pixKey = typeof result.data.pixKey === 'string' ? result.data.pixKey.trim() : '';
    const whatsappNumber = typeof result.data.whatsappNumber === 'string' ? result.data.whatsappNumber : '';
    if (requirePix && !pixKey) {
        throw new Error('A chave PIX do restaurante não está configurada. Entre em contato com o estabelecimento.');
    }
    return { pixKey, whatsappNumber };
}
