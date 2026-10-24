export interface Courier {
  _id: string;
  name: string;
  phone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CourierInput = Pick<Courier, 'name' | 'phone' | 'active'>;

/** The browser and API apply the same validation before persisting a courier. */
export function validateCourierInput(value: unknown): { data: CourierInput; error?: never } | { error: string; data?: never } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Informe os dados do entregador.' };
  const input = value as Record<string, unknown>;
  if (typeof input.name !== 'string' || input.name.trim().length < 2 || input.name.trim().length > 80) return { error: 'O nome deve ter entre 2 e 80 caracteres.' };
  if (typeof input.phone !== 'string' || input.phone.length > 32 || !/^[\d\s()+.-]+$/.test(input.phone)) return { error: 'Informe um telefone válido com DDD.' };
  const phone = input.phone.replace(/\D/g, '');
  if (!/^(?:55)?\d{10,11}$/.test(phone)) return { error: 'Informe um telefone com DDD, com 10 ou 11 dígitos (55 é opcional).' };
  if (input.active !== undefined && typeof input.active !== 'boolean') return { error: 'A situação do entregador é inválida.' };
  return { data: { name: input.name.trim(), phone, active: input.active ?? true } };
}
