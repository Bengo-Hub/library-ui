import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { OrgShell } from './org-shell';

/**
 * Emit the tenant-specific PWA manifest link server-side. Next.js metadata merging makes
 * this deeper `[orgSlug]` segment override the root layout's default `/manifest.json`, so the
 * initial server-rendered HTML for a tenant route already references
 * `/${orgSlug}/manifest.webmanifest`. This is what makes the PWA install capture the correct
 * tenant (name, logo, start_url=/{orgSlug}/) on mobile.
 */
export async function generateMetadata({
    params,
}: {
    params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
    const { orgSlug } = await params;
    return {
        manifest: `/${orgSlug}/manifest.webmanifest`,
    };
}

export default function OrgLayout({ children }: { children: ReactNode }) {
    return <OrgShell>{children}</OrgShell>;
}
