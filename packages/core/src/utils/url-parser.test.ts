import { parseUrl } from './url-parser';

const cases: Array<{ input: string; expectedId: string; label: string }> = [
  { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ', label: 'standard watch' },
  { input: 'https://youtu.be/dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ', label: 'youtu.be short' },
  { input: 'https://www.youtube.com/live/IG9IWQVmxqk?si=9Rbe4RfgRKstpdF9', expectedId: 'IG9IWQVmxqk', label: 'live URL with si param' },
  { input: 'https://www.youtube.com/shorts/YQw3rEZKDA4?si=abc123', expectedId: 'YQw3rEZKDA4', label: 'shorts with si param' },
  { input: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ', label: 'embed' },
  { input: 'https://www.youtube.com/watch?v=BEIulrjHzMI&list=PLxyz&t=120', expectedId: 'BEIulrjHzMI', label: 'watch with extra params' },
  { input: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ', label: 'mobile youtube' },
  { input: 'https://youtu.be/BEIulrjHzMI?si=JiZ_XdfyLiw9nCGP', expectedId: 'BEIulrjHzMI', label: 'youtu.be with si param' },
  { input: 'https://youtube.com/shorts/YQw3rEZKDA4?si=6-9jC-WI68ZzF02Q', expectedId: 'YQw3rEZKDA4', label: 'shorts without www' },
];

const failCases: Array<{ input: string; label: string }> = [
  { input: '', label: 'empty string' },
  { input: 'not a url', label: 'not a URL' },
  { input: 'https://evil.com/watch?v=dQw4w9WgXcQ', label: 'wrong host' },
  { input: 'http://www.youtube.com/watch?v=dQw4w9WgXcQ', label: 'HTTP not HTTPS' },
  { input: 'https://www.youtube.com/channel/UCxyz', label: 'channel URL' },
  { input: 'https://www.youtube.com/watch?v=short', label: 'invalid video ID length' },
];

let passed = 0;
let failed = 0;

for (const tc of cases) {
  try {
    const result = parseUrl(tc.input);
    if (result.videoId === tc.expectedId) {
      console.log(`  PASS  ${tc.label}`);
      passed++;
    } else {
      console.log(`  FAIL  ${tc.label}: expected ${tc.expectedId}, got ${result.videoId}`);
      failed++;
    }
  } catch (e: any) {
    console.log(`  FAIL  ${tc.label}: threw ${e.message}`);
    failed++;
  }
}

for (const tc of failCases) {
  try {
    parseUrl(tc.input);
    console.log(`  FAIL  ${tc.label}: should have thrown`);
    failed++;
  } catch {
    console.log(`  PASS  ${tc.label} (rejected)`);
    passed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
