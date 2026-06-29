'use client';

import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { useQueryClient } from '@tanstack/react-query';

export interface PaymentIntent {
  intent_id: string;
  initiate_url?: string;
  amount?: string | number;
}

/**
 * In-app membership-fee / fine payment via the shared treasury payment modal (replaces the old
 * full-page redirect). The backend issues a treasury intent (reference_type membership_fee); this
 * modal drives the hosted payment and polls for confirmation, then fires onPaid so the caller can
 * refresh. tenantSlug feeds the treasury-ui URL (NEXT_PUBLIC_TREASURY_UI_URL).
 */
export function MembershipPaymentModal({
  open, onClose, orgSlug, intent, description = 'Library membership fee', referenceType = 'membership_fee', onPaid,
}: {
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  intent: PaymentIntent | null;
  description?: string;
  referenceType?: string;
  onPaid?: () => void;
}) {
  const qc = useQueryClient();
  // Treasury reconciles the payment ASYNC (treasury.payment.succeeded → library consumer → DB PAID),
  // so a single refetch on confirm can race ahead of the flip. Refresh now + a few delayed retries
  // so the UI lands on PAID without a manual reload.
  function refreshAfterPayment() {
    const keys = ['fines', 'members', 'reports', 'holds', 'ebooks', 'circulation'];
    const invalidate = () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    invalidate();
    [1500, 4000, 8000].forEach((ms) => setTimeout(invalidate, ms));
  }

  if (!intent?.intent_id) return null;
  // treasury-ui host that the modal embeds (falls back to the shared-ui-lib default).
  const treasuryUiUrl = process.env.NEXT_PUBLIC_TREASURY_UI_URL || undefined;
  return (
    <TreasuryPaymentModal
      open={open}
      onOpenChange={(o: boolean) => { if (!o) { refreshAfterPayment(); onClose(); } }}
      paymentIntentId={intent.intent_id}
      tenantSlug={orgSlug}
      treasuryUiUrl={treasuryUiUrl}
      amount={Number(intent.amount) || 0}
      currency="KES"
      description={description}
      initiateUrl={intent.initiate_url}
      referenceId={intent.intent_id}
      referenceType={referenceType}
      onPaymentConfirmed={() => { refreshAfterPayment(); onPaid?.(); onClose(); }}
      onPaymentFailed={() => { /* keep modal open so the user can retry */ }}
    />
  );
}
