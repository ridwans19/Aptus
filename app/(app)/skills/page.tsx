import { requireManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SkillsClient from './SkillsClient';

export default async function SkillsPage() {
  await requireManager();
  const skillRows = await prisma.skill.findMany({ orderBy: { name: 'asc' } });
  const employeesRaw = await prisma.employee.findMany({
    include: { skills: { include: { skill: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const skills = skillRows.map((s) => ({ id: s.id, name: s.name }));

  const employees = employeesRaw.map((e) => ({
    id: e.id,
    name: e.name,
    init: e.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    color: e.color,
    skills: Object.fromEntries(e.skills.map((es) => [es.skill.name, es.level])) as Record<string, number>,
  }));

  return <SkillsClient skills={skills} employees={employees} />;
}
