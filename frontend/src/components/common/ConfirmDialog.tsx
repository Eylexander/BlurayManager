'use client';

import { ReactNode, useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmOptions {
  title: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  /** Styles the confirm button as destructive */
  danger?: boolean;
}

/**
 * Promise-based replacement for window.confirm() that uses the app's dialog:
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (!(await confirm({ title: '…', danger: true }))) return;
 *   …
 *   return <>{confirmDialog}…</>;
 */
export function useConfirm() {
  const t = useTranslations();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = (ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setOptions(null);
  };

  const confirmDialog = options && (
    <Modal
      size="sm"
      onClose={() => settle(false)}
      title={options.title}
      icon={options.danger ? <AlertTriangle /> : <HelpCircle />}
      tone={options.danger ? 'danger' : 'primary'}
      footer={
        <>
          {/* Destructive actions default to Cancel so a stray Enter is harmless */}
          <Button variant="secondary" onClick={() => settle(false)} autoFocus={options.danger}>
            {t('common.cancel')}
          </Button>
          <Button variant={options.danger ? 'danger' : 'primary'} onClick={() => settle(true)} autoFocus={!options.danger}>
            {options.confirmLabel ?? t('common.confirm')}
          </Button>
        </>
      }
    >
      {options.message && <p className="text-sm text-muted-foreground leading-relaxed">{options.message}</p>}
    </Modal>
  );

  return { confirm, confirmDialog };
}
