'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { useAdminDialog } from './AdminUI';

export default function AdminDialog({ id, title, description, describedBy, role = 'dialog', icon, onClose, children, footer, navigation, size = 'medium', className = '' }: {
  id: string;
  title: string;
  description?: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  navigation?: React.ReactNode;
  size?: 'medium' | 'wide';
  className?: string;
}) {
  const dialogRef = useAdminDialog(true, onClose);

  return (
    <motion.div className="modal-overlay admin-dialog-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .16 }} onClick={onClose}>
      <motion.div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={id}
        aria-describedby={describedBy || (description ? `${id}-description` : undefined)}
        tabIndex={-1}
        className={`modal-panel admin-dialog admin-dialog-${size} ${className}`}
        initial={{ opacity: 0, y: 18, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: .98 }}
        transition={{ duration: .18, ease: 'easeOut' }}
        onClick={event => event.stopPropagation()}
      >
        <header className="admin-dialog-header">
          <span className="admin-dialog-icon" aria-hidden="true">{icon}</span>
          <div className="admin-dialog-heading">
            <h2 id={id}>{title}</h2>
            {description && <p id={`${id}-description`}>{description}</p>}
          </div>
          <button type="button" className="admin-dialog-close no-print" aria-label={`Fechar ${title.toLocaleLowerCase('pt-BR')}`} onClick={onClose}><FaTimes aria-hidden="true" /></button>
        </header>
        {navigation && <div className="admin-dialog-navigation">{navigation}</div>}
        <div className="admin-dialog-body">{children}</div>
        {footer && <footer className="admin-dialog-footer no-print">{footer}</footer>}
      </motion.div>
    </motion.div>
  );
}
