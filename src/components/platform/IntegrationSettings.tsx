'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui/base';
import { Field, Select } from '@/components/ui/form';
import { platformApi, ISBNDB_HOSTS } from '@/lib/api/platform';
import { apiErrorMessage } from '@/lib/api/error-message';

function formatWhen(ts: string | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

/**
 * Platform-owner integration settings. The ISBNdb API key powers richer cover/description
 * auto-fill during cataloging; it is stored encrypted at rest in library-api (never env, never
 * returned). The encryption key card lets the owner provision/rotate the AES key those secrets
 * are encrypted with (mirrors the treasury-api credential-encryption pattern).
 */
export function IntegrationSettings({ orgSlug }: { orgSlug: string }) {
  const qc = useQueryClient();
  const [isbndbKey, setIsbndbKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const isbndb = useQuery({
    queryKey: ['platform', 'isbndb', orgSlug],
    queryFn: () => platformApi.getIsbndb(orgSlug),
  });
  const enc = useQuery({
    queryKey: ['platform', 'encryption-key', orgSlug],
    queryFn: () => platformApi.getEncryptionKey(orgSlug),
  });

  const saveIsbndb = useMutation({
    mutationFn: (vars: { key: string; baseUrl: string }) => platformApi.setIsbndb(orgSlug, vars.key, vars.baseUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'isbndb', orgSlug] });
      setIsbndbKey('');
    },
  });
  const saveEnc = useMutation({
    mutationFn: () => platformApi.setEncryptionKey(orgSlug, { generate: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'encryption-key', orgSlug] }),
  });

  async function onSaveIsbndb(clear = false) {
    const key = clear ? '' : isbndbKey.trim();
    if (!clear && !key) { toast.error('Enter an ISBNdb API key'); return; }
    const host = clear ? '' : (baseUrl || isbndb.data?.base_url || ISBNDB_HOSTS[0].value);
    try {
      await saveIsbndb.mutateAsync({ key, baseUrl: host });
      toast.success(clear ? 'ISBNdb key removed' : 'ISBNdb key saved — covers & descriptions enriched');
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to save key'));
    }
  }

  async function onGenerateEnc() {
    try {
      await saveEnc.mutateAsync();
      toast.success('Encryption key generated & activated');
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to generate key'));
    }
  }

  const isbndbStatus = isbndb.data;
  const encStatus = enc.data;

  return (
    <div className="space-y-6">
      {/* ISBNdb integration */}
      <Card>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">ISBNdb — book metadata</h3>
                {isbndb.isLoading ? null : isbndbStatus?.configured
                  ? <Badge variant="success">Connected</Badge>
                  : <Badge variant="outline">Not configured</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Adds richer covers, synopses and subjects to ISBN scan auto-fill. Free providers
                (Google Books, Open Library) are always used; ISBNdb is tried first when a key is set.
              </p>
              {isbndbStatus?.configured && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  key ••••{isbndbStatus.key_fingerprint}
                  {isbndbStatus.updated_at ? ` · updated ${formatWhen(isbndbStatus.updated_at)}` : ''}
                </p>
              )}
            </div>
          </div>

          <Field label="ISBNdb API key" hint="Stored encrypted at rest. Get a key at isbndb.com (paid plans).">
            <input
              type="password"
              value={isbndbKey}
              onChange={(e) => setIsbndbKey(e.target.value)}
              placeholder={isbndbStatus?.configured ? 'Enter a new key to replace the saved one' : '••••••••••••'}
              autoComplete="off"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
            />
          </Field>

          <Field label="Plan / API host" hint="ISBNdb uses a different host per plan — pick the one matching your subscription.">
            <Select
              value={baseUrl || isbndbStatus?.base_url || ISBNDB_HOSTS[0].value}
              onChange={(e) => setBaseUrl(e.target.value)}
            >
              {ISBNDB_HOSTS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </Select>
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onSaveIsbndb(false)} disabled={saveIsbndb.isPending} className="gap-1.5">
              {saveIsbndb.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Save key
            </Button>
            {isbndbStatus?.configured && (
              <Button variant="outline" onClick={() => onSaveIsbndb(true)} disabled={saveIsbndb.isPending} className="gap-1.5 text-destructive">
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Credential encryption key */}
      <Card>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">Credential encryption key</h3>
                {enc.isLoading ? null : (
                  <Badge variant={encStatus?.source === 'db' ? 'success' : 'warning'}>
                    {encStatus?.source === 'db' ? 'Platform key' : encStatus?.source === 'env' ? 'Env key' : 'Default dev key'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                AES-256-GCM key used to encrypt integration secrets (like the ISBNdb key) at rest.
                Generate a platform key to stop relying on the environment/dev fallback.
              </p>
              {encStatus?.key_fingerprint && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  fingerprint {encStatus.key_fingerprint}
                  {encStatus.updated_at ? ` · updated ${formatWhen(encStatus.updated_at)}` : ''}
                </p>
              )}
            </div>
          </div>
          <Button onClick={onGenerateEnc} disabled={saveEnc.isPending} variant="outline" className="gap-1.5">
            {saveEnc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {encStatus?.source === 'db' ? 'Rotate key' : 'Generate & activate'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
