'use client';

import { Delete, Loader2 } from 'lucide-react';
import { useState } from 'react';

/**
 * PinKeypad — large touch-friendly numeric keypad (adapted from pos-ui's PINKeypadLarge).
 * Calls onConfirm(pin) when the pin reaches `length` digits (or on the ✓ key).
 */
export function PinKeypad({
  onConfirm,
  loading = false,
  error,
  length = 4,
}: {
  onConfirm: (pin: string) => void;
  loading?: boolean;
  error?: string;
  length?: number;
}) {
  const [pin, setPin] = useState('');

  function press(d: string) {
    if (loading) return;
    const next = (pin + d).slice(0, length);
    setPin(next);
    if (next.length >= length) {
      onConfirm(next);
      setTimeout(() => setPin(''), 250);
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex items-center justify-center gap-3 mb-6 h-6">
        {Array.from({ length }).map((_, i) => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full transition-all ${i < pin.length ? 'bg-primary scale-110' : 'bg-muted-foreground/25'}`} />
        ))}
      </div>
      {error && <p className="text-center text-sm text-destructive mb-4" role="alert">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            disabled={loading}
            onClick={() => press(k)}
            className="h-16 rounded-2xl bg-card border border-border text-2xl font-bold hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-50"
          >
            {k}
          </button>
        ))}
        <div />
        <button type="button" disabled={loading} onClick={() => press('0')} className="h-16 rounded-2xl bg-card border border-border text-2xl font-bold hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-50">0</button>
        <button type="button" disabled={loading} onClick={() => setPin((p) => p.slice(0, -1))} className="h-16 rounded-2xl flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all disabled:opacity-50" aria-label="Backspace">
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Delete className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
