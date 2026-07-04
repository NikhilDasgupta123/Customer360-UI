import './AccessRequestsPage.css';
import { useAccessRequests } from '../logic/useAccessRequests.js';

function formatRole(role) {
  return String(role || '')
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AccessRequestsPage() {
  const {
    requests,
    isLoading,
    actionId,
    message,
    pendingCount,
    loadRequests,
    approveRequest,
    rejectRequest,
    logoutCustomerGraph,
  } = useAccessRequests();

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Admin Console</p>
            <h1>Pending Access Requests</h1>
            <p className="admin-subtitle">Approve or reject new users who requested Customer 360 access.</p>
          </div>
          <div className="admin-actions">
            <button className="ghost-btn" type="button" onClick={loadRequests} disabled={isLoading}>
              <i className="ti ti-refresh"></i>
              Refresh
            </button>
            <button className="logout-btn" type="button" onClick={logoutCustomerGraph}>
              <i className="ti ti-logout"></i>
              Logout
            </button>
          </div>
        </header>

        <div className="stats-row">
          <article className="stat-card">
            <span className="stat-icon"><i className="ti ti-user-question"></i></span>
            <div>
              <p className="stat-value">{pendingCount}</p>
              <p className="stat-label">Pending Requests</p>
            </div>
          </article>
          <article className="stat-card">
            <span className="stat-icon"><i className="ti ti-shield-check"></i></span>
            <div>
              <p className="stat-value">Admin</p>
              <p className="stat-label">Approval Mode</p>
            </div>
          </article>
        </div>

        {message ? <p className="admin-message">{message}</p> : null}

        <section className="request-card">
          <div className="request-card-head">
            <h2>Requests waiting for approval</h2>
            <span>{requests.length} item(s)</span>
          </div>

          {isLoading ? (
            <div className="empty-state">Loading pending requests...</div>
          ) : requests.length === 0 ? (
            <div className="empty-state">No pending access requests right now.</div>
          ) : (
            <div className="request-table-wrap">
              <table className="request-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Team</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id || request.email}>
                      <td>{request.full_name || request.name || '-'}</td>
                      <td>{request.email || '-'}</td>
                      <td>{formatRole(request.role)}</td>
                      <td>{request.company_team || request.team || '-'}</td>
                      <td><span className="status-pill">Pending</span></td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="approve-btn"
                            type="button"
                            disabled={actionId === request.id}
                            onClick={() => approveRequest(request.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="reject-btn"
                            type="button"
                            disabled={actionId === request.id}
                            onClick={() => rejectRequest(request.id)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
