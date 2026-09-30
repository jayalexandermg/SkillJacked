/**
 * What a viewer may see of a jack's skills. Pure, so the server and the tests
 * share it; the server is the only place it's applied — the browser never
 * receives content it isn't allowed to show.
 */

export type SkillTier = 'full' | 'preview' | 'locked';

/** Signed-out: this many skills open in full, then this many as name + description. */
export const ANON_FULL = 1;
export const ANON_PREVIEW = 3;

export interface JackSkillRow {
  id: string;
  position: number;
  name: string;
  description: string | null;
  content: string;
  saved_skill_id: string | null;
}

export interface JackSkillView {
  id: string;
  position: number;
  name: string;
  tier: SkillTier;
  description?: string;
  content?: string;
  saved: boolean;
}

export interface JackView {
  id: string;
  shareId: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceChannel: string | null;
  videoId: string | null;
  createdAt: string;
  /** Only in the response that created an anonymous jack. */
  claimToken?: string;
  skills: JackSkillView[];
}

/** One row of the library's "Recent jacks" strip. */
export interface RecentJack {
  id: string;
  sourceTitle: string;
  sourceChannel: string | null;
  videoId: string | null;
  createdAt: string;
  totalSkills: number;
  unsavedSkills: number;
}

export function tierFor(position: number, signedIn: boolean): SkillTier {
  if (signedIn || position < ANON_FULL) return 'full';
  if (position < ANON_FULL + ANON_PREVIEW) return 'preview';
  return 'locked';
}

export function viewSkill(row: JackSkillRow, signedIn: boolean): JackSkillView {
  const tier = tierFor(row.position, signedIn);
  return {
    id: row.id,
    position: row.position,
    name: row.name,
    tier,
    saved: row.saved_skill_id !== null,
    ...(tier !== 'locked' && row.description ? { description: row.description } : {}),
    ...(tier === 'full' ? { content: row.content } : {}),
  };
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

/** The frontmatter `description:`, unquoted. */
export function skillDescription(content: string): string | null {
  const match = content.match(FRONTMATTER)?.[1].match(/^description:\s*(.+)$/m);
  if (!match) return null;
  return match[1].trim().replace(/^['"]|['"]$/g, '') || null;
}

export function videoIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v');
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}
