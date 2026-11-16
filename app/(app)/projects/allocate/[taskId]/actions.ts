'use server';

import { prisma } from '@/lib/prisma';
import { assertManager } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Same 8h working day used when tasks are created.
const HOURS_PER_DAY = 8;

// Assigns (or reassigns) an existing task to one person. The server re-checks
// that they have every required skill, so this can't be bypassed from the UI.
export async function allocateTask(taskId: string, employeeId: string) {
  await assertManager();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { requirements: { include: { skill: true } } },
  });
  if (!task) throw new Error('That task no longer exists.');

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { skills: { include: { skill: true } } },
  });
  if (!employee) throw new Error('That person is no longer on the team.');

  const has = new Set(employee.skills.map((es) => es.skill.name));
  const missing = task.requirements.filter((r) => r.mandatory && !has.has(r.skill.name));
  if (missing.length) {
    throw new Error('Missing required skill: ' + missing.map((m) => m.skill.name).join(', ') + '.');
  }

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
