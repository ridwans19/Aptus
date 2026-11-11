'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  weekDates,
  toIso,
  dayShort,
  matchScore,
  matchClass,
  assignedHoursInWeek,
  reqSummary,
} from '@/lib/scheduling';
import type { Employee, TaskLite, UnassignedTaskLite, Requirement } from '@/lib/scheduling';
import MiniDial from '@/components/MiniDial';
import { placeTask, setDuration, unassignTask, quickAddTask } from './actions';

const LANE_H = 120;

type Project = { id: string; name: string };

type Props = {
  employees: Employee[];
  assignments: TaskLite[];
  unassignedTasks: UnassignedTaskLite[];
  skillsList: string[];
  projects: Project[];
};

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

function computeLayout(empId: string, dates: Date[], assignments: TaskLite[]) {
  const dateIsoList = dates.map(toIso);
  const items = assignments
    .filter((a) => a.empId === empId && dateIsoList.includes(a.day))
    .map((a) => {
      const startIdx = dateIsoList.indexOf(a.day);
      const duration = Math.max(1, Math.min(a.duration || 1, 5 - startIdx));
      return { a, startIdx, duration };
    })
    .sort((x, y) => x.startIdx - y.startIdx);

  const laneEnds: number[] = [];
  items.forEach((it) => {
    let lane = laneEnds.findIndex((end) => end < it.startIdx);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.startIdx + it.duration - 1);
    } else {
      laneEnds[lane] = it.startIdx + it.duration - 1;
    }
    (it as any).lane = lane;
  });

  return { items, maxLanes: Math.max(1, laneEnds.length) };
}

export default function ScheduleClient({ employees, assignments, unassignedTasks, skillsList, projects }: Props) {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const [quickAdd, setQuickAdd] = useState<{ empId: string; day: string } | null>(null);
  const [qaName, setQaName] = useState('');
  const [qaHours, setQaHours] = useState(8);
  const [qaProjectId, setQaProjectId] = useState<string>('');
  const [qaReqs, setQaReqs] = useState<Requirement[]>([{ skill: skillsList[0] || '', level: 3 }]);
  const [qaSubmitting, setQaSubmitting] = useState(false);

  const dates = weekDates(weekOffset);
  const startLabel = dates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endLabel = dates[4].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const weekLabel = startLabel + ' - ' + endLabel;

  function markBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleDropOnCell(empId: string, day: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOverCell(null);
    const emp = employees.find((x) => x.id === empId);
    if (!emp || emp.unavailableDates[day]) return;

    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const taskId = data.id as string;

    markBusy(taskId, true);
    try {
      await placeTask(taskId, empId, day, data.type === 'tray');
      router.refresh();
    } finally {
      markBusy(taskId, false);
    }
  }

  async function handleUnassign(id: string) {
    markBusy(id, true);
    try {
      await unassignTask(id);
      router.refresh();
    } finally {
      markBusy(id, false);
    }
  }

  async function handleChangeDuration(a: TaskLite, delta: number) {
    const dateIsoList = dates.map(toIso);
    const startIdx = dateIsoList.indexOf(a.day);
    const maxDuration = 5 - startIdx;
    const newDuration = Math.min(maxDuration, Math.max(1, (a.duration || 1) + delta));
    if (newDuration === a.duration) return;

    markBusy(a.id, true);
    try {
      await setDuration(a.id, newDuration);
      router.refresh();
    } finally {
      markBusy(a.id, false);
    }
  }

  function updateQaReq(i: number, field: keyof Requirement, value: string | number) {
    setQaReqs((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addQaReq() {
    setQaReqs((prev) => [...prev, { skill: skillsList[0] || '', level: 3 }]);
  }

  function removeQaReq(i: number) {
    setQaReqs((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function submitQuickAdd() {
    if (!quickAdd || !qaName.trim()) return;
    setQaSubmitting(true);
    try {
      await quickAddTask({
        name: qaName,
        hours: qaHours,
        requirements: qaReqs,
        employeeId: quickAdd.empId,
        day: quickAdd.day,
        projectId: qaProjectId || null,
      });
      setQaName('');
      setQaHours(8);
      setQaProjectId('');
      setQaReqs([{ skill: skillsList[0] || '', level: 3 }]);
      setQuickAdd(null);
      router.refresh();
    } finally {
      setQaSubmitting(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button className="icon-btn" onClick={() => setWeekOffset((o) => o - 1)}>Prev</button>
        <div className="mono" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{weekLabel}</div>
        <button className="icon-btn" onClick={() => setWeekOffset((o) => o + 1)}>Next</button>
        {weekOffset !== 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}>Today</button>
        )}
      </div>

      <div className="allocate-layout">
        <div className="panel cal-wrap">
          <div className="cal-grid">
            <div className="cal-header-row">
              <div className="cal-header-emp">Team member</div>
              {dates.map((d) => (
                <div className="cal-header-day" key={toIso(d)}>
                  {dayShort(d)} <span className="mono" style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>{d.getDate()}</span>
                </div>
              ))}
            </div>

            {employees.map((emp) => {
              const { items, maxLanes } = computeLayout(emp.id, dates, assignments);
              const rowMinH = Math.max(140, maxLanes * LANE_H + 16);
              const topOffset = Math.max(6, (rowMinH - maxLanes * LANE_H) / 2);
              const used = assignedHoursInWeek(assignments, emp.id, (a) => a.empId, weekOffset);
              const pct = Math.min(100, Math.round((used / emp.capacity) * 100));
              const over = used > emp.capacity;
              const dateIsoList = dates.map(toIso);

              return (
                <div className="cal-body-row" key={emp.id}>
                  <div className="emp-cell">
                    <div className="emp-id">
                      <div className="avatar" style={{ background: emp.color, width: 34, height: 34 }}>{emp.init}</div>
                      <div>
                        <div className="emp-name">{emp.name}</div>
                        <div className="cap-bar-track">
                          <div className="cap-bar-fill" style={{ width: pct + '%', background: over ? 'var(--rust)' : pct > 85 ? 'var(--brass)' : 'var(--teal)' }} />
                        </div>
                        <div className="cap-txt mono">{used}/{emp.capacity}h</div>
                      </div>
                    </div>
                  </div>

                  <div className="cal-daysarea" style={{ minHeight: rowMinH, position: 'relative' }}>
                    {dates.map((d, i) => {
                      const key = dateIsoList[i];
                      const off = emp.unavailableDates[key];
                      const cellId = emp.id + '-' + key;
                      const cellClass = 'cal-daycol' + (off ? ' unavailable' : '') + (dragOverCell === cellId ? ' dragover' : '');
                      return (
                        <div
                          key={key}
                          className={cellClass}
                          onDragOver={(e) => { e.preventDefault(); if (!off) setDragOverCell(cellId); }}
                          onDragLeave={() => setDragOverCell(null)}
                          onDrop={(e) => handleDropOnCell(emp.id, key, e)}
                          onClick={() => { if (!off) setQuickAdd({ empId: emp.id, day: key }); }}
                        >
                          {off && (
                            <div className="day-off-label" title={off.note || 'Unavailable'}>
                              <ClockIcon />
                              <span>{off.note || 'Unavailable'}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {items.map(({ a, startIdx, duration, lane }: any) => {
                      const score = matchScore(emp, a, used);
                      const left = (startIdx / 5) * 100;
                      const width = (duration / 5) * 100;
                      const blockClass = 'task-block ' + matchClass(score) + (busyIds.has(a.id) ? ' is-busy' : '');
                      return (
                        <div
                          key={a.id}
                          className={blockClass}
                          style={{ left: 'calc(' + left + '% + 3px)', width: 'calc(' + width + '% - 6px)', top: topOffset + lane * LANE_H, opacity: busyIds.has(a.id) ? 0.5 : 1 }}
                          draggable={!busyIds.has(a.id)}
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'assignment', id: a.id }))}
                        >
                       <div className="chip-top">
  <div style={{ minWidth: 0, flex: 1 }}>
    <div
      className="chip-name"
      title={a.name}
      style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      {a.name}
    </div>
  <div
    className="chip-hrs mono"
    title={a.client || ''}
    style={{ opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
  >
    {a.client}
  </div>

<div
  className="chip-hrs mono"
  title={a.hours + 'h - ' + reqSummary(a.requirements)}
  style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
>
  {a.hours}h - {reqSummary(a.requirements)}
</div>
                            </div>
                            <MiniDial score={score} size={26} />
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => handleChangeDuration(a, -1)} title="Shorter" disabled={busyIds.has(a.id)}>-</button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => handleChangeDuration(a, 1)} title="Longer" disabled={busyIds.has(a.id)}>+</button>
                            <button className="block-remove" onClick={() => handleUnassign(a.id)} title="Unassign" disabled={busyIds.has(a.id)}>x</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Unassigned</h3>
            <span className="pill">{unassignedTasks.length}</span>
          </div>
          <div>
            {unassignedTasks.length ? (
              unassignedTasks.map((t) => (
                <div
                  key={t.id}
                  className="tray-item"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'tray', id: t.id }))}
                >
                  <div className="tray-item-name">{t.name}</div>
                  {t.client && (
                    <div className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink-faint)', marginTop: 2 }}>
                      {t.client}
                    </div>
                  )}
                  <div className="tray-item-meta">
                    <span className="pill req">{reqSummary(t.requirements)}</span>
                    <span className="pill mono">{t.hours}h</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="tray-empty">Every task is assigned. Nice and balanced.</div>
            )}
          </div>
        </div>
      </div>

      {quickAdd && (
        <div className="modal-backdrop" onClick={() => !qaSubmitting && setQuickAdd(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <button className="modal-back" onClick={() => setQuickAdd(null)} disabled={qaSubmitting}>Back / Cancel</button>
              <h3>Add a task</h3>
            </div>
            <div className="modal-body">
              <div className="field-group">
                <label className="field-label">Task name</label>
                <input type="text" value={qaName} onChange={(e) => setQaName(e.target.value)} placeholder="e.g. Fix checkout bug" />
              </div>

              <div className="field-row2">
                <div className="field-group">
                  <label className="field-label">Project</label>
                  <select value={qaProjectId} onChange={(e) => setQaProjectId(e.target.value)}>
                    <option value="">No project (internal task)</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Hours</label>
                  <input type="number" value={qaHours} onChange={(e) => setQaHours(parseInt(e.target.value) || 1)} />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Skills required</label>
                {qaReqs.map((r, i) => (
                  <div className="req-row" key={i}>
                    <select value={r.skill} onChange={(e) => updateQaReq(i, 'skill', e.target.value)}>
                      {skillsList.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <select value={r.level} onChange={(e) => updateQaReq(i, 'level', parseInt(e.target.value))}>
                      {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Level {l}</option>)}
                    </select>
                    {qaReqs.length > 1 && (
                      <button className="rm-btn" onClick={() => removeQaReq(i)} title="Remove">x</button>
                    )}
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }} onClick={addQaReq}>
                  + Add another skill
                </button>
              </div>

              <button className="btn btn-primary" onClick={submitQuickAdd} disabled={qaSubmitting}>
                {qaSubmitting ? 'Adding...' : 'Add to schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
