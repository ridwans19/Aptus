// Smart allocation scoring: skill match, availability and workload balance.
// See dissertation Section 4 (AHP weight derivation) - the weights below are
// still placeholders pending the stakeholder pairwise comparisons.
export const WEIGHT_SKILL_MATCH = 0.65;
export const WEIGHT_AVAILABILITY = 0.25;
export const WEIGHT_WORKLOAD_BALANCE = 0.1;

export type Candidate = {
  id: string;
  name: string;
  title: string;
  init: string;
  color: string;
  capacity: number;
  skills: Record<string, number>;
};

export type TaskRequirement = { skill: string; level: number; mandatory: boolean };

export type ResultRow = {
  emp: Candidate;
  overall: number;
  missingMandatory: { skill: string }[];
  explain: string;
};

export function rankCandidates(
  employees: Candidate[],
  requirements: TaskRequirement[],
  hours: number,
  weekHours: Record<string, number>
): { eligible: ResultRow[]; ineligible: ResultRow[] } {
  const safeHours = Math.max(1, hours);

  const rows: ResultRow[] = employees.map((emp) => {
    const missingMandatory = requirements.filter((r) => r.mandatory && !emp.skills[r.skill]);

    const perSkill = requirements.map((r) => {
      const lvl = emp.skills[r.skill];
      let sc: number;
      if (lvl === undefined) sc = 15;
      else if (lvl >= r.level) sc = Math.min(98, 82 + (lvl - r.level) * 6);
      else sc = 40 + lvl * 6;
      return { skill: r.skill, level: r.level, has: lvl, score: sc };
    });

    // A task with no listed skills can't tell candidates apart on skill.
    const skillScore = perSkill.length
      ? Math.round(perSkill.reduce((a, b) => a + b.score, 0) / perSkill.length)
      : 100;
    const used = weekHours[emp.id] || 0;
    const remaining = emp.capacity - used;
    const availScore = Math.max(0, Math.min(100, Math.round((remaining / safeHours) * 70)));
    const balanceScore = Math.max(0, 100 - Math.round((used / emp.capacity) * 100));
    const overall = Math.round(
      skillScore * WEIGHT_SKILL_MATCH + availScore * WEIGHT_AVAILABILITY + balanceScore * WEIGHT_WORKLOAD_BALANCE
    );

    const strong = perSkill.filter((p) => p.has !== undefined && p.has >= p.level).map((p) => p.skill);
    const weak = perSkill
      .filter((p) => p.has !== undefined && p.has < p.level)
      .map((p) => p.skill + ' (has L' + p.has + ', needs L' + p.level + ')');
    const missing = perSkill.filter((p) => p.has === undefined).map((p) => p.skill);

    let explain = '';
    if (strong.length) explain += 'Meets or exceeds the required level in ' + strong.join(', ') + '. ';
    if (weak.length) explain += 'Below the requested level in ' + weak.join(', ') + '. ';
    if (missing.length) explain += 'No recorded experience in ' + missing.join(', ') + '. ';
    explain +=
      remaining >= safeHours
        ? 'Has ' + remaining + 'h free this week, enough to cover the ' + safeHours + 'h estimate.'
        : 'Only ' + remaining + 'h free this week against a ' + safeHours + 'h estimate - would run over capacity.';

    return { emp, overall, missingMandatory, explain };
  });

  const eligible = rows.filter((r) => r.missingMandatory.length === 0).sort((a, b) => b.overall - a.overall);
  const ineligible = rows.filter((r) => r.missingMandatory.length > 0);
  return { eligible, ineligible };
}
