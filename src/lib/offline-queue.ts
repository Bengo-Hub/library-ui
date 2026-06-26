'use client';

import { circulationApi } from '@/lib/api/circulation';

// Offline circulation queue — adapted from the pos-offline-sync idea. When a checkout/return
// can't reach the API (offline / network error), the action is persisted to localStorage with
// a client-generated `client_reference` idempotency key and replayed when connectivity returns.
// The backend checkout is get-or-create on client_reference, so replays are exactly-once.

export type QueuedAction =
  | { id: string; kind: 'checkout'; orgSlug: string; payload: { member_id: string; copy_barcode: string; in_house?: boolean; client_reference: string }; queuedAt: number }
  | { id: string; kind: 'return'; orgSlug: string; payload: { copy_barcode: string }; queuedAt: number };

const KEY = 'library-offline-circulation-queue';

function load(): QueuedAction[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(q: QueuedAction[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(q));
  window.dispatchEvent(new CustomEvent('library-queue-changed', { detail: q.length }));
}

export function queueSize(): number {
  return load().length;
}

export function uid(): string {
  return (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

export function enqueue(action: QueuedAction) {
  const q = load();
  q.push(action);
  save(q);
}

/** Replays queued actions oldest-first; drops an action on success. Stops on the first
 *  network failure (still offline) and leaves the rest queued. Returns the number flushed. */
export async function drain(): Promise<number> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
  let q = load();
  let flushed = 0;
  for (const action of [...q]) {
    try {
      if (action.kind === 'checkout') {
        await circulationApi.checkout(action.orgSlug, action.payload);
      } else {
        await circulationApi.returnCopy(action.orgSlug, action.payload.copy_barcode);
      }
      q = q.filter((a) => a.id !== action.id);
      save(q);
      flushed++;
    } catch (e: unknown) {
      // A real network error means we are still offline → stop and keep the queue.
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === undefined) break;
      // A 4xx (e.g. copy already returned / loan resolved) is terminal for this action.
      q = q.filter((a) => a.id !== action.id);
      save(q);
    }
  }
  return flushed;
}

let started = false;
/** Registers a one-time online/visibility listener that drains the queue when back online. */
export function startOfflineSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const tryDrain = () => { void drain(); };
  window.addEventListener('online', tryDrain);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tryDrain(); });
  tryDrain(); // attempt once on load
}
