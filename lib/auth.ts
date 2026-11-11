import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// Who is this signed-in Clerk user inside Aptus?
//
// Clerk only proves *who someone is* (a verified email). Aptus decides *what
// they may do* from the Employee table: the row whose email matches their
// verified Clerk email, and that row's `role` (MANAGER or EMPLOYEE). Managers
// control that table (Team page), so people cannot pick their own role.
//
// - The first sign-in links the Employee row to the Clerk account (clerkId).
//   After that, a different Clerk account claiming the same email is refused.
// - BOOTSTRAP_MANAGER_EMAIL (server-only env var) lets the very first manager
//   get in when the Employee table has no manager row for them yet.

export type AuthState =
  | { status: 'signed-out' }
  | { status: 'no-access'; email: string | null }
  | { status: 'ok'; employee: NonNullable<Awaited<ReturnType<typeof findEmployee>>> };

async function findEmployee(email: string) {
  return prisma.employee.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
}

export async function getAuthState(): Promise<AuthState> {
  const user = await currentUser();
  if (!user) return { status: 'signed-out' };

  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  // Only trust an email Clerk has verified, otherwise anyone could type a
  // manager's address into the sign-up form and inherit their role.
  if (!primary || primary.verification?.status !== 'verified') {
    return { status: 'no-access', email: primary?.emailAddress ?? null };
  }
  const email = primary.emailAddress.trim().toLowerCase();

  let employee = await findEmployee(email);

  if (!employee) {
    const bootstrap = process.env.BOOTSTRAP_MANAGER_EMAIL?.trim().toLowerCase();
    if (bootstrap && bootstrap === email) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || email.split('@')[0];
      employee = await prisma.employee.create({
        data: { name, email, title: 'Manager', role: 'MANAGER', clerkId: user.id },
      });
    } else {
      return { status: 'no-access', email };
    }
  }

  if (employee.clerkId && employee.clerkId !== user.id) {
    return { status: 'no-access', email };
  }
  if (!employee.clerkId) {
    employee = await prisma.employee.update({ where: { id: employee.id }, data: { clerkId: user.id } });
  }

  return { status: 'ok', employee };
}

// For pages and layouts: send people to the right place instead of erroring.
export async function requireManager() {
  const auth = await getAuthState();
  if (auth.status === 'signed-out') redirect('/sign-in');
  if (auth.status === 'no-access') redirect('/no-access');
  if (auth.employee.role !== 'MANAGER') redirect('/my-tasks');
  return auth.employee;
}

export async function requireEmployee() {
  const auth = await getAuthState();
  if (auth.status === 'signed-out') redirect('/sign-in');
  if (auth.status === 'no-access') redirect('/no-access');
  if (auth.employee.role !== 'EMPLOYEE') redirect('/dashboard');
  return auth.employee;
}

// For server actions: these are public HTTP endpoints, so hiding buttons is
// not security. Every action re-checks the role itself and throws if wrong.
export async function assertManager() {
  const auth = await getAuthState();
  if (auth.status !== 'ok' || auth.employee.role !== 'MANAGER') throw new Error('Forbidden');
  return auth.employee;
}

export async function assertEmployee() {
  const auth = await getAuthState();
  if (auth.status !== 'ok' || auth.employee.role !== 'EMPLOYEE') throw new Error('Forbidden');
  return auth.employee;
}
