'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateMyTaskProgress } from './actions';

type Progress = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

type Task = {
  id: string;
  name: string;
  projectName: string | null;
  clientName: string | null;
  hours: number;
  deadline: string | null;
  progress: Progress;
  progressPercent: number;
  requirements: { skill: string; level: number }[];
};

const LABEL: Record<Progress, string> = { NOT_STARTED: 'Not started', IN_PROGRESS: 'In progress', DONE: 'Done' };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TaskCard({ task }: { task: Task }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<Progress>(task.progress);
  const [percent, setPercent] = useState(task.progressPercent);

  function save(nextProgress: Progress, nextPercent: number) {
    const finalPercent = nextProgress === 'DONE' ? 100 : nextProgress === 'NOT_STARTED' ? 0 : nextPercent;
    setProgress(nextProgress);
    setPercent(finalPercent);
    startTransition(async () => {
      await updateMyTaskProgress(task.id, nextProgress, finalPercent);
      router.refresh();
    });
  }

  const color = progress === 'DONE' ? 'var(--teal)' : progress === 'IN_PROGRESS' ? 'var(--brass)' : 'var(--ink-faint)';

  return (
    <div className="panel" style={{ padding: 18, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '1rem' }}>{task.name}</div>
          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: 4 }}>
            {task.projectName ?? 'No project'}
            {task.clientName ? ` · ${task.clientName}` : ''} · {task.hours}h
            {task.deadline ? ` · due ${fmtDate(task.deadline)}` : ''}
          </div>
        </div>
        <span className="pill" style={{ alignSelf: 'flex-start', color, background: 'var(--surface-alt)' }}>
          {LABEL[progress]}
          {progress === 'IN_PROGRESS' ? ` · ${percent}%` : ''}
        </span>
      </div>

      <div className="skill-tag-row" style={{ marginTop: 10 }}>
        {task.requirements.map((r) => (
          <span className="skill-tag" key={r.skill}>
            {r.skill} L{r.level}
          </span>
        ))}
      </div>

      <div className="cap-bar-track" style={{ width: '100%', margin: '14px 0 10px' }}>
        <div className="cap-bar-fill" style={{ width: `${percent}%`, background: color }} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['NOT_STARTED', 'IN_PROGRESS', 'DONE'] as const).map((opt) => (
          <button
            key={opt}
            className={`btn btn-sm ${progress === opt ? 'btn-primary' : 'btn-ghost'}`}
            disabled={isPending}
            onClick={() => save(opt, percent)}
          >
            {LABEL[opt]}
          </button>
        ))}
      </div>

      {progress === 'IN_PROGRESS' && (
        <div style={{ marginTop: 10 }}>
          <input
            type="range"
            min={0}
            max={99}
            value={percent}
            disabled={isPending}
            onChange={(e) => setPercent(parseInt(e.target.value))}
            onMouseUp={() => save('IN_PROGRESS', percent)}
            onTouchEnd={() => save('IN_PROGRESS', percent)}
            onKeyUp={() => save('IN_PROGRESS', percent)}
            style={{ width: '100%' }}
          />
          <div className="mono field-hint" style={{ textAlign: 'right' }}>{percent}% complete</div>
        </div>
      )}
    </div>
  );
}

export default function MyTasksClient({ tasks }: { tasks: Task[] }) {
  const open = tasks.filter((t) => t.progress !== 'DONE').length;

  return (
    <div>
      <h2 style={{ fontFamily: 'Space Grotesk', margin: '0 0 4px' }}>My tasks</h2>
      <div className="field-hint" style={{ margin: '0 0 18px' }}>
        {tasks.length === 0 ? 'Nothing has been assigned to you yet.' : `${open} open · ${tasks.length - open} done`}
      </div>
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} />
      ))}
    </div>
  );
}
