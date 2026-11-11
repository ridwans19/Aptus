import { prisma } from '@/lib/prisma';
import ScheduleClient from './ScheduleClient';

export default async function SchedulePage() {
  const employeesRaw = await prisma.employee.findMany({
    include: { skills: { include: { skill: true } } },
    orderBy: { createdAt: 'asc' },
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
    skills: Object.fromEntries(e.skills.map((es) => [es.skill.name, es.level])) as Record<string, number>,
    unavailableDates: absencesByEmployee[e.id] || {},
  }));

  const tasks = await prisma.task.findMany({
    include: { requirements: { include: { skill: true } }, project: true },
  });

  const assignments = tasks
    .filter((t) => t.status === 'ASSIGNED' && t.employeeId && t.scheduledDate)
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

  const unassignedTasks = tasks
    .filter((t) => t.status === 'UNASSIGNED')
    .map((t) => ({
      id: t.id,
      name: t.name,
      hours: t.estimatedHours,
      requirements: t.requirements.map((r) => ({ skill: r.skill.name, level: r.level })),
      client: t.project ? t.project.name : null,
    }));

  const skillRows = await prisma.skill.findMany({ orderBy: { name: 'asc' } });
  const skillsList = skillRows.map((s) => s.name);

  const projectRows = await prisma.project.findMany({ orderBy: { name: 'asc' } });
  const projects = projectRows.map((p) => ({ id: p.id, name: p.name }));

  return (
    <ScheduleClient
      employees={employees}
      assignments={assignments}
      unassignedTasks={unassignedTasks}
      skillsList={skillsList}
      projects={projects}
    />
  );
}
