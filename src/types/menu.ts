// Interface para categoria, compatível com o backend
export interface Category {
    _id?: string; // Adicionado para compatibilidade total
    value: string;
    label: string;
    icon?: string; // Propriedade que estava em falta
    order?: number;
    allowHalfAndHalf?: boolean;
}

export interface MenuItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image: string;
    destaque: boolean;
    sizes?: {
        P?: number;
        G?: number;
        'Única'?: number;
    };
    borderOptions?: {
        [key: string]: number;
    };
    extraOptions?: {
        [key: string]: number;
    };
    ingredients?: string[];
    isAvailable?: boolean;
}