import { extract, parseUrl, format } from './packages/core/src/index';

async function testE2E() {
  console.log('=== End-to-End Extraction Test ===\n');
  
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  
  console.log('Step 1: URL Parsing...');
  try {
    const parsed = parseUrl(url);
    console.log(`  ✅ Parsed URL: videoId=${parsed.videoId}, platform=${parsed.platform}`);
  } catch (e: any) {
    console.log(`  ❌ URL parsing failed: ${e.message}`);
    return;
  }
  
  console.log('\nStep 2: Transcript Extraction...');
  try {
    const raw = await extract(url);
    console.log(`  ✅ Extracted content:`);
    console.log(`     Title: ${raw.title}`);
    console.log(`     Duration: ${raw.duration}`);
    console.log(`     Transcript length: ${raw.transcript.length} chars`);
    console.log(`     First 200 chars: ${raw.transcript.substring(0, 200)}...`);
    
    // Save raw content for later use
    const fs = await import('fs');
    fs.writeFileSync('/home/ubuntu/github_repos/SkillJacked/test-raw-content.json', JSON.stringify(raw, null, 2));
    console.log(`     Saved raw content to test-raw-content.json`);
    
  } catch (e: any) {
    console.log(`  ❌ Extraction failed: ${e.message}`);
    return;
  }
  
  console.log('\nStep 3: Transform (requires ANTHROPIC_API_KEY)...');
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('  ⚠️  ANTHROPIC_API_KEY not set - skipping transform test');
    console.log('  Set the key and run again to test full pipeline');
  } else {
    console.log('  API key found, proceeding with transform...');
  }
  
  console.log('\n=== Test Complete ===');
}

testE2E().catch(console.error);
