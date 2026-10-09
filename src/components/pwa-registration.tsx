'use client';

import { PwaInstallPrompt } from '@bengo-hub/shared-ui-lib/offline';
import { useBranding } from '@/providers/branding-provider';
import { requestAppPermissions } from '@/hooks/use-app-permissions';

const DISMISS_KEY = 'lib_pwa_install_dismissed_until';

export function PWARegistration() {
  const { tenant, getServiceTitle } = useBranding();

  // Same title as the header: "The Urban Library" for "The Urban Loft Cafe".
  const appName = getServiceTitle('Library');

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
