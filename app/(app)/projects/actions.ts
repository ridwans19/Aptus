'use server';

import { assertManager } from '@/lib/auth';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function refreshProjectViews() {
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  revalidatePath('/schedule');
  revalidatePath('/team');
}

type ProgressInput = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

// Updates how much of a task's work is actually done. NOT_STARTED and DONE
// snap the percent to 0/100 so the two stay consistent; IN_PROGRESS keeps
// whatever percent the manager sets (clamped to a sane 0-99 range, since
// 100% belongs to DONE).
export async function setTaskProgress(taskId: string, progress: ProgressInput, percent?: number) {
  await assertManager();
  if (!['NOT_STARTED', 'IN_PROGRESS', 'DONE'].includes(progress)) throw new Error('Invalid progress value.');
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
  await assertManager();
  await prisma.task.deleteMany({ where: { projectId } });
  await prisma.project.delete({ where: { id: projectId } });

  refreshProjectViews();
}

// ---- Creating projects and tasks -------------------------------------------

type RequirementInput = { skill: string; level: number; mandatory: boolean };

// Hours -> calendar days, matching the 8h working day used elsewhere.
const HOURS_PER_DAY = 8;

export async function createProject(input: {
  name: string;
  clientName: string;
  clientInfo: string;
  deadline: string;
}) {
  await assertManager();
  const name = input.name.trim();
  if (!name) throw new Error('Project name is required.');
  if (name.length > 120) throw new Error('Project name is too long.');

  let deadline: Date | null = null;
  if (input.deadline) {
    deadline = new Date(input.deadline);
    if (Number.isNaN(deadline.getTime())) throw new Error('That deadline is not a valid date.');
  }

  const project = await prisma.project.create({
    data: {
      name,
      clientName: input.clientName.trim() || null,
      clientInfo: input.clientInfo.trim() || null,
      deadline,
    },
  });

  refreshProjectViews();
  return { id: project.id };
}

// Adds an unassigned task to a project. Who does it is decided afterwards
// with Smart Allocate, from the task's detail view.
export async function addTask(input: {
  projectId: string;
  name: string;
  hours: number;
  requirements: RequirementInput[];
}) {
  await assertManager();
  const name = input.name.trim();
  if (!name) throw new Error('Task name is required.');
  if (name.length > 120) throw new Error('Task name is too long.');
  const hours = Math.round(Number(input.hours));
  if (!Number.isFinite(hours) || hours < 1 || hours > 1000) throw new Error('Hours must be between 1 and 1000.');

  const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { id: true } });
  if (!project) throw new Error('That project no longer exists.');

  // One requirement per skill; keep the first if the same skill is listed twice.
  const seen = new Set<string>();
  const reqs = input.requirements
    .map((r) => ({
      skill: r.skill.trim(),
      level: Math.min(5, Math.max(1, Math.round(Number(r.level) || 1))),
      mandatory: Boolean(r.mandatory),
    }))
    .filter((r) => r.skill && !seen.has(r.skill) && seen.add(r.skill));
  if (reqs.length === 0) throw new Error('Add at least one skill the task needs.');

  const requirementCreates = await Promise.all(
    reqs.map(async (r) => {
      const skill = await prisma.skill.upsert({ where: { name: r.skill }, update: {}, create: { name: r.skill } });
      return { skillId: skill.id, level: r.level, mandatory: r.mandatory };
    })
  );

  const task = await prisma.task.create({
    data: {
      name,
      estimatedHours: hours,
      projectId: project.id,
      status: 'UNASSIGNED',
      duration: Math.min(5, Math.max(1, Math.ceil(hours / HOURS_PER_DAY))),
      requirements: { create: requirementCreates },
    },
  });

  refreshProjectViews();
  return { id: task.id };
}

export async function deleteTask(taskId: string) {
  await assertManager();
  await prisma.task.delete({ where: { id: taskId } });
  refreshProjectViews();
}
