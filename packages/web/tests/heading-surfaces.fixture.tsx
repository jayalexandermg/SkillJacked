import { createRoot } from 'react-dom/client';
import JackResults from '../src/components/jack-results';
import LibraryDetail, { type LibraryGroup } from '../src/components/library-detail';
import SkillPreview from '../src/components/skill-preview';
import type { JackView } from '../src/lib/jack-view';
import { content } from './heading-fixture.mjs';

const name = 'detect-and-avoid-zombie-ui';
const description = 'Identify and fix interface controls that do not work.';
const sourceTitle = 'Detect and Avoid Zombie UI · local fixture';
const sourceUrl = 'https://example.invalid/local-fixture';
const createdAt = '2026-01-01T00:00:00.000Z';
const jack: JackView = {
  id: 'fixture-jack',
  shareId: 'fixture-share',
  sourceTitle,
  sourceUrl,
  sourceChannel: 'SkillJacked fixture',
  videoId: null,
  createdAt,
  skills: [
    { id: 'full', position: 0, name, description, content, tier: 'full', saved: false },
    { id: 'preview', position: 1, name: 'preview-placeholder', description: 'Description only', tier: 'preview', saved: false },
    { id: 'locked', position: 4, name: 'locked-placeholder', tier: 'locked', saved: false },
  ],
};
const group: LibraryGroup = {
  key: 'fixture-group',
  shareId: null,
  isPublic: false,
  sourceTitle,
  sourceUrl,
  sourceChannel: 'SkillJacked fixture',
  videoId: null,
  skills: [{
    id: 'full', name, slug: name, description, content, source_title: sourceTitle,
    source_url: sourceUrl, format: 'claude-skill', created_at: createdAt,
  }],
};
const noMutation = () => { throw new Error('Mutations are disabled in the local fixture.'); };
const surface = new URLSearchParams(location.search).get('surface');

createRoot(document.getElementById('root')!).render(
  <main style={{ padding: 32, maxWidth: 1152, margin: 'auto' }}>
    {surface === 'library' ? (
      <LibraryDetail group={group} openId="full" isPro={false} onOpen={noMutation}
        onClose={() => undefined} onEdit={noMutation} onDelete={async () => noMutation()} />
    ) : surface === 'share' ? (
      <SkillPreview content={content} name={name} description={description} sourceTitle={sourceTitle}
        sourceUrl={sourceUrl} formatLabel="Claude SKILL.md" filename={`${name}/SKILL.md`} />
    ) : (
      <JackResults jack={jack} signedIn={false} onSave={async () => noMutation()}
        onSignUpToSave={noMutation} onReset={noMutation} />
    )}
  </main>,
);
