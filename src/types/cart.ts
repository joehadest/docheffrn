import { MenuItem } from './menu';

export interface CartItem {
    _id: string;
    item: MenuItem;
    quantity: number;
    observation?: string;
    size?: string;
    border?: string;
    name: string;
    observacao?: string;
    extras?: string[];
    price: number;
}

export interface CartContextType {
    items: CartItem[];
    addToCart: (item: MenuItem, quantity: number, observation?: string, size?: string, border?: string, extras?: string[]) => void;
    removeFromCart: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
}

export interface Address {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    referencePoint: string;
}

export interface Cliente {
    nome: string;
    telefone: string;
}

export interface Pedido {
    _id: string;
    itens: {
        nome: string;
        quantidade: number;
        preco: number;
        observacao?: string;
        size?: string;
        border?: string;
        extras?: string[];
    }[];
    total: number;
    tipoEntrega: 'entrega' | 'retirada';
    endereco?: {
        address: Address;
        deliveryFee: number;
        estimatedTime: string;
    };
    cliente: Cliente;
    observacoes?: string;
    formaPagamento: string;
    status: 'pendente' | 'preparando' | 'pronto' | 'em_entrega' | 'entregue' | 'cancelado';
    data: string;
    troco?: string;
} 