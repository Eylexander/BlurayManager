'use client';

import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

const tones = {
  primary: 'bg-primary/10 text-primary',
  danger: 'bg-destructive/10 text-destructive',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
} as const;

const sizes = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
} as const;

// Open modals, innermost last. Only the top one reacts to Escape, so a
// dialog opened from another dialog closes on its own.
const stack: string[] = [];

export interface ModalProps {
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Icon shown in a tinted tile next to the title */
  icon?: ReactNode;
  /** Colour of the icon tile */
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  footer?: ReactNode;
  /** Close when the backdrop is clicked (default true) */
  dismissible?: boolean;
  children: ReactNode;
}

/**
 * Shared dialog shell: portal, backdrop, Escape/backdrop close, scroll lock,
 * focus handling and the header/body/footer layout. Render it conditionally;
 * it is open for as long as it is mounted.
 */
export function Modal({
  onClose,
  title,
  description,
  icon,
  tone = 'primary',
  size = 'md',
  footer,
  dismissible = true,
  children,
}: ModalProps) {
  const t = useTranslations();
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portals need the DOM, which only exists after mount
    setMounted(true);
    stack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(id), 1);
      if (stack.length === 0) document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [id]);

  useEffect(() => {
    if (!mounted) return;
    // Respect an autoFocus inside the dialog; otherwise focus the first
    // field if there is one, else the panel itself.
    const panel = panelRef.current;
    if (panel?.contains(document.activeElement)) return;
    const field = panel?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea');
    (field ?? panel)?.focus();
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        tabIndex={-1}
        className={`w-full ${sizes[size]} max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-card text-card-foreground border border-border rounded-t-2xl sm:rounded-xl shadow-2xl shadow-black/20 outline-none animate-dialog-in`}
      >
        <div className="flex items-start gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-border">
          {icon && (
            <div className={`shrink-0 grid place-items-center w-10 h-10 rounded-lg [&_svg]:w-5 [&_svg]:h-5 ${tones[tone]}`}>
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 id={`${id}-title`} className="text-lg font-semibold leading-tight text-foreground">
              {title}
            </h2>
            {description && (
              <div id={`${id}-description`} className="mt-1 text-sm text-muted-foreground truncate">
                {description}
              </div>
            )}
          </div>
          <IconButton label={t('common.close')} onClick={onClose} className="-mr-2 -mt-1">
            <X />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">{children}</div>

        {footer && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 px-5 sm:px-6 py-4 border-t border-border bg-muted/30 rounded-b-xl pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
