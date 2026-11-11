import { prisma } from '@/lib/prisma';
import { assignedHoursInWeek } from '@/lib/scheduling';
import TeamClient from './TeamClient';

export default async function TeamPage() {
  const employeesRaw = await prisma.employee.findMany({
    include: { skills: { include: { skill: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const taskRows = await prisma.task.findMany({
    where: { status: 'ASSIGNED' },
    include: { requirements: { include: { skill: true } }, project: true },
  });

  const absences = await prisma.absence.findMany();
  const absencesByEmployee: Record<string, Record<string, { note: string | null }>> = {};
  for (const a of absences) {
    const iso = a.date.toISOString().slice(0, 10);
    (absencesByEmployee[a.employeeId] ??= {})[iso] = { note: a.note };
  }

  const employees = employeesRaw.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    title: e.title,
    init: e.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    color: e.color,
    capacity: e.capacityHours,
    skills: Object.fromEntries(e.skills.map((es) => [es.skill.name, es.level])),
    unavailableDates: absencesByEmployee[e.id] || {},
  }));

  const assignments = taskRows
    .filter((t) => t.employeeId && t.scheduledDate)
    .map((t) => ({
      id: t.id,
      name: t.name,
      hours: t.estimatedHours,
      requirements: t.requirements.map((r) => ({ skill: r.skill.name, level: r.level })),
      client: t.project ? t.project.name : null,
      empId: t.employeeId as string,
      day: (t.scheduledDate as Date).toISOString().slice(0, 10),
      duration: t.duration,
      deadline: t.project?.deadline ? t.project.deadline.toISOString().slice(0, 10) : null,
    }));

  const weekHoursUsed: Record<string, number> = {};
  for (const e of employees) {
    weekHoursUsed[e.id] = assignedHoursInWeek(assignments, e.id, (a) => a.empId, 0);
  }

  return <TeamClient employees={employees} assignments={assignments} weekHoursUsed={weekHoursUsed} />;
}
