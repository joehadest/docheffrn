// Existing restaurant contact, kept independent from the payment key.
export const DEFAULT_WHATSAPP_NUMBER = '5584987291269';

export function normalizeWhatsAppNumber(value: string): string | null {
    if (!/^[+\d\s().-]+$/.test(value)) return null;
    const digits = value.replace(/\D/g, '');
    const number = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
    return /^55[1-9]\d\d{8,9}$/.test(number) ? number : null;
}
