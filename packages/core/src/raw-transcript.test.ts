// AC13 + AC15 (SPEC-R1 §5, CG-P1/§4.H1): the raw-transcript path never lets
// more than min(50k words, 500k UTF-16 code units) reach the segmenter
// (truncation on whichever bound binds first), plus AC7 title semantics.
import { buildRawContent } from './index';
import { capTranscript, MAX_TRANSCRIPT_WORDS, MAX_TRANSCRIPT_UNITS } from './extractor/youtube';
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

check('capTranscript is a no-op at exactly 50k words', () => {
  const exact = Array.from({ length: MAX_TRANSCRIPT_WORDS }, () => 'w').join(' ');
  assert(capTranscript(exact) === exact, 'exact-cap transcript was altered');
});

// --- AC15: the character bound (§4.H1) ---

check('whitespace-free ~640k-unit input is truncated to the 500k-unit bound (AC15)', () => {
  const oversized = 'x'.repeat(640_000); // 1 "word", would evade a word-only cap
  const content = buildRawContent(URL_OK, oversized);
  assert(
    content.transcript.length === MAX_TRANSCRIPT_UNITS,
    `expected ${MAX_TRANSCRIPT_UNITS} units, got ${content.transcript.length}`,
  );
  assert(content.transcript === 'x'.repeat(MAX_TRANSCRIPT_UNITS), 'wrong prefix kept');
});

check('CJK input (no whitespace words) is truncated to the 500k-unit bound (AC15)', () => {
  const oversized = '\u65e5\u672c\u8a9e\u306e\u6587\u5b57\u5217'.repeat(90_000); // 630k units, no spaces
  const content = buildRawContent(URL_OK, oversized);
  assert(
    content.transcript.length === MAX_TRANSCRIPT_UNITS,
    `expected ${MAX_TRANSCRIPT_UNITS} units, got ${content.transcript.length}`,
  );
});

check('character-bound slice never splits a surrogate pair', () => {
  // Astral chars are 2 units each; an odd-position cut would strand a high
  // surrogate at the boundary. 251k astral chars = 502k units.
  const oversized = '\u{1F600}'.repeat(251_000);
  const capped = capTranscript(oversized);
  assert(capped.length <= MAX_TRANSCRIPT_UNITS, 'exceeded unit bound');
  const last = capped.charCodeAt(capped.length - 1);
  assert(!(last >= 0xd800 && last <= 0xdbff), 'ended on a lone high surrogate');
});

check('word bound still binds first for normal spaced text (AC13 unchanged)', () => {
  const oversized = Array.from({ length: MAX_TRANSCRIPT_WORDS + 100 }, () => 'hi').join(' ');
  const capped = capTranscript(oversized);
  assert(capped.split(/\s+/).length === MAX_TRANSCRIPT_WORDS, 'word bound did not bind');
});

check('leading whitespace cannot shift the word-cap cut point (CR-S8)', () => {
  const words = Array.from({ length: MAX_TRANSCRIPT_WORDS }, (_, i) => `w${i}`).join(' ');
  const capped = capTranscript(`   ${words}`);
  const split = capped.split(/\s+/).filter(Boolean);
  assert(split.length === MAX_TRANSCRIPT_WORDS, `expected full 50k words kept, got ${split.length}`);
  assert(split[split.length - 1] === `w${MAX_TRANSCRIPT_WORDS - 1}`, 'last word was wrongly dropped');
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
