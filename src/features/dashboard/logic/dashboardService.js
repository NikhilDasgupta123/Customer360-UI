import { getCustomerGraphSession } from '../../auth/logic/authService.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function fetchDashboardSummary() {
  const token = getCustomerGraphSession()?.accessToken;
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/summary`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.detail || 'Dashboard data could not be loaded.');
  return data;
}
