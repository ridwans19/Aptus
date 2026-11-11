'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setTaskProgress, deleteProject } from './actions';

type Requirement = { skill: string; level: number };

type Task = {
  id: string;
  name: string;
  hours: number;
  progress: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
  progressPercent: number;
  deadline: string | null;
  employee: { id: string; name: string; init: string; color: string } | null;
  requirements: Requirement[];
};

type Project = {
  id: string;
  name: string;
  clientName: string | null;
  deadline: string | null;
  status: 'Pending' | 'In Progress' | 'Done';
  tasks: Task[];
};

type Props = { projects: Project[] };

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

export default function ProjectsClient({ projects }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(projects[0]?.id ?? null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [draftPercent, setDraftPercent] = useState(0);

  const selected = projects.find((p) => p.id === selectedId) ?? null;

  function openDetail(t: Task) {
    setDetailTask(t);
    setDraftPercent(t.progressPercent);
  }

  function handleDelete(p: Project) {
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

  function handleProgressChange(task: Task, progress: Task['progress']) {
    const percent = progress === 'DONE' ? 100 : progress === 'NOT_STARTED' ? 0 : draftPercent;
    startTransition(async () => {
      await setTaskProgress(task.id, progress, percent);
      router.refresh();
    });
    setDetailTask((cur) => (cur ? { ...cur, progress, progressPercent: percent } : cur));
  }

  function handlePercentCommit(task: Task, percent: number) {
    startTransition(async () => {
      await setTaskProgress(task.id, 'IN_PROGRESS', percent);
      router.refresh();
    });
    setDetailTask((cur) => (cur ? { ...cur, progress: 'IN_PROGRESS', progressPercent: percent } : cur));
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '1.0625rem', margin: 0 }}>Projects</h2>
        <div className="field-hint" style={{ margin: 0 }}>
          New projects are created from Smart Allocate when you assign a task to a new project.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 18, alignItems: 'start' }}>
        {/* Project list */}
        <div className="panel">
          <div className="panel-head">
            <h3>All projects</h3>
            <span className="pill">{projects.length}</span>
          </div>
          <div>
            {projects.length ? (
              projects.map((p) => {
                const c = statusColor(p.status);
                const active = p.id === selectedId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--line)',
                      cursor: 'pointer',
                      background: active ? 'var(--surface-alt)' : 'transparent',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
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
                    <button
                      className="btn btn-danger-ghost btn-sm"
                      style={{ padding: '4px 8px', flexShrink: 0 }}
                      title="Delete project"
                      disabled={isPending}
                      onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                    >
                      Delete
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="empty-note">No projects yet. Create one from Smart Allocate.</div>
            )}
          </div>
        </div>

        {/* Selected project's tasks */}
        <div className="panel">
          <div className="panel-head">
            <h3>{selected ? selected.name : 'Select a project'}</h3>
            {selected && <span className="pill">{selected.tasks.length} task{selected.tasks.length === 1 ? '' : 's'}</span>}
          </div>
          <div>
            {!selected && <div className="empty-note">Pick a project on the left to see its tasks.</div>}
            {selected && selected.tasks.length === 0 && (
              <div className="empty-note">No tasks under this project yet.</div>
            )}
            {selected &&
              selected.tasks.map((t) => {
                const c = statusColor(t.progress);
                return (
                  <div
                    key={t.id}
                    className="modal-task-card"
                    style={{ margin: '12px 16px', cursor: 'pointer' }}
                    onClick={() => openDetail(t)}
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
        </div>
      </div>

      {/* Task detail / progress editor */}
      {detailTask && (
        <div className="modal-backdrop" onClick={() => setDetailTask(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <button className="modal-back" onClick={() => setDetailTask(null)}>
                ← Back
              </button>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.0625rem' }}>
                {detailTask.name}
              </div>
              <div style={{ fontSize: '0.7812rem', color: 'var(--ink-soft)' }}>
                {detailTask.employee ? `Assigned to ${detailTask.employee.name}` : 'Not yet assigned to anyone'}
              </div>
            </div>

            <div className="modal-body">
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: 16 }}>
                {detailTask.hours}h estimated
                {detailTask.deadline ? ` · due ${fmtDate(detailTask.deadline)}` : ' · no deadline set'}
              </div>

              <div className="field-label">Skills needed</div>
              <div className="skill-tag-row" style={{ marginBottom: 16 }}>
                {detailTask.requirements.length ? (
                  detailTask.requirements.map((r) => (
                    <span className="skill-tag" key={r.skill}>
                      {r.skill} L{r.level}
                    </span>
                  ))
                ) : (
                  <span className="field-hint">No specific skills required</span>
                )}
              </div>

              <div className="field-label">Progress</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {(['NOT_STARTED', 'IN_PROGRESS', 'DONE'] as const).map((opt) => (
                  <button
                    key={opt}
                    className={`btn btn-sm ${detailTask.progress === opt ? 'btn-primary' : 'btn-ghost'}`}
                    disabled={isPending}
                    onClick={() => handleProgressChange(detailTask, opt)}
                  >
                    {progressLabel(opt)}
                  </button>
                ))}
              </div>

              {detailTask.progress === 'IN_PROGRESS' && (
                <div>
                  <input
                    type="range"
                    min={0}
                    max={99}
                    value={draftPercent}
                    onChange={(e) => setDraftPercent(parseInt(e.target.value))}
                    onMouseUp={() => handlePercentCommit(detailTask, draftPercent)}
                    onTouchEnd={() => handlePercentCommit(detailTask, draftPercent)}
                    style={{ width: '100%' }}
                    disabled={isPending}
                  />
                  <div className="mono field-hint" style={{ textAlign: 'right' }}>{draftPercent}% complete</div>
                </div>
              )}

              <div className="cap-bar-track" style={{ width: '100%', marginTop: 6 }}>
                <div
                  className="cap-bar-fill"
                  style={{ width: `${detailTask.progress === 'IN_PROGRESS' ? draftPercent : detailTask.progressPercent}%`, background: statusColor(detailTask.progress).fg }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
