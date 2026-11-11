'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function refreshScheduleViews() {
  revalidatePath('/schedule');
  revalidatePath('/dashboard');
  revalidatePath('/team');
}

// Places a task (whether it was unassigned or already assigned elsewhere) onto
// a specific employee + day. Duration is left untouched by moves between cells;
// callers that want a fresh single-day slot should pass resetDuration.
export async function placeTask(taskId: string, employeeId: string, day: string, resetDuration = false) {
  await prisma.task.update({
    where: { id: taskId },
    data: {
      employeeId,
      scheduledDate: new Date(day + 'T00:00:00.000Z'),
      status: 'ASSIGNED',
      ...(resetDuration ? { duration: 1 } : {}),
    },
  });
  refreshScheduleViews();
}

export async function setDuration(taskId: string, duration: number) {
  await prisma.task.update({ where: { id: taskId }, data: { duration: Math.max(1, duration) } });
  refreshScheduleViews();
}

export async function unassignTask(taskId: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { employeeId: null, scheduledDate: null, status: 'UNASSIGNED', duration: 1 },
  });
  refreshScheduleViews();
}

type QuickAddInput = {
  name: string;
  hours: number;
  requirements: { skill: string; level: number }[];
  employeeId: string;
  day: string;
  projectId: string | null;
};

export async function quickAddTask(input: QuickAddInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Task name is required.');

  const requirementCreates = await Promise.all(
    input.requirements.map(async (r) => {
      const skill = await prisma.skill.upsert({
        where: { name: r.skill },
        update: {},
        create: { name: r.skill },
      });
      return { skillId: skill.id, level: r.level, mandatory: true };
    })
  );

  await prisma.task.create({
    data: {
      name,
      estimatedHours: input.hours,
      projectId: input.projectId,
      employeeId: input.employeeId,
      scheduledDate: new Date(input.day + 'T00:00:00.000Z'),
      duration: 1,
      status: 'ASSIGNED',
      requirements: { create: requirementCreates },
    },
  });

  refreshScheduleViews();
}
