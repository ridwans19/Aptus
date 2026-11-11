'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Assumed working hours per day, matching the default 40h / 5-day employee
// capacity. Used only to give a new task a sensible visual span on the
// Schedule calendar — e.g. a 20h task reads as "spans 3 days", not
// "20 hours crammed into a single day."
const HOURS_PER_DAY = 8;

type AssignInput = {
  taskName: string;
  projectMode: 'new' | 'existing';
  projectName: string;
  existingProjectId: string;
  clientName: string;
  clientInfo: string;
  deadline: string;
  hours: number;
  requirements: { skill: string; level: number; mandatory: boolean }[];
  employeeId: string;
};

export async function assignTask(input: AssignInput) {
  let projectId: string | null = null;

  if (input.projectMode === 'new' && input.projectName.trim()) {
    const project = await prisma.project.create({
      data: {
        name: input.projectName.trim(),
        clientName: input.clientName || null,
        clientInfo: input.clientInfo || null,
        deadline: input.deadline ? new Date(input.deadline) : null,
      },
    });
    projectId = project.id;
  } else if (input.projectMode === 'existing' && input.existingProjectId) {
    projectId = input.existingProjectId;
  }

  const requirementCreates = await Promise.all(
    input.requirements.map(async (r) => {
      const skill = await prisma.skill.upsert({
        where: { name: r.skill },
        update: {},
        create: { name: r.skill },
      });
      return { skillId: skill.id, level: r.level, mandatory: r.mandatory };
    })
  );

  const duration = Math.min(5, Math.max(1, Math.ceil(input.hours / HOURS_PER_DAY)));

  await prisma.task.create({
    data: {
      name: input.taskName,
      estimatedHours: input.hours,
      projectId,
      employeeId: input.employeeId,
      status: 'ASSIGNED',
      scheduledDate: new Date(),
      duration,
      requirements: { create: requirementCreates },
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/smart-allocate');
  revalidatePath('/schedule');
}
