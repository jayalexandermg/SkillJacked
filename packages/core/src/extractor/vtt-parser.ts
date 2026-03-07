/**
 * Parse WebVTT subtitle content into plain text.
 * Strips headers, timestamps, HTML tags, and deduplicates consecutive lines.
 */
export function parseVtt(vttContent: string): string {
  const lines = vttContent.split('\n');
  const textLines: string[] = [];
  let prevLine = '';

  for (const raw of lines) {
    const line = raw.trim();

    // Skip VTT header, metadata, and empty lines
    if (
      line === '' ||
      line === 'WEBVTT' ||
      line.startsWith('Kind:') ||
      line.startsWith('Language:') ||
      line.startsWith('NOTE')
    ) continue;

    // Skip timestamp lines (e.g. 00:00:01.234 --> 00:00:05.678)
    if (/^\d{2}:\d{2}/.test(line) && line.includes('-->')) continue;

    // Skip cue identifiers (numeric-only lines)
    if (/^\d+$/.test(line)) continue;

    // Strip HTML tags (<c>, </c>, <b>, etc.)
    const cleaned = line.replace(/<[^>]+>/g, '').trim();
    if (!cleaned) continue;

    // Deduplicate consecutive identical lines (common in auto-generated subs)
    if (cleaned === prevLine) continue;
    prevLine = cleaned;

    textLines.push(cleaned);
  }

  // Join with spaces and collapse whitespace
  return textLines.join(' ').replace(/\s+/g, ' ').trim();
}
