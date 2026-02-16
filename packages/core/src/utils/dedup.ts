import { SkillSegment } from '../transformer/types';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'with',
  'on', 'is', 'are', 'how', 'what', 'framework', 'system', 'strategy',
  'approach', 'technique', 'method',
]);

function tokenize(name: string): Set<string> {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const tokens = normalized.split(/\s+/).filter(t => t.length > 0 && !STOPWORDS.has(t));
  return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;

  let intersectionSize = 0;
  for (const token of a) {
    if (b.has(token)) intersectionSize++;
  }

  const unionSize = a.size + b.size - intersectionSize;
  if (unionSize === 0) return 1;

  return intersectionSize / unionSize;
}

/**
 * Pick the segment to keep when two are considered duplicates.
 * Returns the index (0 or 1) of the segment to drop.
 * Lower priority number = higher priority. On tie, the later one (index 1) is dropped.
 */
function pickDrop(a: SkillSegment, b: SkillSegment): 0 | 1 {
  if (a.priority !== b.priority) {
    // Higher priority number = lower priority = the one to drop
    return a.priority > b.priority ? 0 : 1;
  }
  // Same priority: drop the one that appears later (b, index 1)
  return 1;
}

const SIMILARITY_THRESHOLD = 0.65;

export function dedupSegments(segments: SkillSegment[]): { kept: SkillSegment[]; removed: number } {
  const originalCount = segments.length;

  // --- Phase 1: Exact slug dedup ---
  const slugMap = new Map<string, SkillSegment>();
  for (const seg of segments) {
    const existing = slugMap.get(seg.proposed_slug);
    if (!existing) {
      slugMap.set(seg.proposed_slug, seg);
    } else {
      // Decide which to keep: pickDrop returns which index to drop (0=existing, 1=seg)
      const drop = pickDrop(existing, seg);
      if (drop === 0) {
        slugMap.set(seg.proposed_slug, seg);
      }
      // else keep existing, discard seg
    }
  }

  let remaining = Array.from(slugMap.values());
  // Restore original ordering among survivors
  const orderIndex = new Map(segments.map((s, i) => [s.id, i]));
  remaining.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));

  // --- Phase 2: Token similarity dedup ---
  const tokenCache = new Map<string, Set<string>>();
  for (const seg of remaining) {
    tokenCache.set(seg.id, tokenize(seg.proposed_name));
  }

  const dropped = new Set<string>();

  for (let i = 0; i < remaining.length; i++) {
    if (dropped.has(remaining[i].id)) continue;

    for (let j = i + 1; j < remaining.length; j++) {
      if (dropped.has(remaining[j].id)) continue;

      const tokensA = tokenCache.get(remaining[i].id)!;
      const tokensB = tokenCache.get(remaining[j].id)!;
      const sim = jaccardSimilarity(tokensA, tokensB);

      if (sim >= SIMILARITY_THRESHOLD) {
        const drop = pickDrop(remaining[i], remaining[j]);
        if (drop === 0) {
          dropped.add(remaining[i].id);
          break; // i is dropped, no need to compare further
        } else {
          dropped.add(remaining[j].id);
        }
      }
    }
  }

  const kept = remaining.filter(s => !dropped.has(s.id));

  return { kept, removed: originalCount - kept.length };
}
