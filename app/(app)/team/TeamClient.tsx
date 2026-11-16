'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { fmtDate, nextAbsence } from '@/lib/scheduling';
import type { Employee, TaskLite } from '@/lib/scheduling';
import {
  inviteEmployee,
  removeEmployee,
  setEmployeeSkill,
  removeEmployeeSkill,
  addSkill,
  removeSkill,
} from './actions';

type Skill = { id: string; name: string };

type Props = {
  employees: Employee[];
  assignments: TaskLite[];
  weekHoursUsed: Record<string, number>;
  skills: Skill[];
};

function barColor(used: number, capacity: number) {
  const pct = capacity ? (used / capacity) * 100 : 0;
  return used > capacity ? 'var(--rust)' : pct > 85 ? 'var(--brass)' : 'var(--teal)';
}

// ---------------------------------------------------------------------------
// One person: availability, editable skills, current tasks
// ---------------------------------------------------------------------------
function EmployeeModal({
  emp,
  weekHoursUsed,
  tasks,
  catalog,
  onClose,
}: {
  emp: Employee;
  weekHoursUsed: number;
  tasks: TaskLite[];
  catalog: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [skills, setSkills] = useState<Record<string, number>>(emp.skills);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newLevel, setNewLevel] = useState(3);

  const absence = nextAbsence(emp.unavailableDates);
  const pct = Math.min(100, Math.round((weekHoursUsed / emp.capacity) * 100));
  const owned = Object.keys(skills).sort((a, b) => a.localeCompare(b));
  const available = catalog.filter((s) => !(s in skills));
  const chosen = newSkill && available.includes(newSkill) ? newSkill : available[0] ?? '';

  // Update the screen straight away, save in the background, and put things
  // back (with a message) if the save fails.
  async function save(change: () => Promise<void>, apply: (prev: Record<string, number>) => Record<string, number>) {
    const before = skills;
    setSkills(apply(before));
    setBusy(true);
    setError('');
    try {
      await change();
      router.refresh();
    } catch (e) {
      setSkills(before);
      setError(e instanceof Error ? e.message : 'Could not save that change.');
    } finally {
      setBusy(false);
    }
  }

  const changeLevel = (name: string, level: number) =>
    save(() => setEmployeeSkill(emp.id, name, level), (p) => ({ ...p, [name]: level }));

  const removeSkillFromPerson = (name: string) =>
    save(() => removeEmployeeSkill(emp.id, name), (p) => {
      const next = { ...p };
      delete next[name];
      return next;
    });

  const addToPerson = () => {
    if (!chosen) return;
    save(() => setEmployeeSkill(emp.id, chosen, newLevel), (p) => ({ ...p, [chosen]: newLevel }));
    setNewSkill('');
  };

  return (
    <div className="modal-backdrop blurred" onClick={onClose}>
      <div className="modal-card fit" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-head">
          <button className="modal-back" onClick={onClose}>
            ← Back
          </button>
          <div className="modal-person-row">
            <div className="avatar" style={{ background: emp.color, width: 44, height: 44, fontSize: '0.9375rem' }}>
              {emp.init}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.0625rem' }}>{emp.name}</div>
              <div style={{ fontSize: '0.7812rem', color: 'var(--ink-soft)' }}>
                {emp.title} · {emp.email}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-body">
          {/* Availability */}
          <div className="field-label">Availability</div>
          <div className="cap-bar-track" style={{ width: '100%', marginBottom: 6 }}>
            <div className="cap-bar-fill" style={{ width: `${pct}%`, background: barColor(weekHoursUsed, emp.capacity) }} />
          </div>
          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: 12 }}>
            {weekHoursUsed}/{emp.capacity}h booked this week · {tasks.length} task{tasks.length === 1 ? '' : 's'} assigned
          </div>
          <div style={{ marginBottom: 20, padding: '10px 12px', borderRadius: 9, background: absence ? 'var(--rust-soft)' : 'var(--surface-alt)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: absence ? 'var(--rust)' : 'var(--ink-soft)' }}>
              {absence ? `Away from ${fmtDate(absence.date)}` : 'No upcoming absences'}
            </div>
            {absence?.note && <div style={{ fontSize: '0.7188rem', color: 'var(--ink-soft)', marginTop: 2 }}>{absence.note}</div>}
          </div>

          {/* Skills */}
          <div className="field-label">Skills and levels</div>
          {owned.length === 0 && <div className="field-hint" style={{ marginBottom: 10 }}>No skills recorded yet.</div>}
          {owned.map((name) => (
            <div
              key={name}
              style={{ display: 'grid', gridTemplateColumns: '1fr 110px 30px', gap: 8, alignItems: 'center', marginBottom: 8 }}
            >
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {name}
              </span>
              <select value={skills[name]} onChange={(e) => changeLevel(name, parseInt(e.target.value))} disabled={busy} style={{ padding: '9px 10px' }}>
                {[1, 2, 3, 4, 5].map((l) => (
                  <option key={l} value={l}>Level {l}</option>
                ))}
              </select>
              <button className="rm-btn" title="Remove this skill" onClick={() => removeSkillFromPerson(name)} disabled={busy}>x</button>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: 8, alignItems: 'center', marginTop: 12 }}>
            {available.length ? (
              <select value={chosen} onChange={(e) => setNewSkill(e.target.value)} disabled={busy} style={{ padding: '9px 10px' }}>
                {available.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            ) : (
              <span className="field-hint">
                {catalog.length ? 'This person already has every skill in the catalog.' : 'No skills in the catalog yet. Add some below the team list.'}
              </span>
            )}
            <select value={newLevel} onChange={(e) => setNewLevel(parseInt(e.target.value))} disabled={busy || !available.length} style={{ padding: '9px 10px' }}>
              {[1, 2, 3, 4, 5].map((l) => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
            <button className="btn btn-outline btn-sm" onClick={addToPerson} disabled={busy || !available.length}>
              + Add skill
            </button>
          </div>

          {error && <div className="pill warn" style={{ display: 'block', margin: '12px 0 0', padding: '8px 12px' }}>{error}</div>}

          {/* Current tasks */}
          <div className="field-label" style={{ marginTop: 22 }}>Assigned tasks</div>
          {tasks.length ? (
            tasks.map((a) => (
              <div className="modal-task-card" key={a.id}>
                <div className="modal-task-name">{a.name}</div>
                <div className="modal-task-client" style={a.client ? undefined : { color: 'var(--ink-faint)' }}>
                  {a.client ?? 'Internal — no client attached'}
                </div>
                <div className="modal-task-meta">
                  Starts {fmtDate(a.day)}
                  {a.duration > 1 ? ` · spans ${a.duration} days` : ''} · {a.hours}h estimated
                  {a.deadline ? ` · due ${fmtDate(a.deadline)}` : ''}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-note" style={{ padding: 0 }}>Nothing assigned right now.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TeamClient({ employees, assignments, weekHoursUsed, skills }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [listError, setListError] = useState('');

  const [newSkill, setNewSkill] = useState('');
  const [catalogError, setCatalogError] = useState('');

  const q = search.trim().toLowerCase();
  const visible = employees.filter(
    (e) =>
      !q ||
      [e.name, e.email, e.title, ...Object.keys(e.skills)].some((t) => t.toLowerCase().includes(q))
  );

  function sendInvite() {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError('Name and email are both required.');
      return;
    }
    setInviteError('');
    startTransition(async () => {
      try {
        await inviteEmployee({ name: inviteName, email: inviteEmail });
        setInviteName('');
        setInviteEmail('');
        setShowInviteForm(false);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        setInviteError(
          message.includes('Unique constraint')
            ? 'Someone with that email is already on the team.'
            : message || 'Could not add this person — please try again.'
        );
      }
    });
  }

  function handleRemove(id: string) {
    if (!confirm('Remove this person from the team? Their assignments will be unassigned.')) return;
    setRemovingId(id);
    setListError('');
    startTransition(async () => {
      try {
        await removeEmployee(id);
        router.refresh();
      } catch (err) {
        setListError(err instanceof Error ? err.message : 'Could not remove this person.');
      } finally {
        setRemovingId(null);
      }
    });
  }

  function handleAddCatalogSkill() {
    const v = newSkill.trim();
    if (!v) return;
    if (skills.some((s) => s.name.toLowerCase() === v.toLowerCase())) {
      setCatalogError('That skill is already in the catalog.');
      return;
    }
    setCatalogError('');
    startTransition(async () => {
      try {
        await addSkill(v);
        setNewSkill('');
        router.refresh();
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : 'Could not add this skill.');
      }
    });
  }

  function handleRemoveCatalogSkill(skill: Skill) {
    if (!confirm(`Remove "${skill.name}" from the catalog? It will also be removed from everyone who has it.`)) return;
    setCatalogError('');
    startTransition(async () => {
      try {
        await removeSkill(skill.id);
        router.refresh();
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : 'Could not remove this skill.');
      }
    });
  }

  const person = personId ? employees.find((e) => e.id === personId) : null;

  return (
    <div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: 8 }}>
          <h3>Team</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowInviteForm((v) => !v)}>
            Invite team member
          </button>
        </div>

        {showInviteForm && (
          <div className="inline-form">
            <div className="field-group">
              <label className="field-label">Name</label>
              <input type="text" placeholder="Jordan Lee" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Email</label>
              <input type="email" placeholder="jordan@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            {inviteError && <div className="field-hint" style={{ color: 'var(--rust)' }}>{inviteError}</div>}
            <button className="btn btn-primary btn-sm" onClick={sendInvite} disabled={isPending}>
              {isPending ? 'Adding...' : 'Add to team'}
            </button>
          </div>
        )}

        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
          <input
            type="text"
            placeholder="Search by name, email, title or skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {listError && <div className="field-hint" style={{ color: 'var(--rust)', padding: '10px 18px 0' }}>{listError}</div>}

        {visible.map((e) => {
          const used = weekHoursUsed[e.id] || 0;
          const away = nextAbsence(e.unavailableDates);
          return (
            <div className="list-row" key={e.id}>
              <div
                className="avatar"
                style={{ background: e.color, width: 38, height: 38, fontSize: '0.8125rem', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => setPersonId(e.id)}
              >
                {e.init}
              </div>
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setPersonId(e.id)}>
                <div className="emp-name" style={{ fontSize: '0.8438rem' }}>{e.name}</div>
                <div className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink-soft)' }}>{e.email} · {e.title}</div>
                <div className="skill-tag-row">
                  {Object.entries(e.skills).length ? (
                    Object.entries(e.skills).map(([s, l]) => (
                      <span className="skill-tag" key={s}>{s} L{l}</span>
                    ))
                  ) : (
                    <span className="field-hint">No skills recorded</span>
                  )}
                </div>
              </div>
              <div style={{ width: 110, flexShrink: 0 }}>
                <div className="mono" style={{ fontSize: '0.7188rem', color: 'var(--ink-soft)', textAlign: 'right', marginBottom: 4 }}>
                  {used}/{e.capacity}h
                </div>
                <div className="cap-bar-track" style={{ width: '100%' }}>
                  <div
                    className="cap-bar-fill"
                    style={{ width: `${Math.min(100, Math.round((used / e.capacity) * 100))}%`, background: barColor(used, e.capacity) }}
                  />
                </div>
                {away && (
                  <div style={{ fontSize: '0.6562rem', color: 'var(--rust)', textAlign: 'right', marginTop: 4 }}>
                    Away from {fmtDate(away.date)}
                  </div>
                )}
              </div>
              <button
                className="btn btn-danger-ghost btn-sm"
                style={{ flexShrink: 0 }}
                onClick={() => handleRemove(e.id)}
                disabled={removingId === e.id}
              >
                {removingId === e.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          );
        })}

        {employees.length === 0 && <div className="empty-note">No team members yet — invite someone to get started.</div>}
        {employees.length > 0 && visible.length === 0 && <div className="empty-note">Nobody matches your search.</div>}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Skill catalog</h3>
          <span className="pill">{skills.length}</span>
        </div>
        <div className="field-hint" style={{ padding: '12px 18px 0' }}>
          Every skill that can be given to a person or required by a task. Open a person above to set their levels.
        </div>
        <div className="skill-chip-cloud">
          {skills.map((s) => (
            <span className="skill-chip" key={s.id}>
              {s.name}
              <button onClick={() => handleRemoveCatalogSkill(s)} disabled={isPending} title="Remove from catalog">&times;</button>
            </span>
          ))}
          {skills.length === 0 && <span className="field-hint">No skills yet.</span>}
        </div>
        <div className="add-skill-row">
          <input
            type="text"
            placeholder="Add a skill, e.g. Kubernetes"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCatalogSkill()}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAddCatalogSkill} disabled={isPending}>
            {isPending ? 'Working...' : 'Add skill'}
          </button>
        </div>
        {catalogError && <div className="field-hint" style={{ color: 'var(--rust)', padding: '0 18px 14px' }}>{catalogError}</div>}
      </div>

      {person && (
        <EmployeeModal
          key={person.id}
          emp={person}
          weekHoursUsed={weekHoursUsed[person.id] || 0}
          tasks={assignments.filter((a) => a.empId === person.id)}
          catalog={skills.map((s) => s.name)}
          onClose={() => setPersonId(null)}
        />
      )}
    </div>
  );
}
