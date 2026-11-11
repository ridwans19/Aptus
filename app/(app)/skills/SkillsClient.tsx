'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addSkill, removeSkill } from './actions';

type Skill = { id: string; name: string };
type Employee = { id: string; name: string; init: string; color: string; skills: Record<string, number> };

type Props = {
  skills: Skill[];
  employees: Employee[];
};

export default function SkillsClient({ skills, employees }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newSkill, setNewSkill] = useState('');
  const [error, setError] = useState('');

  function handleAddSkill() {
    const v = newSkill.trim();
    if (!v) return;
    if (skills.some((s) => s.name.toLowerCase() === v.toLowerCase())) {
      setError('That skill is already in the catalog.');
      return;
    }
    setError('');
    startTransition(async () => {
      await addSkill(v);
      setNewSkill('');
      router.refresh();
    });
  }

  function handleRemoveSkill(skill: Skill) {
    if (!confirm(`Remove "${skill.name}" from the catalog?`)) return;
    setError('');
    startTransition(async () => {
      try {
        await removeSkill(skill.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not remove this skill.');
      }
    });
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>Skill catalog</h3>
          <span className="pill">{skills.length}</span>
        </div>
        <div className="skill-chip-cloud">
          {skills.map((s) => (
            <span className="skill-chip" key={s.id}>
              {s.name}
              <button onClick={() => handleRemoveSkill(s)} disabled={isPending}>&times;</button>
            </span>
          ))}
        </div>
        <div className="add-skill-row">
          <input
            type="text"
            placeholder="Add a skill, e.g. Kubernetes"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAddSkill} disabled={isPending}>
            {isPending ? 'Working...' : 'Add skill'}
          </button>
        </div>
        {error && <div className="field-hint" style={{ color: 'var(--rust)', marginTop: 6 }}>{error}</div>}
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Skill matrix</h3></div>
        <table className="matrix">
          <thead>
            <tr>
              <th>Team member</th>
              {skills.map((s) => (
                <th key={s.id}>{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td>
                  <div className="emp-id">
                    <div className="avatar" style={{ background: e.color, width: 26, height: 26, fontSize: '0.6562rem' }}>{e.init}</div>
                    <span style={{ fontSize: '0.7812rem', fontWeight: 600 }}>{e.name}</span>
                  </div>
                </td>
                {skills.map((s) => {
                  const lvl = e.skills[s.name];
                  if (!lvl) {
                    return (
                      <td key={s.id}>
                        <span className="mono" style={{ color: 'var(--ink-faint)', fontSize: '0.6875rem' }}>—</span>
                      </td>
                    );
                  }
                  return (
                    <td key={s.id}>
                      <div className="dotrow">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div className={`dot ${i <= lvl ? 'filled' : ''}`} key={i} />
                        ))}
                        <span className="mono" style={{ fontSize: '0.6562rem', color: 'var(--ink-soft)', marginLeft: 5 }}>{lvl}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
