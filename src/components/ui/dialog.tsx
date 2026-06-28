'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** max width tailwind class, default max-w-lg */
  className?: string;
  footer?: ReactNode;
}

/**
 * Modal dialog used across library forms (cataloging, members, copies…). On phones it docks to
 * the bottom as a slide-up sheet (native pattern: `modal-motion`, swipe-area handle, safe-area
 * aware); on sm+ it's a centered scale-in modal. The body scrolls independently so the header
 * and footer (action bar) stay pinned — critical for long forms on small screens.
 */
export function Dialog({ open, onClose, title, description, children, className, footer }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Lock body scroll behind the modal/sheet.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'relative z-50 flex w-full max-h-[92dvh] flex-col border border-border bg-card shadow-xl',
          'rounded-t-3xl sm:rounded-2xl sm:max-w-lg sm:max-h-[88vh]',
          'animate-sheet-up sm:animate-scale-in',
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile drag-handle affordance */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-border px-5 sm:px-6 py-3.5 sm:py-4 shrink-0">
          <div className="min-w-0">
            {title && <h2 className="text-base sm:text-lg font-semibold truncate">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 h-9 w-9 -mr-1 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 overscroll-contain">{children}</div>

        {footer && (
          <div
            className="border-t border-border px-5 sm:px-6 py-3.5 sm:py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 bg-accent/5 shrink-0"
            style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
