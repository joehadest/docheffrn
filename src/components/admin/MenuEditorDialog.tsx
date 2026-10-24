'use client';

import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import './menu-editor-dialog.css';

type MenuEditorDialogProps = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  navigation?: ReactNode;
  size?: 'medium' | 'wide';
  busy?: boolean;
  sectionKey?: string;
};

/** Native modal isolation with independent backdrop and panel animations. */
export default function MenuEditorDialog({ id, title, description, icon, onClose, children, footer, navigation, size = 'medium', busy = false, sectionKey }: MenuEditorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    dialog.showModal();
    panelRef.current?.focus({ preventScroll: true });

    // AnimatePresence keeps the native dialog and scroll lock until exit finishes.
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [sectionKey]);

  const dismiss = () => {
    if (!busy && isPresent) onClose();
  };

  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const panel = event.currentTarget;
    const controls = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'))
      .filter(element => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); panel.focus(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="menu-editor-root"
      aria-labelledby={id}
      aria-describedby={`${id}-description`}
      data-state={isPresent ? 'open' : 'closing'}
      onCancel={event => { event.preventDefault(); dismiss(); }}
      onPointerDown={event => { if (event.target === event.currentTarget) dismiss(); }}
    >
      <motion.div
        aria-hidden="true"
        className="menu-editor-backdrop"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : .16 }}
      />
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={keepFocusInside}
        className={`menu-editor-panel menu-editor-panel-${size}`}
        aria-busy={busy}
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12, transition: { duration: reducedMotion ? 0 : .13, ease: 'easeIn' } }}
        transition={{ duration: reducedMotion ? 0 : .2, ease: [.16, 1, .3, 1] }}
      >
        <header className="menu-editor-header">
          <div className="menu-editor-symbol" aria-hidden="true">{icon}</div>
          <div className="menu-editor-heading">
            <p className="menu-editor-eyebrow">Cardápio · {size === 'wide' ? 'Editor de produto' : 'Organização'}</p>
            <h2 id={id}>{title}</h2>
            <p id={`${id}-description`}>{description}</p>
          </div>
          <button type="button" className="menu-editor-close" aria-label={`Fechar ${title.toLocaleLowerCase('pt-BR')}`} disabled={busy} onClick={dismiss}><FaTimes aria-hidden="true" /></button>
        </header>
        <div className={`menu-editor-layout${navigation ? ' menu-editor-with-navigation' : ''}`}>
          {navigation && <aside className="menu-editor-navigation"><p>Informações do item</p>{navigation}<span>Preencha cada seção e salve quando terminar.</span></aside>}
          <div ref={bodyRef} className="menu-editor-body">{children}</div>
        </div>
        <footer className="menu-editor-footer">
          <p className="menu-editor-save-hint">As alterações são aplicadas ao salvar.</p>
          <div className="menu-editor-footer-actions">{footer}</div>
        </footer>
      </motion.div>
    </dialog>
  );
}
