import Dexie, { type Table } from 'dexie';

// ── Form drafts (cataloging autosave) ────────────────────────────────────────────
//
// One row per in-progress, not-yet-saved form (currently: new-title cataloging). Mirrors pos-ui's
// pos-db.ts Dexie-database convention. `data` holds the JSON-serializable form snapshot; a picked
// cover image is stored alongside as a real Blob (IndexedDB, unlike localStorage, can hold binary
// data directly) so it survives a reload too.
export interface FormDraftRow {
  key: string; // PK — scope string, e.g. `${tenantSlug}:${userId}:bib:new`
  updatedAt: string; // ISO
  data: Record<string, unknown>;
  coverBlob?: Blob;
  coverBackBlob?: Blob;
}

class LibraryDatabase extends Dexie {
  formDrafts!: Table<FormDraftRow, string>;

  constructor() {
    super('library_offline_db');
    this.version(1).stores({
      formDrafts: 'key, updatedAt',
    });
  }
}

export const libraryDB = new LibraryDatabase();

/** Drafts older than this are treated as stale and ignored/cleared rather than restored. */
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function getFormDraft(key: string): Promise<FormDraftRow | undefined> {
  const row = await libraryDB.formDrafts.get(key);
  if (!row) return undefined;
  if (Date.now() - new Date(row.updatedAt).getTime() > DRAFT_MAX_AGE_MS) {
    await libraryDB.formDrafts.delete(key);
    return undefined;
  }
  return row;
}

export async function saveFormDraft(
  key: string,
  data: Record<string, unknown>,
  covers?: { cover?: File | null; coverBack?: File | null },
): Promise<void> {
  await libraryDB.formDrafts.put({
    key,
    data,
    updatedAt: new Date().toISOString(),
    coverBlob: covers?.cover ?? undefined,
    coverBackBlob: covers?.coverBack ?? undefined,
  });
}

export async function clearFormDraft(key: string): Promise<void> {
  await libraryDB.formDrafts.delete(key);
}
