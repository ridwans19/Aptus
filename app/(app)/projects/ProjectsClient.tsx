'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setTaskProgress, deleteProject, deleteTask, createProject, addTask, updateTask } from './actions';

type Requirement = { skill: string; level: number; mandatory: boolean };

type Task = {
  id: string;
  name: string;
  hours: number;
  progress: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
  progressPercent: number;
  deadline: string | null;
  ownDeadline: string | null;
  employee: { id: string; name: string; init: string; color: string } | null;
  requirements: Requirement[];
};

type Project = {
  id: string;
  name: string;
  clientName: string | null;
  clientInfo: string | null;
  deadline: string | null;
  status: 'Pending' | 'In Progress' | 'Done';
  tasks: Task[];
};

type Props = { projects: Project[]; skillsList: string[]; initialProjectId: string | null };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusColor(status: Project['status'] | Task['progress']) {
  if (status === 'Done' || status === 'DONE') return { bg: 'var(--teal-soft)', fg: 'var(--teal)' };
  if (status === 'In Progress' || status === 'IN_PROGRESS') return { bg: 'var(--brass-soft)', fg: 'var(--brass)' };
  return { bg: 'var(--surface-alt)', fg: 'var(--ink-soft)' };
}

function progressLabel(p: Task['progress']) {
  if (p === 'DONE') return 'Done';
  if (p === 'IN_PROGRESS') return 'In progress';
  return 'Not started';
}

function includesText(haystack: (string | null | undefined)[], q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return haystack.some((h) => (h ?? '').toLowerCase().includes(needle));
}

// ---------------------------------------------------------------------------
// Add project popup
// ---------------------------------------------------------------------------
function AddProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientInfo, setClientInfo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setSaving(true);
    setError('');
    try {
      const { id } = await createProject({ name, clientName, clientInfo, deadline });
      onCreated(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the project.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop blurred">
      <div className="modal-card fit" style={{ maxWidth: 500 }}>
        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: 'Space Grotesk' }}>Add project</h3>
            <button className="rm-btn" onClick={onClose} title="Close" disabled={saving}>x</button>
          </div>

          <div className="field-group">
            <label className="field-label">Project name</label>
            <input type="text" placeholder="e.g. Client Portal Revamp" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="field-row2">
            <div className="field-group">
              <label className="field-label">Client / company</label>
              <input type="text" placeholder="e.g. Northbridge Retail" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Client details</label>
            <textarea
              placeholder="Point of contact, background, anything relevant to staffing this work..."
              value={clientInfo}
              onChange={(e) => setClientInfo(e.target.value)}
              style={{ minHeight: 80 }}
            />
          </div>

          {error && <div className="pill warn" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving || !name.trim()}>
              {saving ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add task popup
// ---------------------------------------------------------------------------
function AddTaskModal({
  project,
  skillsList,
  onClose,
  onCreated,
}: {
  project: Project;
  skillsList: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [hours, setHours] = useState(8);
  const [reqs, setReqs] = useState<Requirement[]>([{ skill: skillsList[0] ?? '', level: 3, mandatory: true }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const noSkills = skillsList.length === 0;

  function updateReq(i: number, field: keyof Requirement, value: string | number | boolean) {
    setReqs((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  async function submit() {
    setSaving(true);
    setError('');
    try {
      await addTask({ projectId: project.id, name, hours, requirements: reqs });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the task.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop blurred">
      <div className="modal-card fit" style={{ maxWidth: 520 }}>
        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontFamily: 'Space Grotesk' }}>Add task</h3>
            <button className="rm-btn" onClick={onClose} title="Close" disabled={saving}>x</button>
          </div>
          <div className="field-hint" style={{ marginBottom: 16 }}>
            Under <strong>{project.name}</strong>. You choose who does it afterwards with Smart Allocate.
          </div>

          <div className="field-row2">
            <div className="field-group" style={{ gridColumn: 'span 1' }}>
              <label className="field-label">Task name</label>
              <input type="text" placeholder="e.g. Build login flow" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Hours needed</label>
              <input type="number" min={1} max={1000} value={hours} onChange={(e) => setHours(parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Skills required</label>
            {noSkills ? (
              <div className="field-hint">Add skills in the Skill catalog on the Team page first, then come back.</div>
            ) : (
              reqs.map((r, i) => (
                <div className="req-row" key={i}>
                  <select value={r.skill} onChange={(e) => updateReq(i, 'skill', e.target.value)}>
                    {skillsList.map((sk) => (
                      <option key={sk}>{sk}</option>
                    ))}
                  </select>
                  <select value={r.level} onChange={(e) => updateReq(i, 'level', parseInt(e.target.value))}>
                    {[1, 2, 3, 4, 5].map((l) => (
                      <option key={l} value={l}>Level {l}</option>
                    ))}
                  </select>
                  <label className="check-row">
                    <input type="checkbox" checked={r.mandatory} onChange={(e) => updateReq(i, 'mandatory', e.target.checked)} />
                    Required
                  </label>
                  {reqs.length > 1 && (
                    <button className="rm-btn" onClick={() => setReqs((prev) => prev.filter((_, idx) => idx !== i))} title="Remove">x</button>
                  )}
                </div>
              ))
            )}
            {!noSkills && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ paddingLeft: 0 }}
                onClick={() => setReqs((prev) => [...prev, { skill: skillsList[0] ?? '', level: 3, mandatory: false }])}
              >
                + Add another skill
              </button>
            )}
          </div>

          {error && <div className="pill warn" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving || noSkills || !name.trim()}>
              {saving ? 'Adding...' : 'Add task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task detail: edit the task, then Smart allocate
// ---------------------------------------------------------------------------
function TaskDetailModal({ task, skillsList, onClose }: { task: Task; skillsList: string[]; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Editable details
  const [name, setName] = useState(task.name);
  const [hours, setHours] = useState(task.hours);
  const [deadline, setDeadline] = useState(task.ownDeadline ?? '');
  const [reqs, setReqs] = useState<Requirement[]>(
    task.requirements.length ? task.requirements : [{ skill: skillsList[0] ?? '', level: 3, mandatory: true }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Progress
  const [progress, setProgress] = useState<Task['progress']>(task.progress);
  const [percent, setPercent] = useState(task.progressPercent);

  const normalise = (rs: Requirement[]) =>
    JSON.stringify([...rs].sort((a, b) => a.skill.localeCompare(b.skill)).map((r) => [r.skill, r.level, r.mandatory]));
  const dirty =
    name.trim() !== task.name ||
    hours !== task.hours ||
    deadline !== (task.ownDeadline ?? '') ||
    normalise(reqs) !== normalise(task.requirements);
  const canSave = dirty && !saving && name.trim().length > 0 && hours >= 1 && reqs.every((r) => r.skill);

  function updateReq(i: number, field: keyof Requirement, value: string | number | boolean) {
    setReqs((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  async function save() {
    setSaving(true);
    setError('');
    // Drop duplicate skills before sending, so what's shown matches what's stored.
    const seen = new Set<string>();
    const cleaned = reqs.filter((r) => r.skill && !seen.has(r.skill) && seen.add(r.skill));
    try {
      await updateTask({ taskId: task.id, name, hours, deadline, requirements: cleaned });
      setReqs(cleaned);
      setName(name.trim());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the changes.');
    } finally {
      setSaving(false);
    }
  }

  function changeProgress(next: Task['progress']) {
    const nextPercent = next === 'DONE' ? 100 : next === 'NOT_STARTED' ? 0 : percent;
    setProgress(next);
    setPercent(nextPercent);
    startTransition(async () => {
      await setTaskProgress(task.id, next, nextPercent);
      router.refresh();
    });
  }

  function commitPercent() {
    startTransition(async () => {
      await setTaskProgress(task.id, 'IN_PROGRESS', percent);
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(`Delete the task "${task.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteTask(task.id);
      onClose();
      router.refresh();
    });
  }

  const barColor = statusColor(progress).fg;

  return (
    <div className="modal-backdrop blurred" onClick={onClose}>
      <div className="modal-card fit" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-head">
          <button className="modal-back" onClick={onClose}>
            ← Back
          </button>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.0625rem' }}>{task.name}</div>
          <div style={{ fontSize: '0.7812rem', color: 'var(--ink-soft)' }}>
            {task.employee ? `Assigned to ${task.employee.name}` : 'Not yet assigned to anyone'}
          </div>
        </div>

        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Task name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="field-row2">
            <div className="field-group">
              <label className="field-label">Estimated hours</label>
              <input type="number" min={1} max={1000} value={hours} onChange={(e) => setHours(parseInt(e.target.value) || 1)} />
            </div>
            <div className="field-group">
              <label className="field-label">Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="field-hint" style={{ margin: '-8px 0 16px' }}>
            {deadline
              ? 'Clear the date to use the project deadline instead.'
              : task.deadline
                ? `No task deadline set, so the project deadline applies (${fmtDate(task.deadline)}).`
                : 'No deadline set.'}
          </div>

          <div className="field-group">
            <label className="field-label">Skills needed</label>
            {skillsList.length === 0 && <div className="field-hint">Add skills in the Skill catalog on the Team page to choose from them here.</div>}
            {reqs.map((r, i) => (
              <div className="req-row" key={i}>
                <select value={r.skill} onChange={(e) => updateReq(i, 'skill', e.target.value)}>
                  {!skillsList.includes(r.skill) && r.skill && <option value={r.skill}>{r.skill}</option>}
                  {skillsList.map((sk) => (
                    <option key={sk}>{sk}</option>
                  ))}
                </select>
                <select value={r.level} onChange={(e) => updateReq(i, 'level', parseInt(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((l) => (
                    <option key={l} value={l}>Level {l}</option>
                  ))}
                </select>
                <label className="check-row">
                  <input type="checkbox" checked={r.mandatory} onChange={(e) => updateReq(i, 'mandatory', e.target.checked)} />
                  Required
                </label>
                {reqs.length > 1 ? (
                  <button className="rm-btn" onClick={() => setReqs((prev) => prev.filter((_, idx) => idx !== i))} title="Remove">x</button>
                ) : (
                  <span />
                )}
              </div>
            ))}
            {skillsList.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ paddingLeft: 0 }}
                onClick={() => setReqs((prev) => [...prev, { skill: skillsList[0] ?? '', level: 3, mandatory: false }])}
              >
                + Add another skill
              </button>
            )}
          </div>

          {error && <div className="pill warn" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>}

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <div className="field-label">Progress</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {(['NOT_STARTED', 'IN_PROGRESS', 'DONE'] as const).map((opt) => (
                <button
                  key={opt}
                  className={`btn btn-sm ${progress === opt ? 'btn-primary' : 'btn-ghost'}`}
                  disabled={isPending}
                  onClick={() => changeProgress(opt)}
                >
                  {progressLabel(opt)}
                </button>
              ))}
            </div>

            {progress === 'IN_PROGRESS' && (
              <div>
                <input
                  type="range"
                  min={0}
                  max={99}
                  value={percent}
                  onChange={(e) => setPercent(parseInt(e.target.value))}
                  onMouseUp={commitPercent}
                  onTouchEnd={commitPercent}
                  onKeyUp={commitPercent}
                  style={{ width: '100%' }}
                  disabled={isPending}
                />
                <div className="mono field-hint" style={{ textAlign: 'right' }}>{percent}% complete</div>
              </div>
            )}

            <div className="cap-bar-track" style={{ width: '100%', marginTop: 6 }}>
              <div className="cap-bar-fill" style={{ width: `${percent}%`, background: barColor }} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger-ghost btn-sm" onClick={remove} disabled={isPending || saving}>
            Delete task
          </button>
          <span className="spacer" />
          {dirty && <span className="field-hint" style={{ margin: 0 }}>Save before allocating</span>}
          <button className="btn btn-outline" onClick={save} disabled={!canSave}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {dirty || saving ? (
            <button className="btn btn-primary" disabled title="Save your changes first">
              {task.employee ? 'Reassign' : 'Smart allocate'}
            </button>
          ) : (
            <Link href={`/projects/allocate/${task.id}`} className="btn btn-primary">
              {task.employee ? 'Reassign' : 'Smart allocate'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ProjectsClient({ projects, skillsList, initialProjectId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(
    projects.find((p) => p.id === initialProjectId)?.id ?? projects[0]?.id ?? null
  );
  const [projectSearch, setProjectSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const detailTask = selected?.tasks.find((t) => t.id === detailTaskId) ?? null;
  const visibleProjects = projects.filter((p) => includesText([p.name, p.clientName], projectSearch));
  const visibleTasks = selected
    ? selected.tasks.filter((t) =>
        includesText([t.name, t.employee?.name, ...t.requirements.map((r) => r.skill)], taskSearch)
      )
    : [];

  function selectProject(id: string) {
    setSelectedId(id);
    setTaskSearch('');
  }

  function handleDeleteProject(p: Project) {
    const ok = window.confirm(
      `Delete "${p.name}"? This will also delete its ${p.tasks.length} task${p.tasks.length === 1 ? '' : 's'} and free up any assigned employees. This can't be undone.`
    );
    if (!ok) return;
    startTransition(async () => {
      await deleteProject(p.id);
      if (selectedId === p.id) setSelectedId(null);
      router.refresh();
    });
  }

  const selectedStatus = selected ? statusColor(selected.status) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '1.0625rem', margin: 0 }}>Projects</h2>
        <button className="btn btn-primary" onClick={() => setShowAddProject(true)}>+ Add project</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 18, alignItems: 'start' }}>
        {/* Project list */}
        <div className="panel">
          <div className="panel-head">
            <h3>All projects</h3>
            <span className="pill">{projects.length}</span>
          </div>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
            <input
              type="text"
              placeholder="Search projects..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
            />
          </div>
          <div>
            {visibleProjects.map((p) => {
              const c = statusColor(p.status);
              const active = p.id === selectedId;
              return (
                <div
                  key={p.id}
                  onClick={() => selectProject(p.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--line)',
                    cursor: 'pointer',
                    background: active ? 'var(--surface-alt)' : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  <div className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink-faint)', marginTop: 2 }}>
                    {p.tasks.length} task{p.tasks.length === 1 ? '' : 's'}
                    {p.deadline ? ` · due ${fmtDate(p.deadline)}` : ''}
                  </div>
                  <span className="pill" style={{ background: c.bg, color: c.fg, marginTop: 6, display: 'inline-block' }}>
                    {p.status}
                  </span>
                </div>
              );
            })}
            {projects.length === 0 && <div className="empty-note">No projects yet. Use “Add project” to create one.</div>}
            {projects.length > 0 && visibleProjects.length === 0 && <div className="empty-note">No project matches your search.</div>}
          </div>
        </div>

        {/* Selected project's tasks */}
        <div className="panel">
          {!selected && (
            <>
              <div className="panel-head"><h3>Select a project</h3></div>
              <div className="empty-note">Pick a project on the left to see its tasks.</div>
            </>
          )}

          {selected && (
            <>
              <div className="panel-head" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0 }}>{selected.name}</h3>
                  <div className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink-faint)', marginTop: 4 }}>
                    {selected.clientName ? `${selected.clientName} · ` : ''}
                    {selected.deadline ? `due ${fmtDate(selected.deadline)}` : 'no deadline'}
                  </div>
                  {selectedStatus && (
                    <span className="pill" style={{ background: selectedStatus.bg, color: selectedStatus.fg, marginTop: 6, display: 'inline-block' }}>
                      {selected.status}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowAddTask(true)}>+ Add task</button>
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => handleDeleteProject(selected)} disabled={isPending}>
                    Delete project
                  </button>
                </div>
              </div>

              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <input
                  type="text"
                  placeholder="Search tasks by name, person or skill..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                />
              </div>

              <div>
                {selected.tasks.length === 0 && (
                  <div className="empty-note">No tasks under this project yet. Use “Add task” to create the first one.</div>
                )}
                {selected.tasks.length > 0 && visibleTasks.length === 0 && (
                  <div className="empty-note">No task matches your search.</div>
                )}
                {visibleTasks.map((t) => {
                  const c = statusColor(t.progress);
                  return (
                    <div
                      key={t.id}
                      className="modal-task-card"
                      style={{ margin: '12px 16px', cursor: 'pointer' }}
                      onClick={() => setDetailTaskId(t.id)}
                    >
                      <div className="modal-task-top">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="modal-task-name">{t.name}</div>
                          <div className="modal-task-meta">
                            {t.employee ? t.employee.name : 'Unassigned'} · {t.hours}h
                            {t.deadline ? ` · due ${fmtDate(t.deadline)}` : ''}
                          </div>
                        </div>
                        {t.employee && (
                          <div className="avatar" style={{ background: t.employee.color, width: 28, height: 28, fontSize: '0.6875rem' }}>
                            {t.employee.init}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <div className="cap-bar-track" style={{ flex: 1, width: 'auto' }}>
                          <div className="cap-bar-fill" style={{ width: `${t.progressPercent}%`, background: c.fg }} />
                        </div>
                        <span className="pill" style={{ background: c.bg, color: c.fg }}>
                          {progressLabel(t.progress)}{t.progress === 'IN_PROGRESS' ? ` · ${t.progressPercent}%` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {showAddProject && (
        <AddProjectModal
          onClose={() => setShowAddProject(false)}
          onCreated={(id) => {
            setShowAddProject(false);
            setSelectedId(id);
            router.refresh();
          }}
        />
      )}

      {showAddTask && selected && (
        <AddTaskModal
          project={selected}
          skillsList={skillsList}
          onClose={() => setShowAddTask(false)}
          onCreated={() => {
            setShowAddTask(false);
            router.refresh();
          }}
        />
      )}

      {detailTask && selected && (
        <TaskDetailModal
          key={detailTask.id}
          task={detailTask}
          skillsList={skillsList}
          onClose={() => setDetailTaskId(null)}
        />
      )}
    </div>
  );
}
