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

  // Everyone is listed and can be picked. Best fits come first; people who
  // are missing a required skill come last, with a warning.
  const rows = useMemo(() => {
    const { eligible, ineligible } = rankCandidates(employees, task.requirements, task.hours, weekHours);
    return [...eligible, ...ineligible];
  }, [employees, task.requirements, task.hours, weekHours]);

  const fullMatches = rows.filter((r) => r.meetsAll).length;
  const eligibleCount = rows.filter((r) => r.missingMandatory.length === 0).length;

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
      <Link href={backHref} className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, marginBottom: 10 }}>
        ← Back to {task.projectName ?? 'projects'}
      </Link>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: 8 }}>
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

      {fullMatches === 0 && rows.length > 0 && (
        <div
          style={{
            background: 'var(--brass-soft)',
            color: 'var(--ink)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            marginBottom: 16,
          }}
        >
          <strong>No one is a full match for this task.</strong>{' '}
          {eligibleCount === 0
            ? 'Nobody has every required skill.'
            : 'Nobody meets every requested skill level.'}{' '}
          The closest fits are listed first, and you can still assign anyone below.
        </div>
      )}

      {error && (
        <div className="pill warn" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>
      )}

      <div className="panel">
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: 8 }}>
          <h3>Team ranked for this task</h3>
          <span className="pill req">{fullMatches} full match{fullMatches === 1 ? '' : 'es'}</span>
        </div>

        {rows.length === 0 && <div className="empty-note">There is nobody on the team yet. Add people on the Team page.</div>}

        {rows.map((row, i) => {
          const missing = row.missingMandatory.length > 0;
          const isCurrent = row.emp.id === task.assignedToId;
          return (
            <div className="rank-item" key={row.emp.id}>
              <div className="rank-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="avatar" style={{ background: row.emp.color }}>{row.emp.init}</div>
              <div className="rank-body" style={{ minWidth: 0 }}>
                <div className="rank-name-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.emp.name}</span>
                  <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink-faint)' }}>{row.emp.title}</span>
                  <span style={{ marginLeft: 'auto' }}>
                    <MiniDial score={row.overall} size={34} />
                  </span>
                </div>

                <div style={{ margin: '6px 0' }}>
                  {row.meetsAll ? (
                    <span className="pill req">Full match</span>
                  ) : missing ? (
                    <span className="pill warn">Missing required: {row.missingMandatory.map((m) => m.skill).join(', ')}</span>
                  ) : (
                    <span className="pill" style={{ background: 'var(--brass-soft)', color: 'var(--brass)' }}>Partial match</span>
                  )}
                </div>

                <div className="rank-explain">{row.explain}</div>

                {isCurrent ? (
                  <div className="field-hint" style={{ marginTop: 10 }}>Already assigned to this person.</div>
                ) : (
                  <button
                    className={`btn btn-sm ${row.meetsAll ? 'btn-primary' : 'btn-outline'}`}
                    style={{ marginTop: 10 }}
                    onClick={() => assign(row.emp.id)}
                    disabled={assigning !== null}
                  >
                    {assigning === row.emp.id
                      ? 'Assigning...'
                      : row.meetsAll
                        ? task.assignedTo ? 'Reassign to this person' : 'Assign to this task'
                        : 'Assign anyway'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
