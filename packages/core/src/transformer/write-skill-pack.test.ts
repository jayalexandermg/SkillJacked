import { buildIndex } from './write-skill-pack';
import { SkillPlan, StructuredSkill } from './types';

const plan: SkillPlan = {
  video: { title: 'Test Video', url: 'https://youtu.be/abc' },
  content_type: 'interview',
  segmentation_policy: { max_segments: 10, min_lines: 5, allow_overlap: false },
  segments: [
    { id: 's1', proposed_name: 'Diagnose Content', proposed_slug: 'diagnose-content-tiers', description: '', start_line: 0, end_line: 10, evidence_quotes: [], priority: 1 },
    { id: 's2', proposed_name: 'Same Name', proposed_slug: 'same-name', description: '', start_line: 11, end_line: 20, evidence_quotes: [], priority: 1 },
    { id: 's3', proposed_name: 'Skipped Topic', proposed_slug: 'skipped-topic', description: '', start_line: 21, end_line: 30, evidence_quotes: [], priority: 3 },
  ],
};

const skill = (name: string, segmentSlug: string): StructuredSkill => ({
  name, segmentSlug, sourceTitle: 'Test Video', sourceUrl: 'https://youtu.be/abc', generatedAt: '', content: '',
});

const index = buildIndex(plan, [skill('content-tier-diagnostic', 'diagnose-content-tiers'), skill('same-name', 'same-name')]);
const lineFor = (slug: string) => index.split('\n').find((l) => l.includes(`(\`${slug}\`)`)) ?? '';

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean) {
  if (ok) { passed++; console.log(`PASS: ${label}`); } else { failed++; console.log(`FAIL: ${label}`); }
}

check('renamed skill is marked generated', lineFor('diagnose-content-tiers').includes('— generated'));
check('renamed skill links to its actual directory', lineFor('diagnose-content-tiers').includes('](./content-tier-diagnostic/SKILL.md)'));
check('unrenamed skill links to its directory', lineFor('same-name').includes('](./same-name/SKILL.md)'));
check('segment with no skill is marked planned', lineFor('skipped-topic').includes('— planned') && !lineFor('skipped-topic').includes('SKILL.md'));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
