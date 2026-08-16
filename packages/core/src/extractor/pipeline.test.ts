// AC2 + AC3 (SPEC-R1 §5): pipeline order, fall-through, terminal throw, and
// the absence of minimum-word gating and legacy stages — all without network.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildDefaultStages,
  runTranscriptStages,
  extractYouTube,
  EXTRACTION_FAILED_MESSAGE,
  type TranscriptStage,
} from './youtube';
import { ExtractionError } from '../utils/errors';

let passed = 0;
let failed = 0;

function check(label: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  PASS  ${label}`);
      passed++;
    })
    .catch((e: any) => {
      console.log(`  FAIL  ${label}: ${e?.message ?? e}`);
      failed++;
    });
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function stage(
  name: string,
  method: TranscriptStage['method'],
  behavior: 'succeed' | 'throw' | 'null',
  calls: string[],
  transcript = 'a perfectly fine transcript with enough words to be useful',
): TranscriptStage {
  return {
    name,
    method,
    run: async () => {
      calls.push(name);
      if (behavior === 'throw') throw new Error(`${name} exploded`);
      if (behavior === 'null') return null;
      return { transcript, duration: '1:00' };
    },
  };
}

async function main() {
  await check('stage 1 failure falls through to stage 2', async () => {
    const calls: string[] = [];
    const { method } = await runTranscriptStages([
      stage('native-captions', 'captions', 'throw', calls),
      stage('youtube-transcript-plus', 'transcript-plus', 'succeed', calls),
      stage('supadata', 'supadata', 'succeed', calls),
    ]);
    assert(calls.join(',') === 'native-captions,youtube-transcript-plus', `unexpected call order: ${calls.join(',')}`);
    assert(method === 'transcript-plus', `expected transcript-plus, got ${method}`);
  });

  await check('stages 1–2 failing reaches stage 3 (supadata)', async () => {
    const calls: string[] = [];
    const { method } = await runTranscriptStages([
      stage('native-captions', 'captions', 'throw', calls),
      stage('youtube-transcript-plus', 'transcript-plus', 'null', calls),
      stage('supadata', 'supadata', 'succeed', calls),
    ]);
    assert(calls.join(',') === 'native-captions,youtube-transcript-plus,supadata', `unexpected call order: ${calls.join(',')}`);
    assert(method === 'supadata', `expected supadata, got ${method}`);
  });

  await check('all stages failing throws ExtractionError mentioning manual paste', async () => {
    const calls: string[] = [];
    try {
      await runTranscriptStages([
        stage('native-captions', 'captions', 'throw', calls),
        stage('youtube-transcript-plus', 'transcript-plus', 'null', calls),
        stage('supadata', 'supadata', 'throw', calls),
      ]);
      throw new Error('should have thrown');
    } catch (e: any) {
      assert(e instanceof ExtractionError, `expected ExtractionError, got ${e}`);
      assert(e.message === EXTRACTION_FAILED_MESSAGE, `unexpected terminal message: ${e.message}`);
      assert(/paste the transcript manually/i.test(e.message), 'terminal message must mention the manual-paste option');
    }
  });

  await check('short transcripts flow through (no MIN_TRANSCRIPT_WORDS gate)', async () => {
    const calls: string[] = [];
    const { result } = await runTranscriptStages([
      stage('native-captions', 'captions', 'succeed', calls, 'only five words right here'),
    ]);
    assert(result.transcript === 'only five words right here', 'short transcript was not passed through');
  });

  await check('skipFallbacks stops after stage 1', async () => {
    const calls: string[] = [];
    try {
      await runTranscriptStages(
        [
          stage('native-captions', 'captions', 'throw', calls),
          stage('youtube-transcript-plus', 'transcript-plus', 'succeed', calls),
        ],
        { skipFallbacks: true },
      );
      throw new Error('should have thrown');
    } catch (e) {
      assert(e instanceof ExtractionError, `expected ExtractionError, got ${e}`);
    }
    assert(calls.join(',') === 'native-captions', `fallback ran despite skipFallbacks: ${calls.join(',')}`);
  });

  await check('default pipeline composition: native → transcript-plus (no Supadata without key)', () => {
    const prev = process.env.SUPADATA_API_KEY;
    delete process.env.SUPADATA_API_KEY;
    try {
      const names = buildDefaultStages('dQw4w9WgXcQ').map((s) => s.name);
      assert(
        names.join(',') === 'native-captions,youtube-transcript-plus',
        `unexpected default stages: ${names.join(',')}`,
      );
    } finally {
      if (prev !== undefined) process.env.SUPADATA_API_KEY = prev;
    }
  });

  await check('default pipeline composition: Supadata appended as stage 3 when key set', () => {
    const names = buildDefaultStages('dQw4w9WgXcQ', { supadataApiKey: 'test-key' }).map((s) => s.name);
    assert(
      names.join(',') === 'native-captions,youtube-transcript-plus,supadata',
      `unexpected stages with key: ${names.join(',')}`,
    );
  });

  // --- AC16 (SPEC-R1 §4.H2-RESOLUTION): oEmbed is best-effort, never a gate ---

  await check('oEmbed failure does not block extraction; title degrades to URL-derived (AC16)', async () => {
    const calls: string[] = [];
    const failingMetadata = async (_url: string): Promise<{ title: string }> => {
      calls.push('oembed');
      throw new Error('oEmbed returned 403');
    };
    const content = await extractYouTube(
      'dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      undefined,
      [stage('native-captions', 'captions', 'succeed', calls)],
      failingMetadata,
    );
    assert(calls.join(',') === 'oembed,native-captions', `stages did not run after metadata failure: ${calls.join(',')}`);
    assert(content.title === 'YouTube video dQw4w9WgXcQ', `expected URL-derived title, got ${content.title}`);
    assert(content.transcript.length > 0, 'transcript missing');
  });

  await check('oEmbed success still supplies the real title', async () => {
    const calls: string[] = [];
    const okMetadata = async (_url: string) => ({ title: 'A Real Video' });
    const content = await extractYouTube(
      'dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      undefined,
      [stage('native-captions', 'captions', 'succeed', calls)],
      okMetadata,
    );
    assert(content.title === 'A Real Video', `got ${content.title}`);
  });

  await check('no legacy stage or MIN gate identifiers remain in youtube.ts (grep-equivalent)', () => {
    const source = readFileSync(
      fileURLToPath(new URL('./youtube.ts', import.meta.url)),
      'utf-8',
    );
    for (const banned of [
      'extractWithYtDlp',
      'transcribeWithWhisper',
      'extractMetadataFallback',
      'MIN_TRANSCRIPT_WORDS',
      'youtube-caption-extractor',
      // AC16: the misattributing metadata hard-fail is gone from this path.
      'Check that the URL is valid',
    ]) {
      assert(!source.includes(banned), `youtube.ts still references ${banned}`);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
