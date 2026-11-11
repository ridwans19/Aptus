'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function addSkill(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Skill name cannot be empty.');

  await prisma.skill.upsert({
    where: { name: trimmed },
    update: {},
    create: { name: trimmed },
  });

  revalidatePath('/skills');
  revalidatePath('/smart-allocate');
  revalidatePath('/schedule');
}

export async function removeSkill(skillId: string) {
  const usageCount = await prisma.taskRequirement.count({ where: { skillId } });
  if (usageCount > 0) {
    throw new Error(
      `Can't remove this skill — it's required by ${usageCount} task${usageCount === 1 ? '' : 's'}. Remove it from those tasks first.`
    );
  }

  // Deleting the skill cascades to remove it from every employee's record
  // (EmployeeSkill has onDelete: Cascade back to Skill).
  await prisma.skill.delete({ where: { id: skillId } });

  revalidatePath('/skills');
  revalidatePath('/smart-allocate');
  revalidatePath('/schedule');
}
