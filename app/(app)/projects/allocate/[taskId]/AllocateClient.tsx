'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { allocateTask } from './actions';
import MiniDial from '@/components/MiniDial';
import { rankCandidates, type Candidate, type TaskRequirement } from '@/lib/allocation';

type Task = {
  id: string;
  name: string;
  hours: number;
  projectId: string | null;
  projectName: string | null;
  clientName: string | null;
  assignedTo: string | null;
  assignedToId: string | null;
  requirements: TaskRequirement[];
};

type Props = {
  task: Task;
  employees: Candidate[];
  weekHours: Record<string, number>;
};

export default function AllocateClient({ task, employees, weekHours }: Props) {
  const router = useRouter();
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState('');

  const backHref = task.projectId ? `/projects?project=${task.projectId}` : '/projects';
  const results = useMemo(
    () => rankCandidates(employees, task.requirements, task.hours, weekHours),
    [employees, task.requirements, task.hours, weekHours]
  );

  async function assign(empId: string) {
    setAssigning(empId);
    setError('');
    try {
      await allocateTask(task.id, empId);
      router.push(backHref);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setAssigning(null);
    }
  }

  return (
    <div>
      <Link href={backHref} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', paddingLeft: 0, marginBottom: 10 }}>
        ← Back to {task.projectName ?? 'projects'}
      </Link>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <h3>Smart allocate</h3>
          {task.assignedTo && <span className="pill">Currently: {task.assignedTo}</span>}
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.0625rem' }}>{task.name}</div>
          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', margin: '4px 0 12px' }}>
            {task.projectName ?? 'No project'}
            {task.clientName ? ` · ${task.clientName}` : ''} · {task.hours}h estimated
          </div>
          <div className="skill-tag-row">
            {task.requirements.map((r) => (
              <span className="skill-tag" key={r.skill}>
                {r.skill} L{r.level}
                {r.mandatory ? ' · required' : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="pill warn" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h3>Suggested employees</h3>
          <span className="pill req">{results.eligible.length} eligible</span>
        </div>

        {results.eligible.length === 0 && (
          <div className="empty-note">
            Nobody on the team has every required skill. Add the skill to someone on the Skills page, or untick
            “required” on the task.
          </div>
        )}

        {results.eligible.map((row, i) => (
          <div className="rank-item" key={row.emp.id}>
            <div className="rank-num">{String(i + 1).padStart(2, '0')}</div>
            <div className="avatar" style={{ background: row.emp.color }}>{row.emp.init}</div>
            <div className="rank-body">
              <div className="rank-name-row">
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.emp.name}</span>
                <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink-faint)' }}>{row.emp.title}</span>
                <span style={{ marginLeft: 'auto' }}>
                  <MiniDial score={row.overall} size={34} />
                </span>
              </div>
              <div className="rank-explain">{row.explain}</div>
              {row.emp.id === task.assignedToId ? (
                <div className="field-hint" style={{ marginTop: 10 }}>Already assigned to this person.</div>
              ) : (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => assign(row.emp.id)}
                  disabled={assigning !== null}
                >
                  {assigning === row.emp.id ? 'Assigning...' : task.assignedTo ? 'Reassign to this person' : 'Assign to this task'}
                </button>
              )}
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
                <div className="avatar" style={{ background: row.emp.color }}>{row.emp.init}</div>
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
    </div>
  );
}
