'use client';

import { PwaInstallPrompt } from '@bengo-hub/shared-ui-lib/offline';
import { useBranding } from '@/providers/branding-provider';
import { requestAppPermissions } from '@/hooks/use-app-permissions';

const DISMISS_KEY = 'lib_pwa_install_dismissed_until';

export function PWARegistration() {
  const { tenant } = useBranding();

  const tenantFirstWord = tenant?.orgName?.trim().split(/\s+/)[0];
  const appName = tenantFirstWord ? `${tenantFirstWord} Library` : 'Codevertex Library';

  return (
    <PwaInstallPrompt
      appName={appName}
      logoUrl={tenant?.logoUrl}
      tagline="Browse the catalog offline — syncs when reconnected."
      dismissKey={DISMISS_KEY}
      onInstalled={requestAppPermissions}
    />
  );
}
