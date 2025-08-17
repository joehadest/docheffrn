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