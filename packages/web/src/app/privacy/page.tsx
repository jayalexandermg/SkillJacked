import type { Metadata } from 'next';
import LegalPage, { LegalSection } from '@/components/legal-page';
import { CONTACT_EMAIL, MINIMUM_AGE, OPERATOR } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy — SkillJacked',
  description: 'What SkillJacked collects, why, and who it is shared with.',
};

// Every claim here was checked against the code. When data handling changes
// (a new provider, analytics, stored transcripts), update this page first.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what {OPERATOR} (&ldquo;we&rdquo;) collects when you use SkillJacked,
          why we collect it, and who helps us process it. We don&apos;t sell your personal information,
          and we don&apos;t use advertising trackers.
        </p>
      }
    >
      <LegalSection title="What we collect">
        <ul>
          <li>
            <strong>Account details.</strong> When you sign up, our sign-in provider (Clerk) collects
            your email address, plus your name and profile picture if you sign in with Google. We keep
            your email address and an account ID in our database.
          </li>
          <li>
            <strong>Skills you save.</strong> Their content (including any edits and the original
            version), the title and link of the source video, and whether you&apos;ve published a share
            link.
          </li>
          <li>
            <strong>Usage.</strong> How many videos you&apos;ve used this month, and your plan.
          </li>
          <li>
            <strong>Billing.</strong> Payments are handled by Stripe. We never see or store your card
            number. We keep your plan and a Stripe customer ID.
          </li>
          <li>
            <strong>Videos you submit.</strong> We fetch the video&apos;s title and transcript and send
            them to our AI provider to generate skills. We don&apos;t store transcripts.
          </li>
          <li>
            <strong>Technical data.</strong> Your IP address is used briefly, in memory, to prevent
            abuse, and isn&apos;t saved by our app. Our hosting provider keeps standard request logs,
            which include IP addresses and the video links you submit.
          </li>
          <li>
            <strong>Your browser.</strong> Your latest results are kept in your browser&apos;s session
            storage, which clears when you close the tab. Our sign-in provider uses cookies to keep you
            signed in. We don&apos;t use analytics or advertising cookies.
          </li>
        </ul>
        <p>
          The skilljacked command-line tool runs on your own computer with your own Anthropic key. It
          sends nothing to us.
        </p>
      </LegalSection>

      <LegalSection title="Why we use it">
        <p>
          To provide the Service: sign you in, generate and store your skills, enforce plan limits,
          take payments, prevent abuse, and answer your messages. For users in the EU and UK, our legal
          bases are the performance of our contract with you and our legitimate interest in running and
          securing the Service.
        </p>
      </LegalSection>

      <LegalSection title="Who processes it for us">
        <p>These providers handle data only to run SkillJacked:</p>
        <ul>
          <li><strong>Clerk</strong>: sign-in and accounts</li>
          <li><strong>Supabase</strong>: our database</li>
          <li><strong>Stripe</strong>: payments and subscriptions</li>
          <li><strong>Anthropic</strong>: the AI that generates skills from transcripts</li>
          <li><strong>Supadata</strong>: fetching video transcripts</li>
          <li><strong>Vercel</strong>: hosting</li>
        </ul>
        <p>
          These services are based in, or process data in, the United States. We may also disclose
          information if the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="Public share links">
        <p>
          Saved skills are private until you publish a share link. A published page shows the source
          video&apos;s title and the shared skills. It never shows your name, email or account.
          Unpublishing takes effect immediately.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep your account data and saved skills while your account exists. If you ask us to delete
          your account, we&apos;ll delete it from our database within 30 days. Copies may remain for a
          limited time in backups and logs. Stripe keeps billing records for as long as the law
          requires.
        </p>
      </LegalSection>

      <LegalSection title="Your choices and rights">
        <p>
          You can ask us to access, correct, export or delete your personal information by emailing{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Depending on where you live, you may
          have further rights, including the right to complain to a data-protection authority.
          California residents: we don&apos;t sell or share personal information as defined by
          California law.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          SkillJacked isn&apos;t for anyone under {MINIMUM_AGE}, and we don&apos;t knowingly collect
          their information. If you believe a child has signed up, email us and we&apos;ll delete the
          account.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If this policy changes, we&apos;ll update the date at the top, and email you about material
          changes.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
