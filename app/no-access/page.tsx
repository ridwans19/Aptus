import { redirect } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';
import { getAuthState } from '@/lib/auth';

export default async function NoAccessPage() {
  const auth = await getAuthState();
  if (auth.status === 'signed-out') redirect('/sign-in');
  if (auth.status === 'ok') redirect('/');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="panel" style={{ maxWidth: 440, padding: 28 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', margin: '0 0 10px' }}>You are not on a team yet</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', lineHeight: 1.6, margin: '0 0 8px' }}>
          {auth.email ? (
            <>
              You are signed in as <strong>{auth.email}</strong>, but that email is not on any team in Aptus.
            </>
          ) : (
            <>Your account does not have a verified email address.</>
          )}
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', lineHeight: 1.6, margin: '0 0 18px' }}>
          Ask your manager to add this exact email on the Team page, then sign in again. If you used a different email
          to sign up, sign out and use the one your manager added.
        </p>
        <SignOutButton redirectUrl="/sign-in">
          <button className="btn btn-primary">Sign out</button>
        </SignOutButton>
      </div>
    </div>
  );
}
