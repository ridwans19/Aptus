import { prisma } from '@/lib/prisma';
import ProjectsClient from './ProjectsClient';

export default async function ProjectsPage() {
  const projectsRaw = await prisma.project.findMany({
    include: {
      tasks: {
        include: {
          employee: true,
          requirements: { include: { skill: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const projects = projectsRaw.map((p) => {
    const tasks = p.tasks.map((t) => ({
      id: t.id,
      name: t.name,
      hours: t.estimatedHours,
      progress: t.progress as 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE',
      progressPercent: t.progressPercent,
      deadline: p.deadline ? p.deadline.toISOString() : null,
      employee: t.employee
        ? {
            id: t.employee.id,
            name: t.employee.name,
            init: t.employee.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
            color: t.employee.color,
          }
        : null,
      requirements: t.requirements.map((r) => ({ skill: r.skill.name, level: r.level })),
    }));

    // No dedicated status field on Project - derive it from its tasks so
    // there's nothing extra to keep in sync by hand.
    let status: 'Pending' | 'In Progress' | 'Done' = 'Pending';
    if (tasks.length > 0) {
      if (tasks.every((t) => t.progress === 'DONE')) status = 'Done';
      else if (tasks.some((t) => t.progress !== 'NOT_STARTED')) status = 'In Progress';
    }

    return {
      id: p.id,
      name: p.name,
      clientName: p.clientName,
      deadline: p.deadline ? p.deadline.toISOString() : null,
      status,
      tasks,
    };
  });

  return <ProjectsClient projects={projects} />;
}
