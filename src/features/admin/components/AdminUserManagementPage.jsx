import { useMemo, useState } from 'react';
import './AdminUserManagementPage.css';
import { logoutCustomerGraph, getCustomerGraphSession, navigateTo } from '../../auth/logic/authService.js';
import { useAdminUsers } from '../logic/useAdminUsers.js';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'sales_executive', label: 'Sales Executive' },
  { value: 'account_manager', label: 'Account Manager' },
  { value: 'support_agent', label: 'Support Agent' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'disabled', label: 'Suspended' },
];

const EMPTY_CREATE_FORM = {
  full_name: '',
  email: '',
  password: '',
  role: 'sales_executive',
  status: 'active',
  company_team: '',
};

function labelForRole(role) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || String(role || '').replaceAll('_', ' ');
}

function labelForStatus(status) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status || 'Unknown';
}

function initials(value) {
  const tokens = String(value || '?').trim().split(/\s+/).filter(Boolean);
  return tokens.slice(0, 2).map((token) => token[0]).join('').toUpperCase() || '?';
}

function formatDate(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
}

function RolePill({ role }) {
  return <span className={`user-pill role-${role}`}>{labelForRole(role)}</span>;
}

function StatusPill({ status }) {
  return <span className={`user-pill status-${status}`}>{labelForStatus(status)}</span>;
}

function Modal({ title, description, children, onClose }) {
  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="admin-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="admin-modal-header">
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default function AdminUserManagementPage() {
  const session = getCustomerGraphSession();
  const {
    users, summary, filters, isLoading, isSaving, message,
    updateFilter, refresh, createUser, updateUser, deleteUser,
  } = useAdminUsers();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formError, setFormError] = useState('');

  const currentUserId = session?.userId || '';
  const pageCountText = useMemo(() => `${users.length} user${users.length === 1 ? '' : 's'} shown`, [users.length]);

  const openCreate = () => {
    setFormError('');
    setCreateForm(EMPTY_CREATE_FORM);
    setIsCreateOpen(true);
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    setFormError('');
    if (createForm.password.length < 8) {
      setFormError('Temporary password must have at least 8 characters.');
      return;
    }
    const result = await createUser(createForm);
    if (result.ok) setIsCreateOpen(false);
  };

  const openEdit = (user) => {
    setFormError('');
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      role: user.role || 'sales_executive',
      status: user.status || 'active',
      company_team: user.company_team || '',
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editingUser || !editForm) return;
    setFormError('');
    const result = await updateUser(editingUser.id, editForm);
    if (result.ok) setEditingUser(null);
  };

  const applyQuickStatus = async (user, nextStatus) => {
    await updateUser(user.id, { status: nextStatus });
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteUser(deleteTarget.id);
    if (result.ok) setDeleteTarget(null);
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Customers', path: '/customers' },
    { label: 'Risk' }, { label: 'Support' }, { label: 'Billing' },
    { label: 'Opportunities' }, { label: 'AI Chat' }, { label: 'Approvals' },
    { label: 'Admin', path: '/admin/users' }, { label: 'Settings' },
  ];

  return (
    <main className="admin-user-app">
      <div className="admin-titlebar">
        <span className="admin-screen-badge">C-12</span>
        <h1>Admin Panel <span>(User Management)</span></h1>
      </div>

      <div className="admin-user-body">
        <aside className="admin-sidebar">
          <div>
            <div className="admin-brand">
              <span className="admin-brand-mark">✦</span>
              <span>CustomerGraph AI</span>
            </div>
            <nav className="admin-nav" aria-label="Primary navigation">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={item.label === 'Admin' ? 'active' : ''}
                  title={item.label === 'Admin' ? 'User management' : item.path ? item.label : `${item.label} UI will be added next`}
                  onClick={() => item.path && navigateTo(item.path)}
                >
                  <span className="nav-dot" aria-hidden="true"></span>{item.label}
                </button>
              ))}
            </nav>
          </div>
          <p className="sidebar-footnote">User Management</p>
        </aside>

        <section className="admin-main-content">
          <header className="admin-topbar">
            <div className="admin-global-search" aria-label="Product search placeholder">Search customers, accounts, tickets...</div>
            <button className="top-icon-button" type="button" title="Notifications are not connected">⌁<span className="notification-dot" /></button>
            <button className="top-icon-button" type="button" title="Settings are not connected">⚙</button>
            <span className="admin-avatar" title={session?.fullName || session?.email}>{initials(session?.fullName || session?.email)}</span>
          </header>

          <section className="users-panel-head">
            <div>
              <p className="section-eyebrow">ADMIN ACCESS CONTROL</p>
              <h2>Users &amp; Access</h2>
              <p>Manage who can sign in and what they can see across CustomerGraph AI.</p>
            </div>
            <div className="header-actions">
              <button className="secondary-button" type="button" onClick={refresh} disabled={isLoading || isSaving}>↻ Refresh</button>
              <button className="primary-button" type="button" onClick={openCreate}>+ Add User</button>
              <button className="logout-button" type="button" onClick={logoutCustomerGraph}>Log out</button>
            </div>
          </section>

          <section className="admin-stat-grid" aria-label="User statistics">
            <article className="admin-stat-card"><span>Total Users</span><strong>{summary.total_users ?? 0}</strong></article>
            <article className="admin-stat-card"><span>Active</span><strong className="green">{summary.active_users ?? 0}</strong></article>
            <article className="admin-stat-card"><span>Pending</span><strong className="amber">{summary.pending_users ?? 0}</strong></article>
            <article className="admin-stat-card"><span>Admins</span><strong className="blue">{summary.admin_users ?? 0}</strong></article>
          </section>

          <section className="admin-filter-row" aria-label="User filters">
            <label className="filter-search">
              <span className="sr-only">Search users</span>
              <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search by name, email or team..." />
            </label>
            <label className="sr-only" htmlFor="role-filter">Role filter</label>
            <select id="role-filter" value={filters.role} onChange={(event) => updateFilter('role', event.target.value)}>
              <option value="">Role: All</option>
              {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
            <label className="sr-only" htmlFor="status-filter">Status filter</label>
            <select id="status-filter" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">Status: All</option>
              {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </section>

          {message.text ? <div className={`admin-feedback ${message.type || ''}`} role="status">{message.text}</div> : null}

          <section className="user-table-card">
            <div className="table-caption-row">
              <div><h3>Team members</h3><p>{pageCountText}. All data is loaded from the secured Admin API.</p></div>
              {isLoading ? <span className="table-loading">Loading...</span> : null}
            </div>
            <div className="user-table-wrap">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>User</th><th>Role</th><th>Status</th><th>Team</th><th>Last Login</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && users.length === 0 ? (
                    <tr><td className="empty-user-table" colSpan="6">No users match the current filters.</td></tr>
                  ) : users.map((user) => {
                    const isProtected = Boolean(user.is_first_admin) || user.id === currentUserId;
                    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
                    const statusAction = user.status === 'pending' ? 'Approve' : user.status === 'active' ? 'Suspend' : 'Activate';
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="table-user-cell"><span className={`table-avatar avatar-${user.role}`}>{initials(user.full_name)}</span><div><strong>{user.full_name}</strong><small>{user.email}</small></div></div>
                        </td>
                        <td><RolePill role={user.role} /></td>
                        <td><StatusPill status={user.status} /></td>
                        <td>{user.company_team || '—'}</td>
                        <td>{formatDate(user.last_login_at)}</td>
                        <td>
                          <div className="table-actions">
                            <button type="button" onClick={() => openEdit(user)} disabled={isSaving}>Edit</button>
                            <button type="button" onClick={() => applyQuickStatus(user, nextStatus)} disabled={isSaving || isProtected}>{statusAction}</button>
                            <button className="danger-action" type="button" onClick={() => setDeleteTarget(user)} disabled={isSaving || isProtected}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>

      {isCreateOpen ? (
        <Modal title="Add User" description="Create an account and set the user’s platform role." onClose={() => !isSaving && setIsCreateOpen(false)}>
          <form className="admin-form" onSubmit={submitCreate}>
            <label>Full Name<input value={createForm.full_name} onChange={(event) => setCreateForm({ ...createForm, full_name: event.target.value })} placeholder="e.g. Neha Kulkarni" required /></label>
            <label>Work Email<input type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} placeholder="name@company.com" required /></label>
            <label>Temporary Password<input type="password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} placeholder="At least 8 characters" minLength="8" required /></label>
            <label>Role<select value={createForm.role} onChange={(event) => setCreateForm({ ...createForm, role: event.target.value })}>{ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
            <label>Account Status<select value={createForm.status} onChange={(event) => setCreateForm({ ...createForm, status: event.target.value })}><option value="active">Active — can sign in now</option><option value="pending">Pending — approve later</option></select></label>
            <label>Team <span className="optional">(optional)</span><input value={createForm.company_team} onChange={(event) => setCreateForm({ ...createForm, company_team: event.target.value })} placeholder="e.g. Customer Success" /></label>
            <p className="form-note">Email invitations are not enabled in this build. Share the temporary password with the user through your approved channel.</p>
            {formError ? <p className="form-error">{formError}</p> : null}
            <div className="modal-actions"><button className="ghost-button" type="button" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>Cancel</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create User'}</button></div>
          </form>
        </Modal>
      ) : null}

      {editingUser && editForm ? (
        <Modal title="Edit User" description={`Update ${editingUser.full_name}'s access. Changes to role or status end existing sessions.`} onClose={() => !isSaving && setEditingUser(null)}>
          <form className="admin-form" onSubmit={submitEdit}>
            <label>Full Name<input value={editForm.full_name} onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })} required /></label>
            <label>Work Email<input value={editingUser.email} disabled /></label>
            <label>Role<select value={editForm.role} disabled={editingUser.is_first_admin || editingUser.id === currentUserId} onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}>{ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
            <label>Account Status<select value={editForm.status} disabled={editingUser.is_first_admin || editingUser.id === currentUserId} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>{STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
            <label>Team <span className="optional">(optional)</span><input value={editForm.company_team} onChange={(event) => setEditForm({ ...editForm, company_team: event.target.value })} /></label>
            {editingUser.is_first_admin || editingUser.id === currentUserId ? <p className="form-note">Your own and the first Admin account must remain an active Admin. Name and team can still be updated.</p> : null}
            {formError ? <p className="form-error">{formError}</p> : null}
            <div className="modal-actions"><button className="ghost-button" type="button" onClick={() => setEditingUser(null)} disabled={isSaving}>Cancel</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button></div>
          </form>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal title="Delete User" description="This permanently removes the account and revokes all of its active sessions." onClose={() => !isSaving && setDeleteTarget(null)}>
          <div className="confirm-content"><p>Delete <strong>{deleteTarget.full_name}</strong> ({deleteTarget.email})?</p><div className="modal-actions"><button className="ghost-button" type="button" onClick={() => setDeleteTarget(null)} disabled={isSaving}>Cancel</button><button className="danger-button" type="button" onClick={submitDelete} disabled={isSaving}>{isSaving ? 'Deleting...' : 'Delete User'}</button></div></div>
        </Modal>
      ) : null}
    </main>
  );
}
