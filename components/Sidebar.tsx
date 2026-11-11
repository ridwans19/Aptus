'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState} from 'react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/projects', label: 'Projects', icon: 'folder' },
  { href: '/smart-allocate', label: 'Smart Allocate', icon: 'sparkle', hero: true },
  { href: '/schedule', label: 'Schedule', icon: 'calendar' },
  { href: '/team', label: 'Team', icon: 'users' },
  { href: '/skills', label: 'Skills', icon: 'matrix' },
];

const ICONS: Record<string, React.ReactNode> = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M15.5 14.2c2.4.3 4.5 2.3 4.5 5.8" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  ),
  matrix: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="6" cy="6" r="1.4" /><circle cx="12" cy="6" r="1.4" /><circle cx="18" cy="6" r="1.4" />
      <circle cx="6" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="18" cy="12" r="1.4" opacity=".35" />
      <circle cx="6" cy="18" r="1.4" /><circle cx="12" cy="18" r="1.4" opacity=".35" /><circle cx="18" cy="18" r="1.4" opacity=".35" />
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2l1.8 5.6L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.4L12 2z" />
      <path d="M19 13l.7 2.1L22 16l-2.3.9L19 19l-.7-2.1L16 16l2.3-.9L19 13z" opacity=".55" />
    </svg>
  ),
};

export default function Sidebar() {
  const pathname = usePathname();
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);

  return (
    <aside className="sidebar">
      <div style={{ position: 'relative' }}>
        <button
          className="brand"
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          onClick={() => setBrandMenuOpen((v) => !v)}
        >
          <div
            className="brand-mark"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1rem', color: '#12161B',
              background: 'linear-gradient(135deg, #E0A75E, #C98A3E)',
            }}
          >
            A
          </div>
          <div style={{ flex: 1 }}>
  <div className="brand-name" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    Aptus
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ transform: brandMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease', opacity: 0.6 }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  </div>
  <div className="brand-sub">Your workspace</div>
</div>
        </button>

        {brandMenuOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              onClick={() => setBrandMenuOpen(false)}
            />
            <div
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
                background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden',
              }}
            >
              <Link
                href="/settings"
                className="nav-item"
                style={{ borderRadius: 0 }}
                onClick={() => setBrandMenuOpen(false)}
              >
                <span>Settings</span>
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="nav-label">Workspace</div>
      <div className="nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${item.hero ? 'hero' : ''} ${pathname === item.href ? 'active' : ''}`}
          >
            {ICONS[item.icon]}
            <span>{item.label}</span>
            {item.hero && <span className="nav-spark" />}
          </Link>
        ))}
      </div>

      <div className="sidebar-foot">
        <div className="avatar-sm" style={{ background: '#2F6F63' }}>M</div>
        <div>
          <div className="foot-name">Manager Name</div>
          <div className="foot-role">Manager</div>
        </div>
      </div>
    </aside>
  );
}