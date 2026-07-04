import { useEffect, useMemo, useRef, useState } from 'react';
import './CustomerGraphAppShell.css';
import {
  getCustomerGraphSession,
  logoutCustomerGraph,
  navigateTo,
} from '../../auth/logic/authService.js';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'dashboard', roles: ['admin', 'account_manager'] },
  { key: 'customers', label: 'Customers', path: '/customers', icon: 'customers', roles: ['admin', 'sales_executive', 'account_manager', 'support_agent'] },
  { key: 'risk', label: 'Risk', icon: 'risk', roles: ['admin', 'account_manager'] },
  { key: 'support', label: 'Support', icon: 'support', roles: ['admin', 'account_manager', 'support_agent'] },
  { key: 'billing', label: 'Billing', icon: 'billing', roles: ['admin', 'account_manager'] },
  { key: 'opportunities', label: 'Opportunities', icon: 'opportunities', roles: ['admin', 'sales_executive', 'account_manager'] },
  { key: 'chat', label: 'AI Chat', icon: 'chat', roles: ['admin', 'sales_executive', 'account_manager', 'support_agent'] },
  { key: 'approvals', label: 'Approvals', icon: 'approvals', roles: ['admin', 'account_manager'] },
  { key: 'admin', label: 'Admin', path: '/admin/users', icon: 'admin', roles: ['admin'] },
  { key: 'settings', label: 'Settings', icon: 'settings', roles: ['admin'] },
];

function initials(value) {
  const tokens = String(value || '?').trim().split(/\s+/).filter(Boolean);
  return tokens.slice(0, 2).map((token) => token[0]).join('').toUpperCase() || '?';
}

function Icon({ name, size = 17 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.5-3.5 2.4-5.2 5.5-5.2s5 1.7 5.5 5.2" /><path d="M17 11.5c2.2.2 3.6 1.7 4 4.1" /><path d="M16.7 5.2a2.6 2.6 0 0 1 0 5.2" /></>,
    risk: <><path d="M12 3 21 19H3L12 3Z" /><path d="M12 9v4" /><path d="M12 16.5h.01" /></>,
    support: <><path d="M4 13a8 8 0 0 1 16 0" /><path d="M4 13v3a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 1Z" /><path d="M20 13v3a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 1Z" /><path d="M17 19c0 1.2-1.5 2-3.7 2" /></>,
    billing: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h4" /></>,
    opportunities: <><path d="M4 18 9 13l3 3 7-8" /><path d="M15 8h4v4" /></>,
    chat: <><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
    approvals: <><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12 2.4 2.4 5-5" /></>,
    admin: <><path d="M12 3 5 6v5c0 4.7 3 8.2 7 10 4-1.8 7-5.3 7-10V6l-7-3Z" /><path d="M9 12h6M12 9v6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.2 2.2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.2-2.2.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5v-3.2h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.2-2.2.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3.2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.2 2.2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>,
    bell: <><path d="M18 10a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 22h4" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 3v18" /></>,
  };
  return <svg {...common}>{paths[name] || paths.dashboard}</svg>;
}

export default function CustomerGraphAppShell({
  activeNav,
  screenCode,
  screenTitle,
  children,
  contentMode = 'scrollable',
}) {
  const session = getCustomerGraphSession();
  const [query, setQuery] = useState('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const allowedItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.includes(session?.role || '')),
    [session?.role],
  );

  useEffect(() => {
    const closeOverlays = (event) => {
      if (event.key === 'Escape') {
        setIsMobileNavOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    const closeProfileOnOutsidePointer = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', closeOverlays);
    window.addEventListener('pointerdown', closeProfileOnOutsidePointer);
    return () => {
      window.removeEventListener('keydown', closeOverlays);
      window.removeEventListener('pointerdown', closeProfileOnOutsidePointer);
    };
  }, []);

  const goTo = (item) => {
    setIsMobileNavOpen(false);
    setIsProfileMenuOpen(false);
    if (item.path) navigateTo(item.path);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const term = query.trim();
    setIsMobileNavOpen(false);
    setIsProfileMenuOpen(false);
    navigateTo(term ? `/customers?search=${encodeURIComponent(term)}` : '/customers');
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    logoutCustomerGraph();
  };

  const profileName = session?.fullName || session?.email || 'CustomerGraph user';

  return (
    <main className="cg-shell">
      <header className="cg-screen-titlebar">
        <span className="cg-screen-code">{screenCode}</span>
        <h1>{screenTitle}</h1>
      </header>

      <div className="cg-shell-body">
        <button
          type="button"
          className={`cg-sidebar-backdrop ${isMobileNavOpen ? 'is-open' : ''}`}
          onClick={() => setIsMobileNavOpen(false)}
          aria-label="Close navigation menu"
          tabIndex={isMobileNavOpen ? 0 : -1}
        />
        <aside id="customergraph-navigation" className={`cg-sidebar ${isMobileNavOpen ? 'is-open' : ''}`}>
          <div>
            <div className="cg-brand">
              <span className="cg-brand-mark">✦</span>
              <span>CustomerGraph AI</span>
              <small>Executive</small>
              <button type="button" className="cg-mobile-nav-close" onClick={() => setIsMobileNavOpen(false)} aria-label="Close navigation menu">
                <Icon name="close" size={18} />
              </button>
            </div>
            <nav className="cg-nav" aria-label="CustomerGraph navigation">
              {allowedItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={activeNav === item.key ? 'active' : ''}
                  onClick={() => goTo(item)}
                  title={item.path ? item.label : `${item.label} UI will be added next`}
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <button type="button" className="cg-collapse-button" title="Collapse control is visual in this build">
            <span>←</span> Collapse
          </button>
        </aside>

        <section className={`cg-main-area ${contentMode === 'fixed' ? 'is-fixed' : ''}`}>
          <header className="cg-topbar">
            <button
              type="button"
              className="cg-mobile-nav-toggle"
              onClick={() => setIsMobileNavOpen(true)}
              aria-expanded={isMobileNavOpen}
              aria-controls="customergraph-navigation"
              aria-label="Open navigation menu"
            >
              <Icon name="menu" size={19} />
            </button>
            <form className="cg-global-search" onSubmit={submitSearch}>
              <Icon name="search" size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers, accounts, tickets..." aria-label="Search customers, accounts, tickets" />
            </form>
            <div className="cg-top-actions">
              <button type="button" className="cg-icon-button" title="Notifications" aria-label="Notifications"><Icon name="bell" size={17} /></button>
              <button type="button" className="cg-icon-button cg-settings-button" title="Settings" aria-label="Settings"><Icon name="settings" size={16} /></button>
              <div ref={profileMenuRef} className="cg-profile-menu-wrap">
                <button
                  type="button"
                  className="cg-profile-button"
                  onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                  title="Open profile menu"
                  aria-label="Open profile menu"
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  {initials(profileName)}
                </button>
                {isProfileMenuOpen && (
                  <div className="cg-profile-menu" role="menu" aria-label="Profile menu">
                    <div className="cg-profile-menu-user">
                      <span className="cg-profile-menu-avatar">{initials(profileName)}</span>
                      <div>
                        <strong>{profileName}</strong>
                        <span>{session?.email || 'Signed in user'}</span>
                        <small>{session?.roleLabel || session?.role || 'User'}</small>
                      </div>
                    </div>
                    <div className="cg-profile-menu-divider" />
                    <button type="button" className="cg-profile-logout" role="menuitem" onClick={handleLogout}>
                      <Icon name="logout" size={16} />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}

export { Icon };
