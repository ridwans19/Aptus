import { prisma } from '@/lib/prisma';
import { requireEmployee } from '@/lib/auth';
import MyTasksClient from './MyTasksClient';

export default async function MyTasksPage() {
  const me = await requireEmployee();

  const rows = await prisma.task.findMany({
    where: { employeeId: me.id },
    include: { project: true, requirements: { include: { skill: true } } },
    orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
  });

  const tasks = rows.map((t) => ({
    id: t.id,
    name: t.name,
    projectName: t.project?.name ?? null,
    clientName: t.project?.clientName ?? null,
    hours: t.estimatedHours,
    deadline: t.project?.deadline ? t.project.deadline.toISOString() : null,
    progress: t.progress as 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE',
    progressPercent: t.progressPercent,
    requirements: t.requirements.map((r) => ({ skill: r.skill.name, level: r.level })),
  }));

  return <MyTasksClient tasks={tasks} />;
}
