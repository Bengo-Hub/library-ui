'use client';

import { cn } from '@/lib/utils';
import { Camera, Loader2, ScanBarcode } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { BarcodeScanner } from '@/components/BarcodeScanner';

/**
 * ScannerInput — unified barcode entry adapted from pos-ui's keyboard-wedge BarcodeInput.
 *
 * Libraries predominantly use USB handheld laser scanners that behave as keyboard wedges:
 * they type the barcode digits very fast then send Enter. So the primary path is a
 * focused text input that submits on Enter (no camera needed). A camera button opens the
 * html5-qrcode BarcodeScanner for phones/tablets without a hardware scanner.
 *
 * `continuous` keeps focus after each scan so staff can keep scanning (stocktake, checkout).
 */
export function ScannerInput({
  onScan,
  placeholder = 'Scan or type barcode…',
  autoFocus = true,
  continuous = true,
  loading = false,
  className,
}: {
  onScan: (barcode: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  continuous?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [camOpen, setCamOpen] = useState(false);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function submit(raw?: string) {
    const value = (raw ?? inputRef.current?.value ?? '').trim();
    if (!value) return;
    onScan(value);
    if (inputRef.current) inputRef.current.value = '';
    if (continuous) inputRef.current?.focus();
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1">
        <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          aria-label="Barcode"
          placeholder={placeholder}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          className="w-full bg-card border border-border rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/60 disabled:opacity-50"
        />
      </div>
      <button
        type="button"
        onClick={() => setCamOpen(true)}
        disabled={loading}
        title="Scan with camera"
        aria-label="Scan with camera"
        className="h-12 w-12 shrink-0 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
      </button>

      <Dialog open={camOpen} onClose={() => setCamOpen(false)} title="Scan barcode">
        {camOpen && (
          <BarcodeScanner
            onScan={(text) => {
              setCamOpen(false);
              submit(text);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
