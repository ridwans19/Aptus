import { notFound } from 'next/navigation';
import { requireManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AllocateClient from './AllocateClient';

function currentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return { monday, friday };
}

export default async function AllocatePage({ params }: { params: Promise<{ taskId: string }> }) {
  await requireManager();
  const { taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true, employee: true, requirements: { include: { skill: true } } },
  });
  if (!task) notFound();

  const employeesRaw = await prisma.employee.findMany({
    include: { skills: { include: { skill: true } } },
    orderBy: { name: 'asc' },
  });

  // Hours already booked this week. The task being allocated is left out so
  // reassigning doesn't count its own hours against its current owner.
  const { monday, friday } = currentWeekRange();
  const booked = await prisma.task.findMany({
    where: { status: 'ASSIGNED', id: { not: task.id }, scheduledDate: { gte: monday, lte: friday } },
  });
  const weekHours: Record<string, number> = {};
  for (const t of booked) {
    if (!t.employeeId) continue;
    weekHours[t.employeeId] = (weekHours[t.employeeId] || 0) + t.estimatedHours;
  }

  const employees = employeesRaw.map((e) => ({
    id: e.id,
    name: e.name,
    title: e.title,
    init: e.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    color: e.color,
    capacity: e.capacityHours,
    skills: Object.fromEntries(e.skills.map((es) => [es.skill.name, es.level])) as Record<string, number>,
  }));

  return (
    <AllocateClient
      task={{
        id: task.id,
        name: task.name,
        hours: task.estimatedHours,
        projectId: task.projectId,
        projectName: task.project?.name ?? null,
        clientName: task.project?.clientName ?? null,
        assignedTo: task.employee ? task.employee.name : null,
        assignedToId: task.employeeId,
        requirements: task.requirements.map((r) => ({ skill: r.skill.name, level: r.level, mandatory: r.mandatory })),
      }}
      employees={employees}
      weekHours={weekHours}
    />
  );
}
