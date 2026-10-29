'use client';

import Image from 'next/image';
import { FaArrowDown, FaArrowRight, FaMapMarkerAlt, FaUtensils } from 'react-icons/fa';

type MenuHeroProps = {
    isOpen: boolean;
    loading?: boolean;
    onExplore: () => void;
    onInfo?: () => void;
};

export default function MenuHero({ isOpen, loading, onExplore, onInfo }: MenuHeroProps) {
    return (
        <section className="menu-hero storefront-hero" aria-labelledby="menu-welcome">
            <div className="storefront-hero-copy">
                <span className="storefront-eyebrow"><span /> FEITO COM CAPRICHO. FEITO PRA VOCÊ.</span>
                <h1 id="menu-welcome">Seu próximo<br />momento <em>favorito.</em></h1>
                <p>Uma pizza para compartilhar. Uma massa para se apaixonar. Escolha seu sabor e deixe o resto com o Do&apos;Cheff.</p>
                <div className="storefront-hero-actions">
                    <button type="button" className="storefront-primary" onClick={onExplore}>Escolher meu pedido <FaArrowDown aria-hidden="true" /></button>
                    {onInfo && <button type="button" className="storefront-info-link" onClick={onInfo}>Conheça a casa <FaArrowRight aria-hidden="true" /></button>}
                </div>
                <div className="storefront-hero-details">
                    <span><FaMapMarkerAlt aria-hidden="true" /> Alto Rodrigues, RN</span>
                    <span className={isOpen ? 'storefront-status is-open' : 'storefront-status'}><i />{loading ? 'Consultando horário' : isOpen ? 'Aberto para pedidos' : 'Fechado no momento'}</span>
                </div>
            </div>
            <div className="storefront-hero-photo">
                <Image src="/pizzas/pizzadecalabresa.jpg" alt="Pizza de calabresa com queijo e borda dourada" fill priority sizes="(max-width: 700px) 100vw, 55vw" className="object-cover" />
                <div className="storefront-photo-caption"><span><FaUtensils aria-hidden="true" /></span><div><strong>O sabor de estar em casa.</strong><small>Do nosso cardápio para a sua mesa.</small></div></div>
                <span className="storefront-photo-stamp" aria-hidden="true">DO&apos;CHEFF<br /><b>feito com<br />capricho</b><br />ALTO RODRIGUES</span>
            </div>
        </section>
    );
}
