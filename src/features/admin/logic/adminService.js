import { getCustomerGraphSession } from '../../auth/logic/authService.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function authHeaders() {
  const session = getCustomerGraphSession();
  const token = session?.accessToken;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'The Admin request could not be completed');
  }
  return data;
}

function queryString(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.role) params.set('role', filters.role);
  if (filters.status) params.set('status', filters.status);
  const text = params.toString();
  return text ? `?${text}` : '';
}

export async function fetchAdminUsers(filters = {}) {
  const data = await request(`/api/v1/admin/users${queryString(filters)}`, { method: 'GET' });
  return Array.isArray(data?.users) ? data.users : [];
}

export async function fetchAdminUserSummary() {
  return request('/api/v1/admin/users/summary', { method: 'GET' });
}

export async function createAdminUser(payload) {
  return request('/api/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUser(userId, payload) {
  return request(`/api/v1/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(userId) {
  return request(`/api/v1/admin/users/${userId}`, { method: 'DELETE' });
}

// Existing request-approval APIs are kept for older integrations and Swagger testing.
export async function fetchPendingAccessRequests() {
  const data = await request('/api/v1/admin/access-requests?status=pending', { method: 'GET' });
  return Array.isArray(data?.requests) ? data.requests : [];
}

export async function approveAccessRequest(requestId) {
  return request(`/api/v1/admin/access-requests/${requestId}/approve`, { method: 'PATCH' });
}

export async function rejectAccessRequest(requestId) {
  return request(`/api/v1/admin/access-requests/${requestId}/reject`, { method: 'PATCH' });
}
