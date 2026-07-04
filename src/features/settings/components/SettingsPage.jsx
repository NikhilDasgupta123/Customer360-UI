import { useEffect, useState } from 'react';
import CustomerGraphAppShell, { Icon } from '../../layout/components/CustomerGraphAppShell.jsx';
import { getCustomerGraphSession } from '../../auth/logic/authService.js';
import './SettingsPage.css';

const STORAGE_KEY = 'customergraph:workspace-settings';

const DEFAULT_SETTINGS = {
  automaticRefresh: true,
  criticalAlerts: true,
  renewalAlerts: true,
  weeklyDigest: false,
};

function readSavedSettings() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function Switch({ checked, onChange, label, description }) {
  return (
    <label className="settings-switch-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="settings-toggle" aria-hidden="true"><span /></span>
    </label>
  );
}

export default function SettingsPage() {
  const session = getCustomerGraphSession();
  const [settings, setSettings] = useState(readSavedSettings);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (!saveMessage) return undefined;
    const timer = window.setTimeout(() => setSaveMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [saveMessage]);

  const setSetting = (name, value) => {
    setSettings((current) => ({ ...current, [name]: value }));
    setSaveMessage('');
  };

  const saveSettings = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaveMessage('Preferences saved in this browser.');
    } catch {
      setSaveMessage('Preferences could not be saved in this browser.');
    }
  };

  return (
    <CustomerGraphAppShell activeNav="settings" screenTitle="Settings">
      <section className="settings-page">
        <header className="settings-page-head">
          <div>
            <p className="settings-eyebrow">WORKSPACE SETTINGS</p>
            <h2>Manage your CustomerGraph workspace</h2>
            <p>Update dashboard preferences and the notifications you want to receive.</p>
          </div>
          <button type="button" className="settings-save-button" onClick={saveSettings}>Save changes</button>
        </header>

        {saveMessage ? <div className="settings-feedback"><Icon name="check" size={15} /><span>{saveMessage}</span></div> : null}

        <div className="settings-grid">
          <section className="settings-card settings-account-card">
            <header><h3>Workspace profile</h3><p>CustomerGraph account information.</p></header>
            <div className="settings-profile-summary">
              <span className="settings-profile-avatar">{String(session?.fullName || session?.email || 'CG').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
              <div><strong>{session?.fullName || 'CustomerGraph Admin'}</strong><span>{session?.email || 'admin@customergraph.local'}</span></div>
            </div>
            <dl className="settings-detail-list">
              <div><dt>Workspace</dt><dd>CustomerGraph AI</dd></div>
              <div><dt>Role</dt><dd>{session?.roleLabel || session?.role || 'Administrator'}</dd></div>
              <div><dt>Data source</dt><dd>Connected customer graph</dd></div>
            </dl>
          </section>

          <section className="settings-card">
            <header><h3>Dashboard preferences</h3><p>Control how the main dashboard behaves.</p></header>
            <div className="settings-card-body">
              <Switch checked={settings.automaticRefresh} onChange={(value) => setSetting('automaticRefresh', value)} label="Automatic dashboard refresh" description="Refresh live customer health data every 5 minutes." />
            </div>
          </section>

          <section className="settings-card settings-notification-card">
            <header><h3>Notifications</h3><p>Choose which customer updates need your attention.</p></header>
            <div className="settings-card-body">
              <Switch checked={settings.criticalAlerts} onChange={(value) => setSetting('criticalAlerts', value)} label="Critical risk alerts" description="Show an in-app alert for critical customer health changes." />
              <Switch checked={settings.renewalAlerts} onChange={(value) => setSetting('renewalAlerts', value)} label="Upcoming renewal reminders" description="Notify when a renewal enters the next 30-day window." />
              <Switch checked={settings.weeklyDigest} onChange={(value) => setSetting('weeklyDigest', value)} label="Weekly portfolio digest" description="Prepare a weekly summary for the workspace administrator." />
            </div>
          </section>

          <section className="settings-card settings-security-card">
            <header><h3>Security</h3><p>Account access is protected by your current sign-in session.</p></header>
            <div className="settings-security-status"><span className="settings-security-dot" /><div><strong>Session protection enabled</strong><small>Your workspace session will require sign-in again after it expires.</small></div></div>
          </section>
        </div>
      </section>
    </CustomerGraphAppShell>
  );
}
