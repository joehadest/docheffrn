'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaClock, FaInstagram, FaMapMarkerAlt, FaWhatsapp, FaCreditCard, FaTimes } from 'react-icons/fa';
import { FaArrowRight, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import Image from 'next/image';
import type { BusinessHoursConfig } from '@/utils/timeUtils';
import { DEFAULT_WHATSAPP_NUMBER, normalizeWhatsAppNumber } from '@/utils/whatsapp';

const days: { key: keyof BusinessHoursConfig; label: string }[] = [
    { key: 'monday', label: 'Segunda-feira' }, { key: 'tuesday', label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' }, { key: 'thursday', label: 'Quinta-feira' },
    { key: 'friday', label: 'Sexta-feira' }, { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
];

type Props = { open: boolean; onClose: () => void; hours: BusinessHoursConfig | null; whatsappNumber: string; isOpen: boolean; loading: boolean };

export default function RestaurantInfo({ open, onClose, hours, whatsappNumber, isOpen, loading }: Props) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const previousFocus = useRef<HTMLElement | null>(null);
    const number = normalizeWhatsAppNumber(whatsappNumber) || DEFAULT_WHATSAPP_NUMBER;
    const formattedNumber = `+55 (${number.slice(2, 4)}) ${number.slice(4, -4)}-${number.slice(-4)}`;
    const today = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long' }).format(new Date()).toLowerCase();

    useEffect(() => {
        if (!open) return;
        previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        closeRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key !== 'Tab') return;
            const dialog = document.getElementById('restaurant-info-dialog');
            const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') || []);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => { document.documentElement.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); previousFocus.current?.focus(); };
    }, [open, onClose]);

    if (typeof document === 'undefined' || !open) return null;
    return createPortal(
            <div className="restaurant-info-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
                <section id="restaurant-info-dialog" role="dialog" aria-modal="true" aria-labelledby="restaurant-info-title" aria-describedby="restaurant-info-description" className="restaurant-info-panel">
                    <div className="restaurant-info-heading">
                        <div className="restaurant-info-heading-art" aria-hidden="true"><Image src="/pizzas/pizzadecalabresa.jpg" alt="" fill sizes="280px" className="object-cover" /></div>
                        <div className="restaurant-info-heading-content"><span className="restaurant-info-kicker">DO&apos;CHEFF · ALTO RODRIGUES</span><h2 id="restaurant-info-title">Da nossa casa<br /><em>para a sua mesa.</em></h2><p id="restaurant-info-description">Conheça os horários, o endereço e os canais para falar com a gente.</p></div>
                        <button ref={closeRef} type="button" className="restaurant-info-close" onClick={onClose} aria-label="Fechar informações"><FaTimes aria-hidden="true" /></button>
                    </div>
                    <div className="restaurant-info-body">
                        <div className="restaurant-info-intro"><div className={`restaurant-info-status ${isOpen ? 'is-open' : ''}`}><span className="restaurant-info-dot" />{loading ? 'Consultando horário' : isOpen ? 'Aberto para pedidos' : 'Fechado no momento'}</div><span>Informações da casa</span></div>
                        <div className="restaurant-info-block restaurant-info-hours-block"><div className="restaurant-info-section-heading"><span className="restaurant-info-section-icon"><FaClock aria-hidden="true" /></span><div><small>PLANEJE SUA VISITA</small><h3>Horários de funcionamento</h3></div></div>{hours ? <div className="restaurant-info-hours">{days.map(day => { const slot = hours[day.key]; return <div key={day.key} className={today === day.key ? 'is-today' : ''}><span>{day.label}{today === day.key && <small>HOJE</small>}</span><strong>{slot?.open && slot.start && slot.end ? `${slot.start} – ${slot.end}` : 'Fechado'}</strong></div>; })}</div> : <p className="restaurant-info-muted">Horários indisponíveis no momento.</p>}</div>
                        <div className="restaurant-info-grid">
                            <div className="restaurant-info-block"><h3><FaMapMarkerAlt aria-hidden="true" /> Onde estamos</h3><p>Rua Maria Luiza Dantas<br />Alto Rodrigues, RN</p></div>
                            <div className="restaurant-info-block"><h3><FaCreditCard aria-hidden="true" /> Como pagar</h3><p>PIX, cartão e dinheiro</p></div>
                        </div>
                        <div className="restaurant-info-grid">
                            <div className="restaurant-info-block"><h3><FaWhatsapp aria-hidden="true" /> Atendimento</h3><a href={`https://wa.me/${number}`} target="_blank" rel="noopener noreferrer">{formattedNumber} <FaArrowUpRightFromSquare aria-hidden="true" /></a></div>
                            <div className="restaurant-info-block"><h3><FaInstagram aria-hidden="true" /> Instagram</h3><a href="https://www.instagram.com/docheff__/" target="_blank" rel="noopener noreferrer">@docheff__ <FaArrowUpRightFromSquare aria-hidden="true" /></a></div>
                        </div>
                        <p className="restaurant-info-legal">Do&apos;Cheff · CNPJ 53.378.172/0001-60</p>
                    </div>
                    <div className="restaurant-info-footer"><span>Seu próximo momento favorito começa aqui.</span><button type="button" onClick={onClose}>Explorar cardápio <FaArrowRight aria-hidden="true" /></button></div>
                </section>
            </div>, document.body
    );
}
