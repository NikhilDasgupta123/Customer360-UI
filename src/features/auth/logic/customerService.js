import { getCustomerGraphSession } from './authService.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function customerQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.industry) params.set('industry', filters.industry);
  if (filters.healthBand) params.set('health_band', filters.healthBand);
  if (filters.riskLevel) params.set('risk_level', filters.riskLevel);
  if (filters.renewalWithinDays) params.set('renewal_within_days', filters.renewalWithinDays);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchCustomers(filters = {}) {
  const token = getCustomerGraphSession()?.accessToken;
  const response = await fetch(`${API_BASE_URL}/api/v1/customers${customerQuery(filters)}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Customer directory could not be loaded.');
  }

  const customers = Array.isArray(data)
    ? data
    : (data?.customers || data?.items || data?.results || []);

  return {
    customers: Array.isArray(customers) ? customers : [],
    total: Number(data?.total ?? data?.count ?? customers.length) || 0,
    scope: data?.scope || 'all_customers',
  };
}
