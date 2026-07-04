const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function roleLabel(role) {
  return String(role || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function navigateTo(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('customergraph:navigate'));
}

export async function loginCustomerGraph({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Login failed');
  }

  const accessToken = data?.tokens?.access_token || data?.access_token || data?.token || '';
  const role = data?.user?.role || data?.role || '';

  if (!accessToken || !role) {
    throw new Error('Login response is incomplete. Please contact an administrator.');
  }

  const session = {
    accessToken,
    refreshToken: data?.tokens?.refresh_token || '',
    role,
    roleLabel: roleLabel(role),
    email: data?.user?.email || email,
    fullName: data?.user?.full_name || '',
    userId: data?.user?.id || '',
  };

  localStorage.setItem('customergraph_session', JSON.stringify(session));
  return session;
}

export function getCustomerGraphSession() {
  try {
    return JSON.parse(localStorage.getItem('customergraph_session')) || null;
  } catch {
    return null;
  }
}

export function logoutCustomerGraph() {
  const session = getCustomerGraphSession();
  const token = session?.accessToken;

  // Clear the local browser session immediately, then ask the backend to
  // revoke the JWT session in the background.
  localStorage.removeItem('customergraph_session');
  navigateTo('/');

  if (token) {
    void fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {
      // Local logout has already completed. A network failure here does not
      // keep the user on the protected screen.
    });
  }
}
