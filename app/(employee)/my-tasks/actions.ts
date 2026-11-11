'use server';

import { prisma } from '@/lib/prisma';
import { assertEmployee } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

type ProgressInput = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

// An employee may only update progress on tasks assigned to themselves.
// The employee id comes from the verified session, never from the browser.
export async function updateMyTaskProgress(taskId: string, progress: ProgressInput, percent?: number) {
  const me = await assertEmployee();
  if (!['NOT_STARTED', 'IN_PROGRESS', 'DONE'].includes(progress)) throw new Error('Invalid progress value.');

  const mine = await prisma.task.findFirst({ where: { id: taskId, employeeId: me.id }, select: { id: true } });
  if (!mine) throw new Error('Forbidden');

  let progressPercent = 0;
  if (progress === 'DONE') progressPercent = 100;
  else if (progress === 'IN_PROGRESS') progressPercent = Math.min(99, Math.max(0, Math.round(percent ?? 0)));

  await prisma.task.update({ where: { id: taskId }, data: { progress, progressPercent } });

  revalidatePath('/my-tasks');
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  revalidatePath('/schedule');
}
