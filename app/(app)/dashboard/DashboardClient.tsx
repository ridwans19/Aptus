'use client';

import { useState } from 'react';
import PersonModal from '@/components/PersonModal';
import { reqSummary } from '@/lib/mock-data';
import type { Employee, Assignment, UnassignedTask } from '@/lib/mock-data';

type Props = {
  employees: Employee[];
  assignments: Assignment[];
  unassignedTasks: UnassignedTask[];
};

function hoursFor(empId: string, assignments: Assignment[]) {
  return assignments.filter((a) => a.empId === empId).reduce((s, a) => s + a.hours, 0);
}

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return 'In ' + diff + ' days';
}

export default function DashboardClient({ employees, assignments, unassignedTasks }: Props) {
  const [search, setSearch] = useState('');
  const [listModal, setListModal] = useState<'team' | 'tasks' | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);

  const totalCap = employees.reduce((s, e) => s + e.capacity, 0);
  const totalUsed = employees.reduce((s, e) => s + hoursFor(e.id, assignments), 0);
  const overloaded = employees.filter((e) => hoursFor(e.id, assignments) > e.capacity).length;

  const searchMatches = search
    ? employees.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const upcomingDeadlines = assignments
    .filter((a) => a.deadline)
    .sort((a, b) => ((a.deadline as string) < (b.deadline as string) ? -1 : 1));

  function openPerson(id: string) {
    setListModal(null);
    setPersonId(id);
  }

  return (
    <div>
      <div className="dash-search-wrap">
        <input
          type="text"
          placeholder="Search a person..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <div className="dash-search-results open">
            {searchMatches.length ? (
              searchMatches.map((e) => (
                <div key={e.id} className="dash-search-item" onClick={() => { setSearch(''); openPerson(e.id); }}>
                  <div className="avatar" style={{ background: e.color, width: 26, height: 26, fontSize: '0.6562rem' }}>
                    {e.init}
                  </div>
                  <span>{e.name}</span>
                </div>
              ))
            ) : (
              <div className="dash-search-empty">No matches</div>
            )}
          </div>
        )}
      </div>

      <div className="dash-hero">
        <div className="dash-stat" style={{ cursor: 'pointer' }} onClick={() => setListModal('team')}>
          <div className="dash-num">{employees.length}</div>
          <div className="dash-label">Team members</div>
        </div>
        <div className="dash-stat" style={{ cursor: 'pointer' }} onClick={() => setListModal('tasks')}>
          <div className="dash-num">{unassignedTasks.length}</div>
          <div className="dash-label">Unassigned tasks</div>
        </div>
        <div className="dash-stat">
          <div className="dash-num">{totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0}%</div>
          <div className="dash-label">Team utilisation</div>
          <div className="dash-flag" style={{ color: 'var(--teal)' }}>
            <span className="dot" style={{ background: 'var(--teal)' }} />
            Healthy
          </div>
        </div>
        <div className="dash-stat">
          <div className="dash-num">{overloaded}</div>
          <div className="dash-label">Overloaded this week</div>
          <div className="dash-flag" style={{ color: overloaded > 0 ? 'var(--rust)' : 'var(--teal)' }}>
            <span className="dot" style={{ background: overloaded > 0 ? 'var(--rust)' : 'var(--teal)' }} />
            {overloaded > 0 ? 'Needs review' : 'None'}
          </div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head">
          <h3>Workload by person</h3>
          <span className="pill">This week - click a name for detail</span>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {employees.map((e) => {
            const used = hoursFor(e.id, assignments);
            const pct = e.capacity > 0 ? Math.min(100, Math.round((used / e.capacity) * 100)) : 0;
            const over = used > e.capacity;
            return (
              <div key={e.id} className="workload-row" style={{ cursor: 'pointer' }} onClick={() => openPerson(e.id)}>
                <div className="avatar" style={{ background: e.color, width: 28, height: 28, fontSize: '0.6875rem' }}>
                  {e.init}
                </div>
                <div style={{ width: 120, fontSize: '0.7812rem', fontWeight: 600 }}>{e.name}</div>
                <div className="thread-track">
                  <div
                    className="thread-fill"
                    style={{ width: pct + '%', background: over ? 'var(--rust)' : pct > 85 ? 'var(--brass)' : 'var(--teal)' }}
                  />
                </div>
                <div className="mono" style={{ fontSize: '0.7188rem', color: 'var(--ink-soft)', width: 70, textAlign: 'right' }}>
                  {used}/{e.capacity}h
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head">
          <h3>Upcoming deadlines</h3>
          <span className="pill">{upcomingDeadlines.length} across all projects</span>
        </div>
        {upcomingDeadlines.length === 0 && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--ink-faint)', padding: '12px 0' }}>
            Nothing on the calendar right now.
          </div>
        )}
        {upcomingDeadlines.map((a) => {
          const emp = employees.find((e) => e.id === a.empId);
          return (
            <div key={a.id} className="workload-row" style={{ cursor: 'pointer' }} onClick={() => openPerson(a.empId)}>
              <div style={{ width: 160, fontSize: '0.7812rem', fontWeight: 600 }}>{a.name}</div>
              <div className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink-faint)', flex: 1 }}>
                {a.client} - {emp?.name}
              </div>
              <div
                className="mono"
                style={{ fontSize: '0.7188rem', fontWeight: 600, color: daysUntil(a.deadline as string) === 'Overdue' ? 'var(--rust)' : 'var(--ink-soft)' }}
              >
                {daysUntil(a.deadline as string)}
              </div>
            </div>
          );
        })}
      </div>

      {listModal === 'team' && (
        <div className="modal-backdrop" onClick={() => setListModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <button className="modal-back" onClick={() => setListModal(null)}>Back / Close</button>
              <h3>Team members</h3>
            </div>
            <div className="modal-body">
              {employees.map((e) => (
                <div
                  key={e.id}
                  className="modal-task-card"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={() => openPerson(e.id)}
                >
                  <div className="avatar" style={{ background: e.color, width: 34, height: 34 }}>
                    {e.init}
                  </div>
                  <div>
                    <div className="modal-task-name">{e.name}</div>
                    <div className="modal-task-meta">{e.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {listModal === 'tasks' && (
        <div className="modal-backdrop" onClick={() => setListModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <button className="modal-back" onClick={() => setListModal(null)}>Back / Close</button>
              <h3>Unassigned tasks</h3>
            </div>
            <div className="modal-body">
              {unassignedTasks.map((t) => (
                <div key={t.id} className="modal-task-card">
                  <div className="modal-task-name">{t.name}</div>
                  <div className="modal-task-meta">Needs {reqSummary(t.requirements)} - {t.hours}h estimated</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {personId && <PersonModal empId={personId} onClose={() => setPersonId(null)} />}
    </div>
  );
}
