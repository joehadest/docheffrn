'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Pedido } from '@/types/cart'; // Importando a tipagem de Pedido

// Função para formatar data e hora
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export default function PrintOrderPage() {
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const params = useParams();
    const orderId = params?.orderId as string;

    useEffect(() => {
        if (!orderId) return;

        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/pedidos/${orderId}`);
                if (!res.ok) throw new Error('Pedido não encontrado');
                const data = await res.json();
                setPedido(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erro ao carregar pedido');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    useEffect(() => {
        if (pedido) {
            setTimeout(() => {
                window.print();
            }, 300);
        }
    }, [pedido]);

    useEffect(() => {
        const handleAfterPrint = () => window.close();
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    if (loading) return <div className="receipt-container no-print">Carregando para impressão...</div>;
    if (error) return <div className="receipt-container no-print">Erro: {error}</div>;
    if (!pedido) return <div className="receipt-container no-print">Pedido não encontrado.</div>;

    const subtotal = pedido.itens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    const total = subtotal + (pedido.endereco?.deliveryFee || 0);

    return (
        <>
            <div className="receipt-container">
                <header>
                    <h1 className="title">Do'Cheff</h1>
                    <p>Pedido #{pedido._id.slice(-6)}</p>
                    <p>{formatDate(pedido.data)}</p>
                </header>

                <hr />

                <section>
                    <h2>Cliente</h2>
                    <p><strong>Nome:</strong> {pedido.cliente.nome}</p>
                    <p><strong>Telefone:</strong> {pedido.cliente.telefone}</p>
                </section>
                
                <hr />

                <section>
                    <h2>{pedido.tipoEntrega === 'entrega' ? 'Entrega' : 'Retirada'}</h2>
                    {pedido.tipoEntrega === 'entrega' && pedido.endereco ? (
                        <>
                            <p>{pedido.endereco.address.street}, {pedido.endereco.address.number}</p>
                            {pedido.endereco.address.complement && <p>Comp: {pedido.endereco.address.complement}</p>}
                            <p>Bairro: {pedido.endereco.address.neighborhood}</p>
                            {pedido.endereco.address.referencePoint && <p>Ref: {pedido.endereco.address.referencePoint}</p>}
                        </>
                    ) : (
                        <p><strong>Retirada no Balcão</strong></p>
                    )}
                </section>

                <hr />

                <section>
                    <h2>Itens do Pedido</h2>
                    {pedido.itens.map((item, index) => (
                        <div key={index} className="item">
                            <div className="item-line">
                                <span className="item-name">{item.quantidade}x {item.nome}</span>
                                <span className="item-price">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                            </div>
                            {item.size && <p className="item-detail">- Tamanho: {item.size}</p>}
                            {item.border && <p className="item-detail">- Borda: {item.border}</p>}
                            {item.extras && item.extras.length > 0 && <p className="item-detail">- Extras: {item.extras.join(', ')}</p>}
                            {item.observacao && <p className="item-detail">- Obs: {item.observacao}</p>}
                        </div>
                    ))}
                </section>

                <hr />

                <section className="totals">
                    <div className="total-line">
                        <span>Subtotal:</span>
                        <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                    {pedido.tipoEntrega === 'entrega' && (
                        <div className="total-line">
                            <span>Taxa de Entrega:</span>
                            <span>R$ {pedido.endereco?.deliveryFee?.toFixed(2) || '0.00'}</span>
                        </div>
                    )}
                    <div className="total-line total">
                        <strong>Total:</strong>
                        <strong>R$ {total.toFixed(2)}</strong>
                    </div>
                </section>
                
                <hr />

                <section>
                    <h2>Pagamento</h2>
                    <p><strong>Forma:</strong> {pedido.formaPagamento}</p>
                    {pedido.formaPagamento === 'dinheiro' && pedido.troco && (
                        <p><strong>Troco para:</strong> R$ {pedido.troco}</p>
                    )}
                </section>
                
                {pedido.observacoes && (
                    <>
                        <hr />
                        <section>
                            <h2>Observações Gerais</h2>
                            <p>{pedido.observacoes}</p>
                        </section>
                    </>
                )}

                <footer>
                    <p>Obrigado pela preferência!</p>
                </footer>
            </div>

            {/* --- ESTILOS ATUALIZADOS --- */}
            <style jsx global>{`
                @page {
                    margin: 2mm;
                }
                
                * {
                    box-sizing: border-box;
                }

                html, body {
                    width: 76mm;
                    margin: 0;
                    padding: 0;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 10pt; /* Aumentei um pouco para legibilidade */
                    color: #000; /* Cor do texto escura */
                    font-weight: bold; /* Todo texto em negrito */
                    background-color: #fff;
                }
                
                .receipt-container {
                    width: 100%;
                }
                
                header, section, footer {
                    padding: 5px 0;
                    text-align: center;
                }
                
                section {
                    text-align: left;
                }
                
                .title {
                    font-size: 1.5em;
                }
                
                h2 {
                    font-size: 1.1em;
                    text-transform: uppercase;
                    margin: 5px 0;
                    text-align: center;
                }
                
                p {
                    margin: 2px 0;
                    word-wrap: break-word;
                }
                
                hr {
                    border: none;
                    border-top: 1px dashed #000;
                    margin: 4px 0;
                }
                
                .item {
                    margin-bottom: 5px;
                    page-break-inside: avoid;
                }
                
                .item-line, .total-line {
                    display: flex;
                    justify-content: space-between;
                    gap: 8px;
                }
                
                .item-name {
                    flex-grow: 1;
                    text-align: left;
                }
                
                .item-price {
                    flex-shrink: 0;
                    text-align: right;
                }
                
                .item-detail {
                    font-size: 0.9em; /* Um pouco maior para não ficar tão pequeno */
                    padding-left: 10px;
                    margin: 0;
                }
                
                .totals {
                    padding-top: 5px;
                }
                
                .total strong {
                    font-size: 1.2em; /* Total um pouco maior */
                }
                
                footer {
                    padding-top: 10px;
                }

                @media print {
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </>
    );
}