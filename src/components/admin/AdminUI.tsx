'use client';

import React, { useEffect, useRef } from 'react';

export function PageHeading({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className="admin-page-heading"><div><p className="admin-eyebrow">Gestão do restaurante</p><h1>{title}</h1><p className="admin-description">{description}</p></div>{children && <div className="admin-heading-actions">{children}</div>}</div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="admin-empty" role="status"><span aria-hidden="true" className="admin-empty-icon">↗</span><p>{children}</p></div>;
}

export function StatCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode }) {
  return <div className="admin-stat"><div className="admin-stat-top"><p>{label}</p><span aria-hidden="true">{icon}</span></div><p className={`admin-stat-value ${color || ''}`}>{value}</p>{sub && <p className="admin-stat-sub">{sub}</p>}</div>;
}

/** Focus, Escape, scroll lock and focus restoration, shared by admin dialogs. */
export function useAdminDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const panel = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const main = document.querySelector<HTMLElement>('.admin-workspace');
    const previousInert = main?.inert;
    // Only inert the workspace when the dialog is rendered outside it.
    if (main && !main.contains(panel)) main.inert = true;
    document.body.style.overflow = 'hidden';
    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex="0"]')).filter(el => !el.hasAttribute('disabled') && el.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => (focusables()[0] || panel).focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key === 'Tab') {
        const elements = focusables();
        if (!elements.length) { event.preventDefault(); panel.focus(); return; }
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    panel.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      panel.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (main) main.inert = previousInert || false;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return ref;
}
