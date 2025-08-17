import { MenuItem } from '../types/menu';

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
                if (border && item.borderOptions) {
                    const borderPrice = sizeKey === 'G' ? 8.00 : 4.00;
                    price += borderPrice;
                }

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

        if (border && item.borderOptions && item.borderOptions[border] !== undefined) {
            price += item.borderOptions[border];
        }
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