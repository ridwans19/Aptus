'use client';

import { useState } from 'react';

type Section = 'general' | 'profile' | 'workhours' | 'notifications';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'profile', label: 'My profile' },
  { id: 'workhours', label: 'Work hours' },
  { id: 'notifications', label: 'Notifications' },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('general');

  const [companyName, setCompanyName] = useState('Brightframe Studio');
  const [industry, setIndustry] = useState('Software consultancy');
  const [timezone, setTimezone] = useState('GMT (UK)');

  const [managerName, setManagerName] = useState('Manager Name');
  const [managerEmail, setManagerEmail] = useState('manager@brightframe.io');

  const [defaultCapacity, setDefaultCapacity] = useState(40);

  const [notifyOnAssign, setNotifyOnAssign] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
      {/* Settings sub-nav */}
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--ink-faint)', marginBottom: 10 }}>
          Settings
        </div>
        {SECTIONS.map((s) => (
          <div
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              fontSize: '0.8125rem',
              fontWeight: section === s.id ? 600 : 400,
              color: section === s.id ? 'var(--ink)' : 'var(--ink-soft)',
              background: section === s.id ? 'var(--surface-alt)' : 'transparent',
              cursor: 'pointer',
              marginBottom: 2,
            }}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {section === 'general' && (
          <div className="panel">
            <div className="panel-head"><h3>Company details</h3></div>
            <div style={{ padding: 18 }}>
              <div className="field-group">
                <label className="field-label">Company name</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="field-row2">
                <div className="field-group">
                  <label className="field-label">Industry</label>
                  <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Timezone</label>
                  <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary btn-sm">Save changes</button>
            </div>
          </div>
        )}

        {section === 'profile' && (
          <div className="panel">
            <div className="panel-head"><h3>Your profile</h3></div>
            <div style={{ padding: 18 }}>
              <div className="field-row2">
                <div className="field-group">
                  <label className="field-label">Name</label>
                  <input type="text" value={managerName} onChange={(e) => setManagerName(e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Email</label>
                  <input type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary btn-sm">Save changes</button>
            </div>
          </div>
        )}

        {section === 'workhours' && (
          <div className="panel">
            <div className="panel-head"><h3>Work hours</h3></div>
            <div style={{ padding: 18 }}>
              <div className="field-group" style={{ maxWidth: 220 }}>
                <label className="field-label">Default weekly capacity</label>
                <input
                  type="number"
                  value={defaultCapacity}
                  onChange={(e) => setDefaultCapacity(parseInt(e.target.value) || 0)}
                />
                <div className="field-hint" style={{ marginTop: 6 }}>
                  Applied to new team members when they're added. Used across Dashboard, Smart Allocate, and Schedule to calculate workload.
                </div>
              </div>
              <button className="btn btn-primary btn-sm">Save changes</button>
            </div>
          </div>
        )}

        {section === 'notifications' && (
          <div className="panel">
            <div className="panel-head"><h3>Notifications</h3></div>
            <div style={{ padding: 18 }}>
              <label className="check-row" style={{ marginBottom: 14 }}>
                <input type="checkbox" checked={notifyOnAssign} onChange={(e) => setNotifyOnAssign(e.target.checked)} />
                Email an employee when they're assigned a new task
              </label>
              <label className="check-row" style={{ marginBottom: 14 }}>
                <input type="checkbox" checked={weeklySummary} onChange={(e) => setWeeklySummary(e.target.checked)} />
                Send me a weekly workload summary
              </label>
              <button className="btn btn-primary btn-sm">Save changes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}