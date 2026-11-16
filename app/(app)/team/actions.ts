'use server';

import { assertManager } from '@/lib/auth';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const PALETTE = ['#2F6F63', '#C98A3E', '#5B6570', '#C1554B', '#3E7C9B', '#8C6FB5', '#4C8B4C'];

function refreshTeamViews() {
  revalidatePath('/team');
  revalidatePath('/dashboard');
  revalidatePath('/projects');
  revalidatePath('/schedule');
}

export async function inviteEmployee(input: { name: string; email: string }) {
  await assertManager();
  const name = input.name.trim();
  const email = input.email.trim();
  if (!name || !email) throw new Error('Name and email are required.');

  const count = await prisma.employee.count();
  const color = PALETTE[count % PALETTE.length];

  await prisma.employee.create({
    data: {
      name,
      email,
      title: 'New team member',
      color,
    },
  });

  refreshTeamViews();
}

export async function removeEmployee(employeeId: string) {
  const me = await assertManager();
  // Removing your own row would lock you out of the manager side.
  if (me.id === employeeId) throw new Error("You can't remove your own account.");

  // Unassign their tasks first (send them back to the pool) rather than
  // leaving orphaned assignments, then delete the employee record.
  await prisma.task.updateMany({
    where: { employeeId },
    data: { employeeId: null, status: 'UNASSIGNED', scheduledDate: null },
  });

  await prisma.employee.delete({ where: { id: employeeId } });

  refreshTeamViews();
}

// ---- Skills a person has ----------------------------------------------------

// Adds a skill to a person, or changes their level if they already have it.
// The skill must already be in the catalog (add it there first).
export async function setEmployeeSkill(employeeId: string, skillName: string, level: number) {
  await assertManager();
  const lvl = Math.round(Number(level));
  if (!Number.isFinite(lvl) || lvl < 1 || lvl > 5) throw new Error('Level must be between 1 and 5.');

  const skill = await prisma.skill.findUnique({ where: { name: skillName } });
  if (!skill) throw new Error(`"${skillName}" is not in the skill catalog yet. Add it there first.`);

  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
  if (!employee) throw new Error('That person is no longer on the team.');

  await prisma.employeeSkill.upsert({
    where: { employeeId_skillId: { employeeId, skillId: skill.id } },
    update: { level: lvl },
    create: { employeeId, skillId: skill.id, level: lvl },
  });

  refreshTeamViews();
}

export async function removeEmployeeSkill(employeeId: string, skillName: string) {
  await assertManager();
  const skill = await prisma.skill.findUnique({ where: { name: skillName } });
  if (!skill) return;

  await prisma.employeeSkill.deleteMany({ where: { employeeId, skillId: skill.id } });

  refreshTeamViews();
}

// ---- The skill catalog (all skills that can be picked) ----------------------

export async function addSkill(name: string) {
  await assertManager();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Skill name cannot be empty.');
  if (trimmed.length > 60) throw new Error('Skill name is too long.');

  await prisma.skill.upsert({
    where: { name: trimmed },
    update: {},
    create: { name: trimmed },
  });

  refreshTeamViews();
}

export async function removeSkill(skillId: string) {
  await assertManager();
  const usageCount = await prisma.taskRequirement.count({ where: { skillId } });
  if (usageCount > 0) {
    throw new Error(
      `Can't remove this skill — it's required by ${usageCount} task${usageCount === 1 ? '' : 's'}. Remove it from those tasks first.`
    );
  }

  // Deleting the skill cascades to remove it from every employee's record
  // (EmployeeSkill has onDelete: Cascade back to Skill).
  await prisma.skill.delete({ where: { id: skillId } });

  refreshTeamViews();
}
