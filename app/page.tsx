import { redirect } from 'next/navigation';
import { getAuthState } from '@/lib/auth';

// Front door: sends each person to the side that matches their role.
export default async function Home() {
  const auth = await getAuthState();
  if (auth.status === 'signed-out') redirect('/sign-in');
  if (auth.status === 'no-access') redirect('/no-access');
  redirect(auth.employee.role === 'MANAGER' ? '/dashboard' : '/my-tasks');
}
