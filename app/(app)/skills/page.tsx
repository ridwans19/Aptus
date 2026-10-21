'use client';

import { useState } from 'react';
import { employees, skillsList as initialSkills } from '@/lib/mock-data';

export default function SkillsPage() {
  const [skillsList, setSkillsList] = useState<string[]>(initialSkills);
  const [newSkill, setNewSkill] = useState('');

  function addSkill() {
    const v = newSkill.trim();
    if (!v || skillsList.includes(v)) return;
    setSkillsList((prev) => [...prev, v]);
    setNewSkill('');
  }

  function removeSkill(s: string) {
    setSkillsList((prev) => prev.filter((x) => x !== s));
    // Note: this only removes it from the catalog view here.
    // Once wired to Prisma, this will also delete the skill from every employee's record.
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>Skill catalog</h3>
          <span className="pill">{skillsList.length}</span>
        </div>
        <div className="skill-chip-cloud">
          {skillsList.map((s) => (
            <span className="skill-chip" key={s}>
              {s}
              <button onClick={() => removeSkill(s)}>&times;</button>
            </span>
          ))}
        </div>
        <div className="add-skill-row">
          <input
            type="text"
            placeholder="Add a skill, e.g. Kubernetes"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSkill()}
          />
          <button className="btn btn-primary btn-sm" onClick={addSkill}>Add skill</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Skill matrix</h3></div>
        <table className="matrix">
          <thead>
            <tr>
              <th>Team member</th>
              {skillsList.map((s) => (
                <th key={s}>{s}</th>
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
                {skillsList.map((s) => {
                  const lvl = e.skills[s];
                  if (!lvl) {
                    return (
                      <td key={s}>
                        <span className="mono" style={{ color: 'var(--ink-faint)', fontSize: '0.6875rem' }}>—</span>
                      </td>
                    );
                  }
                  return (
                    <td key={s}>
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