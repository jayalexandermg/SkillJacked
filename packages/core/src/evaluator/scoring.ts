export const EVAL_CRITERIA = [
  'completeness',
  'specificity',
  'correctness',
  'clarity',
  'adherence',
] as const;

export type EvalCriterion = (typeof EVAL_CRITERIA)[number];

/** Which labelled output the judge preferred, in the judge's own A/B terms. */
export type Verdict = 'A' | 'B' | 'tie';

/**
 * Which side of the blind comparison the skill output was shown as.
 *
 * Models systematically favour the later-presented option, so the two outputs
 * are shown in a random order and this records the mapping. Nothing downstream
 * may interpret a verdict without it.
 */
export type SkillLabel = 'A' | 'B';

export interface CriterionVerdict {
  criterion: EvalCriterion;
  verdict: Verdict;
}

export interface EvalTally {
  skillWins: number;
  baselineWins: number;
  ties: number;
  /** 0–10, one decimal. */
  score: number;
}

/**
 * Turn the judge's blind A/B verdicts into a score.
 *
 * The judge is never asked for a number. Free-form numeric scores from an LLM
 * drift several points run-to-run on identical input and are not comparable
 * across skills, so the model only ever answers "which of these two is better
 * on this criterion" and the arithmetic happens here — deterministic,
 * reproducible, and debuggable from the stored verdicts alone.
 *
 * A tie counts as half a win: a skill that ties everywhere scores 5.0, meaning
 * "made no difference", which is the honest reading. Scoring ties as losses
 * would punish skills for being merely neutral.
 */
export function tallyVerdicts(
  verdicts: CriterionVerdict[],
  skillLabel: SkillLabel,
): EvalTally {
  let skillWins = 0;
  let baselineWins = 0;
  let ties = 0;

  for (const { verdict } of verdicts) {
    if (verdict === 'tie') {
      ties++;
    } else if (verdict === skillLabel) {
      skillWins++;
    } else {
      baselineWins++;
    }
  }

  const total = verdicts.length;
  // No verdicts means no evidence, not a zero — 5.0 is the neutral midpoint.
  const score = total === 0 ? 5 : ((skillWins + ties * 0.5) / total) * 10;

  return {
    skillWins,
    baselineWins,
    ties,
    score: Math.round(score * 10) / 10,
  };
}

/**
 * Choose which label the skill output is presented under. Split out so the
 * randomisation can be stubbed in tests.
 */
export function pickSkillLabel(random: () => number = Math.random): SkillLabel {
  return random() < 0.5 ? 'A' : 'B';
}
