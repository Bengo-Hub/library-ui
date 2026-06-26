'use client';

import { Html5Qrcode } from 'html5-qrcode';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const ELEMENT_ID = 'library-barcode-reader';

/**
 * BarcodeScanner — ported from inventory-ui's QrScanner. Renders a live camera viewport
 * and invokes onScan with the first decoded value. Used across the library desk for ISBN
 * scanning (cataloging auto-fill), copy/member barcode scan-in (circulation), and copies.
 * Requests camera permission via getUserMedia (browser prompts on start). Stops the camera
 * on unmount and after the first successful scan.
 */
export function BarcodeScanner({
  onScan,
  hint = 'Point the camera at the barcode / ISBN.',
}: {
  onScan: (text: string) => void;
  hint?: string;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;
    const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 160 } },
        (decoded) => {
          if (!active || scannedRef.current) return;
          scannedRef.current = true;
          onScan(decoded.trim());
        },
        () => {
          /* per-frame decode failures are normal; ignore */
        },
      )
      .then(() => active && setStatus('scanning'))
      .catch((err: unknown) => {
        if (!active) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unable to access the camera');
      });

    return () => {
      active = false;
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          id={ELEMENT_ID}
          className="overflow-hidden rounded-2xl border border-border bg-black/90 aspect-video w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover [&_img]:hidden"
        />
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs">Requesting camera…</span>
          </div>
        )}
      </div>
      {status === 'error' ? (
        <p className="text-xs text-destructive">
          Camera unavailable ({error}). Grant camera permission or type the value manually.
        </p>
      ) : (
        <p className="text-center text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
