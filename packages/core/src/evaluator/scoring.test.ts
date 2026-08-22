import { tallyVerdicts, pickSkillLabel, EVAL_CRITERIA, type CriterionVerdict } from './scoring';

let pass = 0;
let fail = 0;
const check = (name: string, cond: boolean) => {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name); }
};

const v = (verdicts: string[]): CriterionVerdict[] =>
  verdicts.map((verdict, i) => ({
    criterion: EVAL_CRITERIA[i % EVAL_CRITERIA.length],
    verdict: verdict as CriterionVerdict['verdict'],
  }));

// --- The mapping is the whole anti-bias mechanism ---------------------------

check(
  'skill sweeps as A -> 10',
  tallyVerdicts(v(['A', 'A', 'A', 'A', 'A']), 'A').score === 10,
);
check(
  'the SAME verdicts score 0 when the skill was B',
  tallyVerdicts(v(['A', 'A', 'A', 'A', 'A']), 'B').score === 0,
);
check(
  'skill sweeps as B -> 10',
  tallyVerdicts(v(['B', 'B', 'B', 'B', 'B']), 'B').score === 10,
);

// --- Ties -------------------------------------------------------------------

check(
  'all ties -> 5.0 (made no difference)',
  tallyVerdicts(v(['tie', 'tie', 'tie', 'tie', 'tie']), 'A').score === 5,
);
check(
  'a tie counts as half a win',
  tallyVerdicts(v(['A', 'tie']), 'A').score === 7.5,
);
check(
  'no verdicts -> neutral 5.0, not 0',
  tallyVerdicts([], 'A').score === 5,
);

// --- Tallies ----------------------------------------------------------------

const mixed = tallyVerdicts(v(['A', 'B', 'tie', 'A', 'B']), 'A');
check('counts skill wins', mixed.skillWins === 2);
check('counts baseline wins', mixed.baselineWins === 2);
check('counts ties', mixed.ties === 1);
check('even split with one tie -> 5.0', mixed.score === 5);
check(
  'tally always sums to the verdict count',
  mixed.skillWins + mixed.baselineWins + mixed.ties === 5,
);

// --- Determinism: the property the plan actually asks for -------------------

const sample = v(['A', 'tie', 'B', 'A', 'A']);
const runs = Array.from({ length: 100 }, () => tallyVerdicts(sample, 'A').score);
check(
  'identical verdicts always produce an identical score',
  new Set(runs).size === 1,
);
check('score is rounded to one decimal', runs[0] === 7);

// --- Label randomisation ----------------------------------------------------

check('random < 0.5 -> A', pickSkillLabel(() => 0.1) === 'A');
check('random >= 0.5 -> B', pickSkillLabel(() => 0.9) === 'B');

const labels = Array.from({ length: 10000 }, () => pickSkillLabel());
const aShare = labels.filter((l) => l === 'A').length / labels.length;
check(
  `both labels used, roughly evenly (A=${(aShare * 100).toFixed(1)}%)`,
  aShare > 0.45 && aShare < 0.55,
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
