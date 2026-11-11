'use client';

import { fmtDate } from '@/lib/scheduling';

type ModalEmployee = {
  id: string;
  name: string;
  title: string;
  email: string;
  color: string;
  capacity: number;
  skills: Record<string, number>;
};

type ModalTask = {
  id: string;
  name: string;
  client: string | null;
  day: string;
  duration: number;
  hours: number;
  deadline: string | null;
};

type Props = {
  emp: ModalEmployee;
  weekHoursUsed: number;
  currentTasks: ModalTask[];
  absence: { date: string; note: string | null } | null;
  onClose: () => void;
};

export default function PersonModal({ emp, weekHoursUsed, currentTasks, absence, onClose }: Props) {
  const pct = Math.min(100, Math.round((weekHoursUsed / emp.capacity) * 100));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <button className="modal-back" onClick={onClose}>
            ← Back
          </button>
          <div className="modal-person-row">
            <div className="avatar" style={{ background: emp.color, width: 44, height: 44, fontSize: '0.9375rem' }}>
              {emp.name
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.0625rem' }}>{emp.name}</div>
              <div style={{ fontSize: '0.7812rem', color: 'var(--ink-soft)' }}>
                {emp.title} · {emp.email}
              </div>
            </div>
          </div>
          <div className="skill-tag-row" style={{ marginTop: 12 }}>
            {Object.entries(emp.skills).length ? (
              Object.entries(emp.skills).map(([s, l]) => (
                <span className="skill-tag" key={s}>
                  {s} L{l}
                </span>
              ))
            ) : (
              <span className="field-hint">No skills recorded</span>
            )}
          </div>
        </div>

        <div className="modal-body">
          {/* Workload */}
          <div className="cap-bar-track" style={{ width: '100%', marginBottom: 6 }}>
            <div
              className="cap-bar-fill"
              style={{ width: `${pct}%`, background: weekHoursUsed > emp.capacity ? 'var(--rust)' : pct > 85 ? 'var(--brass)' : 'var(--teal)' }}
            />
          </div>
          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: 16 }}>
            {weekHoursUsed}/{emp.capacity}h booked this week · {currentTasks.length} task{currentTasks.length === 1 ? '' : 's'} assigned
          </div>

          {/* Next absence */}
          <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 9, background: absence ? 'var(--rust-soft)' : 'var(--surface-alt)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: absence ? 'var(--rust)' : 'var(--ink-soft)' }}>
              {absence ? `Away from ${fmtDate(absence.date)}` : 'No upcoming absences'}
            </div>
            {absence?.note && <div style={{ fontSize: '0.7188rem', color: 'var(--ink-soft)', marginTop: 2 }}>{absence.note}</div>}
          </div>

          {/* Current tasks */}
          {currentTasks.length ? (
            currentTasks.map((a) => (
              <div className="modal-task-card" key={a.id}>
                <div className="modal-task-top">
                  <div>
                    <div className="modal-task-name">{a.name}</div>
                    {a.client ? (
                      <div className="modal-task-client">{a.client}</div>
                    ) : (
                      <div className="modal-task-client" style={{ color: 'var(--ink-faint)' }}>
                        Internal — no client attached
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-task-meta">
                  Starts {fmtDate(a.day)}
                  {a.duration > 1 ? ` · spans ${a.duration} days` : ''} · {a.hours}h estimated
                  {a.deadline ? ` · due ${fmtDate(a.deadline)}` : ''}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-note" style={{ padding: 0 }}>
              Nothing assigned right now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
