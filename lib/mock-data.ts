export type Requirement = { skill: string; level: number };

export type Employee = {
  id: string;
  name: string;
  email: string;
  title: string;
  init: string;
  color: string;
  capacity: number;
  skills: Record<string, number>;
  unavailableDates: Record<string, { note: string }>;
};

export type Assignment = {
  id: string;
  name: string;
  hours: number;
  requirements: Requirement[];
  client: string | null; // the project this task belongs to
  empId: string;
  day: string; // ISO date
  duration: number;
  deadline: string | null;
};

export type UnassignedTask = {
  id: string;
  name: string;
  hours: number;
  requirements: Requirement[];
  client: string | null;
};

export const skillsList = ['Next.js', 'PostgreSQL', 'UI Design', 'Testing', 'DevOps'];

export const projects = ['Client Portal Revamp', 'Internal Analytics Tool'];

export const employees: Employee[] = [
  {
    id: 'e1', name: 'Sarah Chen', email: 'sarah@brightframe.io', title: 'Frontend Engineer',
    init: 'SC', color: '#2F6F63', capacity: 40,
    skills: { 'Next.js': 5, 'PostgreSQL': 4, 'Testing': 3 },
    unavailableDates: {},
  },
  {
    id: 'e2', name: 'Adam Osei', email: 'adam@brightframe.io', title: 'Backend Engineer',
    init: 'AO', color: '#C98A3E', capacity: 40,
    skills: { 'Next.js': 4, 'PostgreSQL': 2, 'DevOps': 4 },
    unavailableDates: {},
  },
  {
    id: 'e3', name: 'John Park', email: 'john@brightframe.io', title: 'QA Engineer',
    init: 'JP', color: '#5B6570', capacity: 40,
    skills: { 'Next.js': 3, 'UI Design': 4, 'Testing': 4 },
    unavailableDates: { '2026-09-25': { note: 'Annual leave' } },
  },
  {
    id: 'e4', name: 'Mia Torres', email: 'mia@brightframe.io', title: 'Product Designer',
    init: 'MT', color: '#C1554B', capacity: 40,
    skills: { 'UI Design': 5, 'Next.js': 3, 'DevOps': 2 },
    unavailableDates: { '2026-09-18': { note: 'Team offsite - out of office' } },
  },
];

export const assignments: Assignment[] = [
  {
    id: 'a1', name: 'Build login flow', hours: 12,
    requirements: [{ skill: 'Next.js', level: 4 }],
    client: 'Client Portal Revamp',
    empId: 'e1', day: '2026-09-14', duration: 1, deadline: '2026-09-22',
  },
  {
    id: 'a2', name: 'API rate limiting', hours: 8,
    requirements: [{ skill: 'DevOps', level: 3 }],
    client: 'Internal Analytics Tool',
    empId: 'e2', day: '2026-09-15', duration: 2, deadline: '2026-09-28',
  },
];

export const unassignedTasks: UnassignedTask[] = [
  {
    id: 't3', name: 'Auth database schema', hours: 14,
    requirements: [{ skill: 'PostgreSQL', level: 3 }],
    client: 'Client Portal Revamp',
  },
  {
    id: 't4', name: 'Dashboard UI polish', hours: 10,
    requirements: [{ skill: 'UI Design', level: 4 }],
    client: null,
  },
];

// --- Date / week helpers ---

export const MS_DAY = 86400000;

function mondayOf(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function weekDates(offset: number): Date[] {
  const start = new Date(mondayOf(new Date()).getTime() + offset * 7 * MS_DAY);
  return [0, 1, 2, 3, 4].map((i) => new Date(start.getTime() + i * MS_DAY));
}

export function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

export function dayShort(d: Date) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

export function fmtDate(iso: string) {
  const parts = iso.split('-').map(Number);
  const y = parts[0], m = parts[1], d = parts[2];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d + ' ' + MONTHS[m - 1] + ' ' + y;
}

// --- Scoring helpers ---

export function assignedHoursInWeek(empId: string, weekOffset = 0) {
  const dates = weekDates(weekOffset).map(toIso);
  return assignments
    .filter((a) => a.empId === empId && dates.includes(a.day))
    .reduce((s, a) => s + a.hours, 0);
}

export function matchScore(
  emp: Employee,
  task: { requirements: Requirement[]; hours: number },
  weekOffset = 0
) {
  const perReq = task.requirements.map((r) => {
    const lvl = emp.skills[r.skill];
    if (lvl === undefined) return 22;
    if (lvl >= r.level) return Math.min(97, 80 + (lvl - r.level) * 6);
    return 42 + lvl * 6;
  });
  let score = Math.round(perReq.reduce((a, b) => a + b, 0) / perReq.length);

  const remaining = emp.capacity - assignedHoursInWeek(emp.id, weekOffset);
  if (remaining < task.hours) score = Math.round(score * 0.82);
  return Math.max(12, Math.round(score));
}

export function matchClass(score: number) {
  return score >= 80 ? 'match-high' : score >= 55 ? 'match-mid' : 'match-low';
}

export function nextAbsence(emp: Employee) {
  const today = toIso(new Date());
  const upcoming = Object.entries(emp.unavailableDates)
    .filter(([date]) => date >= today)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return upcoming.length ? { date: upcoming[0][0], note: upcoming[0][1].note } : null;
}

export function reqSummary(requirements: Requirement[]) {
  return requirements.map((r) => r.skill + ' L' + r.level).join(', ');
}
