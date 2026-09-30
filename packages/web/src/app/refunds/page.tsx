import type { Metadata } from 'next';
import LegalPage, { LegalSection } from '@/components/legal-page';
import { CONTACT_EMAIL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Refund Policy — SkillJacked',
  description: 'How cancelling and refunds work for SkillJacked Pro.',
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro={<p>SkillJacked Pro is a monthly subscription. Here&apos;s how cancelling and refunds work.</p>}
    >
      <LegalSection title="Cancel any time">
        <p>
          Cancel from <a href="/settings">Settings</a> → Manage subscription. You won&apos;t be charged
          again, and Pro stays active until the end of the period you&apos;ve already paid for.
        </p>
      </LegalSection>

      <LegalSection title="Refunds">
        <p>
          We don&apos;t give refunds or credits for partial months or unused videos, except where the
          law requires it.
        </p>
      </LegalSection>

      <LegalSection title="Billing mistakes">
        <p>
          If you were charged twice, or charged after cancelling, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> within 30 days of the charge and
          we&apos;ll refund it.
        </p>
      </LegalSection>

      <LegalSection title="Videos that produce no skills">
        <p>
          If a video produces no skills, it doesn&apos;t count toward your monthly allowance, so
          there&apos;s nothing to refund.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
