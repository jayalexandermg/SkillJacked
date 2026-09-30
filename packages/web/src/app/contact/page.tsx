import type { Metadata } from 'next';
import LegalPage, { LegalSection } from '@/components/legal-page';
import { CONTACT_EMAIL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Contact & Copyright — SkillJacked',
  description: 'How to reach SkillJacked, and how to report content that infringes your copyright.',
};

export default function ContactPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <LegalPage title="Contact & Copyright" intro={<p>One address for everything: {mail}.</p>}>
      <LegalSection title="Support, billing and privacy requests">
        <p>
          Email {mail}. For account deletion or data requests, send them from the email address on your
          account.
        </p>
      </LegalSection>

      <LegalSection title="Reporting copyright infringement">
        <p>
          If a public SkillJacked share page uses your copyrighted work without permission, email{' '}
          {mail} with:
        </p>
        <ul>
          <li>the work you believe is being infringed;</li>
          <li>the link to the SkillJacked page (it starts with skilljacked.com/j/);</li>
          <li>your name and contact details;</li>
          <li>
            a statement that you believe in good faith the use isn&apos;t authorised by you, your agent
            or the law;
          </li>
          <li>
            a statement, under penalty of perjury, that your notice is accurate and that you own the
            rights or are authorised to act for the owner;
          </li>
          <li>your physical or electronic signature.</li>
        </ul>
        <p>
          We&apos;ll promptly remove or disable the page and let the account holder know. If they
          believe the removal was a mistake, they can send a counter-notice to the same address. We
          close the accounts of repeat infringers.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
