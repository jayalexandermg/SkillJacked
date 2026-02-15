/**
 * Normalize a raw transcript string for consistent line-index referencing.
 */
export function normalizeTranscript(raw: string): string {
  return (
    raw
      // CRLF -> LF
      .replace(/\r\n/g, '\n')
      // trim trailing whitespace per line
      .replace(/[^\S\n]+$/gm, '')
      // collapse 3+ consecutive newlines to 2
      .replace(/\n{3,}/g, '\n\n')
      // ensure exactly one trailing newline
      .replace(/\n*$/, '\n')
  );
}
