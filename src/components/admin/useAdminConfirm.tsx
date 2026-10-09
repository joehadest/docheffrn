'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import AdminDialog from './AdminDialog';

type Confirmation = { title: string; message: string; confirmLabel: string; destructive?: boolean };

/** Keeps existing confirmation flows while presenting a consistent, accessible dialog. */
export function useAdminConfirm() {
  const id = useId();
  const [prompt, setPrompt] = useState<Confirmation | null>(null);
  const pending = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((options: Confirmation) => new Promise<boolean>(resolve => {
    pending.current?.(false);
    pending.current = resolve;
    setPrompt(options);
  }), []);

  const settle = useCallback((confirmed: boolean) => {
    pending.current?.(confirmed);
    pending.current = null;
    setPrompt(null);
  }, []);

  useEffect(() => () => { pending.current?.(false); }, []);

  const confirmationDialog = prompt && (
    <AdminDialog
      id={`admin-confirm-${id}`}
      role="alertdialog"
      describedBy={`admin-confirm-message-${id}`}
      title={prompt.title}
      icon={<FaExclamationTriangle />}
      onClose={() => settle(false)}
      className="admin-confirm"
      footer={<>
        <button type="button" className="form-button-secondary" onClick={() => settle(false)}>Cancelar</button>
        <button type="button" className={prompt.destructive ? 'form-button-danger' : 'form-button-primary'} onClick={() => settle(true)}>{prompt.confirmLabel}</button>
      </>}
    >
      <p id={`admin-confirm-message-${id}`} className="admin-confirm-message">{prompt.message}</p>
    </AdminDialog>
  );

  return { confirm, confirmationDialog };
}
