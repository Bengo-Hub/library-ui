'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ScanLine, Upload, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/base';
import { Field, Select, Textarea } from '@/components/ui/form';
import { Dialog } from '@/components/ui/dialog';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { CoverThumb } from '@/components/library/CoverThumb';
import { BIB_FORMATS, type BibInput, type BibRecord, type BibFormat } from '@/lib/api/catalog';
import { useIsbnLookup, useCollections, useUploadCover } from '@/hooks/useCatalog';

const EMPTY: BibInput = {
  title: '', author: '', publisher: '', isbn: '', format: 'book', language: 'en',
  publication_year: null, edition: '', dewey: '', call_number: '', subjects: [], description: '', cover_url: null,
};

export function BibForm({
  orgSlug, initial, saving, onSubmit,
}: {
  orgSlug: string;
  initial?: BibRecord;
  saving?: boolean;
  onSubmit: (data: BibInput, coverFile?: File) => void;
}) {
  const [form, setForm] = useState<BibInput>(EMPTY);
  const [subjectsText, setSubjectsText] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const isbnLookup = useIsbnLookup(orgSlug);
  const { data: collections = [] } = useCollections(orgSlug);

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title, subtitle: initial.subtitle, author: initial.authors?.join(', ') || initial.author,
        publisher: initial.publisher, publication_year: initial.publication_year ?? null, edition: initial.edition,
        isbn: initial.isbn, issn: initial.issn, format: initial.format, language: initial.language,
        dewey: initial.dewey, call_number: initial.call_number, subjects: initial.subjects ?? [],
        collection_id: initial.collection_id, description: initial.description, cover_url: initial.cover_url, pages: initial.pages ?? null,
      });
      setSubjectsText((initial.subjects ?? []).join(', '));
      setCoverPreview(initial.cover_url ?? null);
    }
  }, [initial]);

  function set<K extends keyof BibInput>(key: K, value: BibInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function runIsbnLookup(isbn: string) {
    const clean = isbn.replace(/[^0-9Xx]/g, '');
    if (!clean) return;
    set('isbn', clean);
    // Non-blocking by design: fields stay editable while this runs, and a miss/failure never
    // stops the librarian from keying details manually (see backend's short, fail-soft lookup).
    try {
      const r = await isbnLookup.mutateAsync(clean);
      const found = !!(r.title || r.authors?.length || r.author || r.publisher || r.cover_url);
      if (!found) {
        toast.info('No match for that ISBN — enter the details manually.');
        return;
      }
      setForm((f) => ({
        ...f,
        isbn: r.isbn ?? clean,
        title: r.title ?? f.title,
        subtitle: r.subtitle ?? f.subtitle,
        author: r.authors?.join(', ') || r.author || f.author,
        publisher: r.publisher ?? f.publisher,
        publication_year: r.publication_year ?? f.publication_year,
        pages: r.pages ?? f.pages,
        language: r.language ?? f.language,
        cover_url: r.cover_url ?? f.cover_url,
        description: r.description || f.description,
        subjects: r.subjects?.length ? r.subjects : f.subjects,
      }));
      if (r.subjects?.length) setSubjectsText(r.subjects.join(', '));
      if (r.cover_url) setCoverPreview(r.cover_url);
      toast.success('Details auto-filled from ISBN');
    } catch {
      // Soft-fail: keep whatever was typed, just let the user proceed manually.
      toast.info('Lookup unavailable — enter the details manually.');
    }
  }

  function onCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const subjects = subjectsText.split(',').map((s) => s.trim()).filter(Boolean);
    onSubmit({ ...form, subjects }, coverFile ?? undefined);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ISBN scan row */}
      <div className="rounded-2xl border border-border bg-accent/20 p-4">
        <Field label="ISBN" hint="Scan or type the ISBN to auto-fill title, author, publisher and cover. You can always edit or type everything manually.">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                value={form.isbn ?? ''}
                onChange={(e) => set('isbn', e.target.value)}
                onBlur={(e) => e.target.value && runIsbnLookup(e.target.value)}
                inputMode="numeric"
                placeholder="978…"
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
              />
              {isbnLookup.isPending && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 sm:flex-none gap-1.5" onClick={() => setScanOpen(true)}>
                <ScanLine className="h-4 w-4" /> Scan
              </Button>
              <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => form.isbn && runIsbnLookup(form.isbn)} disabled={isbnLookup.isPending}>
                {isbnLookup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
              </Button>
            </div>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cover */}
        <div className="space-y-2">
          <CoverThumb url={coverPreview} title={form.title} className="aspect-[3/4] w-full" />
          <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm cursor-pointer hover:bg-accent/40 transition-colors">
            <Upload className="h-4 w-4" /> Upload cover
            <input type="file" accept="image/*" className="hidden" onChange={onCoverPick} />
          </label>
          {coverPreview && (
            <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); set('cover_url', null); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" /> Remove cover
            </button>
          )}
        </div>

        {/* Fields */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Title" required className="sm:col-span-2">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Subtitle" className="sm:col-span-2">
            <input value={form.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Author(s)">
            <input value={form.author ?? ''} onChange={(e) => set('author', e.target.value)} placeholder="Surname, Firstname" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Publisher">
            <input value={form.publisher ?? ''} onChange={(e) => set('publisher', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Format" required>
            <Select value={form.format} onChange={(e) => set('format', e.target.value as BibFormat)}>
              {BIB_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </Field>
          <Field label="Publication year">
            <input type="number" value={form.publication_year ?? ''} onChange={(e) => set('publication_year', e.target.value ? Number(e.target.value) : null)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Edition">
            <input value={form.edition ?? ''} onChange={(e) => set('edition', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Language">
            <input value={form.language ?? ''} onChange={(e) => set('language', e.target.value)} placeholder="en" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Dewey / classification">
            <input value={form.dewey ?? ''} onChange={(e) => set('dewey', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Call number">
            <input value={form.call_number ?? ''} onChange={(e) => set('call_number', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Collection">
            <Select value={form.collection_id ?? ''} onChange={(e) => set('collection_id', e.target.value || undefined)}>
              <option value="">— None —</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Pages">
            <input type="number" value={form.pages ?? ''} onChange={(e) => set('pages', e.target.value ? Number(e.target.value) : null)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Subjects" hint="Comma-separated" className="sm:col-span-2">
            <input value={subjectsText} onChange={(e) => setSubjectsText(e.target.value)} placeholder="History, Africa, 20th century" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Description / notes" className="sm:col-span-2">
            <Textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={saving} className="gap-1.5 w-full sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {initial ? 'Save changes' : 'Create title'}
        </Button>
      </div>

      <Dialog open={scanOpen} onClose={() => setScanOpen(false)} title="Scan ISBN barcode">
        <BarcodeScanner
          hint="Point the camera at the book's ISBN barcode."
          onScan={(text) => { setScanOpen(false); runIsbnLookup(text); }}
        />
      </Dialog>
    </form>
  );
}
