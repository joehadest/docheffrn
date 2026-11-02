import { MenuItem } from '../types/menu';

// "(P) 4 fatias" -> "P"; "G" -> "G". Usado para achar preços gravados antes de renomear o tamanho.
const sizeLetter = (size: string) => {
    const trimmed = size.trim();
    return (trimmed.match(/^\(([A-Za-z])\)/)?.[1] ?? (trimmed.length === 1 ? trimmed : '')).toUpperCase();
};

/** Preço de uma borda para o tamanho, tolerando tamanhos renomeados (ex.: "P" -> "(P) 4 fatias"). */
export function resolveBorderSizePrice(prices: Record<string, number> | undefined, sizeKey: string): number | undefined {
    if (!prices) return undefined;
    if (prices[sizeKey] !== undefined) return prices[sizeKey];
    const byTrim = Object.keys(prices).find(key => key.trim() === sizeKey.trim());
    if (byTrim) return prices[byTrim];
    const letter = sizeLetter(sizeKey);
    const byLetter = letter ? Object.keys(prices).find(key => sizeLetter(key) === letter) : undefined;
    return byLetter ? prices[byLetter] : undefined;
}

export function getBorderPrice(item: MenuItem, border: string | undefined, sizeKey: string): number {
    if (!border || !item.borderOptions) return 0;
    const value = item.borderOptions[border];
    if (typeof value === 'number') return value; // formato antigo (preço único), ainda não migrado
    return resolveBorderSizePrice(value, sizeKey) ?? 0;
}

export const calculatePizzaPrice = (
    item: MenuItem,
    size?: string,
    border?: string,
    extras?: string[],
    observation?: string,
    allPizzas?: MenuItem[]
): number => {
    let price = item.price;
    if (size && item.sizes) {
        const sizeKey = size as keyof typeof item.sizes;

        // Se for pizza meio a meio, pega o preço mais alto dos dois sabores
        if (item.category === 'pizzas' && observation && observation.includes('Meio a meio:') && allPizzas) {
            const meioAMeioText = observation.split('Meio a meio:')[1];
            // Remove observações adicionais após o slash (como "- Sem cebola")
            const cleanMeioAMeioText = meioAMeioText.split(' - ')[0];
            const [sabor1, sabor2] = cleanMeioAMeioText.split('/').map(s => s.trim());
            const pizza1 = allPizzas.find((p: MenuItem) => p.name === sabor1);
            const pizza2 = allPizzas.find((p: MenuItem) => p.name === sabor2);

            if (pizza1 && pizza2) {
                const price1 = pizza1.sizes ? pizza1.sizes[sizeKey] || pizza1.price : pizza1.price;
                const price2 = pizza2.sizes ? pizza2.sizes[sizeKey] || pizza2.price : pizza2.price;
                price = Math.max(price1, price2);

                // Adiciona o preço da borda se houver
                price += getBorderPrice(item, border, sizeKey);

                // Adiciona o preço dos extras se houver
                if (extras && item.extraOptions) {
                    extras.forEach(extra => {
                        const extraPrice = item.extraOptions![extra];
                        if (extraPrice) {
                            price += extraPrice;
                        }
                    });
                }

                return price;
            }
        }

        price = item.sizes[sizeKey] || price;

        price += getBorderPrice(item, border, sizeKey);
        if (extras && item.extraOptions) {
            extras.forEach(extra => {
                const extraPrice = item.extraOptions![extra];
                if (extraPrice) {
                    price += extraPrice;
                }
            });
        }
    }
    return price;
}; 