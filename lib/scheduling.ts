// Shared, data-agnostic helpers used by Dashboard, Team, Skills, and Schedule.
// These replace the equivalents in lib/mock-data.ts, which closed over hardcoded
// sample arrays. Every function here takes its data as a parameter instead, so it
// works the same whether the caller fetched from Prisma or from a test fixture.

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
  unavailableDates: Record<string, { note: string | null }>;
};

export type TaskLite = {
  id: string;
  name: string;
  hours: number;
  requirements: Requirement[];
  client: string | null;
  empId: string;
  day: string; // ISO date
  duration: number;
  deadline: string | null;
};

export type UnassignedTaskLite = {
  id: string;
  name: string;
  hours: number;
  requirements: Requirement[];
  client: string | null;
};

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

// Monday 00:00:00 - Friday 23:59:59 for a given week offset from the current week.
// Use this when querying the database for "this week's" assigned tasks.
export function weekRange(offset = 0): { start: Date; end: Date } {
  const dates = weekDates(offset);
  const start = dates[0];
  const end = new Date(dates[4]);
  end.setHours(23, 59, 59, 999);
  return { start, end };
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
  const y = parts[0],
    m = parts[1],
    d = parts[2];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return d + ' ' + MONTHS[m - 1] + ' ' + y;
}

// Sum of `hours` across a list of ISO-dated assignments that fall within the given week.
export function assignedHoursInWeek<T extends { day: string; hours: number }>(
  assignments: T[],
  empId: string,
  getEmpId: (a: T) => string,
  weekOffset = 0
) {
  const dates = weekDates(weekOffset).map(toIso);
  return assignments
    .filter((a) => getEmpId(a) === empId && dates.includes(a.day))
    .reduce((s, a) => s + a.hours, 0);
}

// How well `emp` fits `task`, as a 0-100 score. `hoursAlreadyBooked` is the
// employee's committed hours in the relevant week, computed by the caller
// (e.g. via assignedHoursInWeek) since what counts as "this week" depends on
// which week is being viewed.
export function matchScore(
  emp: { capacity: number; skills: Record<string, number> },
  task: { requirements: Requirement[]; hours: number },
  hoursAlreadyBooked: number
) {
  const perReq = task.requirements.map((r) => {
    const lvl = emp.skills[r.skill];
    if (lvl === undefined) return 22;
    if (lvl >= r.level) return Math.min(97, 80 + (lvl - r.level) * 6);
    return 42 + lvl * 6;
  });
  let score = Math.round(perReq.reduce((a, b) => a + b, 0) / perReq.length);

  const remaining = emp.capacity - hoursAlreadyBooked;
  if (remaining < task.hours) score = Math.round(score * 0.82);
  return Math.max(12, Math.round(score));
}

export function matchClass(score: number) {
  return score >= 80 ? 'match-high' : score >= 55 ? 'match-mid' : 'match-low';
}

// Earliest upcoming absence (today or later) from a map of ISO date -> note.
export function nextAbsence(unavailableDates: Record<string, { note: string | null }>) {
  const today = toIso(new Date());
  const upcoming = Object.entries(unavailableDates)
    .filter(([date]) => date >= today)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return upcoming.length ? { date: upcoming[0][0], note: upcoming[0][1].note } : null;
}

export function reqSummary(requirements: Requirement[]) {
  return requirements.map((r) => r.skill + ' L' + r.level).join(', ');
}
