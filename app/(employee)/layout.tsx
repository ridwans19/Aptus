import { UserButton } from '@clerk/nextjs';
import { requireEmployee } from '@/lib/auth';

// The employee side. Managers are sent to /dashboard by requireEmployee().
export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const employee = await requireEmployee();

  return (
    <div>
      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 28px', borderBottom: '1px solid var(--line)', background: 'var(--surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Space Grotesk', fontWeight: 700, color: '#12161B',
              background: 'linear-gradient(135deg, #E0A75E, #C98A3E)',
            }}
          >
            A
          </div>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700 }}>Aptus</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{employee.name}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--ink-soft)' }}>{employee.title}</div>
          </div>
          <UserButton />
        </div>
      </header>
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>{children}</main>
    </div>
  );
}
