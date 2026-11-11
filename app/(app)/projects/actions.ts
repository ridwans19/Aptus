'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function refreshProjectViews() {
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  revalidatePath('/schedule');
  revalidatePath('/smart-allocate');
}

type ProgressInput = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

// Updates how much of a task's work is actually done. NOT_STARTED and DONE
// snap the percent to 0/100 so the two stay consistent; IN_PROGRESS keeps
// whatever percent the manager sets (clamped to a sane 0-99 range, since
// 100% belongs to DONE).
export async function setTaskProgress(taskId: string, progress: ProgressInput, percent?: number) {
  let progressPercent = 0;
  if (progress === 'DONE') progressPercent = 100;
  else if (progress === 'IN_PROGRESS') progressPercent = Math.min(99, Math.max(0, percent ?? 0));

  await prisma.task.update({
    where: { id: taskId },
    data: { progress, progressPercent },
  });

  refreshProjectViews();
}

// Deleting a project removes all of its tasks too (and, via the existing
// cascade on TaskRequirement, their skill requirements). Deleting a task
// that was assigned to someone is itself the "unassign" - there's no
// separate step needed, since the Task row is what held that booking.
export async function deleteProject(projectId: string) {
  await prisma.task.deleteMany({ where: { projectId } });
  await prisma.project.delete({ where: { id: projectId } });

  refreshProjectViews();
}
