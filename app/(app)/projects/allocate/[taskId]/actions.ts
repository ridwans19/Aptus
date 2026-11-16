'use server';

import { prisma } from '@/lib/prisma';
import { assertManager } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Same 8h working day used when tasks are created.
const HOURS_PER_DAY = 8;

// Assigns (or reassigns) an existing task to one person. The manager can pick
// anyone, including someone who doesn't fully match the skills: the ranking
// page warns about that, but the final call is theirs.
export async function allocateTask(taskId: string, employeeId: string) {
  await assertManager();

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, estimatedHours: true } });
  if (!task) throw new Error('That task no longer exists.');

  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
  if (!employee) throw new Error('That person is no longer on the team.');

  await prisma.task.update({
    where: { id: taskId },
    data: {
      employeeId,
      status: 'ASSIGNED',
      scheduledDate: new Date(),
      duration: Math.min(5, Math.max(1, Math.ceil(task.estimatedHours / HOURS_PER_DAY))),
    },
  });

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  revalidatePath('/schedule');
  revalidatePath('/team');
}
