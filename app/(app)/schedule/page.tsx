'use client';

import { useState } from 'react';
import {
  employees,
  assignments as initialAssignments,
  unassignedTasks as initialUnassigned,
  weekDates,
  toIso,
  dayShort,
  matchScore,
  matchClass,
  assignedHoursInWeek,
  skillsList,
  projects,
  reqSummary,
  type Assignment,
  type UnassignedTask,
  type Requirement,
} from '@/lib/mock-data';
import MiniDial from '@/components/MiniDial';

const LANE_H = 120;

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

function computeLayout(empId: string, dates: Date[], assignments: Assignment[]) {
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

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [unassignedTasks, setUnassignedTasks] = useState<UnassignedTask[]>(initialUnassigned);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [taskSeq, setTaskSeq] = useState(5);

  const [quickAdd, setQuickAdd] = useState<{ empId: string; day: string } | null>(null);
  const [qaName, setQaName] = useState('');
  const [qaHours, setQaHours] = useState(8);
  const [qaProject, setQaProject] = useState<string>('');
  const [qaReqs, setQaReqs] = useState<Requirement[]>([{ skill: skillsList[0], level: 3 }]);

  const dates = weekDates(weekOffset);
  const startLabel = dates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endLabel = dates[4].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const weekLabel = startLabel + ' - ' + endLabel;

  function handleDropOnCell(empId: string, day: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOverCell(null);
    const emp = employees.find((x) => x.id === empId)!;
    if (emp.unavailableDates[day]) return;

    const data = JSON.parse(e.dataTransfer.getData('text/plain'));

    if (data.type === 'tray') {
      const task = unassignedTasks.find((t) => t.id === data.id);
      if (!task) return;
      setUnassignedTasks((prev) => prev.filter((t) => t.id !== data.id));
      setAssignments((prev) => [
        ...prev,
        {
          id: 'a' + Date.now(),
          name: task.name,
          hours: task.hours,
          requirements: task.requirements,
          client: task.client,
          empId,
          day,
          duration: 1,
          deadline: null,
        },
      ]);
    } else {
      setAssignments((prev) => prev.map((a) => (a.id === data.id ? { ...a, empId, day } : a)));
    }
  }

  function unassignTask(id: string) {
    const a = assignments.find((x) => x.id === id);
    if (!a) return;
    setAssignments((prev) => prev.filter((x) => x.id !== id));
    setUnassignedTasks((prev) => [
      ...prev,
      { id: 't' + taskSeq, name: a.name, hours: a.hours, requirements: a.requirements, client: a.client },
    ]);
    setTaskSeq((s) => s + 1);
  }

  function changeDuration(id: string, delta: number) {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const dateIsoList = dates.map(toIso);
        const startIdx = dateIsoList.indexOf(a.day);
        const maxDuration = 5 - startIdx;
        const newDuration = Math.min(maxDuration, Math.max(1, (a.duration || 1) + delta));
        return { ...a, duration: newDuration };
      })
    );
  }

  function updateQaReq(i: number, field: keyof Requirement, value: string | number) {
    setQaReqs((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addQaReq() {
    setQaReqs((prev) => [...prev, { skill: skillsList[0], level: 3 }]);
  }

  function removeQaReq(i: number) {
    setQaReqs((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function submitQuickAdd() {
    if (!quickAdd || !qaName.trim()) return;
    setAssignments((prev) => [
      ...prev,
      {
        id: 'a' + Date.now(),
        name: qaName,
        hours: qaHours,
        requirements: qaReqs,
        client: qaProject || null,
        empId: quickAdd.empId,
        day: quickAdd.day,
        duration: 1,
        deadline: null,
      },
    ]);
    setQaName('');
    setQaHours(8);
    setQaProject('');
    setQaReqs([{ skill: skillsList[0], level: 3 }]);
    setQuickAdd(null);
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
              const used = assignedHoursInWeek(emp.id, weekOffset);
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
                      const score = matchScore(emp, a, weekOffset);
                      const left = (startIdx / 5) * 100;
                      const width = (duration / 5) * 100;
                      const blockClass = 'task-block ' + matchClass(score);
                      return (
                        <div
                          key={a.id}
                          className={blockClass}
                          style={{ left: 'calc(' + left + '% + 3px)', width: 'calc(' + width + '% - 6px)', top: topOffset + lane * LANE_H }}
                          draggable
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
    title={a.client}
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
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => changeDuration(a.id, -1)} title="Shorter">-</button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => changeDuration(a.id, 1)} title="Longer">+</button>
                            <button className="block-remove" onClick={() => unassignTask(a.id)} title="Unassign">x</button>
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
        <div className="modal-backdrop" onClick={() => setQuickAdd(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <button className="modal-back" onClick={() => setQuickAdd(null)}>Back / Cancel</button>
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
                  <select value={qaProject} onChange={(e) => setQaProject(e.target.value)}>
                    <option value="">No project (internal task)</option>
                    {projects.map((p) => <option key={p}>{p}</option>)}
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

              <button className="btn btn-primary" onClick={submitQuickAdd}>
                Add to schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
