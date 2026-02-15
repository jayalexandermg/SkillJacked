/**
 * SkillJacked - Edge Case Testing Suite
 * Phase 2: Edge Cases
 */

import { extract, parseUrl } from './packages/core/src/index';

interface TestResult {
  testName: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function recordResult(testName: string, input: string, expected: string, actual: string, passed: boolean, error?: string) {
  results.push({ testName, input, expected, actual, passed, error });
  console.log(`${passed ? '✅' : '❌'} ${testName}`);
  if (!passed) {
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual: ${actual}`);
    if (error) console.log(`   Error: ${error}`);
  }
}

async function testUrlParsing() {
  console.log('\n=== URL PARSING EDGE CASES ===\n');
  
  // Valid URLs that should work
  const validUrls = [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', desc: 'Standard watch URL' },
    { url: 'https://youtu.be/dQw4w9WgXcQ', desc: 'Short youtu.be URL' },
    { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', desc: 'Embed URL' },
    { url: 'https://www.youtube.com/shorts/kYfNvmF0Bqw', desc: 'Shorts URL' },
    { url: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ', desc: 'Mobile URL' },
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30', desc: 'URL with timestamp' },
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest', desc: 'URL with playlist' },
  ];
  
  for (const { url, desc } of validUrls) {
    try {
      const parsed = parseUrl(url);
      recordResult(`Parse ${desc}`, url, 'Valid parsed result', `videoId=${parsed.videoId}`, true);
    } catch (err: any) {
      recordResult(`Parse ${desc}`, url, 'Valid parsed result', 'Error', false, err.message);
    }
  }
  
  // Invalid URLs that should fail
  console.log('\n--- Invalid URLs (should fail gracefully) ---\n');
  
  const invalidUrls = [
    { url: '', desc: 'Empty string' },
    { url: 'not a url', desc: 'Random text' },
    { url: 'https://vimeo.com/12345', desc: 'Vimeo URL' },
    { url: 'https://www.youtube.com/', desc: 'YouTube homepage' },
    { url: 'https://www.youtube.com/watch', desc: 'Watch without video ID' },
    { url: 'https://www.youtube.com/watch?v=', desc: 'Empty video ID' },
    { url: 'https://www.youtube.com/watch?v=abc', desc: 'Short video ID (invalid)' },
    { url: 'http://www.youtube.com/watch?v=dQw4w9WgXcQ', desc: 'HTTP instead of HTTPS' },
    { url: 'https://youtube.com.malicious.com/watch?v=dQw4w9WgXcQ', desc: 'Malicious lookalike domain' },
    { url: 'javascript:alert(1)', desc: 'JavaScript injection' },
    { url: 'https://www.youtube.com/watch?v=../../etc/passwd', desc: 'Path traversal attempt' },
  ];
  
  for (const { url, desc } of invalidUrls) {
    try {
      const parsed = parseUrl(url);
      recordResult(`Reject ${desc}`, url, 'Should throw ValidationError', `Unexpectedly passed: ${parsed.videoId}`, false);
    } catch (err: any) {
      recordResult(`Reject ${desc}`, url, 'ValidationError', 'Caught error', true);
    }
  }
}

async function testExtraction() {
  console.log('\n=== EXTRACTION EDGE CASES ===\n');
  
  // Note: Due to YouTube blocking, many of these will fail with "RequestBlocked"
  // We test to document the behavior
  
  const testCases = [
    { 
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
      desc: 'Working video (Rick Astley)',
      shouldWork: true 
    },
    { 
      url: 'https://www.youtube.com/watch?v=INVALID12345', 
      desc: 'Non-existent video ID',
      shouldWork: false 
    },
    { 
      url: 'https://www.youtube.com/watch?v=UB1O30fR-EE', 
      desc: 'Blocked video (Traversy Media)',
      shouldWork: false 
    },
  ];
  
  for (const { url, desc, shouldWork } of testCases) {
    try {
      const content = await extract(url);
      if (shouldWork) {
        recordResult(
          `Extract ${desc}`, 
          url, 
          'Successful extraction', 
          `Got ${content.transcript.length} chars`, 
          true
        );
      } else {
        recordResult(
          `Extract ${desc}`, 
          url, 
          'Should fail', 
          'Unexpectedly succeeded', 
          false
        );
      }
    } catch (err: any) {
      if (shouldWork) {
        recordResult(
          `Extract ${desc}`, 
          url, 
          'Successful extraction', 
          'Failed', 
          false, 
          err.message
        );
      } else {
        recordResult(
          `Extract ${desc}`, 
          url, 
          'ExtractionError', 
          'Caught error as expected', 
          true
        );
      }
    }
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       SkillJacked - Edge Case Testing Suite                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  await testUrlParsing();
  await testExtraction();
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n=== FAILED TESTS ===');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`\n❌ ${r.testName}`);
      console.log(`   Input: ${r.input}`);
      console.log(`   Expected: ${r.expected}`);
      console.log(`   Actual: ${r.actual}`);
      if (r.error) console.log(`   Error: ${r.error}`);
    }
  }
  
  // Save results
  const fs = await import('fs');
  fs.writeFileSync('/home/ubuntu/github_repos/SkillJacked/test-results-edge-cases.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { total: results.length, passed, failed },
    results
  }, null, 2));
  console.log('\nResults saved to: test-results-edge-cases.json');
}

main().catch(console.error);
