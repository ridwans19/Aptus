'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { nextAbsence } from '@/lib/scheduling';
import type { Employee, TaskLite } from '@/lib/scheduling';
import PersonModal from '@/components/PersonModal';
import { inviteEmployee, removeEmployee } from './actions';

type Props = {
  employees: Employee[];
  assignments: TaskLite[];
  weekHoursUsed: Record<string, number>;
};

export default function TeamClient({ employees, assignments, weekHoursUsed }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
    startTransition(async () => {
      await removeEmployee(id);
      setRemovingId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>Active team</h3>
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
            {inviteError && (
              <div className="field-hint" style={{ color: 'var(--rust)' }}>{inviteError}</div>
            )}
            <button className="btn btn-primary btn-sm" onClick={sendInvite} disabled={isPending}>
              {isPending ? 'Adding...' : 'Add to team'}
            </button>
          </div>
        )}

        {employees.map((e) => (
          <div className="list-row" key={e.id}>
            <div
              className="avatar"
              style={{ background: e.color, width: 38, height: 38, fontSize: '0.8125rem', cursor: 'pointer' }}
              onClick={() => setPersonId(e.id)}
            >
              {e.init}
            </div>
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setPersonId(e.id)}>
              <div className="emp-name" style={{ fontSize: '0.8438rem' }}>{e.name}</div>
              <div className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink-soft)' }}>{e.email} · {e.title}</div>
              <div className="skill-tag-row">
                {Object.entries(e.skills).map(([s, l]) => (
                  <span className="skill-tag" key={s}>{s} L{l}</span>
                ))}
              </div>
            </div>
            <div className="mono" style={{ fontSize: '0.7188rem', color: 'var(--ink-soft)', width: 70, textAlign: 'right' }}>
              {weekHoursUsed[e.id] || 0}/{e.capacity}h
            </div>
            <button
              className="btn btn-danger-ghost btn-sm"
              onClick={() => handleRemove(e.id)}
              disabled={removingId === e.id}
            >
              {removingId === e.id ? 'Removing...' : 'Remove'}
            </button>
          </div>
        ))}

        {employees.length === 0 && (
          <div className="empty-note">No team members yet — invite someone to get started.</div>
        )}
      </div>

      {personId && (() => {
        const emp = employees.find((e) => e.id === personId);
        if (!emp) return null;
        const currentTasks = assignments.filter((a) => a.empId === personId);
        return (
          <PersonModal
            emp={emp}
            weekHoursUsed={weekHoursUsed[personId] || 0}
            currentTasks={currentTasks}
            absence={nextAbsence(emp.unavailableDates)}
            onClose={() => setPersonId(null)}
          />
        );
      })()}
    </div>
  );
}
