import { apiClient } from './client';
import { libBase } from './types';

/** Masked status of the platform credential-encryption key (no key material ever returned). */
export interface EncryptionKeyStatus {
  configured: boolean;
  source: string; // "db" | "env" | "dev"
  key_fingerprint: string;
  updated_at: string | null;
}

/** Masked status of an integration secret (e.g. the ISBNdb API key). */
export interface IntegrationStatus {
  configured: boolean;
  key_fingerprint: string;
  updated_at: string | null;
}

/**
 * Platform-owner-only configuration. Secrets are stored encrypted at rest in the library-api
 * (ServiceConfig), never exposed back — responses carry only a fingerprint + updated_at.
 */
export const platformApi = {
  getEncryptionKey: (orgSlug: string) =>
    apiClient.get<EncryptionKeyStatus>(`${libBase(orgSlug)}/platform/encryption-key`),
  setEncryptionKey: (orgSlug: string, body: { generate?: boolean; key?: string }) =>
    apiClient.put<EncryptionKeyStatus>(`${libBase(orgSlug)}/platform/encryption-key`, body),

  getIsbndb: (orgSlug: string) =>
    apiClient.get<IntegrationStatus>(`${libBase(orgSlug)}/platform/integrations/isbndb`),
  setIsbndb: (orgSlug: string, apiKey: string) =>
    apiClient.put<IntegrationStatus>(`${libBase(orgSlug)}/platform/integrations/isbndb`, { api_key: apiKey }),
};
