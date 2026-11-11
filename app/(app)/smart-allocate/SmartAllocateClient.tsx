'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignTask } from './actions';
import MiniDial from '@/components/MiniDial';

// Allocation score weighting — see dissertation Section 4 (AHP weight derivation).
// Currently placeholder values pending stakeholder pairwise comparisons.
const WEIGHT_SKILL_MATCH = 0.65;
const WEIGHT_AVAILABILITY = 0.25;
const WEIGHT_WORKLOAD_BALANCE = 0.1;

type Employee = {
  id: string;
  name: string;
  title: string;
  init: string;
  color: string;
  capacity: number;
  skills: Record<string, number>;
};

type Project = { id: string; name: string };

type Requirement = { skill: string; level: number; mandatory: boolean };

type ResultRow = {
  emp: Employee;
  overall: number;
  missingMandatory: { skill: string }[];
  explain: string;
};

type Props = {
  employees: Employee[];
  skillsList: string[];
  projects: Project[];
  weekHours: Record<string, number>;
};

export default function SmartAllocateClient({ employees, skillsList, projects, weekHours }: Props) {
  const router = useRouter();

  const [projectMode, setProjectMode] = useState<'new' | 'existing'>('new');
  const [projectName, setProjectName] = useState('');
  const [existingProjectId, setExistingProjectId] = useState(projects[0]?.id || '');
  const [clientName, setClientName] = useState('');
  const [clientInfo, setClientInfo] = useState('');
  const [hours, setHours] = useState(20);
  const [deadline, setDeadline] = useState('');
  const [requirements, setRequirements] = useState<Requirement[]>([
    { skill: skillsList[0] || '', level: 4, mandatory: true },
  ]);
  const [results, setResults] = useState<{ eligible: ResultRow[]; ineligible: ResultRow[] } | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const canSearch =
    projectMode === 'new' ? projectName.trim().length > 0 : existingProjectId.length > 0;

  function updateReq(i: number, field: keyof Requirement, value: string | number | boolean) {
    setRequirements((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addRequirement() {
    setRequirements((prev) => [...prev, { skill: skillsList[0] || '', level: 3, mandatory: false }]);
  }

  function removeRequirement(i: number) {
    setRequirements((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function runSmartSearch() {
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

      const skillScore = Math.round(perSkill.reduce((a, b) => a + b.score, 0) / perSkill.length);
      const used = weekHours[emp.id] || 0;
      const remaining = emp.capacity - used;
      const availScore = Math.max(0, Math.min(100, Math.round((remaining / hours) * 70)));
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
        remaining >= hours
          ? 'Has ' + remaining + 'h free this week, enough to cover the ' + hours + 'h estimate.'
          : 'Only ' + remaining + 'h free this week against a ' + hours + 'h estimate - would run over capacity.';

      return { emp, overall, missingMandatory, explain };
    });

    const eligible = rows.filter((r) => r.missingMandatory.length === 0).sort((a, b) => b.overall - a.overall);
    const ineligible = rows.filter((r) => r.missingMandatory.length > 0);
    setResults({ eligible, ineligible });
  }

  async function assignFromSmart(empId: string) {
    setAssigning(empId);
    const taskName =
      projectMode === 'new'
        ? projectName.trim()
        : projects.find((p) => p.id === existingProjectId)?.name || 'Untitled task';

    try {
      await assignTask({
        taskName,
        projectMode,
        projectName,
        existingProjectId,
        clientName,
        clientInfo,
        deadline,
        hours,
        requirements,
        employeeId: empId,
      });
      router.refresh();
      resetForm();
    } finally {
      setAssigning(null);
    }
  }

  function resetForm() {
    setProjectMode('new');
    setProjectName('');
    setExistingProjectId(projects[0]?.id || '');
    setClientName('');
    setClientInfo('');
    setHours(20);
    setDeadline('');
    setRequirements([{ skill: skillsList[0] || '', level: 4, mandatory: true }]);
    setResults(null);
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <h3>Describe the work</h3>
        </div>
        <div style={{ padding: 18 }}>
          <label className="field-label">Project</label>
          <div className="seg-switch" style={{ marginBottom: 12 }}>
            <button className={projectMode === 'new' ? 'active' : ''} onClick={() => setProjectMode('new')}>
              New project
            </button>
            <button className={projectMode === 'existing' ? 'active' : ''} onClick={() => setProjectMode('existing')}>
              Existing project
            </button>
          </div>

          {projectMode === 'new' ? (
            <div className="field-group">
              <input
                type="text"
                placeholder="e.g. Client Portal Revamp"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
          ) : (
            <div className="field-group">
              {projects.length ? (
                <select value={existingProjectId} onChange={(e) => setExistingProjectId(e.target.value)}>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <div className="field-hint">No existing projects yet - switch to "New project".</div>
              )}
            </div>
          )}

          <div className="field-row2">
            <div className="field-group">
              <label className="field-label">Client / company name</label>
              <input
                type="text"
                placeholder="e.g. Northbridge Retail"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={projectMode === 'existing'}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Hours needed</label>
              <input
                type="number"
                min={1}
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Client details</label>
            <textarea
              placeholder="Point of contact, background, anything relevant to staffing this work..."
              value={clientInfo}
              onChange={(e) => setClientInfo(e.target.value)}
              disabled={projectMode === 'existing'}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{ maxWidth: 220 }}
              disabled={projectMode === 'existing'}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Skills required</label>
            {requirements.map((r, i) => (
              <div className="req-row" key={i}>
                <select value={r.skill} onChange={(e) => updateReq(i, 'skill', e.target.value)}>
                  {skillsList.map((sk) => (
                    <option key={sk}>{sk}</option>
                  ))}
                </select>
                <select value={r.level} onChange={(e) => updateReq(i, 'level', parseInt(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((l) => (
                    <option key={l} value={l}>Level {l}</option>
                  ))}
                </select>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={r.mandatory}
                    onChange={(e) => updateReq(i, 'mandatory', e.target.checked)}
                  />
                  Required
                </label>
                {requirements.length > 1 && (
                  <button className="rm-btn" onClick={() => removeRequirement(i)} title="Remove">x</button>
                )}
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }} onClick={addRequirement}>
              + Add another skill
            </button>
          </div>

          <button className="btn btn-primary" onClick={runSmartSearch} disabled={!canSearch}>
            Search suitable employees
          </button>
          {!canSearch && (
            <div className="field-hint" style={{ marginTop: 6 }}>
              {projectMode === 'new' ? 'Give the project a name first.' : 'Add a project first, or switch to "New project".'}
            </div>
          )}
        </div>
      </div>

      {results && (
        <div className="panel">
          <div className="panel-head">
            <h3>Suggested employees</h3>
            <span className="pill req">{results.eligible.length} eligible</span>
          </div>

          {results.eligible.map((row, i) => (
            <div className="rank-item" key={row.emp.id}>
              <div className="rank-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="avatar" style={{ background: row.emp.color }}>
                {row.emp.init}
              </div>
              <div className="rank-body">
                <div className="rank-name-row">
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.emp.name}</span>
                  <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink-faint)' }}>
                    {row.emp.title}
                  </span>
                  <span style={{ marginLeft: 'auto' }}>
                    <MiniDial score={row.overall} size={34} />
                  </span>
                </div>
                <div className="rank-explain">{row.explain}</div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => assignFromSmart(row.emp.id)}
                  disabled={assigning === row.emp.id}
                >
                  {assigning === row.emp.id ? 'Assigning...' : 'Assign to this project'}
                </button>
              </div>
            </div>
          ))}

          {results.ineligible.length > 0 && (
            <>
              <div className="panel-head" style={{ borderTop: '1px solid var(--line)' }}>
                <h3 style={{ fontSize: '0.8125rem', color: 'var(--ink-soft)' }}>Not eligible</h3>
                <span className="pill warn">{results.ineligible.length}</span>
              </div>
              {results.ineligible.map((row) => (
                <div className="rank-item ineligible" key={row.emp.id}>
                  <div className="avatar" style={{ background: row.emp.color }}>
                    {row.emp.init}
                  </div>
                  <div className="rank-body">
                    <div style={{ fontWeight: 600, fontSize: '0.8438rem' }}>{row.emp.name}</div>
                    <div className="rank-explain">
                      Missing required skill: {row.missingMandatory.map((m) => m.skill).join(', ')}.
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
