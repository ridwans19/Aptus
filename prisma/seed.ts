import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const skillNames = ['Next.js', 'PostgreSQL', 'UI Design', 'Testing', 'DevOps'];
  const skills = await Promise.all(
    skillNames.map((name) => prisma.skill.upsert({ where: { name }, update: {}, create: { name } }))
  );
  const skillId = (name: string) => skills.find((s) => s.name === name)!.id;

  const sarah = await prisma.employee.create({
    data: {
      name: 'Sarah Chen', email: 'sarah@brightframe.io', title: 'Frontend Engineer',
      color: '#2F6F63', role: 'MANAGER',
      skills: { create: [
        { skillId: skillId('Next.js'), level: 5 },
        { skillId: skillId('PostgreSQL'), level: 4 },
        { skillId: skillId('Testing'), level: 3 },
      ]},
    },
  });

  const adam = await prisma.employee.create({
    data: {
      name: 'Adam Osei', email: 'adam@brightframe.io', title: 'Backend Engineer',
      color: '#C98A3E',
      skills: { create: [
        { skillId: skillId('Next.js'), level: 4 },
        { skillId: skillId('PostgreSQL'), level: 2 },
        { skillId: skillId('DevOps'), level: 4 },
      ]},
    },
  });

  const john = await prisma.employee.create({
    data: {
      name: 'John Park', email: 'john@brightframe.io', title: 'QA Engineer',
      color: '#5B6570',
      skills: { create: [
        { skillId: skillId('Next.js'), level: 3 },
        { skillId: skillId('UI Design'), level: 4 },
        { skillId: skillId('Testing'), level: 4 },
      ]},
      absences: { create: [{ date: new Date('2026-09-25'), note: 'Annual leave' }] },
    },
  });

  const mia = await prisma.employee.create({
    data: {
      name: 'Mia Torres', email: 'mia@brightframe.io', title: 'Product Designer',
      color: '#C1554B',
      skills: { create: [
        { skillId: skillId('UI Design'), level: 5 },
        { skillId: skillId('Next.js'), level: 3 },
        { skillId: skillId('DevOps'), level: 2 },
      ]},
      absences: { create: [{ date: new Date('2026-09-18'), note: 'Team offsite — out of office' }] },
    },
  });

  const project = await prisma.project.create({
    data: { name: 'Client Portal Revamp', clientName: 'Northbridge Retail', deadline: new Date('2026-09-22') },
  });
  const project2 = await prisma.project.create({
    data: { name: 'Internal Analytics Tool', deadline: new Date('2026-09-28') },
  });

  await prisma.task.create({
    data: {
      name: 'Build login flow', estimatedHours: 12, requiredSkillId: skillId('Next.js'), requiredLevel: 4,
      projectId: project.id, employeeId: sarah.id, scheduledDate: new Date('2026-09-14'), duration: 1, status: 'ASSIGNED',
    },
  });
  await prisma.task.create({
    data: {
      name: 'API rate limiting', estimatedHours: 8, requiredSkillId: skillId('DevOps'), requiredLevel: 3,
      projectId: project2.id, employeeId: adam.id, scheduledDate: new Date('2026-09-15'), duration: 2, status: 'ASSIGNED',
    },
  });
  await prisma.task.create({
    data: { name: 'Auth database schema', estimatedHours: 14, requiredSkillId: skillId('PostgreSQL'), requiredLevel: 3, status: 'UNASSIGNED' },
  });
  await prisma.task.create({
    data: { name: 'Dashboard UI polish', estimatedHours: 10, requiredSkillId: skillId('UI Design'), requiredLevel: 4, status: 'UNASSIGNED' },
  });

  console.log('Seed complete:', { sarah: sarah.id, adam: adam.id, john: john.id, mia: mia.id });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());