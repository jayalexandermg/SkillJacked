// AC13 (SPEC-R1 §5, CG-P1): the raw-transcript path never lets more than
// 50k words reach the segmenter (truncation), plus AC7 title semantics.
import { buildRawContent } from './index';
import { capTranscriptWords, MAX_TRANSCRIPT_WORDS } from './extractor/youtube';
import { ValidationError } from './utils/errors';

let passed = 0;
let failed = 0;

function check(label: string, fn: () => void): void {
  try {
    fn();
    console.log(`  PASS  ${label}`);
    passed++;
  } catch (e: any) {
    console.log(`  FAIL  ${label}: ${e?.message ?? e}`);
    failed++;
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const URL_OK = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

check('rawTranscript above 50k words is truncated to exactly 50k', () => {
  const oversized = Array.from({ length: MAX_TRANSCRIPT_WORDS + 5_000 }, (_, i) => `w${i}`).join(' ');
  const content = buildRawContent(URL_OK, oversized);
  const words = content.transcript.split(/\s+/);
  assert(words.length === MAX_TRANSCRIPT_WORDS, `expected ${MAX_TRANSCRIPT_WORDS} words, got ${words.length}`);
  assert(words[0] === 'w0' && words[words.length - 1] === `w${MAX_TRANSCRIPT_WORDS - 1}`, 'truncation kept wrong words');
});

check('rawTranscript at/below the cap passes through unchanged', () => {
  const small = 'a short pasted transcript with a handful of words';
  const content = buildRawContent(URL_OK, `  ${small}  `);
  assert(content.transcript === small, 'transcript was altered');
});

check('capTranscriptWords is a no-op at exactly 50k words', () => {
  const exact = Array.from({ length: MAX_TRANSCRIPT_WORDS }, () => 'w').join(' ');
  assert(capTranscriptWords(exact) === exact, 'exact-cap transcript was altered');
});

check('provided title is used', () => {
  const content = buildRawContent(URL_OK, 'some transcript', 'A Real Video Title');
  assert(content.title === 'A Real Video Title', `got ${content.title}`);
});

check('missing title degrades to a URL-derived title (AC7)', () => {
  const content = buildRawContent(URL_OK, 'some transcript');
  assert(content.title === 'YouTube video dQw4w9WgXcQ', `got ${content.title}`);
});

check('blank title degrades to a URL-derived title', () => {
  const content = buildRawContent(URL_OK, 'some transcript', '   ');
  assert(content.title === 'YouTube video dQw4w9WgXcQ', `got ${content.title}`);
});

check('sourceUrl carries the provided url; method is raw', () => {
  const content = buildRawContent(URL_OK, 'some transcript');
  assert(content.sourceUrl === URL_OK, `got ${content.sourceUrl}`);
  assert(content.transcriptMethod === 'raw', `got ${content.transcriptMethod}`);
  assert(content.platform === 'youtube', `got ${content.platform}`);
});

check('invalid url still rejects with ValidationError on the raw path', () => {
  try {
    buildRawContent('https://evil.com/watch?v=dQw4w9WgXcQ', 'some transcript');
    throw new Error('should have thrown');
  } catch (e) {
    assert(e instanceof ValidationError, `expected ValidationError, got ${e}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
