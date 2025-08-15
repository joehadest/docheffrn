import { ObjectId } from 'mongodb';

export interface MenuItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image?: string;
    destaque?: boolean;
    sizes?: {
        P: number;
        G: number;
    };
    borderOptions?: {
        [key: string]: number;
    };
}

export interface CartItem {
    item: MenuItem;
    quantity: number;
    observations: string;
    size?: 'P' | 'G';
    border?: string;
}

export interface Address {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    referencePoint: string;
}

export interface DeliveryInfo {
    address: Address;
    deliveryFee: number;
    estimatedTime: string;
}

export interface Cart {
    items: CartItem[];
    deliveryInfo?: DeliveryInfo;
    subtotal: number;
    total: number;
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
        address: string;
        complement?: string;
        neighborhood: string;
        deliveryFee: number;
        estimatedTime: string;
    };
    cliente: {
        nome: string;
        telefone: string;
    };
    observacoes?: string;
    formaPagamento: 'pix' | 'dinheiro' | 'cartao';
    status: 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
    data: string;
    troco?: string;
}

export interface RestaurantStatus {
    _id?: ObjectId;
    isOpen: boolean;
    horarioAbertura: string;
    horarioFechamento: string;
    diasFuncionamento: string[];
    mensagemFechado?: string;
}

export interface Diagnostico {
    _id: string;
    tipo: 'erro' | 'aviso' | 'info';
    mensagem: string;
    timestamp: string;
    resolvido: boolean;
    detalhes?: any;
} 