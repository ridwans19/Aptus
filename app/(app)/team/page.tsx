'use client';

import { useState } from 'react';
import { employees as initialEmployees, assignedHoursInWeek, type Employee } from '@/lib/mock-data';
import PersonModal from '@/components/PersonModal';

type Invite = { id: string; name: string; email: string };

export default function TeamPage() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);

  function sendInvite() {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInvites((prev) => [...prev, { id: 'inv' + Date.now(), name: inviteName, email: inviteEmail }]);
    setInviteName('');
    setInviteEmail('');
    setShowInviteForm(false);
  }

  function acceptInvite(id: string) {
    const inv = invites.find((i) => i.id === id);
    if (!inv) return;
    const init = inv.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    setEmployees((prev) => [
      ...prev,
      { id: 'e' + Date.now(), name: inv.name, email: inv.email, title: 'New team member', init, color: '#3E7C9B', capacity: 40, skills: {}, unavailableDates: {} },
    ]);
    setInvites((prev) => prev.filter((i) => i.id !== id));
  }

  function removeEmployee(id: string) {
    if (!confirm('Remove this person from the team? Their assignments will be unassigned.')) return;
    setEmployees((prev) => prev.filter((e) => e.id !== id));
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
            <button className="btn btn-primary btn-sm" onClick={sendInvite}>Send invite</button>
          </div>
        )}

        {employees.map((e) => {
          const used = assignedHoursInWeek(e.id);
          return (
            <div className="list-row" key={e.id}>
              <div className="avatar" style={{ background: e.color, width: 38, height: 38, fontSize: '0.8125rem', cursor: 'pointer' }} onClick={() => setPersonId(e.id)}>
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
                {used}/{e.capacity}h
              </div>
              <button className="btn btn-danger-ghost btn-sm" onClick={() => removeEmployee(e.id)}>Remove</button>
            </div>
          );
        })}
      </div>

      {invites.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Pending invitations</h3></div>
          {invites.map((inv) => (
            <div className="list-row" key={inv.id}>
              <div className="avatar" style={{ background: 'var(--ink-faint)', width: 34, height: 34, fontSize: '0.6875rem' }}>
                {inv.name.split(' ').map((w) => w[0]).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{inv.name}</div>
                <div className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink-soft)' }}>{inv.email}</div>
              </div>
              <span className="invite-status">Invitation sent</span>
              <button className="btn btn-outline btn-sm" onClick={() => acceptInvite(inv.id)}>Simulate acceptance</button>
            </div>
          ))}
        </div>
      )}

      {personId && <PersonModal empId={personId} onClose={() => setPersonId(null)} />}
    </div>
  );
}