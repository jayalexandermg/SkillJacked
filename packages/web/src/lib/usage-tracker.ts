/**
 * localStorage-based extraction usage tracking for free tier.
 * Tracks extractions per calendar month. Will move to Supabase in Phase 2.
 */

const USAGE_KEY = 'skilljack_usage';
const FREE_TIER_LIMIT = 3;

interface UsageData {
  month: string; // "YYYY-MM" format
  count: number;
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getUsageData(): UsageData {
  if (typeof window === 'undefined') return { month: getCurrentMonth(), count: 0 };

  const raw = localStorage.getItem(USAGE_KEY);
  if (!raw) return { month: getCurrentMonth(), count: 0 };

  try {
    const data: UsageData = JSON.parse(raw);
    // Reset if we're in a new month
    if (data.month !== getCurrentMonth()) {
      return { month: getCurrentMonth(), count: 0 };
    }
    return data;
  } catch {
    return { month: getCurrentMonth(), count: 0 };
  }
}

export function getExtractionCount(): number {
  return getUsageData().count;
}

export function getRemainingExtractions(): number {
  return Math.max(0, FREE_TIER_LIMIT - getUsageData().count);
}

export function isAtExtractionLimit(): boolean {
  return getUsageData().count >= FREE_TIER_LIMIT;
}

export function recordExtraction(): void {
  if (typeof window === 'undefined') return;
  const data = getUsageData();
  data.count += 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(data));
}

export const FREE_EXTRACTION_LIMIT = FREE_TIER_LIMIT;
