import type { Metadata } from 'next';
import LegalPage, { LegalSection } from '@/components/legal-page';
import { CONTACT_EMAIL, GOVERNING_STATE, MINIMUM_AGE, OPERATOR } from '@/lib/legal';
import { FREE_EXTRACTION_LIMIT, PRO_EXTRACTION_LIMIT } from '@/lib/usage-tracker';

export const metadata: Metadata = {
  title: 'Terms of Service — SkillJacked',
  description: 'The terms for using SkillJacked.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms are an agreement between you and {OPERATOR} (&ldquo;SkillJacked&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;). By using skilljacked.com or the skilljacked command-line
          tool (the &ldquo;Service&rdquo;), you agree to them. If you don&apos;t agree, don&apos;t use
          the Service.
        </p>
      }
    >
      <LegalSection title="1. Who can use SkillJacked">
        <p>
          You must be at least {MINIMUM_AGE} years old. To buy a paid plan you must be old enough to
          enter a contract where you live, or have a parent or guardian&apos;s permission. You&apos;re
          responsible for your account and for keeping your sign-in secure.
        </p>
      </LegalSection>

      <LegalSection title="2. What the Service does">
        <p>
          You submit a link to a YouTube video. We fetch its transcript and use AI to turn what the
          video teaches into skill files for AI coding tools. Skills are generated automatically and can
          be incomplete or wrong. Review a skill before you rely on it or let an AI agent act on it.
        </p>
      </LegalSection>

      <LegalSection title="3. Your responsibilities for the videos you submit">
        <ul>
          <li>Only submit videos you&apos;re allowed to use this way.</li>
          <li>
            You&apos;re responsible for how you use the skills you generate, including respecting the
            rights of the people who made the source videos.
          </li>
          <li>
            A skill is derived from its source video. Its creator hasn&apos;t endorsed it, and you
            mustn&apos;t present it as if they had.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Who owns what">
        <p>
          As between you and us, you own the skills you generate, to the extent anyone can own them. You
          give us permission to store, process, display and transmit them as needed to run the
          Service, including showing them on a share page you choose to publish. We own the Service
          itself: the site, software, and the SkillJacked name and branding.
        </p>
      </LegalSection>

      <LegalSection title="5. Public share links">
        <p>
          Saved skills are private by default. If you publish a share link, anyone with the link can
          see that extraction&apos;s shared page. You can unpublish it at any time from My Skills. We may
          remove a public page that breaks these terms or that receives a valid copyright complaint (see
          our <a href="/contact">Contact &amp; Copyright</a> page).
        </p>
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>Don&apos;t use the Service to:</p>
        <ul>
          <li>break the law or infringe anyone&apos;s rights;</li>
          <li>get around usage limits, rate limits or security;</li>
          <li>disrupt the Service, or access it with automated tools we haven&apos;t provided;</li>
          <li>resell or redistribute the Service itself.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Plans, billing and cancellation">
        <ul>
          <li>
            <strong>Free</strong> includes {FREE_EXTRACTION_LIMIT} videos a month.{' '}
            <strong>Pro</strong> includes {PRO_EXTRACTION_LIMIT} videos a month, plus the extra
            features listed on the <a href="/pricing">pricing page</a>. Each video produces up to 10
            skills.
          </li>
          <li>
            Allowances reset each calendar month, and unused videos don&apos;t roll over. A video that
            produces no skills doesn&apos;t count.
          </li>
          <li>
            Pro is billed monthly through Stripe and renews automatically until you cancel. You can
            cancel any time from Settings. Pro stays active until the end of the period you&apos;ve
            paid for.
          </li>
          <li>
            Refunds are covered by our <a href="/refunds">Refund Policy</a>. We&apos;ll give notice
            before any price change takes effect for you.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Ending your use">
        <p>
          You can stop using the Service at any time, and ask us to delete your account by emailing{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We may suspend or close an account
          that breaks these terms.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimers">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the
          law allows, we make no warranties, express or implied. That includes warranties of accuracy,
          fitness for a particular purpose, and non-infringement. We don&apos;t guarantee the Service
          will be uninterrupted, or that any particular video can be processed.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          To the extent the law allows, we&apos;re not liable for indirect, incidental, special,
          consequential or punitive damages, or for lost profits or data. Our total liability for any
          claim relating to the Service is limited to the greater of what you paid us in the 12 months
          before the claim and US$50.
        </p>
      </LegalSection>

      <LegalSection title="11. Indemnity">
        <p>
          You agree to cover our reasonable costs from claims by others that arise from the videos you
          submit, how you use the skills you generate, or your breach of these terms.
        </p>
      </LegalSection>

      <LegalSection title="12. Governing law">
        <p>
          These terms are governed by the laws of the State of {GOVERNING_STATE} and the United States,
          without regard to conflict-of-law rules. Disputes will be resolved in the state or federal
          courts located in {GOVERNING_STATE}, unless the law where you live requires otherwise.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes and transfer">
        <p>
          We may update these terms. The date at the top shows the latest version, and we&apos;ll email
          you about material changes. By continuing to use the Service after a change, you accept the
          updated terms. We may transfer these terms, for example to a company formed to operate
          SkillJacked. Your rights under them continue unchanged.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
