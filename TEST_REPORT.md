# SkillJacked - Comprehensive Test Report

**Date:** February 15, 2026  
**Tested by:** DeepAgent  
**Repository:** https://github.com/jayalexandermg/SkillJacked  
**Branch:** version-b

---

## Executive Summary

### 🚨 CRITICAL FINDING: YouTube Transcript Scraping is Severely Limited

The YouTube transcript extraction functionality **does not work reliably** due to YouTube's aggressive bot detection. Out of 20+ videos tested, **only 1 video (Rick Astley - Never Gonna Give You Up)** successfully returned transcripts.

**Impact on Hackathon Demo:** HIGH - The core functionality of scraping YouTube transcripts will fail for most videos in a demo environment.

---

## Test Results Overview

| Test Category | Passed | Failed | Notes |
|--------------|--------|--------|-------|
| URL Parsing | 18/18 | 0 | All URL formats correctly parsed/rejected |
| YouTube Extraction | 1/20+ | 19+ | Only Rick Astley video works |
| Edge Cases | 21/21 | 0 | All edge cases handled gracefully |
| Error Handling | ✅ | - | Proper error messages for all failure modes |

---

## Critical Issues Found & Fixes Applied

### Issue #1: Broken YouTube Transcript Library (FIXED)
- **Problem:** The original `youtube-transcript` package (v1.2.1) returns empty results for all videos
- **Root Cause:** The library is 2+ years old and YouTube has changed their API
- **Fix Applied:** Replaced with `youtube-transcript-plus` package
- **File Changed:** `packages/core/src/extractor/youtube.ts`

### Issue #2: HTML Entities Not Decoded (FIXED)
- **Problem:** Transcript text contained HTML entities like `&#39;` instead of apostrophes
- **Fix Applied:** Added `decodeHtmlEntities()` function to clean transcript text
- **File Changed:** `packages/core/src/extractor/youtube.ts`

### Issue #3: Duration Calculation Wrong (FIXED)
- **Problem:** Video duration showed as `0:04` instead of actual duration
- **Root Cause:** Library uses `offset` property, not `start`
- **Fix Applied:** Updated segment mapping to use `offset` property
- **File Changed:** `packages/core/src/extractor/youtube.ts`

### Issue #4: YouTube Bot Detection (UNRESOLVED - CRITICAL)
- **Problem:** YouTube blocks transcript requests from cloud/data center IPs
- **Status:** This is a fundamental limitation of all YouTube scraping libraries
- **Evidence:** Tested with multiple libraries (youtube-transcript, youtube-transcript-plus, youtubei.js, youtube-transcript-api Python) - all experience same blocking
- **Error:** `RequestBlocked` / `No transcripts are available`

---

## Detailed Test Results

### Phase 1: YouTube Transcript Scraping

#### Videos Tested (with youtube-transcript-plus)

| Video | Result | Notes |
|-------|--------|-------|
| Rick Astley - Never Gonna Give You Up | ✅ Works | 61 segments, 2165 chars |
| 3Blue1Brown - Neural Networks | ❌ Blocked | RequestBlocked |
| Traversy Media - HTML Crash Course | ❌ Blocked | RequestBlocked |
| Simon Sinek - Start with Why | ❌ Blocked | RequestBlocked |
| TED Talk - Do Schools Kill Creativity | ❌ Blocked | RequestBlocked |
| Andrej Karpathy - GPT | ❌ Blocked | RequestBlocked |
| freeCodeCamp Python Tutorial | ❌ Blocked | RequestBlocked |
| Fireship - 100 Seconds videos | ❌ Blocked | RequestBlocked |
| PSY - Gangnam Style | ❌ Blocked | RequestBlocked |
| Queen - Bohemian Rhapsody | ❌ Blocked | RequestBlocked |
| Multiple other educational videos | ❌ Blocked | All blocked |

**Success Rate:** ~5% (1 out of 20+ videos)

### Phase 2: URL Parsing Edge Cases (All Passed ✅)

#### Valid URLs Correctly Parsed:
- Standard watch URL: `https://www.youtube.com/watch?v=xxx`
- Short URL: `https://youtu.be/xxx`
- Embed URL: `https://www.youtube.com/embed/xxx`
- Shorts URL: `https://www.youtube.com/shorts/xxx`
- Mobile URL: `https://m.youtube.com/watch?v=xxx`
- URL with timestamp: `?v=xxx&t=30`
- URL with playlist: `?v=xxx&list=PLxxx`

#### Invalid URLs Correctly Rejected:
- Empty string
- Random text
- Vimeo URLs
- YouTube homepage
- Watch without video ID
- Empty video ID
- Invalid short video IDs
- HTTP (non-HTTPS)
- Malicious lookalike domains
- JavaScript injection attempts
- Path traversal attempts

### Phase 3: Error Handling

All errors are caught and transformed into user-friendly messages:
- ✅ `ExtractionError` for extraction failures
- ✅ `ValidationError` for invalid URLs
- ✅ `TransformError` for AI processing failures
- ✅ Proper error codes for CLI/API responses

---

## Recommendations for Production Readiness

### 🔴 CRITICAL: Before the Hackathon Demo

#### Option 1: Use Pre-loaded Demo Videos (Recommended for Demo)
1. Prepare 3-5 videos with **pre-cached transcripts** stored locally
2. For the demo, use these known-working videos
3. **Working Video:** `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (Rick Astley)

#### Option 2: Implement a Proxy Solution
```typescript
// Example using youtube-transcript-plus with proxy
const transcript = await fetchTranscript(videoId, {
  videoFetch: async ({ url }) => {
    return fetch(`https://your-proxy-server.com/?url=${encodeURIComponent(url)}`);
  }
});
```

#### Option 3: Use YouTube Data API (Official)
- Requires YouTube Data API key
- More reliable but has quota limits
- Transcripts accessible via captions endpoint

### 🟡 Short-Term Fixes (Before Demo)

1. **Add Better Error Messages:**
   ```typescript
   throw new ExtractionError(
     "YouTube is blocking this request. This is common for cloud servers. " +
     "Try a different video or run locally."
   );
   ```

2. **Add a Fallback Demo Mode:**
   - Include demo-transcript.txt as a fallback
   - Allow users to paste transcript directly

3. **Test from Different Network:**
   - Demo might work from a residential IP
   - Consider using a VPN or proxy for the demo

### 🟢 Long-Term Solutions (Post-Hackathon)

1. **Implement Proxy Rotation:**
   - Use residential proxy services (e.g., Brightdata, Oxylabs)
   - Rotate IPs to avoid blocking

2. **Official YouTube API Integration:**
   - Apply for YouTube Data API access
   - Use captions.download endpoint
   - Handle quota limits appropriately

3. **Browser-Based Extraction:**
   - Use Puppeteer/Playwright to render pages
   - Extract transcripts from actual YouTube UI
   - More resource-intensive but more reliable

4. **Alternative Data Sources:**
   - Support Vimeo, Loom, other platforms
   - Allow manual transcript upload
   - Support .srt/.vtt file import

---

## Files Changed

### Modified Files:
1. `packages/core/src/extractor/youtube.ts`
   - Replaced `youtube-transcript` with `youtube-transcript-plus`
   - Added HTML entity decoding
   - Fixed duration calculation
   - Improved error messages

### New Dependencies:
```json
{
  "youtube-transcript-plus": "^latest"
}
```

### Test Files Created:
- `test-extraction.ts` - Core extraction tests
- `test-edge-cases.ts` - Edge case testing suite
- `test-results-extraction.json` - Extraction test results
- `test-results-edge-cases.json` - Edge case test results
- `TEST_REPORT.md` - This report

---

## Appendix: Code Changes

### packages/core/src/extractor/youtube.ts (Updated)

Key changes:
```typescript
// OLD
import { YoutubeTranscript } from 'youtube-transcript';

// NEW
import { fetchTranscript as fetchTranscriptPlus } from 'youtube-transcript-plus';

// Added HTML entity decoder
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&#39;/g, "'")
    // ... more replacements
}

// Fixed segment mapping
transcriptSegments = transcript.map((s: any) => ({
  text: decodeHtmlEntities(s.text || ''),
  start: typeof s.offset === 'number' ? s.offset : (s.start || 0),
  duration: typeof s.duration === 'number' ? s.duration : 0,
}));
```

---

## Conclusion

The SkillJacked codebase has solid architecture and good error handling. The **critical blocker** is YouTube's bot detection which blocks most transcript requests from cloud servers.

**For the hackathon demo tomorrow:**
1. ✅ Use Rick Astley's video (dQw4w9WgXcQ) - it works
2. ✅ Have backup pre-loaded transcripts ready
3. ✅ Consider demoing from a residential network/VPN
4. ⚠️ Be prepared with fallback messaging if extraction fails

The fixes applied improve the reliability of the extraction when it does work, and provide better error messages when it fails.

---

*Report generated: February 15, 2026*
