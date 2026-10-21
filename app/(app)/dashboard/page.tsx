import { prisma } from '@/lib/prisma';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const employees = await prisma.employee.findMany({
    include: { skills: { include: { skill: true } } },
  });

  const tasks = await prisma.task.findMany({
    include: {
      requirements: { include: { skill: true } },
      project: true,
    },
  });

  const assignedTasks = tasks.filter((t) => t.status === 'ASSIGNED');
  const unassignedTasksRaw = tasks.filter((t) => t.status === 'UNASSIGNED');

  const shapedEmployees = employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    title: e.title,
    init: e.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    color: e.color,
    capacity: e.capacityHours,
    skills: Object.fromEntries(e.skills.map((es) => [es.skill.name, es.level])),
    unavailableDates: {} as Record<string, { note: string }>,
  }));

  const shapedAssignments = assignedTasks.map((t) => ({
    id: t.id,
    name: t.name,
    hours: t.estimatedHours,
    requirements: t.requirements.map((r) => ({ skill: r.skill.name, level: r.level })),
    client: t.project ? t.project.name : null,
    empId: t.employeeId as string,
    day: t.scheduledDate ? t.scheduledDate.toISOString().slice(0, 10) : '',
    duration: t.duration,
    deadline: t.project && t.project.deadline ? t.project.deadline.toISOString().slice(0, 10) : null,
  }));

  const shapedUnassigned = unassignedTasksRaw.map((t) => ({
    id: t.id,
    name: t.name,
    hours: t.estimatedHours,
    requirements: t.requirements.map((r) => ({ skill: r.skill.name, level: r.level })),
    client: t.project ? t.project.name : null,
  }));

  return (
    <DashboardClient
      employees={shapedEmployees}
      assignments={shapedAssignments}
      unassignedTasks={shapedUnassigned}
    />
  );
}