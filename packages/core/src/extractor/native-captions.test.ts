// AC1 (SPEC-R1 §5): fixture-based tests for the native caption fetcher.
// No live-YouTube dependency — all HTTP is served from saved fixtures via an
// injected fetch implementation.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  fetchNativeCaptions,
  parsePlayerResponse,
  parseCaptionXml,
  selectCaptionTrack,
  type FetchImpl,
} from './native-captions';
import { ExtractionError } from '../utils/errors';

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../test-fixtures/${name}`, import.meta.url)), 'utf-8');

const WATCH_WITH_CAPTIONS = fixture('watch-with-captions.html');
const WATCH_NO_CAPTIONS = fixture('watch-no-captions.html');
const CAPTIONS_XML = fixture('captions.xml');

function fakeFetch(routes: Array<{ match: (url: string) => boolean; body: string }>): FetchImpl {
  return async (url: string) => {
    const route = routes.find((r) => r.match(url));
    if (!route) {
      return { ok: false, status: 404, text: async () => 'not found' };
    }
    return { ok: true, status: 200, text: async () => route.body };
  };
}

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

async function main() {
  await check('fixture with captionTracks yields a non-empty transcript', async () => {
    const result = await fetchNativeCaptions('dQw4w9WgXcQ', {
      fetchImpl: fakeFetch([
        { match: (u) => u.includes('/watch?v='), body: WATCH_WITH_CAPTIONS },
        { match: (u) => u.includes('timedtext'), body: CAPTIONS_XML },
      ]),
    });
    assert(result.transcript.length > 0, 'transcript is empty');
    assert(
      result.transcript.includes('define the trigger conditions & the expected inputs'),
      'entity decoding failed for &amp;',
    );
    assert(result.transcript.includes("we're building agent skills"), 'entity decoding failed for &#39;');
    assert(result.transcript.includes('<examples>'), 'entity decoding failed for &lt;/&gt;');
    assert(result.transcript.split('\n').length === 5, `expected 5 lines, got ${result.transcript.split('\n').length}`);
    assert(result.duration === '3:32', `expected duration 3:32, got ${result.duration}`);
  });

  await check('manual English track preferred over ASR', async () => {
    let fetchedTrackUrl = '';
    await fetchNativeCaptions('dQw4w9WgXcQ', {
      fetchImpl: fakeFetch([
        { match: (u) => u.includes('/watch?v='), body: WATCH_WITH_CAPTIONS },
        {
          match: (u) => {
            if (u.includes('timedtext')) {
              fetchedTrackUrl = u;
              return true;
            }
            return false;
          },
          body: CAPTIONS_XML,
        },
      ]),
    });
    assert(!fetchedTrackUrl.includes('kind=asr'), `ASR track chosen over manual: ${fetchedTrackUrl}`);
    assert(fetchedTrackUrl.includes('lang=en'), `non-English track chosen: ${fetchedTrackUrl}`);
  });

  await check('fixture WITHOUT captionTracks throws (no dummy content)', async () => {
    try {
      await fetchNativeCaptions('BEIulrjHzMI', {
        fetchImpl: fakeFetch([{ match: (u) => u.includes('/watch?v='), body: WATCH_NO_CAPTIONS }]),
      });
      throw new Error('should have thrown');
    } catch (e) {
      assert(e instanceof ExtractionError, `expected ExtractionError, got ${e}`);
    }
  });

  await check('HTML without ytInitialPlayerResponse throws', () => {
    try {
      parsePlayerResponse('<html><body>consent wall</body></html>');
      throw new Error('should have thrown');
    } catch (e) {
      assert(e instanceof ExtractionError, `expected ExtractionError, got ${e}`);
    }
  });

  await check('parsePlayerResponse survives braces inside strings', () => {
    const html = 'var ytInitialPlayerResponse = {"a":"open { brace } inside","b":{"c":1}};rest';
    const parsed = parsePlayerResponse(html);
    assert(parsed.a === 'open { brace } inside', 'string with braces mangled');
    assert(parsed.b.c === 1, 'nested object mangled');
  });

  await check('selectCaptionTrack ordering: en-manual > en-asr > any-manual > any', () => {
    const enManual = { baseUrl: 'u1', languageCode: 'en' };
    const enAsr = { baseUrl: 'u2', languageCode: 'en', kind: 'asr' };
    const frManual = { baseUrl: 'u3', languageCode: 'fr' };
    const frAsr = { baseUrl: 'u4', languageCode: 'fr', kind: 'asr' };
    assert(selectCaptionTrack([frAsr, enAsr, frManual, enManual]) === enManual, 'en-manual not chosen');
    assert(selectCaptionTrack([frAsr, frManual, enAsr]) === enAsr, 'en-asr not chosen');
    assert(selectCaptionTrack([frAsr, frManual]) === frManual, 'any-manual not chosen');
    assert(selectCaptionTrack([frAsr]) === frAsr, 'last-resort track not chosen');
  });

  await check('parseCaptionXml throws on cue-less XML', () => {
    try {
      parseCaptionXml('<?xml version="1.0"?><transcript></transcript>');
      throw new Error('should have thrown');
    } catch (e) {
      assert(e instanceof ExtractionError, `expected ExtractionError, got ${e}`);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
