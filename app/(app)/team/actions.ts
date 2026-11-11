'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const PALETTE = ['#2F6F63', '#C98A3E', '#5B6570', '#C1554B', '#3E7C9B', '#8C6FB5', '#4C8B4C'];

export async function inviteEmployee(input: { name: string; email: string }) {
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

  revalidatePath('/team');
  revalidatePath('/dashboard');
  revalidatePath('/smart-allocate');
  revalidatePath('/schedule');
  revalidatePath('/skills');
}

export async function removeEmployee(employeeId: string) {
  // Unassign their tasks first (send them back to the pool) rather than
  // leaving orphaned assignments, then delete the employee record.
  await prisma.task.updateMany({
    where: { employeeId },
    data: { employeeId: null, status: 'UNASSIGNED', scheduledDate: null },
  });

  await prisma.employee.delete({ where: { id: employeeId } });

  revalidatePath('/team');
  revalidatePath('/dashboard');
  revalidatePath('/smart-allocate');
  revalidatePath('/schedule');
  revalidatePath('/skills');
}
