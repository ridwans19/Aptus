import { requireManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SmartAllocateClient from './SmartAllocateClient';

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

export default async function SmartAllocatePage() {
  await requireManager();
  const employeesRaw = await prisma.employee.findMany({
    include: { skills: { include: { skill: true } } },
  });

  const skillRows = await prisma.skill.findMany({ orderBy: { name: 'asc' } });
  const skillsList = skillRows.map((s) => s.name);

  const projectRows = await prisma.project.findMany({ orderBy: { name: 'asc' } });
  const projects = projectRows.map((p) => ({ id: p.id, name: p.name }));

  const { monday, friday } = currentWeekRange();
  const assignedTasks = await prisma.task.findMany({
    where: { status: 'ASSIGNED', scheduledDate: { gte: monday, lte: friday } },
  });

  const weekHours: Record<string, number> = {};
  for (const t of assignedTasks) {
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
    <SmartAllocateClient
      employees={employees}
      skillsList={skillsList}
      projects={projects}
      weekHours={weekHours}
    />
  );
}
